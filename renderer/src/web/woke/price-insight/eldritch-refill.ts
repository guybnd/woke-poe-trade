// The first price check of a session reads the eldritch implicits' ranges
// (eldritch-roll.ts) while its rows are already drawn: once the data is back,
// those rows get their bar. Only the range: the numbers in the boxes stay.
import type { ParsedItem } from '@/parser'
import type { FilterOrGroup } from '@/web/price-check/filters/interfaces'
import { calculatedStatToFilter } from '@/web/price-check/filters/create-stat-filters'

export function refillEldritchRows (rows: FilterOrGroup[], item: ParsedItem, percent: number) {
  for (const f of rows) {
    if (f.group) continue
    if (!f.roll || f.roll.bounds || f.sources.length !== 1) continue
    const source = f.sources[0]
    if (!source.modifier.info.eldritch) continue
    const fresh = calculatedStatToFilter({ stat: source.stat.stat, type: source.modifier.info.type, sources: f.sources }, percent, item)
    if (!fresh.roll?.bounds) continue
    f.roll.bounds = fresh.roll.bounds
    f.roll.goodness = fresh.roll.goodness
  }
}
