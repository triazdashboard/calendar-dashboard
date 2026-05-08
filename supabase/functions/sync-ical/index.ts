// @ts-nocheck — Deno globals not available in local TS config
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const BASE_HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

async function dbSelect(table: string, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: BASE_HEADERS })
  return res.json()
}

async function dbUpsert(table: string, rows: unknown[], onConflict: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: { ...BASE_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  })
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

    let totalSynced = 0
    const results = []

    for (const cal of calendars) {
      if (cal.ical_url === 'https://placeholder') continue
      try {
        const res = await fetch(cal.ical_url)
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching iCal`)
        const text = await res.text()
        const events = parseIcal(text)

        if (events.length > 0) {
          const bookings = events.map((e) => ({
            uid: e.uid,
            user_id: cal.user_id,
            property: cal.property,
            source: cal.source,
            checkin: e.checkin,
            checkout: e.checkout,
            summary: e.summary,
            nights: e.nights,
            last_sync: new Date().toISOString(),
          }))
          await dbUpsert('bookings', bookings, 'uid,user_id')
          totalSynced += bookings.length
        }

        await dbPatch('calendars', `id=eq.${cal.id}`, { last_sync: new Date().toISOString() })
        results.push({ name: cal.name, property: cal.property, status: 'ok', count: events.length })
      } catch (e: unknown) {
        results.push({ name: cal.name, property: cal.property, status: 'error', error: (e as Error).message })
      }
    }

    return new Response(JSON.stringify({ synced: totalSynced, results }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
