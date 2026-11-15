// Shared formatting for data age (P11). One 30 s clock for every panel instead
// of a timer per widget.
import { shallowRef } from 'vue'

export const nowMinute = shallowRef(Date.now())
setInterval(() => { nowMinute.value = Date.now() }, 30_000)

// "just now", "4m", "2h", "3d". Reads nowMinute so callers re-render on tick.
export function ago (ts: number | null | undefined): string {
  if (!ts) return ''
  const s = Math.max(0, (nowMinute.value - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

// For a sentence: "just now", "4m ago". (`ago` + " ago" read "just now ago".)
export function agoPhrase (ts: number | null | undefined): string {
  const a = ago(ts)
  return !a || a === 'just now' ? a : `${a} ago`
}

export type Freshness = 'fresh' | 'aging' | 'stale'

// fresh under `freshMin` minutes, stale past `staleMin`.
export function freshness (ts: number | null | undefined, freshMin = 15, staleMin = 120): Freshness {
  if (!ts) return 'stale'
  const m = (nowMinute.value - ts) / 60_000
  return m < freshMin ? 'fresh' : m < staleMin ? 'aging' : 'stale'
}

// ---- prices ----

// One rounding for every price on screen: 1 decimal under 10, whole above,
// and under 0.1 the first digit that isn't zero, so it never reads as 0 or 0.1.
export function formatAmount (v: number): string {
  const abs = Math.abs(v)
  if (abs >= 10) return Math.round(v).toString()
  if (abs > 0 && abs < 0.1) return (+v.toPrecision(1)).toString()
  return (+v.toFixed(1)).toString()
}

// "45 c" or "1.5 div": divines once it's worth at least one (or when `unit`
// says so, e.g. so every point on a chart uses the same unit).
export function formatChaos (chaos: number, divine: number | null | undefined, unit: 'auto' | 'chaos' | 'div' = 'auto'): string {
  const useDiv = !!divine && unit !== 'chaos' && (unit === 'div' || Math.abs(chaos) >= divine)
  return useDiv ? `${formatAmount(chaos / divine!)} div` : `${formatAmount(chaos)} c`
}

// Bulk items worth under 1c (lifeforce, low currency) read better as how many
// a divine buys than as "0.009c". Returns that count, rounded so it reads at a
// glance (whole under 100, two significant figures above: 12,345 -> 12,000),
// or null when the price isn't under 1c or there's no divine rate.
export function bulkPerDivine (chaos: number | null | undefined, divine: number | null | undefined): number | null {
  if (chaos == null || !divine || !(chaos > 0) || chaos >= 1 || !(divine > 0)) return null
  const n = divine / chaos
  if (!Number.isFinite(n)) return null
  if (n < 100) return Math.round(n)
  const step = 10 ** (Math.floor(Math.log10(n)) - 1)
  return Math.round(n / step) * step
}

// "1 div / 12,000" for a bulk price (see bulkPerDivine), else formatChaos.
export function formatUnitPrice (chaos: number, divine: number | null | undefined): string {
  const n = bulkPerDivine(chaos, divine)
  return n != null ? `1 div / ${n.toLocaleString('en-US')}` : formatChaos(chaos, divine)
}

// ---- time ----

// "4:05", or "1:04:05" past an hour (always with hours when `hours` is set).
export function formatClock (ms: number, hours = false): string {
  const s = Math.floor(Math.max(0, ms) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h || hours ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

// "45m" or "2h 05m".
export function formatDuration (ms: number): string {
  const m = Math.round(Math.max(0, ms) / 60_000)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}
