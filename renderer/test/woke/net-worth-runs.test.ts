import { describe, expect, it } from 'vitest'
import { addToTally, cleanDoc, countLabel, emptyRun, leftOf, lineCost, mapsIn, runPerHour, runTotals, tallyFrom, tallyRows, unitOf } from '@/web/woke/net-worth/runs'
import type { Run } from '@/web/woke/net-worth/runs'
import { runsLookup } from '@/web/woke/search/lookups/runs'
import type { LookupContext } from '@/web/woke/search/lookups/types'
import type { LedgerPoint } from '@/web/woke/net-worth/ledger'
import type { StashDiff } from '@/web/woke/net-worth/valuation'

const DIV = 200
const M = 60_000
const H = 3_600_000
const T0 = 1_000_000_000

const point = (at: number, netChaos: number | null, extra: Partial<LedgerPoint> = {}): LedgerPoint =>
  ({ at, chaos: 0, divine: DIV, byCategory: { currency: 0, fragments: 0, cards: 0, gear: 0, other: 0 }, netChaos, top: [], ...extra })
const line = (key: string, count: number, chaos: number) => ({ key, name: key, icon: '', count, chaos })
const diff = (at: number, added: ReturnType<typeof line>[], removed: ReturnType<typeof line>[]): StashDiff =>
  ({ at, added, removed, netChaos: added.reduce((s, l) => s + l.chaos, 0) - removed.reduce((s, l) => s + l.chaos, 0) })
const run = (extra: Partial<Run> = {}): Run => ({ ...emptyRun('r1', 'Covens', 'Nightmare maps', T0), ...extra })

describe('profit', () => {
  it('sums each read after the start, purchases as counted', () => {
    const points = [point(T0, 50), point(T0 + 10 * M, 300), point(T0 + 20 * M, -40 * DIV, { counted: 0, spent: 40 * DIV }), point(T0 + 30 * M, 500)]
    const t = runTotals(run(), points, 4, T0 + H)
    // The start's own read and the purchase don't count.
    expect(t.stashChaos).toBe(800)
    expect(t.profitChaos).toBe(800)
    expect(t.perMapChaos).toBe(200)
    expect(t.perHourChaos).toBe(800)
  })
  it('stops counting at Stop, and a read with other tabs adds nothing', () => {
    const points = [point(T0 + M, 100), point(T0 + 2 * M, null), point(T0 + 3 * M, 100)]
    expect(runTotals(run({ stoppedAt: T0 + 2 * M }), points, 0, T0 + H).stashChaos).toBe(100)
    expect(runTotals(run(), points, 0, T0 + H).stashChaos).toBe(200)
  })
  it('a live run\'s per hour (hideout counted) is to the last read, as the dock card\'s', () => {
    const points = [point(T0, 50), point(T0 + 30 * M, 500)]
    // Opened an hour after the last read: profit is still to that read.
    const t = runTotals(run(), points, 4, T0 + 90 * M)
    expect(t.perHourChaos).toBeCloseTo(500 / 1.5)
  })
  it('per hour counts only the time the Per hour setting counts', () => {
    const split = { map: 30 * M, play: 0, hub: 15 * M, off: 15 * M }
    // Play only: half an hour in maps.
    expect(runPerHour(500, H, split, 'play')).toBe(1000)
    // Plus hideout: 45 minutes.
    expect(runPerHour(500, H, split, 'hub')).toBeCloseTo(500 / 0.75)
    // All time, or no Client.txt: the clock.
    expect(runPerHour(500, H, split, 'all')).toBe(500)
    expect(runPerHour(500, H, null, 'play')).toBe(500)
    // A Client.txt with nothing written in the run: the clock, not "never".
    expect(runPerHour(500, H, { map: 0, play: 0, hub: 0, off: H }, 'play')).toBe(500)
    // Under 10 minutes counted: no rate yet.
    expect(runPerHour(500, H, { map: 5 * M, play: 0, hub: 0, off: 55 * M }, 'play')).toBeNull()
  })
  it('no per hour under 10 minutes, no per map without maps', () => {
    const t = runTotals(run(), [point(T0 + M, 100)], 0, T0 + 5 * M)
    expect(t.perHourChaos).toBeNull()
    expect(t.perMapChaos).toBeNull()
  })
})

