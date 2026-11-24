// What sellers with enough stock ask per item on the exchange.
import { describe, expect, it } from 'vitest'
import { buildBulkInsight, bulkAmount, bulkSideWaiting, pickBulkMarket, bulkSpread, spreadText } from '@/web/woke/price-insight/bulk-insight'
import type { BulkListing } from '@/web/woke/price-insight/bulk-insight'

let id = 0
function offer (each: number, stock: number, over: Partial<BulkListing> = {}): BulkListing {
  return { exchangeAmount: each, itemAmount: 1, stock, accountName: `s${id++}`, isMine: false, ...over }
}

describe('buildBulkInsight', () => {
  it('leaves out offers without stock for the amount you hold, and says how many', () => {
    const insight = buildBulkInsight([offer(15, 3), offer(17, 62), offer(18, 210), offer(18, 55)], 40)!
    expect(insight.lowStock).toBe(1)
    expect(insight.low).toBe(17)
    expect(insight.fair).toBe(18)
    expect(insight.fewWithStock).toBe(false)
  })

  it('counts sellers, not rows, when asking whether enough hold that amount', () => {
    const rows = [
      offer(10, 100, { accountName: 'a' }),
      offer(11, 100, { accountName: 'a' }),
      offer(12, 100, { accountName: 'a' }),
      offer(5, 3, { accountName: 'b' })
    ]
    const insight = buildBulkInsight(rows, 40)!
    expect(insight.fewWithStock).toBe(true)
    expect(insight.sellers).toBe(2)
  })

  it('counts smaller offers when too few sellers hold that amount', () => {
    const insight = buildBulkInsight([offer(15, 3), offer(17, 6), offer(18, 5), offer(19, 500)], 400)!
    expect(insight.fewWithStock).toBe(true)
    expect(insight.lowStock).toBe(0)
    expect(insight.low).toBe(15)
  })

  it('works out per-item prices from bundles', () => {
    const insight = buildBulkInsight([
      offer(0, 0, { exchangeAmount: 10, itemAmount: 50, stock: 500 }),
      offer(0, 0, { exchangeAmount: 11, itemAmount: 50, stock: 500 })
    ], 1)!
    expect(insight.low).toBeCloseTo(0.2)
  })

  it('ignores offers that cannot fill one trade, and your own', () => {
    const insight = buildBulkInsight([
      offer(0, 0, { exchangeAmount: 1, itemAmount: 20, stock: 3 }),
      offer(9, 50, { isMine: true }),
      offer(18, 50)
    ], 1)!
    expect(insight.low).toBe(18)
  })

  it('counts one seller once, at their best offer', () => {
    const rows = [offer(10, 50, { accountName: 'a' }), offer(12, 50, { accountName: 'a' }), offer(11, 50, { accountName: 'a' })]
    const insight = buildBulkInsight(rows, 1)!
    expect(insight.sellers).toBe(1)
    expect(insight.confidence).toBe('low')
  })

  it('rates agreement among sellers', () => {
    expect(buildBulkInsight([10, 10, 11, 11, 12].map(p => offer(p, 50)), 1)!.confidence).toBe('high')
    expect(buildBulkInsight([10, 15, 20].map(p => offer(p, 50)), 1)!.confidence).toBe('medium')
    expect(buildBulkInsight([10, 100].map(p => offer(p, 50)), 1)!.confidence).toBe('low')
  })

  it('sees past a lone offer far under the rest', () => {
    const insight = buildBulkInsight([1, 18, 18, 18, 19].map(p => offer(p, 50)), 1)!
    expect(insight.low).toBe(1)
    expect(insight.floor).toBe(18)
    expect(insight.confidence).toBe('high')
  })

  it('treats a split market as a market', () => {
    const insight = buildBulkInsight([10, 10, 30, 30].map(p => offer(p, 50)), 1)!
    expect(insight.floor).toBe(10)
  })

  it('has nothing to say with no usable offers', () => {
    expect(buildBulkInsight([], 1)).toBeNull()
    expect(buildBulkInsight([offer(5, 50, { isMine: true })], 1)).toBeNull()
  })
})

describe('bulkAmount', () => {
  it('stays readable from fractions to hundreds', () => {
    expect(bulkAmount(0.2)).toBe('0.2')
    expect(bulkAmount(0.04567)).toBe('0.046')
    expect(bulkAmount(1.25)).toBe('1.3')
    expect(bulkAmount(18)).toBe('18')
    expect(bulkAmount(17.46)).toBe('17.5')
    expect(bulkAmount(720.4)).toBe('720')
  })
})

