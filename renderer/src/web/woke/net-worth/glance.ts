// The number drawn on the dock's net worth icon: the change since the refresh
// before, or the total (the mouse wheel swaps them). One small saved doc per
// league, so the icon shows it at startup without loading the window's store.
// Pure: no Vue, no requests.
import { formatAmount } from '../ui/format'
import type { LedgerPoint } from './ledger'

export interface Glance {
  league: string
  // When the stash was read, and its value then (chaos).
  at: number
  chaos: number
  // Items in minus items out since the read before (the window's "Since last
  // refresh"), or null when there was nothing to compare with.
  netChaos: number | null
  // Chaos per divine at that read.
  divine: number | null
  // The window's "per hour" and "today" at that read (chaos), for that day only.
  // Missing in glances made from chart points.
  perHourChaos?: number | null
  todayChaos?: number | null
}

export const DOCS = 'net-worth'
export const glanceKey = (league: string) => `${league}-glance`
// The window's own record (store.ts), whose last chart point stands in for a glance.
export const ledgerKey = (league: string) => `${league}-ledger`

// From the window's chart points, for a league read before glances were saved.
export function glanceFromPoints (league: string, points: LedgerPoint[] | null | undefined): Glance | null {
  const last = Array.isArray(points) ? points[points.length - 1] : null
  if (!last || !Number.isFinite(last.chaos)) return null
  return { league, at: last.at, chaos: last.chaos, netChaos: last.netChaos ?? null, divine: last.divine ?? null }
}

export function isGlance (g: unknown): g is Glance {
  if (g == null || typeof g !== 'object') return false
  const o = g as Record<string, unknown>
  return typeof o.league === 'string' && typeof o.at === 'number' && typeof o.chaos === 'number' && Number.isFinite(o.chaos)
}

// What the wheel steps through, in order. The first is the default.
export const GLANCE_SHOWS = ['change', 'total', 'perHour', 'today'] as const
export type GlanceShows = typeof GLANCE_SHOWS[number]
export const GLANCE_LABELS: Record<GlanceShows, string> = {
  change: 'Since last refresh',
  total: 'Net worth',
  perHour: 'Per hour today',
  today: 'Today'
}

export function nextShows (cur: GlanceShows | undefined, dir: 1 | -1): GlanceShows {
  const i = Math.max(0, GLANCE_SHOWS.indexOf(cur ?? 'change'))
  return GLANCE_SHOWS[(i + dir + GLANCE_SHOWS.length) % GLANCE_SHOWS.length]
}

function sameDay (a: number, b: number): boolean {
  const x = new Date(a)
  const y = new Date(b)
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
}

function chaosFor (g: Glance, shows: GlanceShows, now: number): number | null {
  switch (shows) {
    case 'total': return g.chaos
    case 'change': return g.netChaos
    // Today's numbers are from the last read: none once that day is over.
    case 'perHour': return sameDay(g.at, now) ? g.perHourChaos ?? null : null
    case 'today': return sameDay(g.at, now) ? g.todayChaos ?? null : null
  }
}

// "+1.4d", "−35c", "312d" or "+0.5d/h": divines once it's worth at least one,
// chaos below. Null when there's nothing to show (nothing to compare with, or
// a change that rounds to 0).
export function glanceText (g: Glance, shows: GlanceShows, now = Date.now()): { text: string, tone: 'up' | 'down' | null } | null {
  const chaos = chaosFor(g, shows, now)
  if (chaos == null || !Number.isFinite(chaos)) return null
  const div = g.divine != null && g.divine > 0 && Math.abs(chaos) >= g.divine ? g.divine : null
  const amount = formatAmount(Math.abs(div ? chaos / div : chaos))
  if (amount === '0') return shows === 'total' ? { text: '0c', tone: null } : null
  const unit = (div ? 'd' : 'c') + (shows === 'perHour' ? '/h' : '')
  if (shows === 'total') return { text: `${chaos < 0 ? '−' : ''}${amount}${unit}`, tone: null }
  return chaos > 0 ? { text: `+${amount}${unit}`, tone: 'up' } : { text: `−${amount}${unit}`, tone: 'down' }
}