describe('typed costs', () => {
  it('a map bought into the inventory costs per map', () => {
    // 40 maps bought: the read saw a purchase (counted 0). 27 maps run.
    const r = run({ costs: [{ id: 'c', key: null, name: 'Nightmare Map', qty: 1, unitChaos: DIV, bought: 40 }] })
    const points = [point(T0 + M, -40 * DIV, { counted: 0 }), point(T0 + H, 50 * DIV)]
    const t = runTotals(r, points, 27, T0 + H)
    expect(t.costChaos).toBe(27 * DIV)
    expect(t.profitChaos).toBe(23 * DIV)
    expect(leftOf(r.costs[0], 27)).toBe(13)
    expect(leftOf(r.costs[0], 50)).toBe(0)
  })
  it("a typed item's own stash change is left out, so it never counts twice", () => {
    // Maps sit in a read tab: the stash lost 27 of them. Typed at 1 div each.
    let r = run({ costs: [{ id: 'c', key: 'nm', name: 'Nightmare Map', qty: 1, unitChaos: DIV }] })
    r = addToTally(r, diff(T0 + H, [line('frag', 10, 40 * DIV)], [line('nm', 27, 27 * 1.1 * DIV)]))
    const points = [point(T0 + H, 40 * DIV - 27 * 1.1 * DIV)]
    const t = runTotals(r, points, 27, T0 + H)
    expect(t.takenOverChaos).toBeCloseTo(-27 * 1.1 * DIV)
    expect(t.profitChaos).toBeCloseTo(40 * DIV - 27 * DIV)
  })
  it('once-off costs come off once', () => {
    const r = run({ once: [{ id: 'o', name: 'Kirac mission', chaos: 20 }] })
    expect(runTotals(r, [point(T0 + M, 100)], 3, T0 + H).profitChaos).toBe(80)
  })
  it('line cost never goes negative', () => {
    expect(lineCost({ id: 'c', key: null, name: 'x', qty: -1, unitChaos: 5 }, 3)).toBe(0)
  })
  it('cost per map adds map-cost items the stash used up', () => {
    let r = run({ costs: [{ id: 'c', key: null, name: 'Threads', qty: 3, unitChaos: 1 }] })
    r = addToTally(r, diff(T0 + M, [], [line('scarab', 10, 100), line('chaos', 50, 50)]))
    const t = runTotals(r, [point(T0 + M, -150)], 10, T0 + H, new Set(['scarab']))
    // 3 c typed a map, plus 10 c of scarabs a map; the chaos spent isn't a map cost.
    expect(t.costPerMapChaos).toBe(13)
  })
})

describe('tally', () => {
  it('adds each read once, only inside the run', () => {
    let r = run()
    const d = diff(T0 + M, [line('a', 2, 10)], [line('b', 1, 5)])
    r = addToTally(r, d)
    r = addToTally(r, d)
    r = addToTally(r, diff(T0 - M, [line('a', 9, 90)], []))
    expect(r.tally.a.added).toBe(2)
    expect(r.tally.b.removed).toBe(1)
    const stopped = addToTally({ ...r, stoppedAt: T0 + 2 * M }, diff(T0 + 3 * M, [line('a', 1, 5)], []))
    expect(stopped.tally.a.added).toBe(2)
  })
  it('a start in the past builds from the kept diffs and says so', () => {
    const r = tallyFrom(run(), [diff(T0 - M, [line('x', 1, 1)], []), diff(T0 + M, [line('a', 1, 10)], [])])
    expect(Object.keys(r.tally)).toEqual(['a'])
    expect(r.tallyPartial).toBe(true)
    expect(tallyFrom(run(), [diff(T0 - M, [line('x', 1, 1)], [])]).tallyPartial).toBe(false)
  })
  it('rows: used up and came in, biggest first, typed items left out', () => {
    let r = run({ costs: [{ id: 'c', key: 'nm', name: 'Nightmare Map', qty: 1, unitChaos: 1 }] })
    r = addToTally(r, diff(T0 + M, [line('big', 1, 100), line('small', 1, 10)], [line('nm', 5, 500), line('scarab', 3, 30)]))
    const rows = tallyRows(r)
    expect(rows.came.map(x => x.key)).toEqual(['big', 'small'])
    expect(rows.used.map(x => x.key)).toEqual(['scarab'])
  })
})

