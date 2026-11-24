// Bug hunt 3 (WOKEPOET-522): Net worth and Strategy runs fixes.
import { describe, expect, it, vi } from 'vitest'
import { addToTally, emptyRun, isMapCostItem, runStash, runTotals } from '@/web/woke/net-worth/runs'
import type { Run } from '@/web/woke/net-worth/runs'
import { leftOver, outsideTotals, toListing } from '@/web/woke/net-worth/faustus'
import type { Sale } from '@/web/woke/net-worth/sales'
import { baselineOf, emptyHistory, recordRead, sinceYesterday, valueStash, withTabShift } from '@/web/woke/net-worth/valuation'
import type { DiffLine, Priced, PriceOf, StashDiff, StashItemLike, Valuation } from '@/web/woke/net-worth/valuation'
import { priceSpikes, seriesFor } from '@/web/woke/net-worth/ledger'
import type { LedgerPoint } from '@/web/woke/net-worth/ledger'

vi.mock('@/web/woke/ui/layer', () => ({ toast: () => {} }))
vi.mock('@/web/woke/shared/host', () => ({ hostRequest: async () => null }))
vi.mock('@/web/Config', () => ({ AppConfig: () => ({ leagueId: 'L' }) }))
vi.mock('@/web/woke/net-worth/faustus-read', () => ({ readFaustus: async () => ({ at: 0, listings: [] }) }))
vi.mock('@/web/woke/net-worth/run-store', () => ({ loadRuns: async () => {}, runsDoc: { value: { live: null, done: [] } }, startRun: async () => {} }))
vi.mock('@/web/woke/net-worth/sales-store', () => ({ loadSales: async () => {}, rates: { value: {} }, sales: { value: [] } }))
const { withGap } = await import('@/web/woke/net-worth/run-start')

const M = 60_000
const H = 3_600_000
const T0 = 1_000_000_000
const DIV = 200
const cats = (currency: number, cards = 0) => ({ currency, fragments: 0, cards, gear: 0, other: 0 })
const point = (at: number, netChaos: number | null, extra: Partial<LedgerPoint> = {}): LedgerPoint =>
  ({ at, chaos: 0, divine: DIV, byCategory: cats(0), netChaos, top: [], ...extra })
const line = (key: string, count: number, chaos: number) => ({ key, name: key, icon: '', count, chaos })
const diff = (at: number, added: DiffLine[], removed: DiffLine[] = []): StashDiff =>
  ({ at, added, removed, netChaos: added.reduce((s, l) => s + l.chaos, 0) - removed.reduce((s, l) => s + l.chaos, 0) })
const run = (extra: Partial<Run> = {}): Run => ({ ...emptyRun('r1', 'L', 'Strand', T0), ...extra })
const sale = (id: string, at: number, amount: number, currency = 'chaos'): Sale =>
  ({ id, at, name: id, typeLine: id, baseType: id, frameType: 6, icon: '', stack: 1, price: { amount, currency } })

describe('a past run once its reads leave the chart', () => {
  it('keeps the stash change it had at Stop', () => {
    const done = run({ stoppedAt: T0 + H, final: { profitChaos: 500, maps: 5, perMapChaos: 100, perHourChaos: 500, stashChaos: 500 } })
    const all = [point(T0, null), point(T0 + 10 * M, 300), point(T0 + 20 * M, 200)]
    expect(runStash(done, all)).toBe(500)
    // The ledger kept only newer reads: the kept figure, not 0.
    const trimmed = [point(T0 + 2 * H, 10)]
    expect(runStash(done, trimmed)).toBe(500)
    expect(runTotals(done, trimmed, 5, T0 + 3 * H).profitChaos).toBe(500)
    expect(runTotals(done, [], 5, T0 + 3 * H).profitChaos).toBe(500)
    // While the reads still cover it, they count (an edit can change them).
    expect(runStash(done, [point(T0, null), point(T0 + 10 * M, 100)])).toBe(100)
  })
})

