// Price history series for the price check chart. Pure functions.
//
// Three ranges:
// - 7 days: poe.ninja's own 7-day graph (every poe.ninja item has it)
// - League: daily prices the market tracker saved on this PC, plus today
// - My checks: this PC's log of checks of the same search (works for rares)

import type { DailyRow } from '../market/types'
import type { PriceLogEntry } from './price-log'
import { formatTimeOfDay } from '../ui/format'

export interface HistoryPoint { ts: number, chaos: number }

export type HistoryRange = 'week' | 'league' | 'mine'

export const RANGE_LABEL: Record<HistoryRange, string> = {
  week: '7 days',
  league: 'League',
  mine: 'My checks'
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * poe.ninja's graph: 7 values, % change against a week ago, today last
 * (null on days without a price). Turned into chaos with today = `chaos`.
 */
export function ninjaWeek (chaos: number, graph: Array<number | null> | undefined, now: number): HistoryPoint[] {
  if (!graph || !graph.length || !(chaos > 0)) return []
  const last = graph[graph.length - 1]
  if (typeof last !== 'number' || 1 + last / 100 <= 0) return []
  const today = 1 + last / 100
  const out: HistoryPoint[] = []
  graph.forEach((g, i) => {
    if (typeof g !== 'number') return
    const f = 1 + g / 100
    if (f <= 0) return
    out.push({ ts: now - (graph.length - 1 - i) * DAY_MS, chaos: chaos * f / today })
  })
  return out
}

export function leagueSeries (rows: DailyRow[], today: { chaos: number, ts: number } | null): HistoryPoint[] {
  const byDate = new Map<string, HistoryPoint>()
  for (const r of rows) {
    if (!(r.chaos > 0)) continue
    const prev = byDate.get(r.date)
    if (!prev || r.ts > prev.ts) byDate.set(r.date, { ts: r.ts, chaos: r.chaos })
  }
  const out = Array.from(byDate.values()).sort((a, b) => a.ts - b.ts)
  if (today && today.chaos > 0) {
    const lastDate = out.length ? new Date(out[out.length - 1].ts).toISOString().slice(0, 10) : ''
    if (lastDate === new Date(today.ts).toISOString().slice(0, 10)) out[out.length - 1] = today
    else out.push(today)
  }
  return out
}

export function mineSeries (entries: PriceLogEntry[]): HistoryPoint[] {
  return entries
    .filter(e => e.fair > 0)
    .map(e => ({ ts: e.ts, chaos: e.fair }))
    .sort((a, b) => a.ts - b.ts)
}

/** Change from the first point to the last, as a fraction (0.06 = +6%). */
export function seriesChange (points: HistoryPoint[]): number | null {
  if (points.length < 2) return null
  const a = points[0].chaos
  const b = points[points.length - 1].chaos
  return a > 0 ? b / a - 1 : null
}

export interface ChartGeometry {
  path: string
  area: string
  dots: Array<{ x: number, y: number, chaos: number, ts: number }>
  yTicks: Array<{ y: number, chaos: number }>
  xTicks: Array<{ x: number, label: string }>
}

/** Lays points out on a width × height box with room for axis labels on the left and bottom. */
export function chartGeometry (points: HistoryPoint[], width: number, height: number, left = 34, bottom = 16): ChartGeometry | null {
  if (points.length < 2) return null
  const top = 6
  const right = 6
  const minTs = points[0].ts
  const maxTs = points[points.length - 1].ts
  const values = points.map(p => p.chaos)
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  if (hi - lo < hi * 0.02) { lo *= 0.98; hi *= 1.02 }
  const pad = (hi - lo) * 0.08
  lo = Math.max(lo - pad, 0)
  hi += pad
  const w = width - left - right
  const h = height - top - bottom
  const x = (ts: number) => left + (maxTs === minTs ? w : (ts - minTs) / (maxTs - minTs) * w)
  const y = (c: number) => top + (1 - (c - lo) / (hi - lo)) * h
  const dots = points.map(p => ({ x: x(p.ts), y: y(p.chaos), chaos: p.chaos, ts: p.ts }))
  const path = dots.map((d, i) => `${i ? 'L' : 'M'}${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(' ')
  const base = (top + h).toFixed(1)
  const area = `${path} L${dots[dots.length - 1].x.toFixed(1)},${base} L${dots[0].x.toFixed(1)},${base} Z`
  const yTicks = [hi - pad, (hi + lo) / 2, lo + (lo > 0 ? pad : 0)].map(c => ({ y: y(c), chaos: c }))
  const span = maxTs - minTs
  const fmt = (ts: number) => {
    const d = new Date(ts)
    return span > 2 * DAY_MS
      ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : formatTimeOfDay(d)
  }
  const xTicks = [
    { x: dots[0].x, label: fmt(minTs) },
    { x: dots[dots.length - 1].x, label: fmt(maxTs) }
  ]
  return { path, area, dots, yTicks, xTicks }
}