describe('maps and the saved doc', () => {
  it('counts maps left after the start and entered before the end', () => {
    const maps = [{ enteredAt: T0 - 5 * M, leftAt: T0 - M }, { enteredAt: T0 - M, leftAt: T0 + M }, { enteredAt: T0 + 2 * M, leftAt: T0 + 4 * M }, { enteredAt: T0 + 10 * M, leftAt: T0 + 12 * M }]
    expect(mapsIn(run(), maps, T0 + H)).toBe(3)
    expect(mapsIn(run({ stoppedAt: T0 + 5 * M }), maps, T0 + H)).toBe(2)
  })
  it('cleans a broken doc', () => {
    expect(cleanDoc(null)).toEqual({ live: null, done: [] })
    expect(cleanDoc({ live: { id: 1 }, done: [run(), 'x'] }).done).toHaveLength(1)
  })
})

describe('your edits (long shots, counts, prices, added by hand)', () => {
  const tally = { Mirror: { name: 'Mirror', icon: '', added: 1, removed: 0, addedChaos: 4000, removedChaos: 0 }, Map: { name: 'Map', icon: '', added: 0, removed: 10, addedChaos: 0, removedChaos: 100 } }
  const points = [point(T0 + M, 3900)]
  it('a stash item left out comes off profit, and shows as left out', () => {
    const t = runTotals(run({ tally, edits: { 'tally:Mirror': { out: true } } }), points, 10, T0 + H)
    expect(t.profitChaos).toBe(-100)
    expect(t.leftOutChaos).toBe(4000)
  })
  it('a used-up item left out adds its cost back', () => {
    expect(runTotals(run({ tally, edits: { 'tally:Map': { out: true } } }), points, 10, T0 + H).profitChaos).toBe(4000)
  })
  it('your count and price replace what the stash says, keeping the sign', () => {
    expect(runTotals(run({ tally, edits: { 'tally:Mirror': { each: 3000 } } }), points, 10, T0 + H).profitChaos).toBe(2900)
    expect(runTotals(run({ tally, edits: { 'tally:Map': { count: 5 } } }), points, 10, T0 + H).profitChaos).toBe(3950)
    expect(runTotals(run({ tally, edits: { 'tally:Map': { count: 5 } } }), points, 10, T0 + H, new Set(['Map'])).costPerMapChaos).toBe(5)
  })
  it('items added by hand: in adds, out takes off', () => {
    const manual = [{ id: 'a', name: 'Headhunter', count: 1, each: 1000, side: 'in' as const }, { id: 'b', name: 'Scarab', count: 10, each: 5, side: 'out' as const }]
    const t = runTotals(run({ tally, manual }), points, 10, T0 + H)
    expect(t.manualChaos).toBe(950)
    expect(t.profitChaos).toBe(4850)
  })
})

describe('boss fights', () => {
  it('count like maps for per-map figures and typed costs', () => {
    const r = run({ costs: [{ id: 'c', name: "Maven's Writ", key: 'writ', qty: 1, unitChaos: 100, bought: 5 }] })
    const t = runTotals(r, [point(T0, 0), point(T0 + 30 * M, 1000)], { maps: 0, fights: 4 }, T0 + H)
    expect(t.runs).toBe(4)
    expect(t.costChaos).toBe(400)
    expect(t.profitChaos).toBe(600)
    expect(t.perMapChaos).toBe(150)
    expect(t.costPerMapChaos).toBe(100)
    expect(leftOf(r.costs[0], t.runs)).toBe(1)
  })
  it('labels', () => {
    expect(countLabel(3)).toBe('3 maps')
    expect(countLabel(0, 1)).toBe('1 fight')
    expect(countLabel(2, 3)).toBe('2 maps · 3 fights')
    expect([unitOf(2), unitOf(0, 2), unitOf(1, 1)]).toEqual(['map', 'fight', 'run'])
  })
})

describe('Ctrl+Space run card', () => {
  it('shows boss fights and goes per fight', () => {
    const rows = runsLookup({ league: 'Covens', name: 'Maven', startAt: T0, at: T0 + H, profitChaos: 800, maps: 0, fights: 4, perHourChaos: 800, costPerMapChaos: 50, divine: null })('run', { now: T0 + H, divine: null } as unknown as LookupContext)
    const cells = rows[0].sections?.[0].rows?.map(r => `${r.label}: ${r.value}`)
    expect(cells).toContain('Boss fights: 4')
    expect(cells).toContain('Per fight: +200 c')
    expect(cells).toContain('Cost per fight: 50 c')
  })
})
