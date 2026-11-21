import { describe, expect, it } from 'vitest'
import { groupListings, sortRowsByValue, RowListing } from '@/web/woke/price-insight/listing-rows'
import { toChaos } from '@/web/woke/price-insight/insight'

function listing (id: string, priceAmount: number, priceCurrency: string): RowListing {
  return {
    id,
    priceAmount,
    priceCurrency,
    listedTimes: 1,
    hasFee: false,
    hasNote: false,
    isMine: false,
    accountName: id,
    accountStatus: 'online',
    relativeDate: ''
  }
}

const OPTS = { divine: 180, otherRates: { exalted: 12 } }
const chaosOf = (l: RowListing) => toChaos(l.priceAmount, l.priceCurrency, OPTS)

function order (listings: RowListing[], fn: typeof chaosOf | null, merge = false) {
  return sortRowsByValue(groupListings(listings, { now: 0, merge }), fn).map(r => r.lead.id)
}

describe('sortRowsByValue', () => {
  it('interleaves chaos and divine prices by their chaos value', () => {
    // Trade site order when it thinks a divine is worth ~140c.
    const list = [
      listing('c100', 100, 'chaos'),
      listing('d1', 1, 'divine'), // 180c at the poe.ninja rate
      listing('c150', 150, 'chaos'),
      listing('d1.5', 1.5, 'divine'), // 270c
      listing('c200', 200, 'chaos')
    ]
    expect(order(list, chaosOf)).toEqual(['c100', 'c150', 'd1', 'c200', 'd1.5'])
  })

  it('values other currencies through their poe.ninja rate', () => {
    const list = [listing('e10', 10, 'exalted'), listing('c100', 100, 'chaos')]
    expect(order(list, chaosOf)).toEqual(['c100', 'e10'])
  })

  it('puts rows it cannot value last, in the trade site order', () => {
    const list = [
      listing('odd1', 5, 'some-shard'),
      listing('c50', 50, 'chaos'),
      listing('odd2', 1, 'other-shard'),
      listing('c20', 20, 'chaos')
    ]
    expect(order(list, chaosOf)).toEqual(['c20', 'c50', 'odd1', 'odd2'])
  })

  it('keeps equal prices in the trade site order', () => {
    const list = [listing('a', 180, 'chaos'), listing('b', 1, 'divine'), listing('c', 180, 'chaos')]
    expect(order(list, chaosOf)).toEqual(['a', 'b', 'c'])
  })

  it('leaves the order alone without a divine rate', () => {
    const list = [listing('d1', 1, 'divine'), listing('c150', 150, 'chaos')]
    expect(order(list, null)).toEqual(['d1', 'c150'])
  })

  it('sorts merged rows by their shared price', () => {
    const list = [
      listing('d1-a', 1, 'divine'),
      listing('c150', 150, 'chaos'),
      listing('d1-b', 1, 'divine')
    ]
    const rows = sortRowsByValue(groupListings(list, { now: 0, merge: true }), chaosOf)
    expect(rows.map(r => r.lead.id)).toEqual(['c150', 'd1-a'])
    expect(rows[1].count).toBe(2)
  })
})
