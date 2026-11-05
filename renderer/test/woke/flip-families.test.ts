// The flip families beyond scarabs: Harvest rerolls, catalyst recipes, tier
// upgrades, and how each is priced.
import { describe, it, expect } from 'vitest'
import { buyList, flipModel, parseExchange, upgradeRows } from '@/web/woke/scarab-flip/calc'
import type { Quote } from '@/web/woke/scarab-flip/calc'
import { FAMILIES, bestFlip, familyById, flipRecipe, harvestCost, parseLifeforce, priceFlip, shortName, unpricedShare } from '@/web/woke/scarab-flip/families'
import type { Exchanges } from '@/web/woke/scarab-flip/families'
import type { PriceItem } from '@/web/woke/market/types'

const PLAIN = { sellDiscount: 0, reroll: false }
const delirium = familyById('delirium')
const catalysts = familyById('catalysts')
const vendorCatalyst = catalysts.methods.find(m => m.id === 'vendor')!
const harvestCatalyst = catalysts.methods.find(m => m.id === 'harvest')!

function item (type: string, name: string, chaos: number): PriceItem {
  return { type, name, variant: '', chaos }
}

function quotes (prices: Record<string, number>) {
  return new Map<string, Quote>(Object.entries(prices).map(([name, chaos]) => [name, { chaos, tradedChaos: 1000 }]))
}

describe('Harvest rerolls', () => {
  it('costs one input plus lifeforce and never gives back the input', () => {
    const recipe = { inputs: 1, cost: 2, excludeInput: true, rareShare: null, weightOf: (n: string) => ({ A: { weight: 1, source: 'sample' as const }, B: { weight: 3, source: 'sample' as const } })[n] ?? null }
    const m = flipModel(quotes({ A: 4, B: 8 }), PLAIN, recipe)
    expect(m.recipeValue).toBeCloseTo((1 * 4 + 3 * 8) / 4, 8)
    // Rerolling A can only give B.
    expect(m.rows.find(r => r.name === 'A')!.profit).toBeCloseTo(8 - 4 - 2, 8)
    expect(m.rows.find(r => r.name === 'B')!.profit).toBeCloseTo(4 - 8 - 2, 8)
  })

  it('prices the craft from the right lifeforce, per item', () => {
    const method = familyById('delirium').methods[0]
    const items = [item('Currency', 'Primal Crystallised Lifeforce', 0.03), item('Currency', 'Vivid Crystallised Lifeforce', 0.2)]
    expect(method.lifeforce).toBe('Primal')
    expect(harvestCost(method, 30, items, null)).toBeCloseTo(0.9, 8)
    expect(harvestCost(harvestCatalyst, 30, items, null)).toBeCloseTo(6, 8)
    expect(harvestCost(method, 30, [], null)).toBeNull()
    expect(harvestCost(vendorCatalyst, 30, [], null)).toBe(0)
  })

  it('says so when there is no lifeforce price, instead of calling it free', () => {
    const items = [item('DeliriumOrb', 'Fine Delirium Orb', 30)]
    expect(priceFlip(delirium, delirium.methods[0], items, new Map(), PLAIN, 30)).toEqual({ kind: 'no-cost' })
  })

  it('solves rerolling exactly, even when almost everything gets rerolled', () => {
    // Weight 1 at 1000c, weight 999 at 1c, 1c a reroll: reroll until the 1000c.
    const recipe = { inputs: 1, cost: 1, excludeInput: false, rareShare: null, weightOf: (n: string) => ({ A: { weight: 1, source: 'sample' as const }, B: { weight: 999, source: 'sample' as const } })[n] ?? null }
    const m = flipModel(quotes({ A: 1000, B: 1 }), { sellDiscount: 0, reroll: true }, recipe)
    // worth = 1000 - 1000 = 0 is below B's 1c, so B sells instead: no reroll pays.
    expect(m.recipeValue).toBeCloseTo((1000 + 999) / 1000, 8)
    const dear = flipModel(quotes({ A: 100000, B: 1 }), { sellDiscount: 0, reroll: true }, recipe)
    // Worth rerolling now: worth = 100000 - 1000 = 99000 as an input, plus the 1c.
    expect(dear.buyUnder).toBeCloseTo(99000, 6)
    expect(dear.recipeValue).toBeCloseTo(99001, 6)
  })

  it('reads a typed lifeforce cost: blank, zero or negative mean the listed cost', () => {
    expect(parseLifeforce('')).toBeUndefined()
    expect(parseLifeforce(0)).toBeUndefined()
    expect(parseLifeforce('-30')).toBeUndefined()
    expect(parseLifeforce('12')).toBe(12)
    expect(parseLifeforce(12)).toBe(12)
  })

  it('never treats a free or negative craft as profit from nothing', () => {
    const items = [item('Currency', 'Primal Crystallised Lifeforce', 0.03), item('Currency', 'Vivid Crystallised Lifeforce', 0)]
    expect(harvestCost(delirium.methods[0], -30, items, null)).toBe(0)
    // A zero price means poe.ninja has none, not that lifeforce is free.
    expect(harvestCost(harvestCatalyst, 30, items, null)).toBeNull()
  })

  it('rerolling cheap results settles even at one input per flip', () => {
    const family = familyById('delirium')
    const recipe = flipRecipe(family, family.methods[0], 1)
    const m = flipModel(quotes({ 'Fine Delirium Orb': 40, "Armoursmith's Delirium Orb": 5, "Jeweller's Delirium Orb": 10 }), { sellDiscount: 0, reroll: true }, recipe)
    expect(Number.isFinite(m.recipeValue)).toBe(true)
    expect(m.recipeValue).toBeGreaterThan(flipModel(quotes({ 'Fine Delirium Orb': 40, "Armoursmith's Delirium Orb": 5, "Jeweller's Delirium Orb": 10 }), PLAIN, recipe).recipeValue)
  })
})

