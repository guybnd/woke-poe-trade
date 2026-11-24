import { describe, expect, it } from 'vitest'
import { compareRows, costPerRun, emptyRun, relive, smallSample, sortCompare, topDrop } from '@/web/woke/net-worth/runs'
import type { Run, RunFinal } from '@/web/woke/net-worth/runs'
import { runsLookup } from '@/web/woke/search/lookups/runs'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const M = 60_000
const H = 3_600_000
const T0 = 1_000_000_000
const run = (extra: Partial<Run> = {}): Run => ({ ...emptyRun('r1', 'Covens', 'Nightmare maps', T0), ...extra })
const tl = (name: string, added: number, addedChaos: number, removed = 0, removedChaos = 0) => ({ name, icon: '', added, removed, addedChaos, removedChaos })
const done = (id: string, name: string, startAt: number, ms: number, final: Partial<RunFinal>, extra: Partial<Run> = {}): Run =>
  ({ ...emptyRun(id, 'Covens', name, startAt), stoppedAt: startAt + ms, final: { profitChaos: 0, maps: 0, perMapChaos: null, perHourChaos: null, ...final }, ...extra })

describe('cost kits priced live', () => {
  it('a live line takes the price; a typed one keeps yours', () => {
    const r = run({
      costs: [
        { id: 'a', key: 'thread', name: 'Breach Thread', qty: 4, unitChaos: 0.5, live: true },
        { id: 'b', key: null, name: 'Delirium Orb', qty: 1, unitChaos: 6 }
      ]
    })
    const next = relive(r, (key, name) => key === 'thread' ? 0.8 : name === 'Delirium Orb' ? 9 : null)
    expect(next.costs[0].unitChaos).toBe(0.8)
    expect(next.costs[1].unitChaos).toBe(6)
  })
  it('nothing moved, no price, or a stopped run: the same run back', () => {
    const r = run({ costs: [{ id: 'a', key: null, name: 'Nightmare Map', qty: 1, unitChaos: 31, live: true }] })
    expect(relive(r, () => 31)).toBe(r)
    expect(relive(r, () => null)).toBe(r)
    expect(relive(r, () => 0)).toBe(r)
    const stopped = { ...r, stoppedAt: T0 + H }
    expect(relive(stopped, () => 40)).toBe(stopped)
  })
})

describe('top drop and small samples', () => {
  it('the biggest thing that came in, with edits, left-out ones skipped', () => {
    const r = run({
      tally: { mirror: tl('Mirror Shard', 1, 300), frag: tl('Reality Fragment', 15, 110), nm: tl('Nightmare Map', 0, 0, 9, 330) },
      manual: [{ id: 'm', name: 'Mageblood', count: 1, each: 200, side: 'in' }]
    })
    expect(topDrop(r)).toEqual({ name: 'Mirror Shard', chaos: 300 })
    const out = { ...r, edits: { 'tally:mirror': { out: true } } }
    expect(topDrop(out)).toEqual({ name: 'Mageblood', chaos: 200 })
    expect(topDrop(run())).toBeNull()
  })
  it('currency sums and restocked maps are never the top drop', () => {
    const r = run({
      tally: {
        div: tl('Divine Orb', 3, 600),
        chaos: { ...tl('Chaos Orb', 400, 400), currency: true },
        maps: tl('Nightmare Map', 40, 1200),
        card: tl('The Apothecary', 1, 150)
      }
    })
    expect(topDrop(r)).toEqual({ name: 'The Apothecary', chaos: 150 })
  })
  it('under 30 maps, or one drop over half the profit', () => {
    expect(smallSample(12, 500, null)).toEqual({ few: true, share: null })
    expect(smallSample(40, 500, { name: 'Mirror Shard', chaos: 300 })).toEqual({ few: false, share: 0.6 })
    expect(smallSample(40, 500, { name: 'Divine Orb', chaos: 200 })).toBeNull()
    // A loss: no share (the drop can't be "most of the profit").
    expect(smallSample(40, -50, { name: 'Divine Orb', chaos: 200 })).toBeNull()
    expect(smallSample(0, 0, null)).toBeNull()
  })
})

describe('cost per map from the run alone', () => {
  it('typed lines plus map-cost items used up', () => {
    const r = run({
      costs: [{ id: 'c', key: null, name: 'Breach Thread', qty: 4, unitChaos: 1 }],
      tally: { nm: { ...tl('Nightmare Map', 0, 0, 10, 300), cost: true }, div: tl('Divine Orb', 1, 200) }
    })
    expect(costPerRun(r, 10)).toBe(4 + 30)
    expect(costPerRun(r, 0)).toBeNull()
  })
})

