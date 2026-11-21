// The flip model on a made-up 3 for 1 vendor recipe (the old scarab recipe's
// shape): expected value, buy list, odds and rare-but-cheap marks.
import { describe, it, expect } from 'vitest'
import { buyList, familyQuotes, flipModel, flipOdds, parseExchange, rareCheapList } from '@/web/woke/scarab-flip/calc'
import type { ExchangeQuotes, FlipOptions, FlipRecipe, Quote } from '@/web/woke/scarab-flip/calc'
import type { PriceItem } from '@/web/woke/market/types'

const PLAIN = { sellDiscount: 0, reroll: false }
const RARE_SHARE = 0.0015

function recipe (weights: Record<string, number>, extra: Partial<FlipRecipe> = {}): FlipRecipe {
  return {
    inputs: 3,
    cost: 0,
    excludeInput: true,
    rareShare: RARE_SHARE,
    estimateMissing: true,
    weightOf: name => weights[name] != null ? { weight: weights[name], source: 'sample' } : null,
    ...extra
  }
}

const W = { Common: 414, Mid: 118, Wisp: 60, Jackpot: 18 }
const model = (q: Map<string, Quote>, options: FlipOptions, weights: Record<string, number> = W) => flipModel(q, options, recipe(weights))
const isThread = (name: string) => name.endsWith(' Thread')
const threadQuotes = (items: PriceItem[], exchange: ExchangeQuotes | null) => familyQuotes(items, 'Thread', isThread, exchange)

function quotes (prices: Record<string, number>, tradedChaos: number | null = 1000) {
  return new Map<string, Quote>(Object.entries(prices).map(([name, chaos]) => [name, { chaos, tradedChaos }]))
}

const THREE = { Common: 1, Mid: 100, Wisp: 10 }
const TOTAL = 414 + 118 + 60

describe('recipe value', () => {
  it('is the price of each result times its weight', () => {
    const m = model(quotes(THREE), PLAIN)
    const ev = (414 * 1 + 118 * 100 + 60 * 10) / TOTAL
    expect(m.recipeValue).toBeCloseTo(ev, 8)
    expect(m.buyUnder).toBeCloseTo(ev / 3, 8)
  })

  it('never gives back the type you put in', () => {
    const m = model(quotes(THREE), PLAIN)
    const common = m.rows.find(r => r.name === 'Common')!
    const without = (118 * 100 + 60 * 10) / (118 + 60)
    expect(common.profit).toBeCloseTo(without - 3, 8)
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
    const again = (414 * Math.max(1, v / 3) + 118 * 100 + 60 * Math.max(10, v / 3)) / TOTAL
    expect(again).toBeCloseTo(v, 6)
  })
})

describe('weights', () => {
  it('uses the sample, and the average for what it missed', () => {
    const m = model(quotes({ Common: 1, Wisp: 1, Unseen: 1 }), PLAIN, { Common: 1, Wisp: 1 })
    expect(m.rows.find(r => r.name === 'Common')!.weightSource).toBe('sample')
    const unseen = m.rows.find(r => r.name === 'Unseen')!
    expect(unseen.weightSource).toBe('estimate')
    expect(unseen.share).toBeCloseTo(1 / 3, 8)
    expect(m.unrated).toEqual([])
  })
})

describe('buy list', () => {
  it('ranks by the profit the market can supply, not the profit per recipe', () => {
    const q = quotes({ Common: 1, Mid: 100, Wisp: 2 })
    q.get('Common')!.tradedChaos = 2
    q.get('Wisp')!.tradedChaos = 1000
    const list = buyList(model(q, PLAIN).rows, true)
    expect(list.map(r => r.name)).toEqual(['Wisp', 'Common'])
    expect(list[1].profit).toBeGreaterThan(list[0].profit)
    expect(list[1].tradedPerDay).toBe(2)
  })

  it('hides prices with no trades behind them unless asked', () => {
    const q = quotes({ Common: 1, Mid: 100, Wisp: 0.05 })
    q.get('Wisp')!.tradedChaos = 0.1
    const m = model(q, PLAIN)
    expect(buyList(m.rows, true).map(r => r.name)).not.toContain('Wisp')
    expect(buyList(m.rows, false).map(r => r.name)).toContain('Wisp')
  })

  it('is empty when nothing is cheap enough', () => {
    expect(buyList(model(quotes({ Common: 50, Wisp: 50 }), PLAIN).rows, true)).toEqual([])
  })
})

