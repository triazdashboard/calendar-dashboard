// @ts-nocheck — Deno globals not available in local TS config
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const BASE_HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

// sync-owned columns — enrichment fields are never touched during sync:
// nome, cognome, num_ospiti, orario_arrivo, orario_uscita, importo_totale,
// tasse_citta, doc_identita, numero_prenotazione_web, enrichment_source,
// enrichment_updated_at, internal_booking_id
const SYNC_COLS = [
  'uid', 'user_id', 'property', 'source', 'checkin', 'checkout',
  'summary', 'nights', 'room_id', 'is_mirror_block', 'conflict', 'last_sync',
].join(',')

async function dbSelect(table: string, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: BASE_HEADERS })
  return res.json()
}

async function dbUpsert(table: string, rows: unknown[]) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?on_conflict=uid,user_id&columns=${SYNC_COLS}`,
    {
      method: 'POST',
      headers: { ...BASE_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    }
  )
  if (!res.ok) throw new Error(await res.text())
}

async function dbPatch(table: string, match: string, data: unknown) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
    method: 'PATCH',
    headers: BASE_HEADERS,
    body: JSON.stringify(data),
  })
}

function parseDate(s: string): string {
  const d = s.replace(/T.*/, '').replace(/Z$/, '')
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}

function parseIcal(text: string) {
  const events: { uid: string; summary: string; checkin: string; checkout: string; nights: number }[] = []
  const blocks = text.split('BEGIN:VEVENT')
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]
    const get = (key: string) => {
      const m = block.match(new RegExp(`^${key}(?:;[^:]*)?:(.+)`, 'm'))
      return m ? m[1].trim().replace(/\\n/g, '\n').replace(/\\,/g, ',') : null
    }
    const uid = get('UID')
    const rawStart = get('DTSTART')
    const rawEnd = get('DTEND')
    if (!uid || !rawStart || !rawEnd) continue
    const checkin = parseDate(rawStart)
    const checkout = parseDate(rawEnd)
    const nights = Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86_400_000)
    events.push({ uid, summary: get('SUMMARY') ?? '', checkin, checkout, nights })
  }
  return events
}

// Fraction of event A's duration that overlaps with event B
function overlapFraction(aIn: string, aOut: string, bIn: string, bOut: string): number {
  const aStart = new Date(aIn).getTime()
  const aEnd = new Date(aOut).getTime()
  const bStart = new Date(bIn).getTime()
  const bEnd = new Date(bOut).getTime()
  if (aEnd === aStart) return 0
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart)) / (aEnd - aStart)
}

function isNotAvailable(summary: string): boolean {
  const s = summary.toLowerCase()
  return s.includes('not available') || s.includes('closed')
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const calendars = await dbSelect('calendars', 'select=*')
    if (!Array.isArray(calendars)) {
      return new Response(JSON.stringify({ error: 'Failed to read calendars', detail: calendars }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    type Ev = {
      uid: string; summary: string; checkin: string; checkout: string; nights: number
      property: string; source: string; user_id: string; room_id: string | null
    }

    // Phase 1: fetch all iCal feeds, group events by property+user_id
    const groups = new Map<string, { airbnb: Ev[]; booking: Ev[] }>()
    const calResults: unknown[] = []

    for (const cal of calendars) {
      if (cal.ical_url === 'https://placeholder') continue
      try {
        const res = await fetch(cal.ical_url)
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching iCal`)
        const events = parseIcal(await res.text())
        const key = `${cal.property}||${cal.user_id}`
        if (!groups.has(key)) groups.set(key, { airbnb: [], booking: [] })
        const g = groups.get(key)!
        for (const e of events) {
          const ev: Ev = {
            ...e,
            property: cal.property,
            source: cal.source,
            user_id: cal.user_id,
            room_id: cal.room_id ?? null,
          }
          if (cal.source === 'airbnb') g.airbnb.push(ev)
          else g.booking.push(ev)
        }
        await dbPatch('calendars', `id=eq.${cal.id}`, { last_sync: new Date().toISOString() })
        calResults.push({ name: cal.name, property: cal.property, status: 'ok', count: events.length })
      } catch (e: unknown) {
        calResults.push({ name: cal.name, property: cal.property, status: 'error', error: (e as Error).message })
      }
    }

    // Phase 2: classify mirror blocks + conflicts, build upsert rows (sync-owned fields only)
    const now = new Date().toISOString()
    const rows: unknown[] = []

    for (const { airbnb, booking } of groups.values()) {
      for (const ab of airbnb) {
        let isMirror = false
        let isConflict = false
        if (isNotAvailable(ab.summary)) {
          for (const bk of booking) {
            const frac = overlapFraction(ab.checkin, ab.checkout, bk.checkin, bk.checkout)
            if (frac >= 0.9) { isMirror = true; break }
            if (frac > 0) isConflict = true
          }
        }
        rows.push({
          uid: ab.uid, user_id: ab.user_id, property: ab.property, source: ab.source,
          checkin: ab.checkin, checkout: ab.checkout, summary: ab.summary, nights: ab.nights,
          room_id: ab.room_id, is_mirror_block: isMirror, conflict: isConflict && !isMirror,
          last_sync: now,
        })
      }
      for (const bk of booking) {
        let isConflict = false
        for (const ab of airbnb) {
          if (!isNotAvailable(ab.summary)) continue
          const frac = overlapFraction(ab.checkin, ab.checkout, bk.checkin, bk.checkout)
          if (frac > 0 && frac < 0.9) { isConflict = true; break }
        }
        rows.push({
          uid: bk.uid, user_id: bk.user_id, property: bk.property, source: bk.source,
          checkin: bk.checkin, checkout: bk.checkout, summary: bk.summary, nights: bk.nights,
          room_id: bk.room_id, is_mirror_block: false, conflict: isConflict,
          last_sync: now,
        })
      }
    }

    if (rows.length > 0) await dbUpsert('bookings', rows)

    return new Response(JSON.stringify({ synced: rows.length, results: calResults }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