describe('past runs compared', () => {
  const runs = [
    done('a', 'Nightmare maps', T0 + 10 * H, H, { profitChaos: 600, maps: 48, time: { map: 30 * M, play: 0, hub: 20 * M, off: 10 * M } }),
    done('b', 'Breach', T0 + 5 * H, 2 * H, { profitChaos: 580, maps: 71 }),
    done('c', 'Nightmare maps', T0, 30 * M, { profitChaos: 300, maps: 14 }, { tally: { mb: tl('Mageblood', 1, 280) } })
  ]
  it('one row a run, per hour under the Per hour setting', () => {
    const rows = compareRows(runs, 'play')
    expect(rows.map(r => r.id)).toEqual(['a', 'b', 'c'])
    // 30 minutes in maps: 600 an half hour.
    expect(rows[0].perHourChaos).toBe(1200)
    expect(compareRows(runs, 'hub')[0].perHourChaos).toBeCloseTo(600 / (50 / 60))
    expect(compareRows(runs, 'all')[0].perHourChaos).toBe(600)
    // No Client.txt time: the clock.
    expect(rows[1].perHourChaos).toBe(290)
    expect(rows[2].perMapNoTopChaos).toBeCloseTo(20 / 14)
    expect(rows[2].sample).toEqual({ few: true, share: 280 / 300 })
  })
  it('by strategy adds up runs with the same name', () => {
    const rows = compareRows(runs, 'all', true)
    const nm = rows.find(r => r.name === 'Nightmare maps')!
    expect(nm.count).toBe(2)
    expect(nm.maps).toBe(62)
    expect(nm.perMapChaos).toBeCloseTo(900 / 62)
    expect(nm.perHourChaos).toBeCloseTo(900 / 1.5)
    expect(nm.top?.name).toBe('Mageblood')
    expect(nm.sample).toBeNull()
  })
  it('a run without totals is left out', () => {
    expect(compareRows([run()], 'play')).toEqual([])
  })
  it('sorts best first, cost cheapest first, missing figures last', () => {
    const rows = compareRows(runs, 'all')
    expect(sortCompare(rows, 'perMap').map(r => r.id)).toEqual(['c', 'a', 'b'])
    expect(sortCompare(rows, 'new').map(r => r.id)).toEqual(['a', 'b', 'c'])
    const withNull = [...rows, { ...rows[0], id: 'z', perHourChaos: null }]
    expect(sortCompare(withNull, 'perHour').at(-1)?.id).toBe('z')
    const costly = compareRows([...runs, done('d', 'Pricey', T0, H, { profitChaos: 10, maps: 40 }, { costs: [{ id: 'k', key: null, name: 'Nightmare Map', qty: 1, unitChaos: 30 }] })], 'all')
    expect(sortCompare(costly, 'cost').at(-1)?.id).toBe('d')
  })
})

describe('Ctrl+Space', () => {
  const ctx = { now: T0 + H, divine: 200 } as unknown as LookupContext
  it('compare runs lists strategies best per map first', () => {
    const board = {
      league: 'Covens',
      rows: [
        { name: 'Breach', count: 1, maps: 71, fights: 0, profitChaos: 580, perMapChaos: 8.2, perHour: { play: 400, hub: 300, all: 290 }, costPerMapChaos: 19, perMapNoTopChaos: 7.9, small: false },
        { name: 'Nightmare maps', count: 2, maps: 62, fights: 0, profitChaos: 900, perMapChaos: 14.5, perHour: { play: 700, hub: 600, all: 600 }, costPerMapChaos: 40, perMapNoTopChaos: 10, small: false }
      ]
    }
    const [a] = runsLookup(null, 'play', board)('compare runs', ctx)
    expect(a.name).toContain('Nightmare maps')
    expect(JSON.stringify(a.sections)).toContain('/h')
    expect(runsLookup(null, 'play', board)('blah', ctx)).toEqual([])
  })
  it('the live run says small sample and per map without the top drop', () => {
    const glance = { league: 'Covens', name: 'Nightmare maps', startAt: T0, at: T0 + H, profitChaos: 300, maps: 10, perHourChaos: 300, costPerMapChaos: 30, divine: 200, top: { name: 'Mageblood', chaos: 280 } }
    const [a] = runsLookup(glance, 'all')('run', ctx)
    const text = JSON.stringify(a.sections)
    expect(text).toContain('without Mageblood')
    expect(text).toContain('Small sample')
  })
})
