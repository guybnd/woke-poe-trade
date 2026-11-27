// Day-1 prices (Guy 2026-11-27): what each item was worth over a league's
// first three days (scripts/gen-day1-prices.mjs, run by day1-prices.yml).
// They stand in for an item poe.ninja has no live line for yet, so on the
// first day of a league the filter still has a realistic price for it.
// Only for names the live prices lack; marked day1, shown as a guess.
import type { PriceItem } from '../market/types'

export interface Day1Table {
  league: string
  made: string
  divine: number | null
  items: Array<[type: string, name: string, variant: string, chaos: number]>
}

// The table is a few hundred KB: loaded on its own, only by the loot filter.
let loading: Promise<Day1Table | null> | null = null
export function loadDay1 (): Promise<Day1Table | null> {
  loading ??= import('./day1-prices.json')
    .then(m => (m.default as unknown as Day1Table))
    .catch(() => null)
  return loading
}

// The live items, plus a day-1 line for every name they don't have at all.
export function withDay1 (live: PriceItem[], table: Day1Table | null): PriceItem[] {
  if (!table?.items.length) return live
  const have = new Set(live.map(i => i.name))
  const extra: PriceItem[] = []
  for (const [type, name, variant, chaos] of table.items) {
    if (have.has(name) || !(chaos > 0)) continue
    extra.push({ type, name, variant, chaos, day1: true })
  }
  return extra.length ? [...live, ...extra] : live
}
