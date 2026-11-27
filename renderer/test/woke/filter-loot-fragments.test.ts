// Fragments on the Loot tab (Guy's pick A, 2026-11-27): priced on the
// currency ladder, folded by boss; a fragment's worth is its own price (they
// don't stack). League threads stay in Currency.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, applyCurrency, categoryOf, currencyItems, defaultCurrency, kindOf } from '@/web/woke/loot-filter/currency-weights'
import { fragmentCategoryOf } from '@/web/woke/loot-filter/fragment-classes'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { neverSink } from '../helpers/neversink'

const SEMI = neverSink('2-SEMI-STRICT')
const PRICES: Record<string, number> = { 'Divine Orb': 160, 'The Maven\'s Writ': 120, 'Fragment of the Hydra': 2.5, 'Timeless Karui Emblem': 0.5, 'Breach Thread': 3 }
const lookup: PriceLookup = (_g, base) => PRICES[base] != null ? { chaos: PRICES[base], thin: false } : null
const frag = (name: string): ItemFacts => ({
  name, baseType: name, itemClass: 'Map Fragments', stackSize: 1, areaLevel: 83, influences: [], explicitModNames: []
})

describe('fragments on the Loot tab', () => {
  it('folds fragments by boss', () => {
    expect(fragmentCategoryOf("The Maven's Writ")).toBe('invites')
    expect(fragmentCategoryOf('Screaming Invitation')).toBe('invites')
    expect(fragmentCategoryOf('Fragment of the Hydra')).toBe('shaper')
    expect(fragmentCategoryOf('Fragment of Knowledge')).toBe('shaper')
    expect(fragmentCategoryOf('Cosmic Fragment')).toBe('uber')
    expect(fragmentCategoryOf("Baran's Crest")).toBe('crests')
    expect(fragmentCategoryOf('Timeless Karui Emblem')).toBe('emblems')
    expect(fragmentCategoryOf('Offering to the Goddess')).toBe('lab')
    expect(fragmentCategoryOf('Simulacrum')).toBe('fragother')
    expect(categoryOf('Breach Thread', 'fragments')).toBe('threads')
    expect(kindOf('threads')).toBe('currency')
    expect(kindOf('shaper')).toBe('fragments')
  })

  it('reads fragments from the filter, one to a pile', () => {
    const items = new Map(currencyItems(parseFilter(SEMI), lookup).map(i => [i.name, i]))
    const writ = items.get("The Maven's Writ")!
    expect(writ.cat).toBe('invites')
    expect(writ.full).toBe(1)
    expect(writ.chaos).toBe(120)
    expect(items.get('Breach Thread')!.cat).toBe('threads')
    expect(items.get('Breach Thread')!.full).toBeGreaterThan(1)
    expect([...items.values()].filter(i => kindOf(i.cat) === 'fragments').length).toBeGreaterThan(30)
  })

  it('shows fragments by their price, and honours a section turned off', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    const doc = parseFilter(SEMI)
    applyCurrency(doc, cfg, lookup)
    const tier = (name: string) => matchItem(doc, frag(name)).final?.block
    expect(tier("The Maven's Writ")?.type).toBe(CURRENCY_TYPE)
    expect(tier("The Maven's Writ")?.tier).toBe('s5')
    expect(tier('Fragment of the Hydra')?.tier).toBe('s2')
    expect(tier('Timeless Karui Emblem')?.visibility).toBe('Show')
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])

    cfg.catMode = { shaper: 'off' }
    const off = parseFilter(SEMI)
    applyCurrency(off, cfg, lookup)
    expect(matchItem(off, frag('Fragment of the Hydra')).final?.block.visibility).toBe('Hide')
    expect(matchItem(off, frag("The Maven's Writ")).final?.block.tier).toBe('s5')
  })
})
