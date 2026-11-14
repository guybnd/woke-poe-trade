// The loot filter guard (see filter-guard.test.ts for the rule) over seeded
// random mixes of presets, settings and the safety net, 25 per file. A
// failure names its seed: randomSetup(seed) replays the same mix.
import { describe, it, expect } from 'vitest'
import { FILTERS, breaches, randomSetup } from '../helpers/filter-guard'

describe('random mixes of presets and settings', () => {
  it.each(FILTERS.map((f, i) => ({ name: f.name, i })))('$name: 25 random setups', ({ name, i }) => {
    const seeds = Array.from({ length: 25 }, (_, k) => 1 + i + k * FILTERS.length)
    expect(seeds.flatMap(seed => {
      const s = randomSetup(seed)
      return breaches(name, s).map(x => `${s.name}: ${x}`)
    })).toEqual([])
  })
})
