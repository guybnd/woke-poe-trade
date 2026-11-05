// Scarab vendor recipe: expected value, buy list, odds and rare-but-cheap marks.
import { describe, it, expect } from 'vitest'
import { buyList, flipModel, flipOdds, parseExchange, rareCheapList, scarabQuotes, shortScarab, RARE_SHARE } from '@/web/woke/scarab-flip/calc'
import type { ScarabQuote } from '@/web/woke/scarab-flip/calc'
import { SAMPLE_ROLLS, TIER_ROLLS, UNSAMPLED_TIERS } from '@/web/woke/scarab-flip/weights'
import type { PriceItem } from '@/web/woke/market/types'

const PLAIN = { sellDiscount: 0, reroll: false }

function quotes (prices: Record<string, number>, tradedChaos: number | null = 1000) {
  return new Map<string, ScarabQuote>(Object.entries(prices).map(([name, chaos]) => [name, { chaos, tradedChaos }]))
}

// Sample counts: Harvest Scarab 649, Harvest of Doubling 218, Scarab of Wisps 212.
const THREE = { 'Harvest Scarab': 1, 'Harvest Scarab of Doubling': 100, 'Scarab of Wisps': 10 }
const TOTAL = 649 + 218 + 212

describe('recipe value', () => {
  it('is the price of each result times its weight', () => {
    const m = flipModel(quotes(THREE), PLAIN)
    const ev = (649 * 1 + 218 * 100 + 212 * 10) / TOTAL
    expect(m.recipeValue).toBeCloseTo(ev, 8)
    expect(m.buyUnder).toBeCloseTo(ev / 3, 8)
  })

  it('never gives back the scarab you put in', () => {
    const m = flipModel(quotes(THREE), PLAIN)
    const harvest = m.rows.find(r => r.name === 'Harvest Scarab')!
    const without = (218 * 100 + 212 * 10) / (218 + 212)
    expect(harvest.profit).toBeCloseTo(without - 3, 8)
  })

  it('takes the sell discount off the results', () => {
    const plain = flipModel(quotes(THREE), PLAIN)
    const discounted = flipModel(quotes(THREE), { sellDiscount: 0.1, reroll: false })
    expect(discounted.recipeValue).toBeCloseTo(plain.recipeValue * 0.9, 8)
  })

  it('rerolling cheap results raises the value and settles', () => {
    const plain = flipModel(quotes(THREE), PLAIN)
    const reroll = flipModel(quotes(THREE), { sellDiscount: 0, reroll: true })
    expect(reroll.recipeValue).toBeGreaterThan(plain.recipeValue)
    // The answer satisfies its own definition: a result is worth at least a third of a recipe.
    const v = reroll.recipeValue
    const again = (649 * Math.max(1, v / 3) + 218 * 100 + 212 * Math.max(10, v / 3)) / TOTAL
    expect(again).toBeCloseTo(v, 6)
  })
})

describe('weights', () => {
  it('uses the sample first, then the wiki tier, and leaves the rest out', () => {
    const m = flipModel(quotes({ 'Harvest Scarab': 1, 'Breach Scarab of the Hive': 1, 'Trarthan Scarab': 1 }), PLAIN)
    expect(m.rows.find(r => r.name === 'Harvest Scarab')!.weightSource).toBe('sample')
    const breach = m.rows.find(r => r.name === 'Breach Scarab of the Hive')!
    expect(breach.weightSource).toBe('tier')
    expect(breach.share).toBeCloseTo(TIER_ROLLS.Common / (SAMPLE_ROLLS['Harvest Scarab'] + TIER_ROLLS.Common), 8)
    expect(m.unrated).toEqual(['Trarthan Scarab'])
  })

  it('has the whole sample, and no scarab in both lists', () => {
    const sum = Object.values(SAMPLE_ROLLS).reduce((a, b) => a + b, 0)
    expect(Math.abs(sum - 33333)).toBeLessThanOrEqual(1)
    for (const name of Object.keys(UNSAMPLED_TIERS)) expect(SAMPLE_ROLLS[name], name).toBeUndefined()
  })
})

describe('buy list', () => {
  it('ranks by the profit the market can supply, not the profit per recipe', () => {
    const q = quotes({ 'Harvest Scarab': 1, 'Harvest Scarab of Doubling': 100, 'Scarab of Wisps': 2 })
    q.get('Harvest Scarab')!.tradedChaos = 2
    q.get('Scarab of Wisps')!.tradedChaos = 1000
    const list = buyList(flipModel(q, PLAIN), true)
    expect(list.map(r => r.name)).toEqual(['Scarab of Wisps', 'Harvest Scarab'])
    expect(list[1].profit).toBeGreaterThan(list[0].profit)
    expect(list[1].tradedPerDay).toBe(2)
  })

  it('hides prices with no trades behind them unless asked', () => {
    const q = quotes({ 'Harvest Scarab': 1, 'Harvest Scarab of Doubling': 100, 'Torment Scarab of Possession': 0.05 })
    q.get('Torment Scarab of Possession')!.tradedChaos = 0.1
    const m = flipModel(q, PLAIN)
    expect(buyList(m, true).map(r => r.name)).not.toContain('Torment Scarab of Possession')
    expect(buyList(m, false).map(r => r.name)).toContain('Torment Scarab of Possession')
  })

  it('is empty when no scarab is cheap enough', () => {
    expect(buyList(flipModel(quotes({ 'Harvest Scarab': 50, 'Scarab of Wisps': 50 }), PLAIN), true)).toEqual([])
  })
})

