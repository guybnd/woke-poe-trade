// Scarab vendor recipe: expected value, buy list, odds and rare-but-cheap marks.
import { describe, it, expect } from 'vitest'
import { buyList, familyQuotes, flipModel, flipOdds, parseExchange, rareCheapList, shortScarab, RARE_SHARE } from '@/web/woke/scarab-flip/calc'
import { familyById, flipRecipe } from '@/web/woke/scarab-flip/families'
import type { ExchangeQuotes, FlipOptions, Quote } from '@/web/woke/scarab-flip/calc'
import { SAMPLE_ROLLS } from '@/web/woke/scarab-flip/weights'
import type { PriceItem } from '@/web/woke/market/types'

const PLAIN = { sellDiscount: 0, reroll: false }
const scarabs = familyById('scarabs')
const model = (q: Map<string, Quote>, options: FlipOptions) => flipModel(q, options, flipRecipe(scarabs, scarabs.methods[0], 0))
const scarabQuotes = (items: PriceItem[], exchange: ExchangeQuotes | null) => familyQuotes(items, scarabs.ninjaType, scarabs.match, exchange)

function quotes (prices: Record<string, number>, tradedChaos: number | null = 1000) {
  return new Map<string, Quote>(Object.entries(prices).map(([name, chaos]) => [name, { chaos, tradedChaos }]))
}

const THREE = { 'Harvest Scarab': 1, 'Harvest Scarab of Doubling': 100, 'Scarab of Wisps': 10 }
const WISPS = SAMPLE_ROLLS['Scarab of Wisps']
const TOTAL = 414 + 118 + WISPS

describe('recipe value', () => {
  it('is the price of each result times its weight', () => {
    const m = model(quotes(THREE), PLAIN)
    const ev = (414 * 1 + 118 * 100 + WISPS * 10) / TOTAL
    expect(m.recipeValue).toBeCloseTo(ev, 8)
    expect(m.buyUnder).toBeCloseTo(ev / 3, 8)
  })

  it('never gives back the scarab you put in', () => {
    const m = model(quotes(THREE), PLAIN)
    const harvest = m.rows.find(r => r.name === 'Harvest Scarab')!
    const without = (118 * 100 + WISPS * 10) / (118 + WISPS)
    expect(harvest.profit).toBeCloseTo(without - 3, 8)
  })

  it('takes the sell discount off the results', () => {
    const plain = model(quotes(THREE), PLAIN)
    const discounted = model(quotes(THREE), { sellDiscount: 0.1, reroll: false })
    expect(discounted.recipeValue).toBeCloseTo(plain.recipeValue * 0.9, 8)
  })

  it('rerolling cheap results raises the value and settles', () => {
    const plain = model(quotes(THREE), PLAIN)
    const reroll = model(quotes(THREE), { sellDiscount: 0, reroll: true })
    expect(reroll.recipeValue).toBeGreaterThan(plain.recipeValue)
    // The answer satisfies its own definition: a result is worth at least a third of a recipe.
    const v = reroll.recipeValue
    const again = (414 * Math.max(1, v / 3) + 118 * 100 + WISPS * Math.max(10, v / 3)) / TOTAL
    expect(again).toBeCloseTo(v, 6)
  })
})

describe('weights', () => {
  it('uses the sample, and the average for what it missed', () => {
    const m = model(quotes({ 'Harvest Scarab': 1, 'Scarab of Wisps': 1, 'Trarthan Scarab': 1 }), PLAIN)
    expect(m.rows.find(r => r.name === 'Harvest Scarab')!.weightSource).toBe('sample')
    const trarthan = m.rows.find(r => r.name === 'Trarthan Scarab')!
    expect(trarthan.weightSource).toBe('estimate')
    expect(trarthan.share).toBeCloseTo(1 / 3, 8)
    expect(m.unrated).toEqual([])
  })

  it('has the 3.28 sample, with the one scarab only 3.27 saw', () => {
    const sum = Object.values(SAMPLE_ROLLS).reduce((a, b) => a + b, 0)
    expect(sum).toBe(22431 + SAMPLE_ROLLS['Scarab of Hunted Traitors'])
    expect(SAMPLE_ROLLS['Breach Scarab of the Hive']).toBeGreaterThan(0)
  })
})

