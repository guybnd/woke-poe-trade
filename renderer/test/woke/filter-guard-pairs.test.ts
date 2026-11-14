// The loot filter guard (see filter-guard.test.ts for the rule) over every
// pair of presets at their harshest, on the softest and the strictest file
// (a style only changes the looks).
import { describe, it, expect } from 'vitest'
import { breaches, pairSetups } from '../helpers/filter-guard'

describe('every pair of presets at their harshest', () => {
  const pairs = pairSetups()
  it.each(['1-REGULAR', '6-UBER-PLUS-STRICT'])('%s: all 171 pairs', name => {
    expect(pairs).toHaveLength(171)
    expect(pairs.flatMap(s => breaches(name, s).map(x => `${s.name}: ${x}`))).toEqual([])
  })
})
