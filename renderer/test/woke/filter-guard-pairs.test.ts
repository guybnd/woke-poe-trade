// The loot filter guard (see filter-guard.test.ts for the rule) over every
// pair of presets at their harshest, on the softest and the strictest file
// (a style only changes the looks).
// About a minute of CPU, so it runs on pushes to master (CI sets
// WOKE_FULL_GUARD=1), not on every pull request. filter-guard.test.ts still
// does. Run it yourself with WOKE_FULL_GUARD=1 npx vitest run filter-guard-.
import { describe, it, expect } from 'vitest'
import { breaches, pairSetups } from '../helpers/filter-guard'

describe.runIf(process.env.WOKE_FULL_GUARD === '1')('every pair of presets at their harshest', () => {
  const pairs = pairSetups()
  it.each(['1-REGULAR', '6-UBER-PLUS-STRICT'])('%s: all 231 pairs', name => {
    expect(pairs).toHaveLength(231)
    expect(pairs.flatMap(s => breaches(name, s).map(x => `${s.name}: ${x}`))).toEqual([])
  })
})
