// Search detail pane: round amounts of a currency in chaos and divines.
import { describe, it, expect } from 'vitest'
import { convNumber, currencyConversions } from '@/web/woke/search/conversions'

describe('currencyConversions', () => {
  it('shows chaos in divines, and how many a divine buys', () => {
    const c = currencyConversions('Chaos Orb', 1, 90)!
    expect(c.rows).toEqual([
      { amount: 1, chaos: null, div: 1 / 90 },
      { amount: 10, chaos: null, div: 10 / 90 },
      { amount: 100, chaos: null, div: 100 / 90 }
    ])
    expect(c.perDivine).toBe(90)
  })
  it('shows divines in chaos only', () => {
    const c = currencyConversions('Divine Orb', 90, 90)!
    expect(c.rows.map(r => [r.amount, r.chaos, r.div])).toEqual([[1, 90, null], [2, 180, null], [5, 450, null], [10, 900, null]])
    expect(c.perDivine).toBeNull()
  })
  it('uses bigger amounts for cheap currency and small ones for dear', () => {
    expect(currencyConversions('Orb of Alchemy', 0.25, 90)!.rows.map(r => r.amount)).toEqual([10, 100, 1000])
    expect(currencyConversions('Orb of Annulment', 4, 90)!.rows.map(r => r.amount)).toEqual([1, 10, 100])
    expect(currencyConversions('Mirror of Kalandra', 9000, 90)!.rows.map(r => r.amount)).toEqual([1, 2, 5, 10])
    expect(currencyConversions('Orb of Alchemy', 0.25, 90)!.perDivine).toBe(360)
  })
  it('skips divines without a divine price, and anything unpriced', () => {
    expect(currencyConversions('Orb of Annulment', 4, null)!.rows[0]).toEqual({ amount: 1, chaos: 4, div: null })
    expect(currencyConversions('Chaos Orb', 1, null)).toBeNull()
    expect(currencyConversions('Orb of Annulment', 0, 90)).toBeNull()
  })
})

describe('convNumber', () => {
  it('keeps a few useful digits', () => {
    expect(convNumber(1 / 90)).toBe('0.011')
    expect(convNumber(90.3456)).toBe('90.35')
    expect(convNumber(452.4)).toBe('452')
    expect(convNumber(9035)).toBe('9,035')
    expect(convNumber(0)).toBe('0')
  })
})
