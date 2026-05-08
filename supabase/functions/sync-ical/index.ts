import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function parseDate(s: string): string {
  // Handles YYYYMMDD or YYYYMMDDTHHmmssZ
  const d = s.replace(/T.*/, '')
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}

function parseIcal(text: string): Array<{ uid: string; summary: string; checkin: string; checkout: string; nights: number }> {
  const events: Array<{ uid: string; summary: string; checkin: string; checkout: string; nights: number }> = []
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
    const nights = Math.round(
      (new Date(checkout).getTime() - new Date(checkin).getTime()) / 86_400_000,
    )

    events.push({ uid, summary: get('SUMMARY') ?? '', checkin, checkout, nights })
  }

  return events
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  const { data: calendars, error: calErr } = await supabase.from('calendars').select('*')
  if (calErr) {
    return new Response(JSON.stringify({ error: calErr.message }), { status: 500 })
  }

  let totalSynced = 0
  const results: Array<{ name: string; status: string; count?: number; error?: string }> = []

  for (const cal of calendars ?? []) {
    try {
      const res = await fetch(cal.ical_url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      const events = parseIcal(text)

      const bookings = events.map((e) => ({
        uid: e.uid,
        property: cal.property,
        source: cal.source,
        checkin: e.checkin,
        checkout: e.checkout,
        summary: e.summary,
        nights: e.nights,
        last_sync: new Date().toISOString(),
      }))

      if (bookings.length > 0) {
        const { error: upsertErr } = await supabase
          .from('bookings')
          .upsert(bookings, { onConflict: 'uid' })
        if (upsertErr) throw new Error(upsertErr.message)
      }

      await supabase
        .from('calendars')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', cal.id)

      totalSynced += bookings.length
      results.push({ name: cal.name, status: 'ok', count: bookings.length })
    } catch (e: unknown) {
      results.push({ name: cal.name, status: 'error', error: (e as Error).message })
    }
  }

  return new Response(JSON.stringify({ synced: totalSynced, results }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
})
