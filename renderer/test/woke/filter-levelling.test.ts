// Levelling (levelling.ts, Guy's picks 2026-11-28): the Loot tab's rules
// apply everywhere by default, the hideout (area level 60) too, and below
// maps a leveller's supplies, gems and uniques never hide by price.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, applyCurrency, defaultCurrency } from '@/web/woke/loot-filter/currency-weights'
import type { CurrencySettings } from '@/web/woke/loot-filter/currency-weights'
import { gateConds, isLvDefault, lvAdded, lvConds, lvCurrencyOf, lvGate, lvOn, setLvCurrency, setLvGate, setLvOn } from '@/web/woke/loot-filter/levelling'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { neverSink } from '../helpers/neversink'

const SEMI = neverSink('2-SEMI-STRICT')
const PRICES: Record<string, number> = {
  'Divine Orb': 160,
  'Chaos Orb': 1,
  'Orb of Alchemy': 0.3,
  'Orb of Transmutation': 0.05,
  'Scroll of Wisdom': 0.02,
  'Portal Scroll': 0.02,
  'Orb of Augmentation': 0.03,
  'Orb of Scouring': 0.4,
  'Simple Robe': 0.05,
  'Leather Belt': 9000
}
const lookup: PriceLookup = (_g, base) => PRICES[base] != null ? { chaos: PRICES[base], thin: false } : null
const on = (f?: (c: CurrencySettings) => void): CurrencySettings => {
  const c = defaultCurrency()
  c.on = true
  c.line = 1
  f?.(c)
  return c
}
const pile = (name: string, stackSize: number, areaLevel: number): ItemFacts => ({
  name, baseType: name, itemClass: 'Stackable Currency', stackSize, areaLevel, influences: [], explicitModNames: []
})
const unique = (baseType: string, areaLevel: number): ItemFacts => ({
  name: baseType, baseType, itemClass: 'Body Armours', rarity: 'Unique', areaLevel, influences: [], explicitModNames: []
} as ItemFacts)
const step = (doc: ReturnType<typeof parseFilter>, f: ItemFacts) => {
  const m = matchItem(doc, f)
  return m.visibility === 'Hide' ? 0 : Number(m.final?.block.tier?.slice(1)) || 0
}

