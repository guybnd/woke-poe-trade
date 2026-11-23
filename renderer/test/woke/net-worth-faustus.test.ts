import { describe, expect, it } from 'vitest'
import { collectAll, listingsQuery, outsideTotals, setMark, toListing } from '@/web/woke/net-worth/faustus'
import type { OutsideRun } from '@/web/woke/net-worth/faustus'
import type { Sale } from '@/web/woke/net-worth/sales'
import { emptyRun, runTotals } from '@/web/woke/net-worth/runs'

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
  it('a sale waits in the Faustus line until collected, then the stash counts it', () => {
    const sales = [item('s', T0 + 3 * M, 100)]
    expect(outsideTotals(run(), sales, RATES).waitingChaos).toBe(100)
    const collected = setMark(run(), 's', { collected: true })
    const o = outsideTotals(collected, sales, RATES)
    expect(o.waitingChaos).toBe(0)
    expect(o.beforeChaos).toBe(0)
  })
  it('a sale from before the run: nothing waits, and once collected it comes off profit', () => {
    const sales = [item('s', T0 + 3 * M, 100)]
    const before = setMark(run(), 's', { before: true })
    expect(outsideTotals(before, sales, RATES).faustusChaos).toBe(0)
    const o = outsideTotals(setMark(before, 's', { collected: true }), sales, RATES)
    expect(o.beforeChaos).toBe(100)
    const t = runTotals(emptyRun('r', 'L', 'x', T0), [], 0, T0 + 20 * M, undefined, o)
    expect(t.profitChaos).toBe(-100)
    expect(t.totalChaos).toBe(-100)
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
  it('marks: cleared ones are dropped, all collected', () => {
    let r = setMark(run(), 'a', { before: true })
    r = setMark(r, 'a', { before: false })
    expect(r.saleMarks).toEqual({})
    r = collectAll(r, [item('a', T0 + M, 1), item('b', T0 - M, 1)])
    expect(r.saleMarks).toEqual({ a: { collected: true } })
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