describe('catalysts', () => {
  it('compares 3-for-1 vendoring, which can give the same type back, with Harvest', () => {
    expect(vendorCatalyst.inputs).toBe(3)
    expect(vendorCatalyst.excludeInput).toBe(false)
    expect(harvestCatalyst.inputs).toBe(1)
    expect(harvestCatalyst.excludeInput).toBe(true)
    const m = flipModel(quotes({ 'Imbued Catalyst': 2, 'Prismatic Catalyst': 100 }), PLAIN, flipRecipe(catalysts, vendorCatalyst, 0))
    expect(m.rows.find(r => r.name === 'Imbued Catalyst')!.profit).toBeCloseTo(m.recipeValue - 6, 8)
  })

  it('leaves Tainted out: the recipe never returns it', () => {
    const flip = priceFlip(catalysts, vendorCatalyst, [item('Currency', 'Imbued Catalyst', 2), item('Currency', 'Tainted Catalyst', 20), item('Currency', 'Divine Orb', 400)], new Map(), PLAIN, 30)
    expect(flip?.kind === 'pool' && flip.model.rows.map(r => r.name)).toEqual(['Imbued Catalyst'])
    expect(flip?.kind === 'pool' && flip.model.unrated).toEqual([])
  })
})

describe('upgrades', () => {
  it('prices 3 of a tier against 1 of the next, walking up the chain', () => {
    const rows = upgradeRows(quotes({ 'Black Oil': 13, 'Opalescent Oil': 44, 'Crimson Oil': 6 }), [['Crimson Oil', 'Black Oil', 'Opalescent Oil']], 0)
    expect(rows.map(r => [r.name, r.profit])).toEqual([
      ['Crimson to Black Oil', 13 - 18],
      ['Black to Opalescent Oil', 44 - 39]
    ])
    expect(rows[1].tradedPerDay).toBeCloseTo(1000 / 13, 8)
    // 25.6 recipes' worth of Black a day, but only 22.7 Opalescent sell.
    expect(rows[1].profitPerDay).toBeCloseTo(5 * 1000 / 44, 8)
    expect(buyList(rows, true).map(r => r.name)).toEqual(['Black to Opalescent Oil'])
  })

  it('hides a recipe whose result nobody trades', () => {
    const q = quotes({ 'Silver Oil': 100, 'Golden Oil': 500 })
    q.get('Golden Oil')!.tradedChaos = 0
    const rows = upgradeRows(q, [['Silver Oil', 'Golden Oil']], 0)
    expect(rows[0].profit).toBe(200)
    expect(rows[0].profitPerDay).toBe(0)
    expect(buyList(rows, true)).toEqual([])
    expect(buyList(rows, false).length).toBe(1)
  })

  it('shows profit per item put in', () => {
    const [row] = upgradeRows(quotes({ 'Black Oil': 13, 'Opalescent Oil': 44 }), [['Black Oil', 'Opalescent Oil']], 0)
    expect(row.profitEach).toBeCloseTo(5 / 3, 8)
    const recipe = flipRecipe(catalysts, vendorCatalyst, 0)
    const m = flipModel(quotes({ 'Imbued Catalyst': 2, 'Prismatic Catalyst': 100 }), PLAIN, recipe)
    const imbued = m.rows.find(r => r.name === 'Imbued Catalyst')!
    expect(imbued.profitEach).toBeCloseTo(imbued.profit / 3, 8)
  })

  it('does not count rounding noise as profit', () => {
    const rows = upgradeRows(quotes({ 'Violet Oil': 0.7, 'Crimson Oil': 2.1 }), [['Violet Oil', 'Crimson Oil']], 0)
    expect(buyList(rows, true)).toEqual([])
  })

  it('skips tiers with no price', () => {
    expect(upgradeRows(quotes({ 'Clear Oil': 1, 'Amber Oil': 9 }), [['Clear Oil', 'Sepia Oil', 'Amber Oil']], 0)).toEqual([])
  })

  it('takes the sell discount off the result', () => {
    const [row] = upgradeRows(quotes({ 'Black Oil': 10, 'Opalescent Oil': 100 }), [['Black Oil', 'Opalescent Oil']], 0.1)
    expect(row.profit).toBeCloseTo(60, 8)
  })

  it('builds essence lines that stay within one type', () => {
    const line = familyById('essences').chains!.find(c => c[0].endsWith('of Anger'))!
    expect(line[0]).toBe('Whispering Essence of Anger')
    expect(line[line.length - 1]).toBe('Deafening Essence of Anger')
    expect(line.every(n => n.endsWith('Essence of Anger'))).toBe(true)
  })
})

