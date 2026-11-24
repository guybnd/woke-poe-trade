import { describe, expect, it } from 'vitest'
import { emptyRun } from '@/web/woke/net-worth/runs'
import type { LastRun, Run, RunFinal } from '@/web/woke/net-worth/runs'
import { summarize } from '@/web/woke/net-worth/run-summary'
import type { SummaryInput, SummaryMap } from '@/web/woke/net-worth/run-summary'
import { runsLookup } from '@/web/woke/search/lookups/runs'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const M = 60_000
const H = 3_600_000
const T0 = 1_000_000_000
const tl = (name: string, added: number, addedChaos: number, removed = 0, removedChaos = 0, extra = {}) => ({ name, icon: '', added, removed, addedChaos, removedChaos, ...extra })
const done = (id: string, name: string, startAt: number, final: Partial<RunFinal>, extra: Partial<Run> = {}): Run =>
  ({ ...emptyRun(id, 'Covens', name, startAt), stoppedAt: startAt + H, final: { profitChaos: 0, maps: 0, perMapChaos: null, perHourChaos: null, ...final }, ...extra })
const map = (i: number, mapMs: number, deaths = 0, npcs: string[] = []): SummaryMap => ({ name: `Map ${i}`, enteredAt: T0 + i * 5 * M, mapMs, deaths, npcs })
const fmt = (c: number) => `${Math.round(c * 10) / 10}c`

function input (extra: Partial<SummaryInput> = {}): SummaryInput {
  const run = extra.run ?? { ...emptyRun('now', 'Covens', 'Nightmare maps', T0), stoppedAt: T0 + 2 * H }
  return { run, done: [], maps: [], profitChaos: 300, perMapChaos: 30, perHourChaos: 150, costPerMapChaos: 10, runs: 10, time: null, rateTime: 'play', fmt, ...extra }
}

