// mock-supabase.jsx — fake Supabase client + bookings dataset for the preview.

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

const PROPERTIES = [
  'Trastevere Loft 21',
  'Navigli Skyhouse',
  'Fondamenta Nove 3',
  'Palatino Garden Suite',
  'San Lorenzo Studio',
]

const NAMES = [
  'M. Rossi', 'A. Bianchi', 'L. Conti', 'S. Müller', 'J. Dubois',
  'K. Tanaka', 'P. Fernández', 'O. Nielsen', 'F. Romano', 'T. Hayashi',
  'C. Morales', 'D. Schmidt', 'I. Petrov', 'R. Costa', 'B. Klein',
  'N. Lefèvre', 'V. Greco', 'H. Park', 'E. Lombardi', 'G. Ferrari',
]

// Deterministic-ish RNG so the preview is stable per-session.
let seed = 42
const rng = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
const pick = (a) => a[Math.floor(rng() * a.length)]

function generateBookings() {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const bookings = []
  // build 35 bookings spread over ±35 days from today
  for (let i = 0; i < 35; i++) {
    const offset = Math.floor(rng() * 70) - 35
    const checkin = addDays(today, offset)
    const nights = 1 + Math.floor(rng() * 6)
    const checkout = addDays(checkin, nights)
    const source = rng() > 0.45 ? 'airbnb' : 'booking'
    const property = pick(PROPERTIES)
    const guest = pick(NAMES)
    bookings.push({
      uid: `${source}-${1000 + i}-${ymd(checkin)}`,
      property,
      source,
      checkin: ymd(checkin),
      checkout: ymd(checkout),
      summary: `${guest} · ${nights}n`,
      nights,
      last_sync: new Date(Date.now() - Math.floor(rng() * 3600 * 1000 * 6)).toISOString(),
    })
  }
  // guarantee at least 2 events today (one check-in, one check-out)
  bookings.push({
    uid: `airbnb-today-in`, property: 'Trastevere Loft 21', source: 'airbnb',
    checkin: ymd(today), checkout: ymd(addDays(today, 3)),
    summary: 'E. Lombardi · 3n', nights: 3,
    last_sync: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  })
  bookings.push({
    uid: `booking-today-out`, property: 'Navigli Skyhouse', source: 'booking',
    checkin: ymd(addDays(today, -2)), checkout: ymd(today),
    summary: 'J. Dubois · 2n', nights: 2,
    last_sync: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  })
  bookings.push({
    uid: `airbnb-today-stay`, property: 'Fondamenta Nove 3', source: 'airbnb',
    checkin: ymd(addDays(today, -1)), checkout: ymd(addDays(today, 4)),
    summary: 'K. Tanaka · 5n', nights: 5,
    last_sync: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  })
  return bookings.sort((a, b) => a.checkin.localeCompare(b.checkin))
}

const DATA = generateBookings()

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// Pretend session, opt-in via localStorage so the login screen is reachable.
const SESSION_KEY = 'stayops_mock_session'
const listeners = new Set()
const broadcast = (s) => listeners.forEach((cb) => cb(null, s))

window.mockSupabase = {
  auth: {
    async getSession() {
      const raw = localStorage.getItem(SESSION_KEY)
      return { data: { session: raw ? JSON.parse(raw) : null } }
    },
    async signInWithPassword({ email, password }) {
      await wait(450)
      if (!email || !password) return { error: { message: 'Email e password richiesti' } }
      if (password.length < 4) return { error: { message: 'Password troppo corta' } }
      const session = { user: { email, id: 'mock-user' }, access_token: 'mock' }
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      broadcast(session)
      return { data: { session }, error: null }
    },
    async signOut() {
      localStorage.removeItem(SESSION_KEY)
      broadcast(null)
      return { error: null }
    },
    onAuthStateChange(cb) {
      listeners.add(cb)
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
    },
  },
  from(table) {
    const ctx = { table, ascending: true }
    const builder = {
      select() { return builder },
      order(_col, opts) { ctx.ascending = opts?.ascending ?? true; return builder },
      then(resolve) {
        wait(420).then(() => {
          if (ctx.table !== 'bookings') return resolve({ data: [], error: null })
          const rows = [...DATA]
          if (!ctx.ascending) rows.reverse()
          resolve({ data: rows, error: null })
        })
      },
    }
    return builder
  },
}