describe('priceFlip', () => {
  const essences = familyById('essences')
  const items = [
    item('Essence', 'Deafening Essence of Anger', 7),
    item('Essence', 'Deafening Essence of Greed', 4),
    item('Essence', 'Shrieking Essence of Anger', 1),
    item('Currency', 'Primal Crystallised Lifeforce', 0.03)
  ]

  it('rerolls essences within the priced tier, without counting others as unrated', () => {
    const flip = priceFlip(essences, essences.methods[0], items, new Map(), PLAIN, 30)
    expect(flip?.kind).toBe('pool')
    if (flip?.kind !== 'pool') return
    expect(flip.model.rows.map(r => r.name).sort()).toEqual(['Deafening Essence of Anger', 'Deafening Essence of Greed'])
    expect(flip.model.unrated).toEqual([])
    expect(flip.cost).toBeCloseTo(0.9, 8)
  })

  it('upgrades across every tier', () => {
    const flip = priceFlip(essences, essences.methods[1], items, new Map(), PLAIN, 30)
    expect(flip?.kind === 'upgrade' && flip.rows.map(r => r.name)).toEqual(['Shrieking to Deafening Essence of Anger'])
  })

  it('tells prices nobody can use apart from no prices at all', () => {
    const lower = [item('Essence', 'Shrieking Essence of Anger', 1), item('Currency', 'Primal Crystallised Lifeforce', 0.03)]
    expect(priceFlip(essences, essences.methods[0], lower, new Map(), PLAIN, 30)).toEqual({ kind: 'no-pool' })
  })

  it('returns nothing when the family has no prices', () => {
    expect(priceFlip(delirium, delirium.methods[0], items, new Map(), PLAIN, 30)).toBeNull()
  })

  it('treats a feed holding only other items as no volume data', () => {
    const scarabsOnly = parseExchange({ core: { primary: 'chaos' }, items: [{ id: 'a', name: 'Abyss Scarab' }], lines: [{ id: 'a', primaryValue: 5, volumePrimaryValue: 100 }] })
    const flip = priceFlip(essences, essences.methods[0], items, new Map([['Essence', scarabsOnly]]), PLAIN, 30)
    expect(flip?.kind === 'pool' && flip.model.rows[0].tradedChaos).toBeNull()
  })
})

