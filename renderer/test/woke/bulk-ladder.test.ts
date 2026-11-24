import { describe, it, expect } from 'vitest'
import { ladderSteps, fillPlan } from '@/web/woke/price-insight/bulk-ladder'

const offer = (accountName: string, exchangeAmount: number, stock: number, itemAmount = 1, isMine = false) =>
  ({ accountName, exchangeAmount, itemAmount, stock, isMine })

// Guy's Evocator of Beidat screenshot, chaos side.
const MAPS = [
  offer('a', 1, 2), offer('b', 1, 2), offer('c', 2, 1), offer('d', 2, 7),
  offer('e', 3, 1), offer('f', 3, 39), offer('g', 3, 1), offer('h', 3, 36),
  offer('i', 4, 16), offer('j', 5, 1), offer('k', 5, 76)
]

describe('ladderSteps', () => {
  it('groups offers by price, with stock added up and sellers counted', () => {
    const steps = ladderSteps(MAPS)
    expect(steps.map(s => [s.key, s.stock, s.sellers])).toEqual([
      ['1', 4, 2], ['2', 8, 2], ['3', 77, 4], ['4', 16, 1], ['5', 77, 2]
    ])
  })

  it('puts lots at the same price per item on one step, cheapest first', () => {
    const steps = ladderSteps([offer('a', 15, 100, 10), offer('b', 3, 50, 2), offer('c', 1.5, 9, 1)])
    expect(steps.map(s => s.key)).toEqual(['1.5'])
    expect(steps[0].sellers).toBe(3)
  })

  it('counts one seller once on a step, and leaves your own stock out', () => {
    expect(ladderSteps([offer('a', 2, 1), offer('a', 2, 5)])[0].sellers).toBe(1)
    expect(ladderSteps([offer('me', 2, 9, 1, true), offer('a', 2, 5)])[0].stock).toBe(5)
  })
})

describe('fillPlan', () => {
  it('buys from the cheapest up and adds the cost', () => {
    const plan = fillPlan(MAPS, 20)
    expect(plan.picks.map(p => [p.offer.accountName, p.items])).toEqual([['a', 2], ['b', 2], ['c', 1], ['d', 7], ['e', 1], ['f', 7]])
    expect(plan.items).toBe(20)
    expect(plan.cost).toBe(2 + 2 + 2 + 14 + 3 + 21)
    expect(plan.short).toBe(false)
  })

  it('buys in the seller\'s lots and never past their stock', () => {
    const plan = fillPlan([offer('a', 7, 25, 10), offer('b', 1, 100)], 15)
    // One lot of 10 from a; the last 5 cost less as singles from b than a second lot of a.
    expect(plan.picks.map(p => [p.offer.accountName, p.lots, p.items, p.cost])).toEqual([['a', 1, 10, 7], ['b', 5, 5, 5]])
    // Never past their stock: 25 holds two lots of 10.
    expect(fillPlan([offer('a', 7, 25, 10)], 40).picks[0].lots).toBe(2)
  })

  it('skips your own offers and ones that cannot fill a lot', () => {
    const plan = fillPlan([offer('me', 1, 50, 1, true), offer('thin', 1, 5, 10), offer('ok', 2, 3)], 2)
    expect(plan.picks.map(p => p.offer.accountName)).toEqual(['ok'])
  })

  it('takes a single over a cheaper big lot when the single costs less for what is left', () => {
    const plan = fillPlan([offer('lot', 50, 500, 100), offer('one', 0.6, 5)], 1)
    expect(plan.picks.map(p => [p.offer.accountName, p.items])).toEqual([['one', 1]])
    expect(plan.cost).toBe(0.6)
  })

  it('still takes the big lot when it is all there is', () => {
    const plan = fillPlan([offer('lot', 50, 500, 100)], 1)
    expect(plan.picks.map(p => [p.offer.accountName, p.items])).toEqual([['lot', 100]])
  })

  it('says when fewer are on offer than asked', () => {
    const plan = fillPlan([offer('a', 1, 3)], 10)
    expect(plan.items).toBe(3)
    expect(plan.short).toBe(true)
  })
})
