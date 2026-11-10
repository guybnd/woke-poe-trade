// "Adds # to #" lines: the parser keeps their average as the roll, so a line
// read "Adds 45 to 45". The two rolled numbers, summed over the row's mods, let
// a tooltip line read as the game shows it ("Adds 30 to 60").

import type { StatFilter } from '@/web/price-check/filters/interfaces'

export function rollPair (filter: StatFilter): [number, number] | undefined {
  if (!filter.sources.length || !filter.text.includes('# to #')) return undefined
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
