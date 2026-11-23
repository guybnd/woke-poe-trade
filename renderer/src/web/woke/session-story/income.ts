// Map history's income rows: each Net worth stash read is its own row between
// the maps. Reads come about every 10 minutes, too slow to pin on one map, so a
// row says what came in since the read before and which maps that covers.
import { isPurchase, resolveSpends } from '../net-worth/spend'
import type { StashGain } from '../net-worth/valuation'
import type { MapRecord } from './map-log'

export interface IncomeRow {
  at: number
  since: number | null
  // What the read adds to profit: a purchase counts 0 or less (spend.ts).
  chaos: number
  // Chaos per divine at that read; null when the read has no divine figure.
  rate: number | null
  // Left out as spent on a purchase.
  spent: number
  purchase: boolean
  // Maps you came out of between the read before and this one.
  maps: number
  perHour: number | null
}

// Shorter than this between two reads: no per-hour figure (too noisy).
const MIN_SPAN_MS = 5 * 60_000

export function incomeRows (gains: readonly StashGain[], maps: readonly MapRecord[]): IncomeRow[] {
  // Worked out over every gain: a purchase can be cancelled by a later read.
  const share = resolveSpends(gains)
  return [...gains].sort((a, b) => b.at - a.at).map(g => {
    const r = share.get(g.at)
    const chaos = r?.counted ?? g.netChaos
    const span = g.since != null ? g.at - g.since : 0
    return {
      at: g.at,
      since: g.since,
      chaos,
      rate: g.netDivine ? g.netChaos / g.netDivine : null,
      spent: r?.spent ?? 0,
      purchase: isPurchase(g),
      maps: g.since == null ? 0 : maps.filter(m => m.leftAt > g.since! && m.leftAt <= g.at).length,
      perHour: span >= MIN_SPAN_MS ? chaos / (span / 3_600_000) : null
    }
  })
}

export type HistoryItem =
  | { kind: 'map', at: number, map: MapRecord }
  | { kind: 'read', at: number, read: IncomeRow }

// Maps and reads in one list, newest first. A read sits above the maps it
// followed: maps by when you entered, reads by when they happened.
export function interleave (maps: readonly MapRecord[], reads: readonly IncomeRow[]): HistoryItem[] {
  const items: HistoryItem[] = [
    ...maps.map(map => ({ kind: 'map' as const, at: map.enteredAt, map })),
    ...reads.map(read => ({ kind: 'read' as const, at: read.at, read }))
  ]
  return items.sort((a, b) => b.at - a.at)
}
