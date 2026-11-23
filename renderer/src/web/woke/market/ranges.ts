// The Prices tab's time ranges. poe.ninja's feed has one price a day, so the
// ranges under 3 days come from the snapshots this app saves about every
// 30 minutes (kept 3 days). There is no 1 hour: poe.ninja re-prices currency
// about once an hour, so it would be a single step, usually 0%.
import type { MarketRow } from './browser'

export type PriceRange = '3h' | '6h' | '12h' | '24h' | '2d' | '3d' | '7d'

const HOUR = 3600 * 1000

export const PRICE_RANGES: Array<{ id: PriceRange, label: string, long: string, ms: number, local: boolean }> = [
  { id: '3h', label: '3h', long: 'Last 3 hours', ms: 3 * HOUR, local: true },
  { id: '6h', label: '6h', long: 'Last 6 hours', ms: 6 * HOUR, local: true },
  { id: '12h', label: '12h', long: 'Last 12 hours', ms: 12 * HOUR, local: true },
  { id: '24h', label: '24h', long: 'Last 24 hours', ms: 24 * HOUR, local: true },
  { id: '2d', label: '2d', long: 'Last 2 days', ms: 48 * HOUR, local: true },
  { id: '3d', label: '3d', long: 'Last 3 days', ms: 72 * HOUR, local: false },
  { id: '7d', label: '7d', long: 'Last 7 days', ms: 168 * HOUR, local: false }
]

export function rangeInfo (id: unknown): typeof PRICE_RANGES[number] {
  return PRICE_RANGES.find(r => r.id === id) ?? PRICE_RANGES[PRICE_RANGES.length - 1]
}

// Days of poe.ninja's daily line a range falls back to without saved prices.
const NINJA_DAYS: Partial<Record<PriceRange, number>> = { '24h': 1, '2d': 2, '3d': 3 }

export interface RangeTrend {
  trend: number[]
  // % change over the range; null when the data doesn't cover it.
  change: number | null
}

// From poe.ninja's 7 daily values (% against a week ago): the last `days`+1
// days as chaos, and the change between the first and last of them.
export function ninjaRange (chaos: number, graph: unknown, days: number): RangeTrend {
  if (!Array.isArray(graph) || graph.length < days + 1) return { trend: [], change: null }
  const tail = graph.slice(-(days + 1))
  const last = tail[tail.length - 1]
  const first = tail[0]
  if (typeof last !== 'number' || 1 + last / 100 <= 0) return { trend: [], change: null }
  const trend: number[] = []
  for (const v of tail) {
    if (typeof v === 'number' && Number.isFinite(v) && 1 + v / 100 > 0) trend.push(chaos * (1 + v / 100) / (1 + last / 100))
  }
  // All zeros: poe.ninja shows "Not enough data" (browser.ts weekChange).
  const flat = graph.every(v => v == null || v === 0)
  const change = !flat && typeof first === 'number' && 1 + first / 100 > 0 ? ((1 + last / 100) / (1 + first / 100) - 1) * 100 : null
  return { trend, change }
}

// From the app's own saved prices: the line ends at today's price. Null when
// there's no saved price at the start of the range (the app wasn't running).
export function savedRange (chaos: number, line: Array<number | null> | undefined): RangeTrend | null {
  if (!line?.length || line[0] == null || !(line[0] > 0)) return null
  const trend = line.filter((v): v is number => v != null && v > 0)
  trend.push(chaos)
  return { trend, change: (chaos / line[0] - 1) * 100 }
}

// A row's line and change for the range. `saved` is the category's saved
// prices over the range (null while loading or when there are none).
export function rowRange (
  row: MarketRow & { graph?: unknown },
  range: PriceRange,
  saved: Record<string, Array<number | null>> | null
): RangeTrend {
  if (range === '7d') return { trend: row.trend, change: row.change }
  const info = rangeInfo(range)
  if (info.local) {
    const own = savedRange(row.chaos, saved?.[row.key])
    if (own) return own
  }
  const days = NINJA_DAYS[range]
  return days ? ninjaRange(row.chaos, row.graph, days) : { trend: [], change: null }
}
