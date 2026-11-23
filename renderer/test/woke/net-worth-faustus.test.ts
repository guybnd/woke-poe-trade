import { describe, expect, it } from 'vitest'
import { arrivalsOf, leftOver, listingsQuery, outsideTotals, setBefore, setEdit, startListingIds, toListing } from '@/web/woke/net-worth/faustus'
import type { HeldItem, OutsideRun } from '@/web/woke/net-worth/faustus'
import type { Sale } from '@/web/woke/net-worth/sales'
import { addToTally, emptyRun, runTotals } from '@/web/woke/net-worth/runs'

const M = 60_000
const H = 3_600_000
const T0 = 1_000_000_000
const RATES = { chaos: 1, divine: 200 }
const item = (id: string, at: number, amount: number, currency = 'chaos'): Sale =>
  ({ id, at, name: id, typeLine: id, baseType: id, frameType: 3, icon: '', stack: 1, price: { amount, currency } })
const run = (extra: Partial<OutsideRun> = {}): OutsideRun => ({ startAt: T0, ...extra })

describe('outside the stash', () => {
  it('counts listings made during the run at their asking price', () => {
    const r = run({ faustus: { at: T0 + 10 * M, listings: [item('a', T0 - M, 50), item('b', T0 + M, 2, 'divine'), item('c', T0 + 2 * M, 30)] } })
    const o = outsideTotals(r, [], RATES)
    expect(o.listed.map(x => x.item.id)).toEqual(['c', 'b'])
    expect(o.listedChaos).toBe(430)
    expect(o.faustusChaos).toBe(430)
  })
  it('a sale waits at Faustus until a read sees its currency come in', () => {
    const sales = [item('s', T0 + 3 * M, 2, 'divine')]
    expect(outsideTotals(run(), sales, RATES).waitingChaos).toBe(400)
    // 1 div isn't the sale's 2: it stays. Then 3 come in: collected.
    const one = run({ arrivals: [{ at: T0 + 5 * M, c: 'divine', n: 1 }] })
    expect(outsideTotals(one, sales, RATES).waitingChaos).toBe(400)
    const all = run({ arrivals: [{ at: T0 + 5 * M, c: 'divine', n: 1 }, { at: T0 + 6 * M, c: 'divine', n: 3 }] })
    expect(outsideTotals(all, sales, RATES).waitingChaos).toBe(0)
    expect(outsideTotals(all, sales, RATES).sold[0].collected).toBe(true)
  })
  it('one arrival collects several sales, oldest first, while it has enough', () => {
    const sales = [item('a', T0 + M, 30), item('b', T0 + 2 * M, 50), item('c', T0 + 3 * M, 10)]
    const r = run({ arrivals: [{ at: T0 + 5 * M, c: 'chaos', n: 85 }] })
    // 30 + 50 fit; 10 more doesn't (5 left).
    expect(outsideTotals(r, sales, RATES).sold.filter(x => x.collected).map(x => x.item.id).sort()).toEqual(['a', 'b'])
  })
  it('a run saved with sales ticked collected keeps them', () => {
    const r = run({ saleMarks: { s: { collected: true } } })
    expect(outsideTotals(r, [item('s', T0 + M, 10)], RATES).waitingChaos).toBe(0)
  })
  it('a listing from the start that was repriced during the run is not the run\'s', () => {
    const r = run({ startListings: ['x'], faustus: { at: T0 + 9 * M, listings: [item('x', T0 + 5 * M, 40)] } })
    expect(outsideTotals(r, [], RATES).listedChaos).toBe(0)
  })
  it('currency that came in before the sale, or in another currency, collects nothing', () => {
    const sales = [item('s', T0 + 3 * M, 2, 'divine')]
    const r = run({ arrivals: [{ at: T0 + 2 * M, c: 'divine', n: 5 }, { at: T0 + 4 * M, c: 'chaos', n: 500 }] })
    expect(outsideTotals(r, sales, RATES).waitingChaos).toBe(400)
  })
  it('a sale late in the sales file is still collected by a read after it', () => {
    // The read came first; the sale shows up in the history later.
    const r = run({ arrivals: [{ at: T0 + 10 * M, c: 'chaos', n: 100 }] })
    expect(outsideTotals(r, [item('s', T0 + 5 * M, 100)], RATES).waitingChaos).toBe(0)
  })
  it('an item listed when the run started is from before: nothing waits, and once collected it comes off profit', () => {
    const sales = [item('s', T0 + 3 * M, 100)]
    const before = run({ startListings: ['s'] })
    const o = outsideTotals(before, sales, RATES)
    expect(o.sold[0].before).toBe(true)
    expect(o.faustusChaos).toBe(0)
    const got = outsideTotals({ ...before, arrivals: [{ at: T0 + 4 * M, c: 'chaos', n: 100 }] }, sales, RATES)
    expect(got.beforeChaos).toBe(100)
    const t = runTotals(emptyRun('r', 'L', 'x', T0), [], 0, T0 + 20 * M, undefined, got)
    expect(t.profitChaos).toBe(-100)
    // Your override wins.
    expect(outsideTotals(setBefore(before, 's', false), sales, RATES).waitingChaos).toBe(100)
  })
  it('a listing that sold since the read counts once, as the sale', () => {
    const r = run({ faustus: { at: T0 + M, listings: [item('x', T0 + M, 40)] } })
    const o = outsideTotals(r, [item('x', T0 + 5 * M, 40)], RATES)
    expect(o.listed).toHaveLength(0)
    expect(o.faustusChaos).toBe(40)
  })
  it('sales outside the run, and after Stop, are left out', () => {
    const o = outsideTotals(run({ stoppedAt: T0 + 10 * M }), [item('a', T0 - M, 5), item('b', T0 + 11 * M, 5), item('c', T0 + M, 5)], RATES)
    expect(o.sold.map(x => x.item.id)).toEqual(['c'])
  })
  it('a currency without a rate is not counted, and says so', () => {
    const o = outsideTotals(run(), [item('a', T0 + M, 5, 'mirror')], RATES)
    expect(o.waitingChaos).toBe(0)
    expect(o.unpriced).toBe(1)
  })
  it('a read\'s currency arrivals: net in, per currency', () => {
    const d = { at: 5, added: [{ key: 'Divine Orb', name: '', icon: '', count: 3, chaos: 600 }, { key: 'Chaos Orb', name: '', icon: '', count: 10, chaos: 10 }], removed: [{ key: 'Divine Orb', name: '', icon: '', count: 1, chaos: 200 }, { key: 'Chaos Orb', name: '', icon: '', count: 20, chaos: 20 }], netChaos: 0 }
    expect(arrivalsOf(d)).toEqual([{ at: 5, c: 'divine', n: 2 }])
    expect(addToTally(emptyRun('r', 'L', 'x', 1), d).arrivals).toEqual([{ at: 5, c: 'divine', n: 2 }])
  })
})

