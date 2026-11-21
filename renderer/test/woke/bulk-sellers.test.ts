import { describe, expect, it } from 'vitest'
import { bulkOnly, bulkSellerCount } from '@/web/woke/price-insight/bulk-sellers'

const l = (accountName: string, priceAmount: number, listedTimes = 1, extra: { stackSize?: number, priceCurrency?: string } = {}) =>
  ({ accountName, priceAmount, priceCurrency: extra.priceCurrency ?? 'chaos', listedTimes, stackSize: extra.stackSize })

describe('bulkOnly', () => {
  it('keeps a seller grouped to several copies', () => {
    expect(bulkOnly([l('a', 2, 22), l('b', 2)]).map(x => x.accountName)).toEqual(['a'])
  })

  it('counts a seller\'s separate instant-buyout listings at one price', () => {
    const out = bulkOnly([l('a', 2), l('b', 2), l('a', 2), l('c', 3)])
    expect(out.map(x => x.accountName)).toEqual(['a', 'a'])
  })

  it('does not add copies across prices or currencies', () => {
    expect(bulkOnly([l('a', 2), l('a', 3), l('a', 2, 1, { priceCurrency: 'divine' })])).toEqual([])
  })

  it('keeps a stack of more than one', () => {
    expect(bulkOnly([l('a', 1, 1, { stackSize: 4 }), l('b', 1, 1, { stackSize: 1 })]).map(x => x.accountName)).toEqual(['a'])
  })

  it('does not add copies of a different kind', () => {
    const a = { ...l('a', 2), corrupted: true }
    const b = { ...l('a', 2), corrupted: false }
    expect(bulkOnly([a, b], x => String(x.corrupted))).toEqual([])
  })

  it('counts one seller per account and price', () => {
    expect(bulkSellerCount([l('a', 2), l('a', 2), l('b', 5, 3), l('c', 1)])).toBe(2)
  })
})