describe('bestFlip', () => {
  const feed = (name: string, chaos: number, traded: number) => parseExchange({
    core: { primary: 'chaos' },
    items: [{ id: name, name }],
    lines: [{ id: name, primaryValue: chaos, volumePrimaryValue: traded }]
  })
  const items = [
    item('DeliriumOrb', 'Fine Delirium Orb', 40),
    item('DeliriumOrb', "Armoursmith's Delirium Orb", 5),
    item('Oil', 'Black Oil', 10),
    item('Oil', 'Opalescent Oil', 100),
    item('Currency', 'Primal Crystallised Lifeforce', 0.03)
  ]

  it('picks across families by the profit the market can supply', () => {
    const exchanges: Exchanges = new Map([
      ['DeliriumOrb', feed("Armoursmith's Delirium Orb", 5, 500)],
      ['Oil', feed('Black Oil', 10, 100)]
    ])
    const best = bestFlip(items, exchanges, PLAIN, 30)
    expect(best?.family.id).toBe('delirium')
    expect(best?.name).toBe("Armoursmith's Delirium Orb")
    expect(best?.item).toBe("Armoursmith's Delirium Orb")
  })

  it('names the item to buy when the best flip is a recipe', () => {
    const oils = parseExchange({
      core: { primary: 'chaos' },
      items: [{ id: 'b', name: 'Black Oil' }, { id: 'o', name: 'Opalescent Oil' }],
      lines: [{ id: 'b', primaryValue: 10, volumePrimaryValue: 100 }, { id: 'o', primaryValue: 100, volumePrimaryValue: 100 }]
    })
    const exchanges: Exchanges = new Map([['Oil', oils]])
    const best = bestFlip([item('Oil', 'Black Oil', 10), item('Oil', 'Opalescent Oil', 100)], exchanges, PLAIN, 30)
    expect(best?.name).toBe('Black to Opalescent Oil')
    expect(best?.item).toBe('Black Oil')
  })

  it('never picks a low-confidence family', () => {
    const rich = [item('Runegraft', 'Runegraft of Quaffing', 1), item('Runegraft', 'Runegraft of the Bound', 2000)]
    const exchanges: Exchanges = new Map([['Runegraft', parseExchange({
      core: { primary: 'chaos' },
      items: [{ id: 'q', name: 'Runegraft of Quaffing' }, { id: 'b', name: 'Runegraft of the Bound' }],
      lines: [{ id: 'q', primaryValue: 1, volumePrimaryValue: 900 }, { id: 'b', primaryValue: 2000, volumePrimaryValue: 900 }]
    })]])
    expect(familyById('runegrafts').lowConfidence).toBeTruthy()
    expect(bestFlip(rich, exchanges, PLAIN, 30)).toBeNull()
  })

  it('ranks by profit without volume, below any flip with volume', () => {
    // Per item, the orb's +34c beats the oil's +23c, though the oil's recipe makes more.
    const noVolume = bestFlip(items, new Map(), PLAIN, 30)
    expect(noVolume?.name).toBe("Armoursmith's Delirium Orb")
    expect(noVolume?.profitEach).toBeCloseTo(34.1, 1)
    expect(noVolume?.profitPerDay).toBeNull()
    const oneFeed = bestFlip(items, new Map([['DeliriumOrb', feed("Armoursmith's Delirium Orb", 5, 500)]]), PLAIN, 30)
    expect(oneFeed?.family.id).toBe('delirium')
  })
})

describe('family data', () => {
  it('every family can be priced some way', () => {
    for (const f of FAMILIES) {
      for (const m of f.methods) {
        if (m.id === 'upgrade') expect(f.chains?.length, f.id).toBeGreaterThan(0)
        else expect(Boolean(f.weights || f.weightOf), f.id).toBe(true)
      }
    }
  })

  it('every weighted item belongs to its family', () => {
    for (const f of FAMILIES) {
      for (const name of Object.keys(f.weights ?? {})) expect(f.match(name), name).toBe(true)
    }
  })

  it('reports the weight sitting on unpriced items', () => {
    const family = { ...delirium, weights: { 'Fine Delirium Orb': 3, 'Imperial Delirium Orb': 1 } }
    expect(unpricedShare(family, quotes({ 'Fine Delirium Orb': 30 }))).toBeCloseTo(0.25, 8)
  })

  it('shortens names without losing what tells them apart', () => {
    expect(shortName("Armoursmith's Delirium Orb")).toBe("Armoursmith's")
    expect(shortName('Scorched Fossil')).toBe('Scorched')
    expect(shortName('Imbued Catalyst')).toBe('Imbued')
    expect(shortName('Deafening Essence of Anger')).toBe('Deafening Anger')
    expect(shortName('Runegraft of the Bound')).toBe('Bound')
    expect(shortName('Harvest Scarab of Doubling')).toBe('Harvest of Doubling')
    expect(shortName('Black to Opalescent Oil')).toBe('Black to Opalescent Oil')
  })
})