describe('rare and cheap', () => {
  // A realistic pool: commons drown the rare ones, as in the game.
  const POOL = {
    ...Object.fromEntries(Object.keys(SAMPLE_ROLLS).filter(n => SAMPLE_ROLLS[n] > 100).map(n => [n, 3])),
    'Scarab of Radiant Storms': 4, // 32 rolls
    'Blight Scarab of Invigoration': 8, // 23 rolls
    'Legion Scarab of Eternal Conflict': 44, // 24 rolls
    'Incursion Scarab of Timelines': 38, // 24 rolls
    'Kalguuran Scarab of Refinement': 68, // 29 rolls
    'Horned Scarab of Bloodlines': 500 // 34 rolls
  }

  it('marks rare scarabs costing under a third of a typical rare one', () => {
    const m = flipModel(quotes(POOL), PLAIN)
    // Typical rare scarab here: the middle of 4, 8, 38, 44, 68, 500 = 41c.
    expect(m.typicalRare).toBe(41)
    expect(rareCheapList(m).map(r => r.name)).toEqual(['Scarab of Radiant Storms', 'Blight Scarab of Invigoration'])
  })

  it('never marks a common scarab, however cheap', () => {
    const m = flipModel(quotes(POOL), PLAIN)
    const common = m.rows.find(r => r.name === 'Harvest Scarab')!
    expect(common.share).toBeGreaterThan(RARE_SHARE)
    expect(common.rareCheap).toBe(false)
  })

  it('skips cheap prices nobody trades, which may just be stale', () => {
    const q = quotes(POOL)
    q.get('Scarab of Radiant Storms')!.tradedChaos = 0
    const names = rareCheapList(flipModel(q, PLAIN)).map(r => r.name)
    expect(names).toEqual(['Blight Scarab of Invigoration'])
  })
})

describe('odds', () => {
  it('splits chance and value by price range', () => {
    const o = flipOdds(flipModel(quotes({ 'Harvest Scarab': 0.5, 'Horned Scarab of Bloodlines': 800 }), PLAIN))
    const low = o.buckets[0]
    const top = o.buckets[o.buckets.length - 1]
    expect(low.chance).toBeCloseTo(649 / (649 + 34), 8)
    expect(top.valueShare).toBeGreaterThan(0.9)
    expect(o.buckets.reduce((n, b) => n + b.chance, 0)).toBeCloseTo(1, 8)
    expect(o.buckets.reduce((n, b) => n + b.valueShare, 0)).toBeCloseTo(1, 8)
    expect(o.jackpotOneIn).toBeCloseTo((649 + 34) / 34, 8)
    expect(o.withoutJackpot).toBeCloseTo(649 * 0.5 / (649 + 34), 8)
    expect(o.medianResult).toBe(0.5)
  })

  it('has no jackpot line when nothing reaches that price', () => {
    expect(flipOdds(flipModel(quotes(THREE), PLAIN)).jackpotOneIn).toBeNull()
  })
})

describe('price feeds', () => {
  const FEED = {
    core: { primary: 'chaos' },
    items: [{ id: 'harvest-scarab', name: 'Harvest Scarab' }],
    lines: [{ id: 'harvest-scarab', primaryValue: 1.12, volumePrimaryValue: 128 }]
  }
  const dense: PriceItem[] = [
    { type: 'Scarab', name: 'Harvest Scarab', variant: '', chaos: 2 },
    { type: 'Scarab', name: 'Scarab of Wisps', variant: '', chaos: 30 },
    { type: 'Currency', name: 'Divine Orb', variant: '', chaos: 400 }
  ]

  it('reads the exchange feed, and refuses one not priced in chaos', () => {
    expect(parseExchange(FEED)!.get('Harvest Scarab')).toEqual({ chaos: 1.12, tradedChaos: 128 })
    expect(parseExchange({ ...FEED, core: { primary: 'divine' } })).toBeNull()
    expect(parseExchange({})).toBeNull()
  })

  it('prefers exchange prices, keeps only scarabs, and counts a scarab missing from it as untraded', () => {
    const q = scarabQuotes(dense, parseExchange(FEED))
    expect([...q.keys()].sort()).toEqual(['Harvest Scarab', 'Scarab of Wisps'])
    expect(q.get('Harvest Scarab')).toEqual({ chaos: 1.12, tradedChaos: 128 })
    expect(q.get('Scarab of Wisps')).toEqual({ chaos: 30, tradedChaos: 0 })
  })

  it('falls back to the dense prices with volume unknown', () => {
    const q = scarabQuotes(dense, null)
    expect(q.get('Harvest Scarab')).toEqual({ chaos: 2, tradedChaos: null })
    const list = buyList(flipModel(new Map([['Harvest Scarab', q.get('Harvest Scarab')!], ['Scarab of Wisps', q.get('Scarab of Wisps')!]]), PLAIN), true)
    expect(list[0].profitPerDay).toBeNull()
  })
})

describe('names', () => {
  it('drops the word Scarab where the name still reads', () => {
    expect(shortScarab('Harvest Scarab of Doubling')).toBe('Harvest of Doubling')
    expect(shortScarab('Harvest Scarab')).toBe('Harvest')
    expect(shortScarab('Scarab of Wisps')).toBe('Scarab of Wisps')
  })
})