describe('rare and cheap', () => {
  // Commons drown the rare ones, as in the game: 20 at 400 weight, 6 at 6.
  const commons = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`Common ${i}`, 400]))
  const RARES = { 'Rare A': 4, 'Rare B': 8, 'Rare C': 38, 'Rare D': 44, 'Rare E': 68, 'Rare F': 500 }
  const weights = { ...commons, ...Object.fromEntries(Object.keys(RARES).map(n => [n, 6])) }
  const POOL = { ...Object.fromEntries(Object.keys(commons).map(n => [n, 3])), ...RARES }

  it('marks rare items costing under a third of a typical rare one', () => {
    const m = model(quotes(POOL), PLAIN, weights)
    // Typical rare here: the middle of 4, 8, 38, 44, 68, 500 = 41c.
    expect(m.typicalRare).toBe(41)
    expect(rareCheapList(m).map(r => r.name)).toEqual(['Rare A', 'Rare B'])
  })

  it('never marks a common item, however cheap', () => {
    const m = model(quotes(POOL), PLAIN, weights)
    const common = m.rows.find(r => r.name === 'Common 0')!
    expect(common.share).toBeGreaterThan(RARE_SHARE)
    expect(common.rareCheap).toBe(false)
  })

  it('skips cheap prices nobody trades, which may just be stale', () => {
    const q = quotes(POOL)
    q.get('Rare A')!.tradedChaos = 0
    expect(rareCheapList(model(q, PLAIN, weights)).map(r => r.name)).toEqual(['Rare B'])
  })
})

describe('odds', () => {
  it('splits chance and value by price range', () => {
    const o = flipOdds(model(quotes({ Common: 0.5, Jackpot: 800 }), PLAIN))
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
    items: [{ id: 'legion-thread', name: 'Legion Thread' }],
    lines: [{ id: 'legion-thread', primaryValue: 1.12, volumePrimaryValue: 128 }]
  }
  const dense: PriceItem[] = [
    { type: 'Thread', name: 'Legion Thread', variant: '', chaos: 2 },
    { type: 'Thread', name: 'Abyss Thread', variant: '', chaos: 30 },
    { type: 'Currency', name: 'Divine Orb', variant: '', chaos: 400 }
  ]

  it('reads the exchange feed, and refuses one not priced in chaos', () => {
    expect(parseExchange(FEED)!.get('Legion Thread')).toEqual({ chaos: 1.12, tradedChaos: 128 })
    expect(parseExchange({ ...FEED, core: { primary: 'divine' } })).toBeNull()
    expect(parseExchange({})).toBeNull()
  })

  it('prefers exchange prices, keeps only the family, and counts an item missing from it as untraded', () => {
    const q = threadQuotes(dense, parseExchange(FEED))
    expect([...q.keys()].sort()).toEqual(['Abyss Thread', 'Legion Thread'])
    expect(q.get('Legion Thread')).toEqual({ chaos: 1.12, tradedChaos: 128 })
    expect(q.get('Abyss Thread')).toEqual({ chaos: 30, tradedChaos: 0 })
  })

  it('falls back to the dense prices with volume unknown', () => {
    const q = threadQuotes(dense, null)
    expect(q.get('Legion Thread')).toEqual({ chaos: 2, tradedChaos: null })
    const list = buyList(flipModel(q, PLAIN, recipe({ 'Legion Thread': 1, 'Abyss Thread': 1 })).rows, true)
    expect(list[0].profitPerDay).toBeNull()
  })
})