const held = (id: string, name: string, at: number, unitChaos: number, extra: Partial<HeldItem> = {}): HeldItem =>
  ({ id, key: name, name, icon: '', count: 1, unitChaos, at, tallyAdded: 0, ...extra })

describe('held outside the stash (the run hotkey)', () => {
  it('counts until the stash, a listing or a sale shows it', () => {
    const h = held('h', 'The Dark Seer', T0 + M, 800)
    expect(outsideTotals(run({ held: [h] }), [], RATES).heldChaos).toBe(800)
    // Stashed: the stash counts it now.
    expect(outsideTotals(run({ held: [h], tally: { 'The Dark Seer': { added: 1 } } }), [], RATES).heldChaos).toBe(0)
    // Listed: the listing counts it.
    const listedRun = run({ held: [h], faustus: { at: T0 + 9 * M, listings: [item('The Dark Seer', T0 + 2 * M, 900)] } })
    const o = outsideTotals(listedRun, [], RATES)
    expect([o.heldChaos, o.listedChaos]).toEqual([0, 900])
    // Sold: the sale counts it.
    expect(outsideTotals(run({ held: [h] }), [item('The Dark Seer', T0 + 3 * M, 850)], RATES).faustusChaos).toBe(850)
  })
  it('a rolled map held by its base is taken by its listing under the map\'s rare name', () => {
    const h = held('h', 'Cemetery Map', T0 + M, 20, { key: 'R:Cemetery Map|T16', base: 'Cemetery Map' })
    const rare: Sale = { id: 'l', at: T0 + 2 * M, name: 'Dread Cell', typeLine: 'Cemetery Map', baseType: 'Cemetery Map', frameType: 2, mapTier: 16, icon: '', stack: 1, price: { amount: 30, currency: 'chaos' } }
    const o = outsideTotals(run({ held: [h], faustus: { at: T0 + 9 * M, listings: [rare] } }), [], RATES)
    expect([o.heldChaos, o.listedChaos]).toEqual([0, 30])
    const magic: Sale = { ...rare, id: 's', name: '', typeLine: 'Fecund Cemetery Map of Bameth', frameType: 1 }
    expect(outsideTotals(run({ held: [h] }), [magic], RATES).heldChaos).toBe(0)
    // Another base's rare map leaves it held.
    expect(outsideTotals(run({ held: [h] }), [{ ...magic, typeLine: 'Strand Map', baseType: 'Strand Map' }], RATES).heldChaos).toBe(20)
    // A held T16 map isn't taken by a T14 sale of the same base.
    const t16 = held('h', 'Cemetery Map', T0 + M, 20, { key: 'R:Cemetery Map|T16', base: 'Cemetery Map', mapTier: 16 })
    expect(outsideTotals(run({ held: [t16] }), [{ ...magic, mapTier: 14 }], RATES).heldChaos).toBe(20)
    expect(outsideTotals(run({ held: [t16] }), [magic], RATES).heldChaos).toBe(0)
  })
  it('a stack already in the stash when added doesn\'t take it', () => {
    const h = held('h', 'Reality Fragment', T0 + M, 50, { count: 2, tallyAdded: 3 })
    expect(outsideTotals(run({ held: [h], tally: { 'Reality Fragment': { added: 3 } } }), [], RATES).heldChaos).toBe(100)
    expect(outsideTotals(run({ held: [h], tally: { 'Reality Fragment': { added: 4 } } }), [], RATES).heldChaos).toBe(50)
  })
  it('a second hold of the same item after the first was stashed', () => {
    const a = held('a', 'The Doctor', T0 + M, 100)
    const b = held('b', 'The Doctor', T0 + 3 * M, 100, { tallyAdded: 1 })
    expect(outsideTotals(run({ held: [a, b], tally: { 'The Doctor': { added: 1 } } }), [], RATES).heldChaos).toBe(100)
    expect(outsideTotals(run({ held: [a, b], tally: { 'The Doctor': { added: 2 } } }), [], RATES).heldChaos).toBe(0)
  })
  it('carries over once: the next run passes on only its own', () => {
    const first = run({ held: [held('h', 'Manastorm', T0 + M, 300)] })
    const second = run({ startAt: T0 + H, ...leftOver(first, [], RATES) })
    expect(leftOver(second, [], RATES)).toEqual({})
  })
  it('a left over item carries to the next run, not counted: its stash arrival, listing and sale are from before', () => {
    const last = run({ held: [held('h', 'Manastorm', T0 + M, 300)] })
    const carry = leftOver(last, [], RATES)
    expect(carry.carried?.map(c => c.name)).toEqual(['Manastorm'])
    const next = run({ startAt: T0 + H, ...carry })
    expect(outsideTotals(next, [], RATES).faustusChaos).toBe(0)
    expect(outsideTotals({ ...next, tally: { Manastorm: { added: 1 } } }, [], RATES).beforeChaos).toBe(300)
    const sold = outsideTotals(next, [item('Manastorm', T0 + H + M, 320)], RATES)
    expect(sold.sold[0].before).toBe(true)
    expect(sold.faustusChaos).toBe(0)
    const listed = outsideTotals({ ...next, faustus: { at: T0 + 2 * H, listings: [item('Manastorm', T0 + H + M, 320)] } }, [], RATES)
    expect(listed.listedChaos).toBe(0)
  })
  it('sales left uncollected carry over: collected in the next run, off its profit', () => {
    const s = item('s', T0 + M, 100)
    const carry = leftOver(run(), [s], RATES)
    expect(carry.carriedSales).toEqual(['s'])
    const next = run({ startAt: T0 + H, ...carry, arrivals: [{ at: T0 + H + M, c: 'chaos', n: 100 }] })
    expect(outsideTotals(next, [s], RATES).beforeChaos).toBe(100)
  })
})

