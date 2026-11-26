import { findDivinePrice } from './parse'
import { isCorrupted, isThin, itemKey } from './types'
import type { CorruptedFilter, PriceItem } from './types'

export interface Mover {
  type: string
  name: string
  variant: string
  now: number
  then: number
  change: number // fraction, 0.25 = +25%, in the unit asked for
  gaps?: number
}

export type MoveUnit = 'chaos' | 'div'

// Items present in both lists, priced at least `minChaos` now,
// sorted by the size of the move.
export function computeMovers (
  now: PriceItem[],
  then: PriceItem[],
  opts: {
    minChaos: number
    type?: string
    limit: number
    // 'div' measures the move in divines, so a divine price swing doesn't
    // show up as every item moving.
    unit?: MoveUnit
    divNow?: number | null
    divThen?: number | null
    hideThin?: boolean
    corrupted?: CorruptedFilter
  }
): Mover[] {
  const inDiv = opts.unit === 'div' && opts.divNow && opts.divThen
  const ratio = inDiv ? opts.divThen! / opts.divNow! : 1
  const before = new Map<string, number>()
  for (const item of then) before.set(itemKey(item), item.chaos)

  const out: Mover[] = []
  for (const item of now) {
    if (opts.type && item.type !== opts.type) continue
    const prev = before.get(itemKey(item))
    if (prev == null || prev <= 0) continue
    if (item.chaos < opts.minChaos) continue
    if (opts.hideThin && isThin(item)) continue
    if (opts.corrupted === 'only' && !isCorrupted(item)) continue
    if (opts.corrupted === 'hide' && isCorrupted(item)) continue
    if (inDiv && item.type === 'Currency' && item.name === 'Divine Orb' && !item.variant) continue
    out.push({
      type: item.type,
      name: item.name,
      variant: item.variant,
      now: item.chaos,
      then: prev,
      change: (item.chaos / prev) * ratio - 1,
      gaps: item.gaps
    })
  }
  out.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
  return out.slice(0, opts.limit)
}

// Past prices from poe.ninja's trend, for when local history doesn't reach back far enough.
export function trendThen (items: PriceItem[], period: '24h' | '7d'): PriceItem[] {
  const out: PriceItem[] = []
  for (const item of items) {
    const chaos = period === '24h' ? item.d1 : item.d7
    if (chaos != null) out.push({ ...item, chaos })
  }
  return out
}

// That list and the Divine Orb's price in it, so moves in divines work on it too.
export function trendBaseline (items: PriceItem[], period: '24h' | '7d'): { then: PriceItem[], divThen: number | null } {
  const then = trendThen(items, period)
  return { then, divThen: findDivinePrice(then) }
}