describe('run summary', () => {
  it('best drops leave out currency and map costs; Mirrors and hand-added items count', () => {
    const run: Run = {
      ...emptyRun('now', 'Covens', 'Nightmare maps', T0),
      stoppedAt: T0 + H,
      tally: {
        div: tl('Divine Orb', 3, 600, 0, 0, { currency: true }),
        mirror: tl('Mirror of Kalandra', 1, 9000, 0, 0, { currency: true }),
        flame: tl('Forbidden Flame', 1, 180),
        card: tl('The Apothecary', 1, 96),
        nm: tl('Nightmare Map', 2, 60, 0, 0, { cost: true }),
        junk: tl('Grand Spectrum', 3, 54),
        out: tl('Headhunter', 1, 5000)
      },
      edits: { 'tally:out': { out: true } },
      manual: [{ id: 'm1', name: 'Mageblood', count: 1, each: 120, side: 'in' }]
    }
    const s = summarize(input({ run }))
    expect(s.drops.map(d => d.name)).toEqual(['Mirror of Kalandra', 'Forbidden Flame', 'Mageblood', 'The Apothecary'])
    expect(s.drops.find(d => d.name === 'Forbidden Flame')?.count).toBe(1)
  })

  it('compares against your other runs of the same name only, and leaves this run out', () => {
    const run = { ...emptyRun('now', 'Covens', 'Nightmare maps', T0), stoppedAt: T0 + H, final: { profitChaos: 400, maps: 10, perMapChaos: 40, perHourChaos: 400 } }
    const others = [
      done('a', 'Nightmare maps', T0 - 5 * H, { profitChaos: 200, maps: 10 }),
      done('b', 'Nightmare maps', T0 - 3 * H, { profitChaos: 400, maps: 10 }),
      done('c', 'Essence', T0 - 2 * H, { profitChaos: 9000, maps: 10 })
    ]
    const s = summarize(input({ run, done: [run, ...others] }))
    expect(s.usual?.count).toBe(2)
    expect(s.usual?.perMapChaos).toBe(30)
    expect(summarize(input({ run, done: [run] })).usual).toBeNull()
  })

  it('spent and kept: kit lines, map-cost items used up and hand-added costs', () => {
    const run: Run = {
      ...emptyRun('now', 'Covens', 'Nightmare maps', T0),
      tally: { scarab: tl('Ambush Scarab', 0, 0, 10, 50, { cost: true }) },
      costs: [{ id: 'k', key: null, name: 'Nightmare Map', qty: 1, unitChaos: 15 }],
      manual: [{ id: 'm', name: 'Fee', count: 1, each: 10, side: 'out' }]
    }
    const s = summarize(input({ run, runs: 10, profitChaos: 420 }))
    expect(s.spentChaos).toBe(210)
    expect(s.spentOn).toEqual(['Nightmare Map', 'Ambush Scarab'])
    expect(s.returnPerChaos).toBeCloseTo(3)
  })

  it('a steady run with nothing to say gets no tips', () => {
    const maps = Array.from({ length: 12 }, (_, i) => map(i, 3 * M + (i % 2) * 5000))
    expect(summarize(input({ maps })).tips).toEqual([])
  })

  it('pace: says faster with the end-pace per hour', () => {
    const maps = Array.from({ length: 12 }, (_, i) => map(i, i < 4 ? 4 * M : i >= 8 ? 2.5 * M : 3 * M))
    const t = summarize(input({ maps })).tips.find(x => x.id === 'pace')
    expect(t?.lead).toBe('You got faster as you went')
    expect(t?.text).toContain('4:00 a map in the first third, 2:30 in the last')
    expect(t?.text).toContain('about')
  })

  it('slow maps: names them, their deaths, a common NPC and the time lost', () => {
    const maps = Array.from({ length: 10 }, (_, i) => map(i, 3 * M))
    maps[3] = { ...map(3, 7 * M, 2, ['Delirium']), name: 'Cemetery Map' }
    maps[7] = { ...map(7, 6 * M, 0, ['Delirium', 'Einhar']), name: 'Bog Map' }
    maps[9] = map(9, 3 * M, 1)
    const t = summarize(input({ maps })).tips.find(x => x.id === 'slow')
    expect(t?.lead).toBe('2 maps took far longer than the rest')
    expect(t?.text).toContain('Cemetery 7:00, Bog 6:00')
    expect(t?.text).toContain('2 of your 3 deaths were in them')
    expect(t?.text).toContain('Delirium was in most of them')
    expect(t?.text).toContain('7 minutes')
  })

  it('kit price: cost a map vs usual, and the line that moved', () => {
    const run: Run = { ...emptyRun('now', 'Covens', 'Nightmare maps', T0), stoppedAt: T0 + H, costs: [{ id: 'k', key: null, name: 'Nightmare Map', qty: 1, unitChaos: 16.5 }] }
    const past = done('a', 'Nightmare maps', T0 - 3 * H, { profitChaos: 300, maps: 10 }, { costs: [{ id: 'k', key: null, name: 'Nightmare Map', qty: 1, unitChaos: 14 }] })
    const t = summarize(input({ run, done: [past], costPerMapChaos: 16.5, perMapChaos: 36 })).tips.find(x => x.id === 'kit-price')
    expect(t?.lead).toBe('A map cost 2.5c more than usual')
    expect(t?.text).toContain('Nightmare Map went from 14c to 16.5c')
    expect(t?.text).toContain('still beat your usual')
  })

  it('hideout: only over a quarter of the run, in maps\' worth', () => {
    const maps = Array.from({ length: 10 }, (_, i) => map(i, 3 * M))
    const busy = summarize(input({ maps, time: { map: 30 * M, play: 0, hub: 15 * M, off: 0 } })).tips.find(x => x.id === 'hideout')
    expect(busy?.lead).toBe('Hideout and town took 33% of the run')
    expect(busy?.text).toContain('about 5 maps\' worth')
    expect(summarize(input({ maps, time: { map: 30 * M, play: 0, hub: 5 * M, off: 0 } })).tips.some(x => x.id === 'hideout')).toBe(false)
  })

  it('kit compare: needs 3 runs on each side', () => {
    const scarab = [{ id: 'k', key: null, name: 'Ambush Scarab', qty: 1, unitChaos: 5 }]
    const withIt = [1, 2, 3].map(i => done(`w${i}`, 'Nightmare maps', T0 - i * 2 * H, { profitChaos: 500, maps: 10 }, { costs: scarab }))
    const without = [4, 5].map(i => done(`o${i}`, 'Nightmare maps', T0 - i * 2 * H, { profitChaos: 300, maps: 10 }))
    const run = { ...emptyRun('now', 'Covens', 'Nightmare maps', T0), stoppedAt: T0 + H, final: { profitChaos: 300, maps: 10, perMapChaos: 30, perHourChaos: 300 } }
    expect(summarize(input({ run, done: [...withIt, ...without] })).tips.some(x => x.id === 'kit-compare')).toBe(true)
    const tip = summarize(input({ run, done: [...withIt, ...without] })).tips.find(x => x.id === 'kit-compare')
    expect(tip?.lead).toBe('Ambush Scarab looks worth it')
    expect(summarize(input({ run, done: [...withIt, without[0]] })).tips.some(x => x.id === 'kit-compare')).toBe(false)
  })

  it('at most three tips', () => {
    const maps = Array.from({ length: 12 }, (_, i) => map(i, i < 4 ? 4 * M : 2.5 * M))
    maps[2] = map(2, 12 * M, 1)
    const run: Run = { ...emptyRun('now', 'Covens', 'Nightmare maps', T0), stoppedAt: T0 + H, costs: [{ id: 'k', key: null, name: 'Nightmare Map', qty: 1, unitChaos: 20 }] }
    const past = done('a', 'Nightmare maps', T0 - 3 * H, { profitChaos: 300, maps: 10 }, { costs: [{ id: 'k', key: null, name: 'Nightmare Map', qty: 1, unitChaos: 10 }] })
    const s = summarize(input({ run, maps, done: [past], costPerMapChaos: 20, time: { map: 30 * M, play: 0, hub: 30 * M, off: 0 } }))
    expect(s.tips.length).toBe(3)
  })
})

describe('Ctrl+Space last run', () => {
  const ctx = { divine: 200, now: T0 + 3 * H } as unknown as LookupContext
  const last: LastRun = { league: 'Covens', id: 'r', name: 'Nightmare maps', startAt: T0, stoppedAt: T0 + H, profitChaos: 1240, maps: 34, perMapChaos: 36.5, usualPerMapChaos: 28.4, best: { name: 'Forbidden Flame', chaos: 180 }, tips: [{ lead: 'You got faster as you went', text: '3:05 a map in the first third, 2:22 in the last.' }] }
  it('"last run" answers with the summary and its tips', () => {
    const rows = runsLookup(null, 'play', null, last)('last run', ctx)
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toContain('Last run Nightmare maps')
    expect(JSON.stringify(rows[0].sections)).toContain('You got faster as you went')
    expect(JSON.stringify(rows[0].sections)).toContain('Forbidden Flame')
  })
  it('the run\'s name answers with the last run when none goes; unrelated words don\'t', () => {
    expect(runsLookup(null, 'play', null, last)('nightmare', ctx)).toHaveLength(1)
    expect(runsLookup(null, 'play', null, last)('chaos orb', ctx)).toHaveLength(0)
  })
})
