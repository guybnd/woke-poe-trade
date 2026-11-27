// Divination cards on the Loot tab (Guy's picks, 2026-11-27: folded by what
// the set turns into, priced like currency): a pile counts price × stack,
// capped at the card's set size.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, applyCurrency, currencyItems, defaultCurrency, kindOf } from '@/web/woke/loot-filter/currency-weights'
import { cardCategoryOf } from '@/web/woke/loot-filter/card-classes'
import type { CardFacts } from '@/web/woke/loot-filter/card-classes'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { neverSink } from '../helpers/neversink'

const SEMI = neverSink('2-SEMI-STRICT')
const PRICES: Record<string, number> = { 'Divine Orb': 160, 'The Doctor': 900, 'Rain of Chaos': 0.3, 'The Nurse': 40 }
const lookup: PriceLookup = (_g, base) => PRICES[base] != null ? { chaos: PRICES[base], thin: false } : null
const CARDS: CardFacts = new Map([
  ['The Doctor', { stack: 8, cat: 'carduniq' }],
  ['Rain of Chaos', { stack: 8, cat: 'cardcur' }],
  ['The Nurse', { stack: 8, cat: 'cardother' }]
])
const card = (name: string, stackSize = 1): ItemFacts => ({
  name, baseType: name, itemClass: 'Divination Cards', stackSize, areaLevel: 83, influences: [], explicitModNames: []
})

describe('divination cards on the Loot tab', () => {
  it('folds a card by what its set turns into', () => {
    expect(cardCategoryOf(['<uniqueitem>{Headhunter}'])).toBe('carduniq')
    expect(cardCategoryOf(['<currencyitem>{10x Exalted Orb}'])).toBe('cardcur')
    expect(cardCategoryOf(['<gemitem>{Level 4 Empower}', '<corrupted>{Corrupted}'])).toBe('cardgem')
    expect(cardCategoryOf(['<whiteitem>{Six-Link Holy Chainmail}'])).toBe('cardgear')
    expect(cardCategoryOf(['<magicitem>{Punishing Map}'])).toBe('cardmap')
    expect(cardCategoryOf(['<size:26>{<currencyitem>{Mirror of Kalandra}}'])).toBe('cardcur')
    expect(cardCategoryOf(['<divination>{The Doctor}'])).toBe('cardother')
    expect(kindOf('carduniq')).toBe('cards')
  })

  it('reads cards from the filter, with their set size once known', () => {
    const items = new Map(currencyItems(parseFilter(SEMI), lookup, {}, CARDS).map(i => [i.name, i]))
    expect(items.get('The Doctor')).toMatchObject({ cat: 'carduniq', full: 8, chaos: 900, cls: 'Divination Cards' })
    const before = new Map(currencyItems(parseFilter(SEMI), lookup).map(i => [i.name, i]))
    expect(before.get('The Doctor')).toMatchObject({ cat: 'cardother', full: 10 })
    expect(before.get('The Doctor')?.free).toBeUndefined()
  })

  it('shows a card by price × stack, and a turned-off fold hides', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    cfg.line = 0.5
    const doc = parseFilter(SEMI)
    applyCurrency(doc, cfg, lookup, CARDS)
    const hit = (name: string, n = 1) => matchItem(doc, card(name, n)).final?.block
    expect(hit('The Doctor')?.type).toBe(CURRENCY_TYPE)
    expect(hit('The Doctor')?.tier).toBe('s5')
    // 0.3c a card: one is under Small's line (0.5c), a pile of 4 isn't.
    expect(hit('Rain of Chaos', 1)?.visibility).toBe('Hide')
    expect(hit('Rain of Chaos', 4)?.visibility).toBe('Show')
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
    cfg.catMode = { carduniq: 'off' }
    const off = parseFilter(SEMI)
    applyCurrency(off, cfg, lookup, CARDS)
    expect(matchItem(off, card('The Doctor')).final?.block.visibility).toBe('Hide')
    expect(matchItem(off, card('The Nurse')).final?.block.visibility).toBe('Show')
  })
})

describe('Collecting', () => {
  it('shows a collected card at least Normal at any stack, even with its fold off', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    cfg.line = 0.5
    cfg.items = { 'Rain of Chaos': { min: 2 } }
    cfg.catMode = { cardcur: 'off' }
    const doc = parseFilter(SEMI)
    applyCurrency(doc, cfg, lookup, CARDS)
    const b = matchItem(doc, card('Rain of Chaos')).final?.block
    expect(b?.visibility).toBe('Show')
    expect(b?.tier).toBe('s2')
    // The Doctor is still priced: a star doesn't make it quieter.
    cfg.items = { 'The Doctor': { min: 2 } }
    const doc2 = parseFilter(SEMI)
    applyCurrency(doc2, cfg, lookup, CARDS)
    expect(matchItem(doc2, card('The Doctor')).final?.block.tier).toBe('s5')
  })
})