describe('listings read', () => {
  it('a listing the Listed doc saw by the start is from before, though Start\'s read (100 at most) missed it', () => {
    const read = [item('new', T0 + M, 10), item('old', T0 - M, 10)]
    const ids = startListingIds(read, { older: T0 - H, later: T0 + 2 * M }, T0)
    expect(ids.sort()).toEqual(['old', 'older'])
    // Its sale during the run is from before, not run profit.
    const o = outsideTotals(run({ startListings: ids }), [item('older', T0 + 5 * M, 300)], RATES)
    expect(o.sold[0].before).toBe(true)
    expect(o.faustusChaos).toBe(0)
  })
  it('keeps merchant listings with a price only', () => {
    const base = { id: 'i', indexedAt: new Date(T0).toISOString(), priceAmount: 3, priceCurrency: 'divine', listedItem: { name: 'Mageblood', typeLine: 'Heavy Belt', frameType: 3, icon: 'x' } }
    expect(toListing({ ...base, hasFee: true })).toMatchObject({ id: 'i', at: T0, name: 'Mageblood', price: { amount: 3, currency: 'divine' } })
    expect(toListing({ ...base, hasFee: false })).toBeNull()
    expect(toListing({ ...base, hasFee: true, priceCurrency: 'no price' })).toBeNull()
    // The item's id, as the trade history has it, so a sold listing matches its sale.
    expect(toListing({ ...base, hasFee: true, listedItem: { ...base.listedItem, id: 'item1' } })?.id).toBe('item1')
  })
  it('asks for your merchant listings, newest first', () => {
    const q = listingsQuery('Guy#1234')
    expect(q.query.status.option).toBe('securable')
    expect(q.query.filters.trade_filters.filters.account.input).toBe('Guy#1234')
    expect(q.sort).toEqual({ indexed: 'desc' })
  })
})

