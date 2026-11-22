// "Adds # to #" lines: the parser keeps their average as the roll, so a line
// read "Adds 45 to 45". The two rolled numbers, summed over the row's mods, let
// a tooltip line read as the game shows it ("Adds 30 to 60").
// A two-number line the trade site searches by its percentage (Kitava's
// "50% chance ... 200 Life") keeps that number as the roll; its pair stops the
// line reading "50% chance ... 50 Life".

import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { searchedNumber } from '@/parser/stat-translations'

export function rollPair (filter: StatFilter): [number, number] | undefined {
  if (!filter.sources.length) return undefined
  const first = searchedNumber(filter.sources[0].stat.stat, filter.sources[0].stat.translation.string) >= 0
  if (!first && !filter.text.includes('# to #')) return undefined
  // Two first-number mods on one row have no one pair to show.
  if (first && (filter.sources.length !== 1 || filter.sources[0].stat.translation.negate)) return undefined
  let lo = 0
  let hi = 0
  for (const source of filter.sources) {
    const pair = source.stat.roll?.pair
    // A mod scaled by a catalyst or similar shows its average, as before.
    if (!pair || source.contributes?.value !== source.stat.roll!.value) return undefined
    lo += pair[0]
    hi += pair[1]
  }
  return [lo, hi]
}