describe('buy list', () => {
  it('ranks by the profit the market can supply, not the profit per recipe', () => {
    const q = quotes({ 'Harvest Scarab': 1, 'Harvest Scarab of Doubling': 100, 'Scarab of Wisps': 2 })
    q.get('Harvest Scarab')!.tradedChaos = 2
    q.get('Scarab of Wisps')!.tradedChaos = 1000
    const list = buyList(model(q, PLAIN).rows, true)
    expect(list.map(r => r.name)).toEqual(['Scarab of Wisps', 'Harvest Scarab'])
    expect(list[1].profit).toBeGreaterThan(list[0].profit)
    expect(list[1].tradedPerDay).toBe(2)
  })

  it('hides prices with no trades behind them unless asked', () => {
    const q = quotes({ 'Harvest Scarab': 1, 'Harvest Scarab of Doubling': 100, 'Torment Scarab of Possession': 0.05 })
    q.get('Torment Scarab of Possession')!.tradedChaos = 0.1
    const m = model(q, PLAIN)
    expect(buyList(m.rows, true).map(r => r.name)).not.toContain('Torment Scarab of Possession')
    expect(buyList(m.rows, false).map(r => r.name)).toContain('Torment Scarab of Possession')
  })

  it('is empty when no scarab is cheap enough', () => {
    expect(buyList(model(quotes({ 'Harvest Scarab': 50, 'Scarab of Wisps': 50 }), PLAIN).rows, true)).toEqual([])
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
    const m = model(quotes(POOL), PLAIN)
    // Typical rare scarab here: the middle of 4, 8, 38, 44, 68, 500 = 41c.
    expect(m.typicalRare).toBe(41)
    expect(rareCheapList(m).map(r => r.name)).toEqual(['Scarab of Radiant Storms', 'Blight Scarab of Invigoration'])
  })

  it('never marks a common scarab, however cheap', () => {
    const m = model(quotes(POOL), PLAIN)
    const common = m.rows.find(r => r.name === 'Harvest Scarab')!
    expect(common.share).toBeGreaterThan(RARE_SHARE)
    expect(common.rareCheap).toBe(false)
  })

  it('skips cheap prices nobody trades, which may just be stale', () => {
    const q = quotes(POOL)
    q.get('Scarab of Radiant Storms')!.tradedChaos = 0
    const names = rareCheapList(model(q, PLAIN)).map(r => r.name)
    expect(names).toEqual(['Blight Scarab of Invigoration'])
  })
})

describe('odds', () => {
  it('splits chance and value by price range', () => {
    const o = flipOdds(model(quotes({ 'Harvest Scarab': 0.5, 'Horned Scarab of Bloodlines': 800 }), PLAIN))
    const low = o.buckets[0]
    const top = o.buckets[o.buckets.length - 1]
    expect(low.chance).toBeCloseTo(414 / (414 + 18), 8)
    expect(top.valueShare).toBeGreaterThan(0.9)
    expect(o.buckets.reduce((n, b) => n + b.chance, 0)).toBeCloseTo(1, 8)
    expect(o.buckets.reduce((n, b) => n + b.valueShare, 0)).toBeCloseTo(1, 8)
    expect(o.jackpotOneIn).toBeCloseTo((414 + 18) / 18, 8)
    expect(o.withoutJackpot).toBeCloseTo(414 * 0.5 / (414 + 18), 8)
    expect(o.medianResult).toBe(0.5)
  })

  it('has no jackpot line when nothing reaches that price', () => {
    expect(flipOdds(model(quotes(THREE), PLAIN)).jackpotOneIn).toBeNull()
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
    const list = buyList(model(new Map([['Harvest Scarab', q.get('Harvest Scarab')!], ['Scarab of Wisps', q.get('Scarab of Wisps')!]]), PLAIN).rows, true)
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
