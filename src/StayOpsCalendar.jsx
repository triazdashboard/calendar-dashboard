// StayOpsCalendar.jsx
// Single-file React dashboard. Stack: React + Tailwind + lucide-react + @supabase/supabase-js.
// Run with Vite. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Calendar, CalendarDays, CalendarRange, Clock,
  ChevronLeft, ChevronRight, LogOut, Building2,
  RefreshCw, X, AlertCircle, Loader2, Moon, Filter,
  Link, Plus, Trash2, Check, Save,
} from 'lucide-react'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

// ───────────────────────────────────────────────────────────── helpers ──
const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseYmd = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const sameDay = (a, b) => ymd(a) === ymd(b)
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const startOfWeek = (d) => { // Monday-start
  const x = new Date(d); const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x
}
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0)
const monthLabel = (d) => d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
const dayLabel = (d) => d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

// classify a booking against a date → 'checkin' | 'checkout' | 'stay' | null
const classify = (b, dateStr) => {
  if (b.checkin === dateStr) return 'checkin'
  if (b.checkout === dateStr) return 'checkout'
  if (b.checkin < dateStr && dateStr < b.checkout) return 'stay'
  return null
}

const KIND = {
  checkin:  { label: 'check-in',  bg: 'bg-emerald-500/15', ring: 'ring-emerald-400/40', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  checkout: { label: 'check-out', bg: 'bg-amber-500/15',   ring: 'ring-amber-400/40',   dot: 'bg-amber-400',   text: 'text-amber-300' },
  stay:     { label: 'soggiorno', bg: 'bg-blue-500/15',    ring: 'ring-blue-400/40',    dot: 'bg-blue-400',    text: 'text-blue-300' },
}

const SOURCE = {
  airbnb:  { label: 'airbnb',      cls: 'bg-emerald-900/60 text-emerald-200 border-emerald-700/50' },
  booking: { label: 'booking.com', cls: 'bg-blue-900/60 text-blue-200 border-blue-700/50' },
}

// ─────────────────────────────────────────────────────────────── login ──
function LoginScreen({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setErr(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setErr(error.message)
    else onSignedIn()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0f1117' }}>
      <div className="absolute inset-0 pointer-events-none opacity-40"
           style={{ background: 'radial-gradient(800px 400px at 20% 10%, rgba(59,130,246,0.18), transparent), radial-gradient(700px 380px at 90% 90%, rgba(16,185,129,0.12), transparent)' }} />
      <form onSubmit={submit}
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500 grid place-items-center">
            <Moon className="h-4 w-4 text-slate-900" />
          </div>
          <div className="text-white text-lg font-semibold tracking-tight">StayOps</div>
        </div>
        <div className="text-sm text-white/50 mb-6">Accedi per gestire il calendario delle prenotazioni.</div>

        <label className="block text-xs uppercase tracking-wider text-white/40 mb-1">Email</label>
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/60"
          placeholder="tu@dominio.it" />

        <label className="block text-xs uppercase tracking-wider text-white/40 mb-1">Password</label>
        <input
          type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-5 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/60"
          placeholder="••••••••" />

        {err && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{err}</span>
          </div>
        )}

        <button type="submit" disabled={loading}
                className="w-full rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500 px-4 py-2.5 text-slate-900 font-medium hover:brightness-110 disabled:opacity-60 transition">
          {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Accesso…</span> : 'Accedi'}
        </button>
      </form>
    </div>
  )
}

// ────────────────────────────────────────────────────────── shared chrome ──
function ViewSwitcher({ view, setView }) {
  const items = [
    { id: 'day', label: 'Giorno', Icon: Calendar },
    { id: 'week', label: 'Settimana', Icon: CalendarRange },
    { id: 'month', label: 'Mese', Icon: CalendarDays },
  ]
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl">
      {items.map(({ id, label, Icon }) => (
        <button key={id} onClick={() => setView(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                  view === id ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white/85'
                }`}>
          <Icon className="h-4 w-4" />{label}
        </button>
      ))}
    </div>
  )
}

function SourceBadge({ source }) {
  const s = SOURCE[source] || { label: source, cls: 'bg-white/10 text-white/70 border-white/10' }
  return <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${s.cls}`}>{s.label}</span>
}

function KindBadge({ kind, compact = false }) {
  const k = KIND[kind]
  return (
    <span className={`inline-flex items-center gap-1 rounded-md ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'} ${k.bg} ring-1 ${k.ring} ${k.text} text-[10px] uppercase tracking-wider`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${k.dot}`} />{k.label}
    </span>
  )
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />
}

// ─────────────────────────────────────────────────────── booking panel ──
function PanelInput({ label, value, onChange, type = 'text', className = '' }) {
  return (
    <div className={className}>
      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</div>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-400/60"
      />
    </div>
  )
}

function BookingPanel({ booking, onClose }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (booking) {
      setForm({
        nome: booking.nome || '',
        cognome: booking.cognome || '',
        num_ospiti: booking.num_ospiti || '',
        orario_arrivo: booking.orario_arrivo || '',
        orario_uscita: booking.orario_uscita || '',
        importo_totale: booking.importo_totale || '',
        tasse_citta: booking.tasse_citta || '',
        doc_identita: booking.doc_identita || '',
        numero_prenotazione_web: booking.numero_prenotazione_web || '',
      })
      setSaved(false)
    }
  }, [booking])

  const save = async () => {
    setSaving(true)
    const patch = { ...form, enrichment_source: 'manual', enrichment_updated_at: new Date().toISOString() }
    // Remove empty strings so we don't overwrite with blanks
    Object.keys(patch).forEach((k) => { if (patch[k] === '') patch[k] = null })
    await supabase.from('bookings').update(patch).eq('internal_booking_id', booking.internal_booking_id)
    setSaving(false); setSaved(true)
  }

  if (!booking) return null
  const inDate = parseYmd(booking.checkin)
  const outDate = parseYmd(booking.checkout)

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="relative h-full w-full max-w-[420px] border-l border-white/10 bg-[#161922]/98 backdrop-blur-xl shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="sticky top-0 z-10 flex items-start justify-between p-5 border-b border-white/10 bg-[#161922]/95 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SourceBadge source={booking.source} />
              {booking.conflict && (
                <span className="text-[10px] border border-red-500/40 bg-red-500/10 text-red-300 rounded px-1.5 py-0.5">Conflitto</span>
              )}
              {booking.enrichment_source === 'n8n' && (
                <span className="text-[10px] text-white/35 border border-white/15 rounded px-1.5 py-0.5">Importato automaticamente</span>
              )}
            </div>
            <div className="text-white font-semibold">{booking.summary || booking.uid}</div>
            <div className="text-white/50 text-sm">{booking.property}{booking.room_id ? ' · stanza' : ''}</div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1 rounded-md hover:bg-white/5 mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* read-only booking info */}
        <div className="p-5 grid grid-cols-2 gap-4 text-sm border-b border-white/10">
          <Field label="Check-in" value={inDate.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} accent="text-emerald-300" />
          <Field label="Check-out" value={outDate.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} accent="text-amber-300" />
          <Field label="Notti" value={booking.nights} />
          <Field label="Ultima sync" value={booking.last_sync ? new Date(booking.last_sync).toLocaleString('it-IT') : '—'} />
        </div>

        {/* enrichment fields */}
        <div className="p-5 space-y-4">
          <div className="text-[10px] uppercase tracking-wider text-white/40">Ospite</div>
          <div className="grid grid-cols-2 gap-3">
            <PanelInput label="Nome" value={form.nome} onChange={(v) => setForm((f) => ({ ...f, nome: v }))} />
            <PanelInput label="Cognome" value={form.cognome} onChange={(v) => setForm((f) => ({ ...f, cognome: v }))} />
            <PanelInput label="N. ospiti" type="number" value={form.num_ospiti} onChange={(v) => setForm((f) => ({ ...f, num_ospiti: v }))} />
            <PanelInput label="Doc. identità" value={form.doc_identita} onChange={(v) => setForm((f) => ({ ...f, doc_identita: v }))} />
            <PanelInput label="Orario arrivo" type="time" value={form.orario_arrivo} onChange={(v) => setForm((f) => ({ ...f, orario_arrivo: v }))} />
            <PanelInput label="Orario uscita" type="time" value={form.orario_uscita} onChange={(v) => setForm((f) => ({ ...f, orario_uscita: v }))} />
          </div>

          <div className="text-[10px] uppercase tracking-wider text-white/40 pt-1">Prenotazione</div>
          <div className="grid grid-cols-2 gap-3">
            <PanelInput label="Importo totale (€)" type="number" value={form.importo_totale} onChange={(v) => setForm((f) => ({ ...f, importo_totale: v }))} />
            <PanelInput label="Tasse città (€)" type="number" value={form.tasse_citta} onChange={(v) => setForm((f) => ({ ...f, tasse_citta: v }))} />
            <PanelInput label="N. prenotazione web" value={form.numero_prenotazione_web} onChange={(v) => setForm((f) => ({ ...f, numero_prenotazione_web: v }))} className="col-span-2" />
          </div>

          <button
            onClick={save} disabled={saving}
            className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              saved
                ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-200'
                : 'bg-white/[0.08] border border-white/15 text-white hover:bg-white/[0.12] disabled:opacity-50'
            }`}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Salvo…' : saved ? 'Salvato' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, accent = 'text-white', mono = false, className = '' }) {
  return (
    <div className={className}>
      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">{label}</div>
      <div className={`${accent} ${mono ? 'font-mono text-xs' : ''} truncate`}>{value}</div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────── views ──
const slotHour = (kind, source) => {
  if (kind === 'checkout') return source === 'booking' ? 10 : 11
  if (kind === 'checkin')  return source === 'booking' ? 16 : 15
  return null
}
const DAY_HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 06:00 → 22:00

function DayView({ bookings, date, onPick }) {
  const dateStr = ymd(date)
  const items = bookings.map((b) => ({ b, kind: classify(b, dateStr) })).filter((x) => x.kind)
  const checkins = items.filter((x) => x.kind === 'checkin')
  const checkouts = items.filter((x) => x.kind === 'checkout')
  const stays = items.filter((x) => x.kind === 'stay')

  const slots = new Map()
  items.forEach(({ b, kind }) => {
    const h = slotHour(kind, b.source); if (h == null) return
    if (!slots.has(h)) slots.set(h, [])
    slots.get(h).push({ b, kind })
  })

  const now = new Date()
  const isToday = sameDay(date, now)
  const nowH = now.getHours() + now.getMinutes() / 60

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-white/85 capitalize">{dayLabel(date)}</span>
        <span className="text-white/15">·</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-white/55">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{checkins.length} check-in
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-white/55">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{checkouts.length} check-out
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-white/55">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />{stays.length} in soggiorno
        </span>
      </div>

      {stays.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-3">
          <div className="px-1 pb-2 text-[10px] uppercase tracking-wider text-blue-300/70 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Soggiorni in corso · tutto il giorno
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {stays.map(({ b }) => {
              const start = parseYmd(b.checkin)
              const dayN = Math.round((date - start) / 86400000) + 1
              return (
                <button key={b.uid} onClick={() => onPick(b)}
                        className={`text-left rounded-lg ring-1 ${b.conflict ? 'ring-red-500/50 bg-red-500/10' : 'ring-blue-400/30 bg-blue-500/10'} hover:brightness-125 px-3 py-2 transition`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-white text-sm font-medium truncate">{b.summary || b.uid}</div>
                    <SourceBadge source={b.source} />
                  </div>
                  <div className="text-white/55 text-xs truncate">{b.property}</div>
                  <div className="text-blue-300/80 text-[11px] mt-1 tabular-nums">notte {dayN} di {b.nights}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: '72px 1fr' }}>
          {DAY_HOURS.map((h) => {
            const list = slots.get(h) || []
            const isCurrent = isToday && Math.floor(nowH) === h
            const fraction = isCurrent ? (nowH - h) : 0
            return (
              <React.Fragment key={h}>
                <div className={`px-3 py-2 border-b border-white/5 text-[11px] tabular-nums ${isCurrent ? 'text-emerald-300' : 'text-white/35'}`}>
                  {pad(h)}:00
                </div>
                <div className={`relative px-3 py-2 border-b border-l border-white/5 min-h-[60px] ${isCurrent ? 'bg-emerald-400/[0.04]' : ''}`}>
                  {isCurrent && (
                    <div className="absolute -left-1 right-2 pointer-events-none flex items-center gap-2 z-10"
                         style={{ top: `${fraction * 100}%`, transform: 'translateY(-50%)' }}>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                      <span className="flex-1 h-px bg-emerald-400/55" />
                      <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-medium tabular-nums">{pad(now.getHours())}:{pad(now.getMinutes())}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {list.map(({ b, kind }) => {
                      const k = KIND[kind]
                      return (
                        <button key={b.uid + kind} onClick={() => onPick(b)}
                                className={`text-left rounded-lg ${k.bg} ring-1 ${b.conflict ? 'ring-red-500/60' : k.ring} px-3 py-2 hover:brightness-125 transition min-w-[220px]`}>
                          <div className="flex items-center gap-1.5">
                            <KindBadge kind={kind} compact />
                            <SourceBadge source={b.source} />
                            {b.conflict && <span className="text-[9px] text-red-300 border border-red-500/30 rounded px-1">conflitto</span>}
                          </div>
                          <div className="text-white text-sm font-medium truncate mt-1">{b.summary || b.uid}</div>
                          <div className="text-white/55 text-xs truncate">{b.property} · {b.nights}n</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {items.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] text-white/30 text-sm py-10 text-center">
          Nessun evento in questa data
        </div>
      )}
    </div>
  )
}

function WeekView({ bookings, anchor, onPick }) {
  const start = startOfWeek(anchor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-white/10">
        {days.map((d) => {
          const isToday = sameDay(d, new Date())
          return (
            <div key={d.toString()} className={`px-3 py-2 text-xs border-r last:border-r-0 border-white/10 ${isToday ? 'text-white' : 'text-white/55'}`}>
              <div className="capitalize">{d.toLocaleDateString('it-IT', { weekday: 'short' })}</div>
              <div className={`mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md text-sm ${isToday ? 'bg-emerald-400/20 text-emerald-200' : ''}`}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-7 min-h-[420px]">
        {days.map((d) => {
          const ds = ymd(d)
          const list = bookings.map((b) => ({ b, kind: classify(b, ds) })).filter((x) => x.kind)
          return (
            <div key={ds} className="border-r last:border-r-0 border-white/10 p-2 space-y-1">
              {list.map(({ b, kind }) => {
                const k = KIND[kind]
                return (
                  <button key={b.uid + kind} onClick={() => onPick(b)}
                          className={`w-full text-left rounded-md ring-1 ${b.conflict ? 'ring-red-500/60 bg-red-500/10' : `${k.ring} ${k.bg}`} px-2 py-1.5 hover:brightness-125 transition`}>
                    <div className="flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${b.conflict ? 'bg-red-400' : k.dot}`} />
                      <span className={`text-[10px] uppercase tracking-wider ${b.conflict ? 'text-red-300' : k.text}`}>{k.label}</span>
                    </div>
                    <div className="text-white text-xs font-medium truncate mt-0.5">{b.summary || b.uid}</div>
                    <div className="text-white/50 text-[10px] truncate">{b.property}</div>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthView({ bookings, anchor, onPick }) {
  const first = startOfMonth(anchor)
  const last = endOfMonth(anchor)
  const gridStart = startOfWeek(first)
  const totalCells = Math.ceil((((last - gridStart) / 86400000) + 1) / 7) * 7
  const cells = Array.from({ length: totalCells }, (_, i) => addDays(gridStart, i))
  const weekdays = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-white/10">
        {weekdays.map((w) => (<div key={w} className="px-3 py-2 text-xs text-white/45 uppercase tracking-wider border-r last:border-r-0 border-white/10">{w}</div>))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const ds = ymd(d)
          const inMonth = d.getMonth() === anchor.getMonth()
          const isToday = sameDay(d, new Date())
          const list = bookings.map((b) => ({ b, kind: classify(b, ds) })).filter((x) => x.kind)
          const shown = list.slice(0, 3)
          const more = list.length - shown.length
          return (
            <div key={i} className={`min-h-[110px] border-r border-b border-white/10 p-1.5 last-in-row:border-r-0 ${inMonth ? '' : 'opacity-40'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md text-xs ${isToday ? 'bg-emerald-400/20 text-emerald-200' : 'text-white/55'}`}>
                  {d.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {shown.map(({ b, kind }) => {
                  const k = KIND[kind]
                  return (
                    <button key={b.uid + kind} onClick={() => onPick(b)}
                            className={`w-full text-left rounded-sm px-1.5 py-0.5 ${b.conflict ? 'bg-red-500/15 ring-1 ring-red-500/50' : `${k.bg} ring-1 ${k.ring}`} ${k.text} text-[10px] truncate hover:brightness-125`}
                            title={`${KIND[kind].label} · ${b.summary || b.uid}${b.conflict ? ' · CONFLITTO' : ''}`}>
                      <span className={`inline-block h-1 w-1 rounded-full ${b.conflict ? 'bg-red-400' : k.dot} mr-1 align-middle`} />
                      <span className="text-white/90">{b.summary || b.uid}</span>
                    </button>
                  )
                })}
                {more > 0 && <div className="text-[10px] text-white/40 px-1">+{more}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────── apartments ──
const EMPTY_LINK = { source: 'airbnb', ical_url: '' }
const INPUT_CLS = 'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/60'

function ICalLinkForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_LINK)
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} className="space-y-2 p-3 rounded-xl bg-white/[0.04] border border-white/10">
      <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className={INPUT_CLS}>
        <option value="airbnb">Airbnb</option>
        <option value="booking">Booking.com</option>
        <option value="vrbo">VRBO</option>
        <option value="altro">Altro</option>
      </select>
      <input value={form.ical_url} onChange={(e) => setForm({ ...form, ical_url: e.target.value })}
             placeholder="URL iCal (.ics)" required type="url" className={INPUT_CLS} />
      <div className="flex gap-2">
        <button type="submit" disabled={saving}
                className="rounded-lg bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/30 px-3 py-1.5 text-sm text-emerald-200 disabled:opacity-50">
          {saving ? 'Salvo…' : 'Salva'}
        </button>
        <button type="button" onClick={onCancel}
                className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-sm text-white/60">
          Annulla
        </button>
      </div>
    </form>
  )
}

// ─────────────────────────────────── ApartmentCard (Type A + Type B) ──
function ApartmentCard({ property, calendars, propertyRooms, onRefresh, session }) {
  const isMultiRoom = propertyRooms.length > 0

  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(property)
  const [renameSaving, setRenameSaving] = useState(false)

  // Type A state
  const [addingLink, setAddingLink] = useState(false)
  const [linkSaving, setLinkSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Type B state
  const [addingRoom, setAddingRoom] = useState(false)
  const [newRoom, setNewRoom] = useState({ name: '', ical_url: '' })
  const [roomSaving, setRoomSaving] = useState(false)

  const rename = async (e) => {
    e.preventDefault()
    if (!name.trim() || name === property) { setEditingName(false); return }
    setRenameSaving(true)
    await supabase.from('calendars').update({ property: name.trim() }).eq('property', property)
    await supabase.from('bookings').update({ property: name.trim() }).eq('property', property)
    await supabase.from('rooms').update({ property: name.trim() }).eq('property', property)
    setRenameSaving(false); setEditingName(false); onRefresh()
  }

  const deleteApartment = async () => {
    // delete room calendars, then rooms, then apartment-level calendars
    for (const room of propertyRooms) {
      await supabase.from('calendars').delete().eq('room_id', room.id)
      await supabase.from('rooms').delete().eq('id', room.id)
    }
    await supabase.from('calendars').delete().eq('property', property)
    onRefresh()
  }

  // Type A operations
  const addLink = async (form) => {
    setLinkSaving(true)
    await supabase.from('calendars').insert([{ ...form, property, name: form.source, user_id: session?.user?.id }])
    await supabase.from('calendars').delete().eq('property', property).eq('ical_url', 'https://placeholder')
    setLinkSaving(false); setAddingLink(false); onRefresh()
  }
  const updateLink = async (id, form) => {
    setLinkSaving(true)
    await supabase.from('calendars').update({ source: form.source, ical_url: form.ical_url, name: form.source }).eq('id', id)
    setLinkSaving(false); setEditingId(null); onRefresh()
  }
  const deleteLink = async (id) => {
    await supabase.from('calendars').delete().eq('id', id)
    onRefresh()
  }

  // Type B operations
  const addRoom = async (e) => {
    e.preventDefault()
    if (!newRoom.name.trim()) return
    setRoomSaving(true)
    const { data: room } = await supabase.from('rooms')
      .insert([{ property, name: newRoom.name.trim(), user_id: session?.user?.id }])
      .select().single()
    if (room && newRoom.ical_url) {
      await supabase.from('calendars').insert([{
        name: 'booking', source: 'booking', ical_url: newRoom.ical_url,
        property, user_id: session?.user?.id, room_id: room.id,
      }])
    }
    setRoomSaving(false); setAddingRoom(false); setNewRoom({ name: '', ical_url: '' }); onRefresh()
  }
  const deleteRoom = async (roomId) => {
    await supabase.from('calendars').delete().eq('room_id', roomId)
    await supabase.from('rooms').delete().eq('id', roomId)
    onRefresh()
  }
  const updateRoomLink = async (roomId, ical_url) => {
    const existing = calendars.find((c) => c.room_id === roomId)
    if (existing) {
      await supabase.from('calendars').update({ ical_url }).eq('id', existing.id)
    } else {
      await supabase.from('calendars').insert([{
        name: 'booking', source: 'booking', ical_url,
        property, user_id: session?.user?.id, room_id: roomId,
      }])
    }
    onRefresh()
  }

  // Derived
  const aptLevelCals = calendars.filter((c) => !c.room_id && c.ical_url !== 'https://placeholder')
  const airbnbCal = aptLevelCals.find((c) => c.source === 'airbnb')

  const cardHeader = (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
      {editingName ? (
        <form onSubmit={rename} className="flex-1 flex items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
                 className="flex-1 rounded-lg bg-white/5 border border-emerald-400/50 px-3 py-1.5 text-sm text-white focus:outline-none" />
          <button type="submit" disabled={renameSaving}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-sm disabled:opacity-50">
            {renameSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={() => { setEditingName(false); setName(property) }}
                  className="p-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </form>
      ) : (
        <>
          <Building2 className="h-4 w-4 text-white/40 shrink-0" />
          <span className="flex-1 text-white font-medium truncate">{property}</span>
          {isMultiRoom && <span className="text-[10px] text-white/30 border border-white/10 rounded px-1.5 py-0.5">multi-stanza</span>}
          <button onClick={() => { setEditingName(true); setName(property) }}
                  className="p-1.5 text-white/30 hover:text-white/70 rounded-md hover:bg-white/5 transition" title="Rinomina">
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z"/>
            </svg>
          </button>
          <button onClick={deleteApartment}
                  className="p-1.5 text-white/30 hover:text-red-400 rounded-md hover:bg-red-400/10 transition" title="Elimina appartamento">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  )

  if (isMultiRoom) {
    // ── Type B: airbnb at apartment level + rooms ──
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden">
        {cardHeader}

        {/* Airbnb section */}
        <div className="px-4 pt-3 pb-1">
          <div className="text-[10px] uppercase tracking-wider text-white/35 mb-2">Airbnb — Unità intera</div>
          {airbnbCal ? (
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <SourceBadge source="airbnb" />
                  {airbnbCal.last_sync && (
                    <span className="text-[10px] text-white/30">
                      sync {new Date(airbnbCal.last_sync).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/35 truncate font-mono">{airbnbCal.ical_url}</div>
              </div>
              <button onClick={() => deleteLink(airbnbCal.id)}
                      className="p-1.5 text-white/30 hover:text-red-400 rounded-md hover:bg-red-400/10 transition">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            editingId === 'airbnb-apt' ? (
              <div className="mb-2">
                <ICalLinkForm
                  initial={{ source: 'airbnb', ical_url: '' }}
                  onSave={async (form) => {
                    setLinkSaving(true)
                    await supabase.from('calendars').insert([{ ...form, property, name: 'airbnb', user_id: session?.user?.id }])
                    setLinkSaving(false); setEditingId(null); onRefresh()
                  }}
                  onCancel={() => setEditingId(null)}
                  saving={linkSaving}
                />
              </div>
            ) : (
              <button onClick={() => setEditingId('airbnb-apt')}
                      className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 mb-2 transition">
                <Plus className="h-3.5 w-3.5" />Aggiungi link Airbnb
              </button>
            )
          )}
        </div>

        {/* Rooms section */}
        <div className="px-4 pt-2 pb-3 border-t border-white/5">
          <div className="text-[10px] uppercase tracking-wider text-white/35 mb-2">Stanze</div>
          <div className="space-y-2">
            {propertyRooms.map((room) => {
              const roomCal = calendars.find((c) => c.room_id === room.id)
              return (
                <div key={room.id} className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-white/80 font-medium flex-1">{room.name}</span>
                    <button onClick={() => deleteRoom(room.id)}
                            className="p-1 text-white/25 hover:text-red-400 rounded hover:bg-red-400/10 transition">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  {editingId === `room-${room.id}` ? (
                    <ICalLinkForm
                      initial={{ source: 'booking', ical_url: roomCal?.ical_url || '' }}
                      onSave={async (form) => {
                        setLinkSaving(true)
                        await updateRoomLink(room.id, form.ical_url)
                        setLinkSaving(false); setEditingId(null)
                      }}
                      onCancel={() => setEditingId(null)}
                      saving={linkSaving}
                    />
                  ) : roomCal ? (
                    <div className="flex items-center gap-2">
                      <SourceBadge source={roomCal.source} />
                      <span className="text-[10px] text-white/30 font-mono truncate flex-1">{roomCal.ical_url}</span>
                      <button onClick={() => setEditingId(`room-${room.id}`)}
                              className="p-1 text-white/30 hover:text-white/70 rounded hover:bg-white/5 transition">
                        <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z"/>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingId(`room-${room.id}`)}
                            className="flex items-center gap-1.5 text-[11px] text-white/35 hover:text-white/60 transition">
                      <Plus className="h-3 w-3" />Aggiungi link Booking.com
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {addingRoom ? (
            <form onSubmit={addRoom} className="mt-2 space-y-2 p-3 rounded-xl bg-white/[0.04] border border-white/10">
              <input value={newRoom.name} onChange={(e) => setNewRoom((r) => ({ ...r, name: e.target.value }))}
                     placeholder="Nome stanza" required className={INPUT_CLS} autoFocus />
              <input value={newRoom.ical_url} onChange={(e) => setNewRoom((r) => ({ ...r, ical_url: e.target.value }))}
                     placeholder="URL iCal Booking.com (opzionale)" type="url" className={INPUT_CLS} />
              <div className="flex gap-2">
                <button type="submit" disabled={roomSaving}
                        className="rounded-lg bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/30 px-3 py-1.5 text-sm text-emerald-200 disabled:opacity-50">
                  {roomSaving ? 'Salvo…' : 'Aggiungi'}
                </button>
                <button type="button" onClick={() => { setAddingRoom(false); setNewRoom({ name: '', ical_url: '' }) }}
                        className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-sm text-white/60">
                  Annulla
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setAddingRoom(true)}
                    className="mt-2 flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition">
              <Plus className="h-3.5 w-3.5" />Aggiungi stanza
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Type A: flat list of iCal links ──
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden">
      {cardHeader}
      <div className="divide-y divide-white/5">
        {aptLevelCals.map((cal) => (
          <div key={cal.id} className="px-4 py-3">
            {editingId === cal.id ? (
              <ICalLinkForm
                initial={{ source: cal.source, ical_url: cal.ical_url }}
                onSave={(form) => updateLink(cal.id, form)}
                onCancel={() => setEditingId(null)}
                saving={linkSaving}
              />
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <SourceBadge source={cal.source} />
                    {cal.last_sync && (
                      <span className="text-[10px] text-white/30">
                        sync {new Date(cal.last_sync).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/35 truncate font-mono">{cal.ical_url}</div>
                </div>
                <button onClick={() => setEditingId(cal.id)}
                        className="p-1.5 text-white/30 hover:text-white/70 rounded-md hover:bg-white/5 transition" title="Modifica">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z"/>
                  </svg>
                </button>
                <button onClick={() => deleteLink(cal.id)}
                        className="p-1.5 text-white/30 hover:text-red-400 rounded-md hover:bg-red-400/10 transition" title="Rimuovi">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {addingLink ? (
          <div className="px-4 py-3">
            <ICalLinkForm
              onSave={addLink}
              onCancel={() => setAddingLink(false)}
              saving={linkSaving}
            />
          </div>
        ) : (
          <button onClick={() => setAddingLink(true)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.03] transition">
            <Plus className="h-3.5 w-3.5" />Aggiungi link iCal
          </button>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────── ApartmentsView ──
const EMPTY_ROOM = { name: '', ical_url: '' }

function ApartmentsView({ onSyncDone, onBack, session }) {
  const [calendars, setCalendars] = useState(null)
  const [rooms, setRooms] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [addingApt, setAddingApt] = useState(false)
  const [aptSaving, setAptSaving] = useState(false)

  // creation form state
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('single') // 'single' | 'multi'
  const [newAirbnbUrl, setNewAirbnbUrl] = useState('')
  const [newBookingUrl, setNewBookingUrl] = useState('')
  const [newRooms, setNewRooms] = useState([EMPTY_ROOM])

  const load = async () => {
    const [{ data: cals }, { data: rms }] = await Promise.all([
      supabase.from('calendars').select('*').order('property'),
      supabase.from('rooms').select('*').order('property'),
    ])
    setCalendars(cals || [])
    setRooms(rms || [])
  }

  useEffect(() => { load() }, [])

  const apartments = useMemo(() => {
    if (!calendars) return null
    const map = new Map()
    for (const cal of calendars) {
      if (!map.has(cal.property)) map.set(cal.property, [])
      map.get(cal.property).push(cal)
    }
    return [...map.entries()]
      .map(([property, cals]) => ({
        property,
        calendars: cals,
        propertyRooms: rooms.filter((r) => r.property === property),
      }))
      .sort((a, b) => a.property.localeCompare(b.property))
  }, [calendars, rooms])

  const resetForm = () => {
    setNewName(''); setNewType('single'); setNewAirbnbUrl(''); setNewBookingUrl('')
    setNewRooms([EMPTY_ROOM]); setAddingApt(false)
  }

  const createApartment = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setAptSaving(true)
    const uid = session?.user?.id
    const property = newName.trim()

    if (newType === 'single') {
      const links = []
      if (newAirbnbUrl) links.push({ name: 'airbnb', source: 'airbnb', ical_url: newAirbnbUrl, property, user_id: uid })
      if (newBookingUrl) links.push({ name: 'booking', source: 'booking', ical_url: newBookingUrl, property, user_id: uid })
      if (links.length > 0) {
        await supabase.from('calendars').insert(links)
      } else {
        await supabase.from('calendars').insert([{ name: 'placeholder', source: 'airbnb', ical_url: 'https://placeholder', property, user_id: uid }])
      }
    } else {
      // Type B: airbnb at apartment level + rooms
      if (newAirbnbUrl) {
        await supabase.from('calendars').insert([{ name: 'airbnb', source: 'airbnb', ical_url: newAirbnbUrl, property, user_id: uid }])
      } else {
        await supabase.from('calendars').insert([{ name: 'placeholder', source: 'airbnb', ical_url: 'https://placeholder', property, user_id: uid }])
      }
      for (const room of newRooms.filter((r) => r.name.trim())) {
        const { data: roomData } = await supabase.from('rooms')
          .insert([{ property, name: room.name.trim(), user_id: uid }])
          .select().single()
        if (roomData && room.ical_url) {
          await supabase.from('calendars').insert([{
            name: 'booking', source: 'booking', ical_url: room.ical_url,
            property, user_id: uid, room_id: roomData.id,
          }])
        }
      }
    }

    setAptSaving(false); resetForm(); load()
  }

  const syncAll = async () => {
    setSyncing(true); setSyncResult(null)
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-ical`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${s?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )
      const data = await res.json()
      if (!res.ok) setSyncResult({ error: JSON.stringify(data) })
      else { setSyncResult(data); onSyncDone() }
    } catch (ex) {
      setSyncResult({ error: ex.message })
    }
    setSyncing(false)
  }

  return (
    <div className="space-y-5">
      {/* page header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
                className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition">
          <ChevronLeft className="h-4 w-4" />Calendario
        </button>
        <span className="text-white/20">/</span>
        <span className="text-white/85 font-medium">Appartamenti</span>
        <div className="flex-1" />
        <button onClick={syncAll} disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-sm disabled:opacity-50 transition">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {syncing ? 'Sync…' : 'Sincronizza tutto'}
        </button>
        <button onClick={() => setAddingApt((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/30 px-3 py-1.5 text-sm text-emerald-200 transition">
          <Plus className="h-4 w-4" />Appartamento
        </button>
      </div>

      {syncResult && (
        <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${
          syncResult.error
            ? 'border-red-500/30 bg-red-500/10 text-red-200'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
        }`}>
          {syncResult.error
            ? <><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{syncResult.error}</>
            : <><Check className="h-4 w-4 mt-0.5 shrink-0" />Sincronizzate {syncResult.synced} prenotazioni</>}
        </div>
      )}

      {/* creation form */}
      {addingApt && (
        <form onSubmit={createApartment} className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 space-y-4">
          <div className="text-sm font-medium text-white/80">Nuovo appartamento</div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">Nome</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
                   placeholder="es. Via Roma 12" required className={INPUT_CLS} autoFocus />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-2">Tipo</label>
            <div className="flex gap-3">
              {[['single', 'Unità singola'], ['multi', 'Multi-stanza']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setNewType(val)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                          newType === val
                            ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                            : 'border-white/10 bg-white/5 text-white/55 hover:text-white/80'
                        }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {newType === 'single' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">URL iCal Airbnb <span className="text-white/25">(opzionale)</span></label>
                <input value={newAirbnbUrl} onChange={(e) => setNewAirbnbUrl(e.target.value)}
                       placeholder="https://..." type="url" className={INPUT_CLS} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">URL iCal Booking.com <span className="text-white/25">(opzionale)</span></label>
                <input value={newBookingUrl} onChange={(e) => setNewBookingUrl(e.target.value)}
                       placeholder="https://..." type="url" className={INPUT_CLS} />
              </div>
            </div>
          )}

          {newType === 'multi' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">URL iCal Airbnb — unità intera <span className="text-white/25">(opzionale)</span></label>
                <input value={newAirbnbUrl} onChange={(e) => setNewAirbnbUrl(e.target.value)}
                       placeholder="https://..." type="url" className={INPUT_CLS} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-2">Stanze</label>
                <div className="space-y-2">
                  {newRooms.map((room, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1">
                        <input value={room.name} onChange={(e) => setNewRooms((rs) => rs.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))}
                               placeholder="Nome stanza" className={INPUT_CLS} />
                        <input value={room.ical_url} onChange={(e) => setNewRooms((rs) => rs.map((r, i) => i === idx ? { ...r, ical_url: e.target.value } : r))}
                               placeholder="URL iCal Booking.com (opzionale)" type="url" className={INPUT_CLS} />
                      </div>
                      {newRooms.length > 1 && (
                        <button type="button" onClick={() => setNewRooms((rs) => rs.filter((_, i) => i !== idx))}
                                className="mt-2 p-1.5 text-white/30 hover:text-red-400 rounded hover:bg-red-400/10 transition">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setNewRooms((rs) => [...rs, EMPTY_ROOM])}
                          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition">
                    <Plus className="h-3.5 w-3.5" />Aggiungi stanza
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={aptSaving}
                    className="rounded-lg bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/30 px-4 py-2 text-sm text-emerald-200 disabled:opacity-50">
              {aptSaving ? 'Salvo…' : 'Crea appartamento'}
            </button>
            <button type="button" onClick={resetForm}
                    className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm text-white/60">
              Annulla
            </button>
          </div>
        </form>
      )}

      {/* apartments list */}
      {apartments === null && (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      )}
      {apartments !== null && apartments.length === 0 && !addingApt && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] text-white/30 text-sm py-12 text-center">
          Nessun appartamento. Clicca "+ Appartamento" per iniziare.
        </div>
      )}
      {apartments !== null && apartments.map(({ property, calendars: cals, propertyRooms }) => (
        <ApartmentCard
          key={property}
          property={property}
          calendars={cals}
          propertyRooms={propertyRooms}
          onRefresh={load}
          session={session}
        />
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────── dashboard ──
function Dashboard({ session, onSignOut }) {
  const [mainView, setMainView] = useState('calendar') // 'calendar' | 'calendars'
  const [view, setView] = useState('day')
  const [anchor, setAnchor] = useState(new Date())
  const [bookings, setBookings] = useState(null)
  const [error, setError] = useState(null)
  const [activeProp, setActiveProp] = useState(null)
  const [picked, setPicked] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [showMirrorBlocks, setShowMirrorBlocks] = useState(false)

  useEffect(() => {
    let alive = true
    setBookings(null); setError(null)
    ;(async () => {
      const { data, error } = await supabase
        .from('bookings').select('*').order('checkin', { ascending: true })
      if (!alive) return
      if (error) setError(error.message)
      else setBookings(data || [])
    })()
    return () => { alive = false }
  }, [reloadKey])

  const properties = useMemo(() => {
    if (!bookings) return []
    const map = new Map()
    bookings
      .filter((b) => !b.is_mirror_block)
      .forEach((b) => map.set(b.property, (map.get(b.property) || 0) + 1))
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [bookings])

  const lastSync = useMemo(() => {
    if (!bookings || !bookings.length) return null
    return bookings.reduce((acc, b) => (b.last_sync && (!acc || b.last_sync > acc) ? b.last_sync : acc), null)
  }, [bookings])

  const filtered = useMemo(() => {
    if (!bookings) return []
    let result = activeProp ? bookings.filter((b) => b.property === activeProp) : bookings
    if (!showMirrorBlocks) result = result.filter((b) => !b.is_mirror_block)
    return result
  }, [bookings, activeProp, showMirrorBlocks])

  const goPrev = () => setAnchor((d) => view === 'month' ? new Date(d.getFullYear(), d.getMonth() - 1, 1)
                                   : view === 'week' ? addDays(d, -7) : addDays(d, -1))
  const goNext = () => setAnchor((d) => view === 'month' ? new Date(d.getFullYear(), d.getMonth() + 1, 1)
                                   : view === 'week' ? addDays(d, 7) : addDays(d, 1))
  const goToday = () => setAnchor(new Date())

  const headerTitle = useMemo(() => {
    if (view === 'day') return dayLabel(anchor)
    if (view === 'week') {
      const s = startOfWeek(anchor); const e = addDays(s, 6)
      return `${s.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} – ${e.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}`
    }
    return monthLabel(anchor)
  }, [view, anchor])

  return (
    <div className="min-h-screen text-white" style={{ background: '#0f1117' }}>
      <div className="fixed inset-0 pointer-events-none opacity-50"
           style={{ background: 'radial-gradient(900px 500px at 10% -5%, rgba(59,130,246,0.10), transparent), radial-gradient(700px 400px at 100% 100%, rgba(16,185,129,0.08), transparent)' }} />

      {/* header */}
      <header className="relative z-10 border-b border-white/10 bg-white/[0.02] backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] px-5 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500 grid place-items-center">
              <Moon className="h-3.5 w-3.5 text-slate-900" />
            </div>
            <div className="font-semibold tracking-tight">StayOps</div>
            <div className="text-white/30 text-xs hidden sm:block">· Calendar</div>
          </div>

          <div className="flex-1 flex justify-center items-center gap-3">
            {mainView === 'calendar' && <ViewSwitcher view={view} setView={setView} />}
            <button onClick={() => setMainView((v) => v === 'calendars' ? 'calendar' : 'calendars')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm transition ${
                      mainView === 'calendars'
                        ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                        : 'border-white/10 bg-white/[0.04] text-white/55 hover:text-white/85'
                    }`}>
              <Building2 className="h-4 w-4" />Appartamenti
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-white/45">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Sync: {lastSync ? new Date(lastSync).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
            </div>
            <button onClick={() => setReloadKey((k) => k + 1)} title="Ricarica"
                    className="p-1.5 rounded-md text-white/55 hover:text-white hover:bg-white/5"><RefreshCw className="h-4 w-4" /></button>
            <div className="hidden md:block text-xs text-white/55 truncate max-w-[180px]">{session?.user?.email}</div>
            <button onClick={onSignOut}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-sm">
              <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Esci</span>
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-[1400px] px-5 py-5 grid grid-cols-12 gap-5">

        {mainView === 'calendars' && (
          <div className="col-span-12 max-w-2xl mx-auto w-full">
            <ApartmentsView
              onSyncDone={() => setReloadKey((k) => k + 1)}
              onBack={() => setMainView('calendar')}
              session={session}
            />
          </div>
        )}

        {/* sidebar */}
        {mainView === 'calendar' && <aside className="col-span-12 md:col-span-3 lg:col-span-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-white/55" />
              <span className="text-white/85 font-medium">Proprietà</span>
              {activeProp && (
                <button onClick={() => setActiveProp(null)} className="ml-auto text-[10px] uppercase tracking-wider text-white/45 hover:text-white">reset</button>
              )}
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {bookings === null && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 mb-1" />)}
              {bookings !== null && properties.length === 0 && <div className="text-white/30 text-sm px-2 py-6 text-center">Nessuna proprietà</div>}
              {properties.map(([p, count]) => (
                <button key={p} onClick={() => setActiveProp(activeProp === p ? null : p)}
                        className={`w-full text-left rounded-lg px-3 py-2 mb-0.5 text-sm flex items-center justify-between transition ${
                          activeProp === p ? 'bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/30' : 'text-white/75 hover:bg-white/5'
                        }`}>
                  <span className="truncate">{p}</span>
                  <span className="text-[10px] tabular-nums text-white/40">{count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Legenda</div>
            <div className="space-y-1.5">
              <KindBadge kind="checkin" />
              <KindBadge kind="checkout" />
              <KindBadge kind="stay" />
            </div>
            <div className="mt-3 pt-3 border-t border-white/8">
              <button
                onClick={() => setShowMirrorBlocks((v) => !v)}
                className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 w-full transition ${
                  showMirrorBlocks ? 'text-white/70 bg-white/5' : 'text-white/35 hover:text-white/55 hover:bg-white/[0.03]'
                }`}
              >
                <span className={`h-2 w-2 rounded-full border ${showMirrorBlocks ? 'bg-white/60 border-white/60' : 'border-white/30'}`} />
                Mirror blocks {showMirrorBlocks ? 'visibili' : 'nascosti'}
              </button>
            </div>
          </div>
        </aside>}

        {/* main */}
        {mainView === 'calendar' && <main className="col-span-12 md:col-span-9 lg:col-span-9">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={goPrev} className="p-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={goToday} className="px-3 py-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-sm">Oggi</button>
              <button onClick={goNext} className="p-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
              <div className="ml-3 text-white/85 capitalize">{headerTitle}</div>
            </div>
            {activeProp && (
              <div className="inline-flex items-center gap-1.5 text-xs rounded-md bg-emerald-400/10 ring-1 ring-emerald-400/30 text-emerald-200 px-2 py-1">
                <Filter className="h-3 w-3" /> {activeProp}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-start gap-2 mb-4">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Errore di connessione</div>
                <div className="text-red-200/80">{error}</div>
              </div>
            </div>
          )}

          {bookings === null && !error && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Skeleton className="h-4 w-24 mb-3" />
                  <Skeleton className="h-12 w-full mb-2" />
                  <Skeleton className="h-12 w-full mb-2" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          )}

          {bookings && !error && (
            <>
              {view === 'day' && <DayView bookings={filtered} date={anchor} onPick={setPicked} />}
              {view === 'week' && <WeekView bookings={filtered} anchor={anchor} onPick={setPicked} />}
              {view === 'month' && <MonthView bookings={filtered} anchor={anchor} onPick={setPicked} />}
            </>
          )}
        </main>}
      </div>

      <BookingPanel booking={picked} onClose={() => setPicked(null)} />
    </div>
  )
}

// ───────────────────────────────────────────────────────────────── root ──
export default function StayOpsCalendar() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center" style={{ background: '#0f1117' }}>
        <Loader2 className="h-6 w-6 text-white/50 animate-spin" />
      </div>
    )
  }

  if (!session) return <LoginScreen onSignedIn={() => { /* onAuthStateChange will set session */ }} />
  return <Dashboard session={session} onSignOut={() => supabase.auth.signOut()} />
}
