// Gold on the Loot tab (Guy 2026-11-28): one row in Currency, its piles
// stepped by size on its own ruler; its rules only ever name Gold.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, applyCurrency, currencyItems, defaultCurrency, kindOf, normalizeCurrency } from '@/web/woke/loot-filter/currency-weights'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { neverSink } from '../helpers/neversink'

const SEMI = neverSink('2-SEMI-STRICT')
const lookup: PriceLookup = (_g, base) => base === 'Divine Orb' ? { chaos: 160, thin: false } : base === 'Chaos Orb' ? { chaos: 1, thin: false } : null
const gold = (n: number): ItemFacts => ({ name: 'Gold', baseType: 'Gold', stackSize: n, areaLevel: 83, influences: [], explicitModNames: [] } as ItemFacts)

describe('gold on the Loot tab', () => {
  it('has one row in Currency', () => {
    const items = currencyItems(parseFilter(SEMI), lookup).filter(i => i.cat === 'gold')
    expect(items.map(i => i.name)).toEqual(['Gold'])
    expect(kindOf('gold')).toBe('currency')
  })

  it('steps a pile by its size on the gold ruler', () => {
    const cfg = { ...defaultCurrency(), on: true, gold: [200, 500, 3000, 10000, 50000] }
    const doc = parseFilter(SEMI)
    applyCurrency(doc, cfg, lookup)
    const hit = (n: number) => matchItem(doc, gold(n))
    const step = (n: number) => Number(hit(n).final?.block.tier?.slice(1))
    expect(hit(5000).final?.block.type).toBe(CURRENCY_TYPE)
    expect([step(300), step(600), step(5000), step(20000), step(60000)]).toEqual([1, 2, 3, 4, 5])
    expect(hit(50).visibility).toBe('Hide')
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
    // Its rules never name anything but Gold.
    for (const b of doc.blocks.filter(x => x.type === CURRENCY_TYPE && x.conditions.some(k => k.key === 'BaseType' && k.values.includes('Gold')))) {
      expect(b.conditions.find(k => k.key === 'BaseType')?.values).toEqual(['Gold'])
    }
  })

  it('shows every pile by default, and hides it all when set Off', () => {
    const cfg = { ...defaultCurrency(), on: true }
    const doc = parseFilter(SEMI)
    applyCurrency(doc, cfg, lookup)
    expect(matchItem(doc, gold(20)).visibility).toBe('Show')
    const off = parseFilter(SEMI)
    applyCurrency(off, { ...cfg, items: { Gold: { step: 0 } } }, lookup)
    expect(matchItem(off, gold(4000)).visibility).toBe('Hide')
  })

  it('keeps a saved ruler only when it climbs', () => {
    expect(normalizeCurrency({ gold: [1, 400, 300, 9000, 9001] }).gold).toEqual(defaultCurrency().gold)
    expect(normalizeCurrency({ gold: [5, 400, 3000, 9000, 9001] }).gold).toEqual([5, 400, 3000, 9000, 9001])
  })
})