describe('long shots and your prices outside the stash', () => {
  it('a listing left out counts nowhere; its sale stays left out, and once collected comes off profit', () => {
    const r = run({ faustus: { at: T0 + 10 * M, listings: [item('b', T0 + M, 20, 'divine')] }, edits: { 'item:b': { out: true } } })
    const o = outsideTotals(r, [], RATES)
    expect([o.listedChaos, o.leftOutChaos, o.listed[0].leftOut]).toEqual([0, 4000, true])
    const sold = { ...r, arrivals: [{ at: T0 + 6 * M, c: 'divine', n: 20 }] }
    const s = outsideTotals(sold, [item('b', T0 + 5 * M, 20, 'divine')], RATES)
    expect([s.waitingChaos, s.leftOutCollectedChaos]).toEqual([0, 4000])
  })
  it('your price on a listing replaces the asking price', () => {
    const r = run({ faustus: { at: T0 + 10 * M, listings: [item('b', T0 + M, 20, 'divine')] }, edits: { 'item:b': { each: 50 } } })
    const o = outsideTotals(r, [], RATES)
    expect(o.listedChaos).toBe(50)
    expect(o.listed[0].edited).toBe(true)
  })
  it('setEdit merges, and clears an edit with nothing left', () => {
    const a = setEdit(run(), 'item:x', { out: true })
    expect(a.edits).toEqual({ 'item:x': { out: true } })
    expect(setEdit(a, 'item:x', { out: false }).edits).toEqual({})
    expect(setEdit(setEdit(a, 'item:x', { each: 5 }), 'item:x', null).edits).toEqual({})
  })
})
