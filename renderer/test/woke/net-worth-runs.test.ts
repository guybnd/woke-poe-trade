import { describe, expect, it } from 'vitest'
import { addToTally, cleanDoc, emptyRun, leftOf, lineCost, mapsIn, runTotals, tallyFrom, tallyRows } from '@/web/woke/net-worth/runs'
import type { Run } from '@/web/woke/net-worth/runs'
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
