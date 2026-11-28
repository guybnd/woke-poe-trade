// Foulborn uniques on the Loot tab (Guy's R1, 2026-11-28): their own section,
// each base priced by its most valuable Foulborn unique, on the same steps,
// and never touching the plain uniques on the same bases.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, applyCurrency, currencyItems, defaultCurrency, kindOf } from '@/web/woke/loot-filter/currency-weights'
import { NET_GROUPS, priceLookup } from '@/web/woke/loot-filter/economy'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import type { PriceItem } from '@/web/woke/market/types'
import { neverSink } from '../helpers/neversink'

const REGULAR = neverSink('1-REGULAR')
// Plain uniques and Foulborn ones priced apart: a plain Leather Belt is a
// Headhunter, a Foulborn one is cheap; a Foulborn Paua Amulet is valuable.
const PLAIN: Record<string, number> = { 'Leather Belt': 9000, 'Paua Amulet': 1 }
const FOUL: Record<string, number> = { 'Leather Belt': 0.1, 'Paua Amulet': 2000 }
const lookup: PriceLookup = (g, base) => {
  if (!g.unique) return base === 'Divine Orb' ? { chaos: 160, thin: false } : null
  const t = g.foulborn ? FOUL : PLAIN
  return t[base] != null ? { chaos: t[base], thin: false, note: g.foulborn ? `Foulborn X ${base}` : `X ${base}` } : null
}
const unique = (baseType: string, foulborn: boolean, more: Partial<ItemFacts> = {}): ItemFacts => ({
  name: baseType, baseType, itemClass: 'Belts', rarity: 'Unique', areaLevel: 83, influences: [], explicitModNames: [], foulborn, ...more
} as ItemFacts)

describe('Foulborn uniques on the Loot tab', () => {
  it('reads bases from NeverSink\'s Foulborn tiers, priced by their Foulborn lines', () => {
    const items = new Map(currencyItems(parseFilter(REGULAR), lookup).filter(i => i.cat === 'uniqfoul').map(i => [i.name, i]))
    expect(items.get('Foulborn Paua Amulet')).toMatchObject({ bt: 'Paua Amulet', chaos: 2000, est: false })
    expect(items.get('Foulborn Leather Belt')?.chaos).toBe(0.1)
    expect(kindOf('uniqfoul')).toBe('uniques')
    expect(items.size).toBeGreaterThan(100)
  })

  it('prices a base by its best Foulborn unique on poe.ninja', () => {
    const group = { ...NET_GROUPS.find(g => g.unique)!, foulborn: true }
    const look = priceLookup([
      { type: 'UniqueAccessory', name: 'Foulborn Headhunter', variant: '', chaos: 50, gaps: 0 },
      { type: 'UniqueAccessory', name: 'Headhunter', variant: '', chaos: 9000, gaps: 0 }
    ] as PriceItem[], () => ['Headhunter'])
    expect(look(group, 'Leather Belt')?.chaos).toBe(50)
    expect(look({ ...group, foulborn: false }, 'Leather Belt')?.chaos).toBe(9000)
  })

  it('writes Foulborn rules that never catch the plain unique on the base', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    const doc = parseFilter(REGULAR)
    applyCurrency(doc, cfg, lookup)
    const hit = (base: string, foul: boolean, more: Partial<ItemFacts> = {}) => matchItem(doc, unique(base, foul, more)).final?.block
    expect(hit('Paua Amulet', true, { itemClass: 'Amulets' })).toMatchObject({ type: CURRENCY_TYPE, tier: 's5' })
    expect(hit('Leather Belt', true)?.visibility).toBe('Hide')
    // The plain Headhunter base still shows loud, the plain Paua Amulet is the
    // plain uniques' business.
    expect(hit('Leather Belt', false)).toMatchObject({ type: CURRENCY_TYPE, tier: 's5' })
    expect(hit('Paua Amulet', false, { itemClass: 'Amulets' })?.tier).not.toBe('s5')
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })

  it('a Foulborn section set Off hides only Foulborn uniques', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    cfg.catMode = { uniqfoul: 'off' }
    const doc = parseFilter(REGULAR)
    applyCurrency(doc, cfg, lookup)
    expect(matchItem(doc, unique('Paua Amulet', true, { itemClass: 'Amulets' })).final?.block.visibility).toBe('Hide')
    expect(matchItem(doc, unique('Leather Belt', false)).final?.block.tier).toBe('s5')
  })
})
