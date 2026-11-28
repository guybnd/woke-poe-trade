// Loot › Recipes: by default each recipe shows at the step its reward's
// price reaches (Guy 2026-11-28); a step picked by hand wins.
import { describe, it, expect, beforeAll } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { applyCurrency, defaultCurrency, recipePicked, recipeStep, recipeWorth, scaled, setRecipeStep } from '@/web/woke/loot-filter/currency-weights'
import type { CurrencySettings } from '@/web/woke/loot-filter/currency-weights'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { lootPresets, migratedPresets } from '@/web/woke/loot-filter/loot-presets'
import { defaultPresets } from '@/web/woke/loot-filter/presets'
import { neverSink } from '../helpers/neversink'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData, 60000)

const SEMI = neverSink('2-SEMI-STRICT')
const PRICES: Record<string, number> = { 'Divine Orb': 160, 'Orb of Fusing': 0.5, 'Jeweller\'s Orb': 0.1, 'Gemcutter\'s Prism': 1.2, 'Glassblower\'s Bauble': 0.3, 'Chromatic Orb': 0.1 }
const lookup: PriceLookup = (_g, base) => PRICES[base] != null ? { chaos: PRICES[base], thin: false } : null
const on = (f?: (c: CurrencySettings) => void): CurrencySettings => {
  const c = defaultCurrency()
  c.on = true
  f?.(c)
  return c
}
const rare = (extra: Partial<ItemFacts>): ItemFacts => ({ name: 'x', baseType: 'Simple Robe', itemClass: 'Body Armours', rarity: 'Rare', itemLevel: 84, areaLevel: 83, influences: [], explicitModNames: [], identified: true, ...extra } as ItemFacts)

describe('recipe steps by price', () => {
  it('prices what the vendor gives, count included', () => {
    expect(recipeWorth(lookup, 'link6')).toBe(10)
    expect(recipeWorth(lookup, 'six')).toBeCloseTo(0.7)
    expect(recipeWorth(null, 'link6')).toBeNull()
  })
  it('lands on the steps of the currency section (line 0.2, Normal 1, Decent 3, Big 10)', () => {
    const c = on()
    expect(recipeStep(c, 'link6', lookup)).toBe(4)
    expect(recipeStep(c, 'six', lookup)).toBe(1)
    expect(recipeStep(c, 'gem20', lookup)).toBe(2)
    expect(recipeStep(c, 'flask20', lookup)).toBe(1)
    expect(recipeStep(c, 'rgb', lookup)).toBe(0)
    // Without prices: the old defaults.
    expect(recipeStep(c, 'link6', null)).toBe(4)
    expect(recipeStep(c, 'six', null)).toBe(2)
  })
  it('follows strictness and the section bias', () => {
    const strict = scaled(on(c => { c.mult = 4 }), null)
    expect(recipeStep(strict, 'six', lookup)).toBe(0)
    expect(recipeStep(on(c => { c.bias = { ...c.bias, orbs: 51 } }), 'gem20', lookup)).toBe(1)
  })
  it('never goes past Big', () => {
    expect(recipeStep(on(), 'link6', () => ({ chaos: 50, thin: false }))).toBe(4)
  })
  it('a step picked by hand wins, and By price clears it', () => {
    const c = on(x => setRecipeStep(x, 'rgb', 3))
    expect(recipePicked(c, 'rgb')).toBe(3)
    expect(recipeStep(c, 'rgb', lookup)).toBe(3)
    setRecipeStep(c, 'rgb', null)
    expect(recipePicked(c, 'rgb')).toBeNull()
    expect('rcrgb' in c.catMode).toBe(false)
    expect(recipeStep(c, 'rgb', lookup)).toBe(0)
  })
  it('writes the priced steps into the filter', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(), lookup)
    const tier = (f: ItemFacts) => matchItem(doc, f).final?.block.tier
    expect(tier(rare({ socketGroups: ['RG', 'GB', 'BR'] }))).toBe('s1')
    expect(tier({ ...rare({}), baseType: 'Divine Life Flask', itemClass: 'Life Flasks', rarity: 'Magic', quality: 20 } as ItemFacts)).toBe('s1')
    expect(doc.blocks.some(b => b.comment.endsWith('recipe: R-G-B linked'))).toBe(false)
  })
  it('R-G-B priced Off still stops NeverSink\'s chromatic rules in maps', () => {
    const p = defaultPresets()
    p.currency.on = true
    expect(lootPresets(p, true, recipeStep(p.currency, 'rgb', lookup)).hideRgb.on).toBe(true)
    expect(lootPresets(p, true, 1).hideRgb.on).toBe(false)
  })
  it('uses your own price on the reward, and hides on a step turned off there', () => {
    expect(recipeStep(on(c => { c.items['Jeweller\'s Orb'] = { price: 0.5 } }), 'six', lookup)).toBe(3)
    expect(recipeStep(on(c => { c.offBy = { orbs: [2] } }), 'gem20', lookup)).toBe(0)
  })
  it('undoes an earlier carry-over that pinned R-G-B and 6 sockets from untouched presets, once', () => {
    const p = defaultPresets()
    p.currency.on = true
    p.currency.catMode = { rcmig: 1, rcrgb: 1, rcsix: 0, rclink6: 1 } as unknown as CurrencySettings['catMode']
    const m = migratedPresets(p)
    expect(recipePicked(m.currency, 'rgb')).toBeNull()
    expect(recipePicked(m.currency, 'six')).toBeNull()
    expect(recipePicked(m.currency, 'link6')).toBe(1)
    expect(migratedPresets(m)).toBe(m)
    // A Hide R-G-B you had on still carries over as Off.
    const q = defaultPresets()
    q.currency.on = true
    q.hideRgb.on = true
    expect(recipePicked(migratedPresets(q).currency, 'rgb')).toBe(0)
  })
})
