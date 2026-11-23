import { describe, expect, it } from 'vitest'
import { arrivalsOf, listingsQuery, outsideTotals, setBefore, toListing } from '@/web/woke/net-worth/faustus'
import type { OutsideRun } from '@/web/woke/net-worth/faustus'
import type { Sale } from '@/web/woke/net-worth/sales'
import { addToTally, emptyRun, runTotals } from '@/web/woke/net-worth/runs'

const M = 60_000
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

describe('listings read', () => {
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
