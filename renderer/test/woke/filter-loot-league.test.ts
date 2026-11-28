// League items on the Loot tab (Guy's League A, 2026-11-27): a mechanic set
// Off hides in maps; the rest stays NeverSink's.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, applyCurrency, currencyItems, defaultCurrency, kindOf } from '@/web/woke/loot-filter/currency-weights'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { leaguePile } from '@/web/woke/loot-filter/league-pile'
import { neverSink } from '../helpers/neversink'

const REGULAR = neverSink('1-REGULAR')
const item = (baseType: string, itemClass: string, areaLevel = 83): ItemFacts => ({
  name: baseType, baseType, itemClass, rarity: 'Normal', areaLevel, itemLevel: 83, influences: [], explicitModNames: []
} as ItemFacts)

describe('league items on the Loot tab', () => {
  it('hides a mechanic set Off, but not a row set by hand in it', () => {
    const doc = parseFilter(REGULAR)
    const cfg = { ...defaultCurrency(), on: true, catMode: { lgexped: 'off' as const, lgheist: 'off' as const }, items: { 'Blueprint, enchanted': { step: 4 as const } } }
    applyCurrency(doc, cfg, () => null)
    expect(matchItem(doc, item('Expedition Logbook', 'Expedition Logbooks')).visibility).toBe('Hide')
    expect(matchItem(doc, item('Chronicle of Atzoatl', 'Misc Map Items')).visibility).toBe('Show')
    const bp = { ...item('Blueprint: Bunker', 'Blueprints'), rarity: 'Rare', anyEnchantment: true } as ItemFacts
    expect(matchItem(doc, bp).visibility).toBe('Show')
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })

  it('has a fold per mechanic: priced Viscera and keys, a row per item level band for the rest', () => {
    const prices: Record<string, number> = { 'Divine Orb': 160, "Maven's Orrery": 40, 'Ancient Reliquary Key': 30 }
    const lookup: PriceLookup = (_g, base) => prices[base] != null ? { chaos: prices[base], thin: false } : null
    const items = currencyItems(parseFilter(REGULAR), lookup).filter(i => i.type === 'league')
    expect(new Set(items.map(i => kindOf(i.cat)))).toEqual(new Set(['league']))
    expect(items.find(i => i.name === "Maven's Orrery")).toMatchObject({ cat: 'lgviscera', chaos: 40, est: false })
    expect(items.find(i => i.name === 'Ancient Reliquary Key')).toMatchObject({ cat: 'lgkeys', chaos: 30, est: false })
    expect(items.find(i => i.name === 'Logbook, item level 83+')?.est).toBe(true)
    const cfg = { ...defaultCurrency(), on: true }
    const doc = parseFilter(REGULAR)
    applyCurrency(doc, cfg, lookup)
    const at = (f: ItemFacts) => matchItem(doc, f)
    const step = (f: ItemFacts) => Number(at(f).final?.block.tier?.slice(1))
    expect(at(item("Maven's Orrery", 'Viscera')).final?.block.type).toBe(CURRENCY_TYPE)
    const log = (n: number) => ({ ...item('Expedition Logbook', 'Expedition Logbooks'), itemLevel: n })
    expect(step(log(84))).toBeGreaterThan(step(log(75)))
    const bp = (more: Partial<ItemFacts>) => ({ ...item('Blueprint: Bunker', 'Blueprints'), rarity: 'Rare', ...more } as ItemFacts)
    expect(step(bp({ anyEnchantment: true }))).toBeGreaterThan(step(bp({})))
    // A whole class with no BaseType: charts, Sanctum research.
    expect(at(item('Forbidden Tome', 'Sanctum Research')).final?.block.type).toBe(CURRENCY_TYPE)
    expect(at(item('Gold', 'Currency')).final?.block.comment).not.toMatch(/lgsanctum|lgcharts/)
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })

  it('drops every league item on the ground, each naming its row', () => {
    const names = new Set(currencyItems(parseFilter(REGULAR), () => null).filter(i => i.type === 'league').map(i => i.name))
    for (const d of leaguePile(3)) if (d.priced) expect(names.has(d.priced), d.priced).toBe(true)
  })
})