describe('cost per map', () => {
  it('maps, scarabs and fragments are map-cost items', () => {
    expect(isMapCostItem('Strand Map', 'other')).toBe(true)
    expect(isMapCostItem('Strand Map (T16)', 'other')).toBe(true)
    expect(isMapCostItem('Gilded Ambush Scarab', 'fragments')).toBe(true)
    expect(isMapCostItem('Mapmaker\'s Fate', 'cards')).toBe(false)
  })
  it('the tally keeps a map cost used up reads ago (dock card and Ctrl+Space)', () => {
    let r = run()
    r = addToTally(r, diff(T0 + M, [], [{ ...line('Gilded Ambush Scarab', 10, 40), cat: 'fragments' as const }]))
    // Two reads later the scarab is in neither the stash nor its last read.
    r = addToTally(r, diff(T0 + 20 * M, [line('Chaos Orb', 5, 5)]))
    expect(runTotals(r, [], 4, T0 + H).costPerMapChaos).toBe(10)
  })
})

describe('carry-over collected between runs', () => {
  it('a sale collected after Stop and before the next start is not carried', () => {
    const a = run({ stoppedAt: T0 + H })
    const sales = [sale('doc', T0 + 30 * M, 300)]
    expect(leftOver(a, sales, { chaos: 1, divine: DIV }).carriedSales).toEqual(['doc'])
    // Collected in hideout between the runs.
    const gap = [diff(T0 + H + 5 * M, [line('Chaos Orb', 300, 300)])]
    expect(leftOver(withGap(a, gap, T0 + H + 10 * M), sales, { chaos: 1, divine: DIV }).carriedSales).toBeUndefined()
    // The window stays the last run's.
    expect(withGap(a, gap, T0 + H + 10 * M).stoppedAt).toBe(T0 + H)
  })
  it('a read after the next start is not part of the gap', () => {
    const a = run({ stoppedAt: T0 + H })
    const g = withGap(a, [diff(T0 + 2 * H, [line('Chaos Orb', 300, 300)])], T0 + H + 10 * M)
    expect(g.arrivals).toBeUndefined()
  })
})

describe('the read waiting on Stop', () => {
  it('a run capped at the press leaves a later read out of the tally', () => {
    const r = run({ costs: [{ id: 'c', key: 'Strand Map', name: 'Strand Map', qty: 1, unitChaos: 10 }] })
    const capped = { ...r, stoppedAt: T0 + H }
    expect(addToTally(capped, diff(T0 + H + 30_000, [line('Strand Map', 5, 50)]))).toBe(capped)
  })
})

describe('ignoring a fake price', () => {
  const card = (typeLine: string, stack: number): StashItemLike => ({ name: '', typeLine, baseType: typeLine, frame: 6, stack, icon: '' })
  const tabs = [{ name: 'Cards', id: 't1', items: [card('The Witch', 13)] }]
  const pricesOf = (p: Record<string, Priced>): PriceOf => (i) => p[i.typeLine] ?? null
  const normal = pricesOf({ 'The Witch': { chaos: 1, category: 'cards', thin: true } })
  const fake = pricesOf({ 'The Witch': { chaos: 7075, category: 'cards', thin: true } })

  it('does not make it the trusted price it is held against later', () => {
    const b0 = baselineOf(valueStash(tabs, normal))
    const ignored = valueStash(tabs, fake, { prices: {}, ignored: ['The Witch'] }, { before: b0, now: T0 + H })
    const b1 = baselineOf(ignored)
    expect(b1['The Witch'].ref).toBe(1)
    // Un-ignored while the fake is still up: still held at 1c.
    const back = valueStash(tabs, fake, undefined, { before: b1, now: T0 + 2 * H })
    expect(back.lines.find(l => l.key === 'The Witch')!.unitChaos).toBe(1)
  })
})

describe('today after picking other tabs', () => {
  const v = (chaos: number): Valuation => ({ chaos, byCategory: cats(chaos), lines: [], unpricedLines: [], ignoredLines: [], unpriced: 0 } as unknown as Valuation)
  const day = (d: number, h: number) => new Date(2026, 10, d, h).getTime()

  it('leaves the tabs added out of today', () => {
    let h = recordRead(emptyHistory(), v(1000), 100, day(23, 22))
    h = recordRead(h, v(1000), 100, day(24, 9))
    // A 5,000c tab added at the next read, nothing else changed.
    h = withTabShift(recordRead(h, v(6000), 100, day(24, 10)), 1000, 6000, 100, day(24, 10))
    expect(sinceYesterday(h, 6000, 100, day(24, 10))).toBeCloseTo(0)
    // What comes in after counts.
    expect(sinceYesterday(h, 6500, 100, day(24, 11))).toBeCloseTo(5)
    // Tomorrow starts clean.
    expect(sinceYesterday(h, 6000, 100, day(25, 9))).toBeCloseTo(0)
  })
})

