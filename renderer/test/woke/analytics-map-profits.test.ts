// What Session analytics counts per map from the saved sessions (bug hunt pick:
// a session saved without map detail still counts as its maps).
import { describe, it, expect } from 'vitest'
import { mapProfits, strategyRows } from '@/web/woke/analytics/stats'
import type { MapRun, SessionRecord } from '@/web/woke/analytics/types'

function run (over: Partial<MapRun> = {}): MapRun {
  return { areaId: 'MapWorldsStrand', name: 'Strand', level: 83, enteredAt: 1, mapMs: 600_000, otherMs: 0, loot: [], ...over }
}

function session (over: Partial<SessionRecord> = {}): SessionRecord {
  return { id: 's', league: 'L', strategy: 'Boxes', startedAt: 0, endedAt: 1, durationMs: 1_200_000, maps: 2, costPerMapChaos: 10, loot: [], extraChaos: 0, divine: 100, runs: [run(), run()], ...over }
}

describe('session analytics per map', () => {
  it('typical map, best map and losing share count a session without map detail as its maps', () => {
    const bulk = session({ id: 'a', runs: [], maps: 10, extraChaos: 1000, costPerMapChaos: 0 })
    const detailed = session({ id: 'b', costPerMapChaos: 50, runs: [run({ loot: [{ type: 'Currency', name: 'Divine Orb', variant: '', qty: 1, chaos: 300 }] as MapRun['loot'] }), run()] })
    const [row] = strategyRows([bulk, detailed], 'chaos', null, 'hub')
    // Ten maps of 100 each, one of 250 and one of -50.
    expect(row.typicalMap).toBe(100)
    expect(row.bestMap).toBe(250)
    expect(row.losingShare).toBeCloseTo(1 / 12, 5)
    expect(mapProfits([{ profit: 30, ms: 1, ts: 1, name: '', maps: 3 }, { profit: 5, ms: 1, ts: 1, name: 'x' }])).toEqual([10, 10, 10, 5])
  })
})
