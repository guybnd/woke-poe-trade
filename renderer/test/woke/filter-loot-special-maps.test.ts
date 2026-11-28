// Special maps on the Loot tab (Guy's M1, 2026-11-28): blighted and
// blight-ravaged maps priced by tier, in NeverSink's blighted section, never
// touching plain maps of the same tier.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, applyCurrency, currencyItems, defaultCurrency, kindOf } from '@/web/woke/loot-filter/currency-weights'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { neverSink } from '../helpers/neversink'

const REGULAR = neverSink('1-REGULAR')
const PRICES: Record<string, number> = {
  'Divine Orb': 160,
  'Blighted Map (Tier 16)': 40,
  'Blighted Map (Tier 3)': 0.05,
  'Blight-ravaged Map (Tier 16)': 300
}
const lookup: PriceLookup = (_g, base) => PRICES[base] != null ? { chaos: PRICES[base], thin: false } : null
const map = (tier: number, more: Partial<ItemFacts> = {}): ItemFacts => ({
  name: `Map (Tier ${tier})`,
  baseType: `Map (Tier ${tier})`,
  itemClass: 'Maps',
  rarity: 'Normal',
  mapTier: tier,
  areaLevel: 83,
  influences: [],
  explicitModNames: [],
  blightedMap: false,
  uberBlightedMap: false,
  ...more
} as ItemFacts)

describe('special maps on the Loot tab', () => {
  it('reads a priced tier of each kind as an item', () => {
    const items = new Map(currencyItems(parseFilter(REGULAR), lookup).filter(i => kindOf(i.cat) === 'maps').map(i => [i.name, i]))
    expect(items.get('Blighted Map (Tier 16)')).toMatchObject({ cat: 'mapblight', bt: 'Map (Tier 16)', chaos: 40 })
    expect(items.get('Blight-ravaged Map (Tier 16)')).toMatchObject({ cat: 'mapravaged', chaos: 300 })
    expect(items.size).toBe(3)
  })

  it('shows a blighted map by its tier\'s price and leaves plain maps alone', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    const doc = parseFilter(REGULAR)
    applyCurrency(doc, cfg, lookup)
    const hit = (f: ItemFacts) => matchItem(doc, f).final?.block
    expect(hit(map(16, { blightedMap: true }))?.type).toBe(CURRENCY_TYPE)
    expect(hit(map(16, { uberBlightedMap: true }))?.type).toBe(CURRENCY_TYPE)
    expect(Number(hit(map(16, { uberBlightedMap: true }))?.tier?.slice(1))).toBeGreaterThan(Number(hit(map(16, { blightedMap: true }))?.tier?.slice(1)))
    // Under the line (0.2c): hidden.
    expect(hit(map(3, { blightedMap: true }))?.visibility).toBe('Hide')
    // A plain map of a priced tier is NeverSink's.
    expect(hit(map(3))?.type).not.toBe(CURRENCY_TYPE)
    expect(hit(map(16))?.type).not.toBe(CURRENCY_TYPE)
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })
})
