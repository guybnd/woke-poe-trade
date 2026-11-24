// The Holdings chart's marks (Guy's picks, 2026-11-24): sales as coins sized
// by price with the biggest named (B), and your maps as columns (D).
// Pure: no Vue, no IO.
import type { ItemTipRef } from '../ui/tooltip/item-tip'

export interface ChartSale {
  at: number
  // The hover card's line: "Forbidden Flame 18 d".
  text: string
  tip?: ItemTipRef
  // For the coin's label.
  name?: string
  // Its price in the chart's unit (null: a currency without a price).
  div?: number | null
}

export interface ChartMap {
  from: number
  to: number
  // "Map 7 · Strand"
  name: string
  // What the refreshes after it added, in the chart's unit.
  gainDiv: number | null
}

// px: the smallest coin for a sale without a price or a cheap one, the
// biggest for the dearest sale on screen.
export const COIN_MIN = 3.5
export const COIN_MAX = 7

// A coin's radius: by area, so a sale twice the price is a coin twice the size.
export function coinRadius (div: number | null, most: number): number {
  if (div == null || !(div > 0) || !(most > 0)) return COIN_MIN
  return COIN_MIN + (COIN_MAX - COIN_MIN) * Math.sqrt(Math.min(1, div / most))
}

// The sales to name: the two dearest, the second only when it isn't on top
// of the first (x within `gap` % of the chart's width).
export function labelledSales<T extends { x: number, div?: number | null, name?: string }> (dots: readonly T[], gap = 40): T[] {
  const priced = dots.filter(d => d.name && d.div != null && d.div > 0).sort((a, b) => b.div! - a.div!)
  const out: T[] = []
  for (const d of priced) {
    if (out.length >= 2) break
    if (out.every(o => Math.abs(o.x - d.x) >= gap)) out.push(d)
  }
  return out
}

// A read comes in the hideout after a map: the map before it, if the read
// is within this long of the map's end.
const AFTER_MS = 20 * 60_000
export function mapOf (maps: readonly ChartMap[], at: number): ChartMap | null {
  let found: ChartMap | null = null
  for (const m of maps) if (m.from <= at) found = m
  return found && at - found.to <= AFTER_MS ? found : null
}