describe('levelling', () => {
  it('reads the gate and the layer switch from catMode, everywhere and on by default', () => {
    const c = defaultCurrency()
    expect(lvGate(c)).toBe(2)
    expect(lvOn(c)).toBe(true)
    expect(gateConds(c)).toEqual([])
    expect(lvConds(c)?.map(x => `${x.key} ${x.op} ${x.values[0]}`)).toEqual(['AreaLevel <= 67'])
    setLvGate(c, 1)
    expect(gateConds(c).map(x => `${x.op} ${x.values[0]}`)).toEqual(['>= 60'])
    expect(lvConds(c)?.map(x => `${x.op} ${x.values[0]}`)).toEqual(['>= 60', '<= 67'])
    // Before Act 4 is under the hideout: nothing there with this gate.
    expect(lvConds(c, 33)).toBeNull()
    setLvGate(c, 0)
    expect(gateConds(c).map(x => `${x.op} ${x.values[0]}`)).toEqual(['>= 68'])
    expect(lvConds(c)).toBeNull()
    setLvGate(c, 2)
    setLvOn(c, false)
    expect(lvConds(c)).toBeNull()
  })

  it('a currency item can be added to the floor or taken off it', () => {
    const c = defaultCurrency()
    expect(lvCurrencyOf(c, 'Scroll of Wisdom')).toMatchObject({ step: 2 })
    expect(lvCurrencyOf(c, 'Weeping Essence of Greed')).toMatchObject({ step: 2 })
    expect(lvCurrencyOf(c, 'Orb of Scouring')).toBeNull()
    setLvCurrency(c, 'Orb of Scouring', true)
    setLvCurrency(c, 'Scroll of Wisdom', false)
    expect(lvCurrencyOf(c, 'Orb of Scouring')).toMatchObject({ step: 2 })
    expect(lvCurrencyOf(c, 'Scroll of Wisdom')).toBeNull()
    expect(lvAdded(c)).toEqual(['Orb of Scouring'])
    // Back to the list's own choice: the key goes.
    setLvCurrency(c, 'Scroll of Wisdom', true)
    expect(Object.keys(c.catMode)).toEqual(['lv:Orb of Scouring'])
    expect(isLvDefault('Portal Scroll')).toBe(true)
  })

  it('keeps a leveller\'s supplies visible below maps, the hideout too, and hides them by price in maps', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(), lookup)
    for (const name of ['Scroll of Wisdom', 'Portal Scroll', 'Orb of Transmutation', 'Orb of Augmentation']) {
      expect(matchItem(doc, pile(name, 1, 83)).visibility, `${name} in maps`).toBe('Hide')
      for (const area of [2, 40, 60, 67]) {
        expect(matchItem(doc, pile(name, 1, area)).final?.block.type, `${name} at ${area}`).toBe(CURRENCY_TYPE)
        expect(step(doc, pile(name, 1, area)), `${name} at ${area}`).toBe(2)
      }
    }
    // A pile of orbs one step louder; wisdom stays Normal.
    expect(step(doc, pile('Orb of Transmutation', 3, 20))).toBe(3)
    expect(step(doc, pile('Scroll of Wisdom', 10, 20))).toBe(2)
    // Worth more than the floor: its own step.
    expect(step(doc, pile('Divine Orb', 1, 20))).toBe(step(doc, pile('Divine Orb', 1, 83)))
    expect(step(doc, pile('Divine Orb', 1, 20))).toBeGreaterThan(2)
    // Not on the list: the price decides, levelling too.
    expect(matchItem(doc, pile('Orb of Scouring', 1, 20)).visibility).toBe('Hide')
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })

  it('an item taken off the floor hides by price while levelling; one added shows', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => { setLvCurrency(c, 'Scroll of Wisdom', false); setLvCurrency(c, 'Orb of Scouring', true) }), lookup)
    expect(matchItem(doc, pile('Scroll of Wisdom', 1, 20)).visibility).toBe('Hide')
    expect(step(doc, pile('Orb of Scouring', 1, 20))).toBe(2)
  })

  it('from the hideout: the hideout gets the Loot looks, Act 1 stays NeverSink\'s', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => setLvGate(c, 1)), lookup)
    expect(step(doc, pile('Portal Scroll', 1, 60))).toBe(2)
    expect(matchItem(doc, pile('Chaos Orb', 1, 60)).final?.block.type).toBe(CURRENCY_TYPE)
    expect(matchItem(doc, pile('Chaos Orb', 1, 20)).final?.block.type).not.toBe(CURRENCY_TYPE)
  })

  it('maps only: below area level 68 NeverSink decides, as before', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => setLvGate(c, 0)), lookup)
    for (const area of [20, 60]) expect(matchItem(doc, pile('Chaos Orb', 1, area)).final?.block.type).not.toBe(CURRENCY_TYPE)
    expect(doc.blocks.some(b => b.comment.includes('levelling:'))).toBe(false)
  })

  it('every unique shows at least Normal below maps; in maps a cheap one hides', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(), lookup)
    expect(matchItem(doc, unique('Simple Robe', 83)).visibility).toBe('Hide')
    expect(step(doc, unique('Simple Robe', 20))).toBe(2)
    expect(step(doc, unique('Simple Robe', 60))).toBe(2)
    // A valuable one keeps its own, louder step.
    expect(step(doc, { ...unique('Leather Belt', 20), itemClass: 'Belts' })).toBeGreaterThan(2)
  })

  it('the layer off: below maps prices alone decide', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => setLvOn(c, false)), lookup)
    expect(matchItem(doc, pile('Portal Scroll', 1, 20)).visibility).toBe('Hide')
    expect(matchItem(doc, unique('Simple Robe', 20)).visibility).toBe('Hide')
  })
})
