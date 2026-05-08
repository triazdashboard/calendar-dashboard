// StayOpsCalendar.jsx
// Single-file React dashboard. Stack: React + Tailwind + lucide-react + @supabase/supabase-js.
// Run with Vite. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Calendar, CalendarDays, CalendarRange, Clock,
  ChevronLeft, ChevronRight, LogOut, Building2,
  RefreshCw, X, AlertCircle, Loader2, Moon, Filter,
  Link, Plus, Trash2, Check,
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
  const k = KIND[kind]; if (!k) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-md ring-1 ${k.ring} ${k.bg} ${k.text} ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${k.dot}`} />{k.label}
    </span>
  )
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-white/5 ${className}`} />
}

// ─────────────────────────────────────────────────────────────── modal ──
function BookingModal({ booking, onClose }) {
  if (!booking) return null
  const inDate = parseYmd(booking.checkin)
  const outDate = parseYmd(booking.checkout)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#161922]/95 backdrop-blur-xl shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1"><SourceBadge source={booking.source} /></div>
            <div className="text-white font-semibold">{booking.summary || booking.uid}</div>
            <div className="text-white/50 text-sm">{booking.property}</div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1 rounded-md hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4 text-sm">
          <Field label="Check-in" value={inDate.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} accent="text-emerald-300" />
          <Field label="Check-out" value={outDate.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} accent="text-amber-300" />
          <Field label="Notti" value={booking.nights} />
          <Field label="UID" value={booking.uid} mono />
          <Field label="Ultima sync" value={booking.last_sync ? new Date(booking.last_sync).toLocaleString('it-IT') : '—'} className="col-span-2" />
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
// Canonical hours for time-less bookings: check-out in the morning, check-in
// in the afternoon. Slight per-source offset adds a little visual rhythm so
// stacked events don't all collapse onto one row.
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
      {/* date + counts */}
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

      {/* stays — all-day banner */}
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
                        className="text-left rounded-lg ring-1 ring-blue-400/30 bg-blue-500/10 hover:bg-blue-500/15 px-3 py-2 transition">
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

      {/* hourly timeline */}
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
                                className={`text-left rounded-lg ${k.bg} ring-1 ${k.ring} px-3 py-2 hover:brightness-125 transition min-w-[220px]`}>
                          <div className="flex items-center gap-1.5">
                            <KindBadge kind={kind} compact />
                            <SourceBadge source={b.source} />
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
                          className={`w-full text-left rounded-md ring-1 ${k.ring} ${k.bg} px-2 py-1.5 hover:brightness-125 transition`}>
                    <div className="flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${k.dot}`} />
                      <span className={`text-[10px] uppercase tracking-wider ${k.text}`}>{k.label}</span>
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
                            className={`w-full text-left rounded-sm px-1.5 py-0.5 ${k.bg} ring-1 ${k.ring} ${k.text} text-[10px] truncate hover:brightness-125`}
                            title={`${KIND[kind].label} · ${b.summary || b.uid}`}>
                      <span className={`inline-block h-1 w-1 rounded-full ${k.dot} mr-1 align-middle`} />
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

function ApartmentCard({ property, calendars, onRefresh }) {
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(property)
  const [renameSaving, setRenameSaving] = useState(false)
  const [addingLink, setAddingLink] = useState(false)
  const [linkSaving, setLinkSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const rename = async (e) => {
    e.preventDefault()
    if (!name.trim() || name === property) { setEditingName(false); return }
    setRenameSaving(true)
    await supabase.from('calendars').update({ property: name.trim() }).eq('property', property)
    await supabase.from('bookings').update({ property: name.trim() }).eq('property', property)
    setRenameSaving(false); setEditingName(false); onRefresh()
  }

  const addLink = async (form) => {
    setLinkSaving(true)
    await supabase.from('calendars').insert([{ ...form, property, name: form.source }])
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

  const deleteApartment = async () => {
    await supabase.from('calendars').delete().eq('property', property)
    onRefresh()
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden">
      {/* apartment header */}
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

      {/* iCal links */}
      <div className="divide-y divide-white/5">
        {calendars.map((cal) => (
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

function ApartmentsView({ onSyncDone, onBack }) {
  const [calendars, setCalendars] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [addingApt, setAddingApt] = useState(false)
  const [newAptName, setNewAptName] = useState('')
  const [aptSaving, setAptSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('calendars').select('*').order('property')
    setCalendars(data || [])
  }

  useEffect(() => { load() }, [])

  const apartments = useMemo(() => {
    if (!calendars) return null
    const map = new Map()
    for (const cal of calendars) {
      if (!map.has(cal.property)) map.set(cal.property, [])
      map.get(cal.property).push(cal)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [calendars])

  const createApartment = async (e) => {
    e.preventDefault()
    if (!newAptName.trim()) return
    setAptSaving(true)
    await supabase.from('calendars').insert([{ name: 'placeholder', property: newAptName.trim(), source: 'airbnb', ical_url: 'https://placeholder' }])
    await supabase.from('calendars').delete().eq('property', newAptName.trim()).eq('ical_url', 'https://placeholder')
    setAptSaving(false); setNewAptName(''); setAddingApt(false); load()
  }

  const syncAll = async () => {
    setSyncing(true); setSyncResult(null)
    try {
      const res = await supabase.functions.invoke('sync-ical')
      setSyncResult(res.data)
      onSyncDone()
    } catch (e) {
      setSyncResult({ error: e.message })
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

      {addingApt && (
        <form onSubmit={createApartment}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <Building2 className="h-4 w-4 text-white/40 shrink-0" />
          <input value={newAptName} onChange={(e) => setNewAptName(e.target.value)}
                 placeholder="Nome appartamento" required autoFocus
                 className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none" />
          <button type="submit" disabled={aptSaving}
                  className="rounded-lg bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/30 px-3 py-1.5 text-sm text-emerald-200 disabled:opacity-50">
            {aptSaving ? 'Creo…' : 'Crea'}
          </button>
          <button type="button" onClick={() => { setAddingApt(false); setNewAptName('') }}
                  className="p-1.5 text-white/40 hover:text-white rounded-md hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </form>
      )}

      {calendars === null && <Skeleton className="h-32 w-full rounded-2xl" />}

      {apartments !== null && apartments.length === 0 && !addingApt && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center">
          <Building2 className="h-8 w-8 mx-auto mb-3 text-white/20" />
          <div className="text-white/40 text-sm">Nessun appartamento configurato</div>
          <button onClick={() => setAddingApt(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/30 px-4 py-2 text-sm text-emerald-200 transition">
            <Plus className="h-4 w-4" />Aggiungi il primo appartamento
          </button>
        </div>
      )}

      {(apartments || []).map(([property, cals]) => (
        <ApartmentCard key={property} property={property} calendars={cals} onRefresh={load} />
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────── dashboard ──
function Dashboard({ session, onSignOut }) {
  const [mainView, setMainView] = useState('calendar') // 'calendar' | 'calendars'
  const [view, setView] = useState('day')
  const [anchor, setAnchor] = useState(new Date()) // ref date for day/week/month
  const [bookings, setBookings] = useState(null)   // null = loading
  const [error, setError] = useState(null)
  const [activeProp, setActiveProp] = useState(null) // null = all
  const [picked, setPicked] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

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
    bookings.forEach((b) => map.set(b.property, (map.get(b.property) || 0) + 1))
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [bookings])

  const lastSync = useMemo(() => {
    if (!bookings || !bookings.length) return null
    return bookings.reduce((acc, b) => (b.last_sync && (!acc || b.last_sync > acc) ? b.last_sync : acc), null)
  }, [bookings])

  const filtered = useMemo(() => {
    if (!bookings) return []
    return activeProp ? bookings.filter((b) => b.property === activeProp) : bookings
  }, [bookings, activeProp])

  // navigation helpers
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
      {/* ambient glows */}
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

        {/* apartments view (full width) */}
        {mainView === 'calendars' && (
          <div className="col-span-12 max-w-2xl mx-auto w-full">
            <ApartmentsView
              onSyncDone={() => setReloadKey((k) => k + 1)}
              onBack={() => setMainView('calendar')}
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

      <BookingModal booking={picked} onClose={() => setPicked(null)} />
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
