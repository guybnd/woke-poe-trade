// Gold on the Loot tab (Guy 2026-11-28): a row per pile size in Currency,
// each a guess you can set; its rules only ever name Gold.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, applyCurrency, currencyItems, defaultCurrency, kindOf } from '@/web/woke/loot-filter/currency-weights'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { neverSink } from '../helpers/neversink'

const SEMI = neverSink('2-SEMI-STRICT')
const lookup: PriceLookup = (_g, base) => base === 'Divine Orb' ? { chaos: 160, thin: false } : base === 'Chaos Orb' ? { chaos: 1, thin: false } : null
const gold = (n: number): ItemFacts => ({ name: 'Gold', baseType: 'Gold', stackSize: n, areaLevel: 83, influences: [], explicitModNames: [] } as ItemFacts)

describe('gold on the Loot tab', () => {
  it('has a row per pile size in Currency', () => {
    const items = currencyItems(parseFilter(SEMI), lookup).filter(i => i.cat === 'gold')
    expect(items.map(i => i.name)).toEqual(['Gold 3,000+', 'Gold 500+', 'Gold 150+', 'Gold under 150'])
    expect(kindOf('gold')).toBe('currency')
  })

  it('shows a pile by its size and hides small piles once the line passes them', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    const doc = parseFilter(SEMI)
    applyCurrency(doc, cfg, lookup)
    const hit = (n: number) => matchItem(doc, gold(n))
    expect(hit(5000).final?.block.type).toBe(CURRENCY_TYPE)
    expect(Number(hit(5000).final?.block.tier?.slice(1))).toBeGreaterThan(Number(hit(200).final?.block.tier?.slice(1)))
    expect(hit(50).visibility).toBe('Show')
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
    const strict = parseFilter(SEMI)
    applyCurrency(strict, { ...cfg, line: 1 }, lookup)
    expect(matchItem(strict, gold(50)).visibility).toBe('Hide')
    expect(matchItem(strict, gold(5000)).visibility).toBe('Show')
    // Its rules never name anything but Gold.
    for (const b of strict.blocks.filter(x => x.type === CURRENCY_TYPE && x.conditions.some(k => k.key === 'BaseType' && k.values.includes('Gold')))) {
      expect(b.conditions.find(k => k.key === 'BaseType')?.values).toEqual(['Gold'])
    }
  })

  it('hides a bigger pile set Off, never leaving it to a smaller row', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    cfg.items = { 'Gold 3,000+': { step: 0 } }
    const doc = parseFilter(SEMI)
    applyCurrency(doc, cfg, lookup)
    expect(matchItem(doc, gold(4000)).visibility).toBe('Hide')
    expect(matchItem(doc, gold(600)).visibility).toBe('Show')
  })
})