describe('a divine rate swing is not a price glitch', () => {
  it('a stash of divines stays flat in divines', () => {
    const p = (at: number, chaos: number, divine: number): LedgerPoint => ({ at, chaos, divine, byCategory: cats(chaos), netChaos: 0, top: [] })
    const reads = [p(1, 15000, 150), p(2, 20000, 200), p(3, 15000, 150)]
    expect(priceSpikes(reads).size).toBe(0)
    expect(seriesFor(reads, {}, 'league', 4, 150).map(s => Math.round(s.div))).toEqual([100, 100, 100])
  })
  it('a card glitch still is one', () => {
    const p = (at: number, chaos: number, divine: number): LedgerPoint => ({ at, chaos, divine, byCategory: cats(0, chaos), netChaos: 0, top: [] })
    expect([...priceSpikes([p(1, 10000, 200), p(2, 20000, 205), p(3, 10000, 200)])]).toEqual([2])
  })
})

describe('Faustus listings', () => {
  const base = { id: 'x', indexedAt: new Date(T0).toISOString(), hasFee: true, priceAmount: 15, priceCurrency: 'chaos' }
  it('keep a gem\'s level and quality, a map\'s tier and links, as a sale does', () => {
    const gem = toListing({ ...base, listedItem: { id: 'g', typeLine: 'Vaal Grace', frameType: 4, properties: [{ name: 'Level', values: [['21', 0]] }, { name: 'Quality', values: [['+20%', 1]], type: 6 }] } })
    expect(gem).toMatchObject({ gemLevel: 21, quality: 20 })
    const map = toListing({ ...base, listedItem: { id: 'm', typeLine: 'Strand Map', frameType: 2, properties: [{ name: 'Map Tier', values: [['14', 0]] }] } })
    expect(map?.mapTier).toBe(14)
    const sockets = [0, 0, 0, 0, 0, 0].map(group => ({ group, sColour: 'R' }))
    expect(toListing({ ...base, listedItem: { id: 'a', name: 'Carcass Jack', typeLine: 'Varnished Coat', frameType: 3, sockets } })?.links).toBe(6)
    // A 4-link isn't a links variant.
    expect(toListing({ ...base, listedItem: { id: 'b', frameType: 3, sockets: sockets.slice(0, 4) } })?.links).toBeUndefined()
  })
  it('a held map matches only a listing of its tier', () => {
    const held = { id: 'h', icon: '', key: 'Strand Map (T16)', name: 'Strand Map', base: 'Strand Map', mapTier: 16, count: 1, unitChaos: 50, at: T0 + M, tallyAdded: 0 }
    const t14 = toListing({ ...base, indexedAt: new Date(T0 + 5 * M).toISOString(), listedItem: { id: 'l', typeLine: 'Strand Map', baseType: 'Strand Map', frameType: 2, properties: [{ name: 'Map Tier', values: [['14', 0]] }] } })!
    const o = outsideTotals({ startAt: T0, held: [held], faustus: { at: T0 + 10 * M, listings: [t14] } }, [], { chaos: 1, divine: DIV })
    expect(o.held.map(h => h.left)).toEqual([1])
  })
})

describe('the dock card counts your listings as the window does', () => {
  it("the window's worth, else the ask; sold and taken-down ones out", async () => {
    const { listedTotal } = await import('@/web/woke/net-worth/pending-glance')
    const g = { league: 'L', readAt: T0, items: [['a', T0 - H, 120, 'chaos'], ['b', T0 - H, 1, 'divine'], ['c', T0, 30, 'chaos']] as Array<[string, number, number, string]> }
    // 'a' priced by the window at 100; 'c' new since (its ask); 'z' taken down.
    const w = { league: 'L', at: T0 - M, items: [['a', 100], ['z', 999]] as Array<[string, number]> }
    expect(listedTotal(g, w, [], DIV)).toBe(100 + 200 + 30)
    // 'b' sold after it was listed, read after the worth was saved: out.
    expect(listedTotal(g, w, [{ id: 'b', at: T0 - 30 * M }], DIV)).toBe(130)
    // Another league's worth doesn't apply.
    expect(listedTotal(g, { ...w, league: 'X' }, [], DIV)).toBe(120 + 200 + 30)
    expect(listedTotal(null, w, [], DIV)).toBe(0)
  })
})