describe('pickBulkMarket', () => {
  const side = (fair: number, sellers: number, total: number | null = 100) => ({
    insight: { low: fair, fair, high: fair, floor: fair, confidence: 'high' as const, lowStock: 0, fewWithStock: false, sellers, spread: { low: fair, high: fair, most: null } },
    total
  })

  it('leads with chaos when divine sellers ask 1 div for a 1c item, though divine has more offers (WOKEPOET-487)', () => {
    expect(pickBulkMarket(side(1, 24, 911), side(1, 30, 1207), 209)).toBe('xchgChaos')
  })

  it('leads with divine when it is cheaper in chaos', () => {
    expect(pickBulkMarket(side(230, 10, 300), side(1, 20, 50), 209)).toBe('xchgStable')
  })

  it('a market with a seller or two loses to a busier one when the prices are close', () => {
    expect(pickBulkMarket(side(150, 2), side(1, 20), 209)).toBe('xchgStable')
    expect(pickBulkMarket(side(150, 2), side(1, 2), 209)).toBe('xchgChaos')
  })

  it('a thin side far under the rest still wins', () => {
    expect(pickBulkMarket(side(1, 2), side(1, 20), 180)).toBe('xchgChaos')
  })

  it('takes the only side with offers, and falls back to the offer count without a rate', () => {
    expect(pickBulkMarket({ insight: null, total: 40 }, side(1, 5, 10), 209)).toBe('xchgStable')
    expect(pickBulkMarket(side(1, 5, 10), side(1, 5, 40), null)).toBe('xchgStable')
    expect(pickBulkMarket({ insight: null, total: null }, { insight: null, total: 3 }, 209)).toBe('xchgStable')
    expect(pickBulkMarket({ insight: null, total: 3 }, { insight: null, total: null }, 209)).toBe('xchgChaos')
  })

  it('leads with divine when the first search held the chaos side back, without needing chaos loaded', () => {
    expect(pickBulkMarket({ insight: null, total: null }, side(1, 5, 300), 209)).toBe('xchgStable')
    expect(pickBulkMarket({ insight: null, total: null }, { insight: null, total: 0 }, 209)).toBe('xchgStable')
  })
})

describe('bulkSideWaiting', () => {
  it('waits only while the side\'s own search runs', () => {
    expect(bulkSideWaiting({ loaded: false, failed: false, loading: true })).toBe(true)
  })

  it('never waits for a side held back and not asked for (no search runs by itself)', () => {
    expect(bulkSideWaiting({ loaded: false, failed: false, loading: false })).toBe(false)
  })

  it('stops waiting once loaded or failed', () => {
    expect(bulkSideWaiting({ loaded: true, failed: false, loading: false })).toBe(false)
    expect(bulkSideWaiting({ loaded: false, failed: true, loading: false })).toBe(false)
  })
})

describe('bulkSpread / spreadText (WOKEPOET-540)', () => {
  const c = (v: number) => `${bulkAmount(v)}c`
  it('gives the range without the dearest tenth, and the price most ask', () => {
    const units = [1, 8, 10, 10, 10, 10, 12, 15, 15, 500]
    const s = bulkSpread(units)
    expect(s).toEqual({ low: 1, high: 15, most: 10 })
    expect(spreadText(s, units.length, c)).toBe('Sellers ask 1 to 15c, most ask 10c')
  })
  it('shows only the range under 4 sellers or when no price repeats', () => {
    expect(spreadText(bulkSpread([8, 8, 12]), 3, c)).toBe('Sellers ask 8 to 12c')
    expect(bulkSpread([1, 2, 3, 4]).most).toBeNull()
  })
  it('counts prices as shown, so 9.96 and 10 are one', () => {
    expect(bulkSpread([9.96, 10, 11, 12]).most).toBe(9.96)
  })
  it('says one price once, and nothing for one seller', () => {
    expect(spreadText(bulkSpread([10, 10, 10]), 3, c)).toBe('Sellers ask 10c')
    expect(spreadText(bulkSpread([10]), 1, c)).toBeNull()
  })
  it('strips the unit from the low end in divines too', () => {
    const d = (v: number) => `${bulkAmount(v)} div`
    expect(spreadText(bulkSpread([0.5, 1, 1, 2]), 4, d)).toBe('Sellers ask 0.5 to 2 div, most ask 1 div')
  })
  it('is on every built insight', () => {
    const insight = buildBulkInsight([offer(15, 50), offer(17, 50), offer(17, 50), offer(18, 50)], 1)!
    expect(insight.spread).toEqual({ low: 15, high: 18, most: 17 })
  })
})
