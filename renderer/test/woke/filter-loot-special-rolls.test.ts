// Special unique rolls on the Loot tab (Guy's spec A, 2026-11-28): NeverSink's
// special rules (6-link, both influences, no sockets...) priced per base, a
// 6-link at least 20 Orbs of Fusing.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, applyCurrency, currencyItems, defaultCurrency } from '@/web/woke/loot-filter/currency-weights'
import { NET_GROUPS, priceLookup } from '@/web/woke/loot-filter/economy'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import type { PriceItem } from '@/web/woke/market/types'
import { neverSink } from '../helpers/neversink'

const REGULAR = neverSink('1-REGULAR')
const lookup: PriceLookup = (g, base) => {
  if (!g.unique) return ({ 'Divine Orb': 160, 'Orb of Fusing': 0.5 } as Record<string, number>)[base] != null ? { chaos: ({ 'Divine Orb': 160, 'Orb of Fusing': 0.5 } as Record<string, number>)[base], thin: false } : null
  if (g.links) return ({ 'Simple Robe': 2, 'Vaal Regalia': 400 } as Record<string, number>)[base] != null ? { chaos: ({ 'Simple Robe': 2, 'Vaal Regalia': 400 } as Record<string, number>)[base], thin: false, note: 'X' } : null
  if (g.special) return base === 'Onyx Amulet' ? { chaos: 5000, thin: false, note: 'Impresence' } : base === 'Glorious Plate' ? { chaos: 0.1, thin: false, note: "Kaom's Heart" } : null
  return base === 'Vaal Regalia' ? { chaos: 1, thin: false } : base === 'Simple Robe' ? { chaos: 1, thin: false } : null
}
const unique = (baseType: string, more: Partial<ItemFacts> = {}): ItemFacts => ({
  name: baseType, baseType, itemClass: 'Body Armours', rarity: 'Unique', areaLevel: 83, influences: [], explicitModNames: [], foulborn: false, ...more
} as ItemFacts)

describe('special unique rolls on the Loot tab', () => {
  it('prices each special rule per base, a 6-link at least 20 Fusings', () => {
    const items = new Map(currencyItems(parseFilter(REGULAR), lookup).filter(i => i.cat === 'uniqspec' || i.cat === 'uniq6l').map(i => [i.name, i]))
    expect(items.get('Simple Robe, 6-link')).toMatchObject({ chaos: 10, bt: 'Simple Robe', cat: 'uniq6l', floor: 4 })
    // Any other 6-linked unique: one row (Guy's R1).
    expect(items.get('Vaal Regalia, 6-link')).toBeUndefined()
    // Priced at its 20 Fusings and never below Big, not at the best 6-link
    // there is (Guy: "any unique 6link should not be tink").
    expect(items.get('Any unique, 6-link')).toMatchObject({ chaos: 10, floor: 4, cat: 'uniq6l' })
    expect(items.get('Any unique, 6-link')?.bts).toContain('Vaal Regalia')
    expect(items.get('Onyx Amulet, Shaper and Elder')?.chaos).toBe(5000)
    expect(items.get('Glorious Plate, no sockets')?.chaos).toBe(0.1)
  })

  it('a special roll\'s best line counts, 6-link lines only for 6-links', () => {
    const items = [
      { type: 'UniqueArmour', name: 'Tabula Rasa', variant: '', chaos: 1, gaps: 0 },
      { type: 'UniqueArmour', name: 'Tabula Rasa', variant: '6L', chaos: 30, gaps: 0 },
      { type: 'UniqueAccessory', name: 'Impresence', variant: 'Lightning', chaos: 900, gaps: 5 },
      { type: 'UniqueAccessory', name: 'Impresence', variant: '', chaos: 40, gaps: 0 }
    ] as PriceItem[]
    const on: Record<string, string[]> = { 'Simple Robe': ['Tabula Rasa'], 'Onyx Amulet': ['Impresence'] }
    const look = priceLookup(items, b => on[b] ?? [])
    const u = NET_GROUPS.find(g => g.unique)!
    expect(look(u, 'Simple Robe')?.chaos).toBe(1)
    expect(look({ ...u, special: true, links: true }, 'Simple Robe')?.chaos).toBe(30)
    expect(look(u, 'Onyx Amulet')?.chaos).toBe(40)
    expect(look({ ...u, special: true }, 'Onyx Amulet')?.chaos).toBe(900)
  })

  it('writes the rules above NeverSink\'s specials, each with its conditions', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    const doc = parseFilter(REGULAR)
    applyCurrency(doc, cfg, lookup)
    const hit = (base: string, more: Partial<ItemFacts> = {}) => matchItem(doc, unique(base, more)).final?.block
    // A random 6-linked unique shows Big in the 6-links look, not Tink.
    const six = hit('Vaal Regalia', { socketGroups: ['RRRRRR'] } as Partial<ItemFacts>)
    expect(six).toMatchObject({ type: CURRENCY_TYPE, tier: 's4' })
    const act = (k: string) => six?.actions.find(a => a.key === k)?.args.join(' ')
    expect(act('SetBackgroundColor')).toBe('175 96 37 255')
    expect(act('SetTextColor')).toBe('255 255 255 255')
    expect(act('PlayEffect')).toBe('White')
    // Tabula too, whatever its 6-link market says.
    expect(hit('Simple Robe', { socketGroups: ['RRRRRR'] } as Partial<ItemFacts>)?.actions.find(a => a.key === 'SetBackgroundColor')?.args.join(' ')).toBe('175 96 37 255')
    // Kaom's Heart at 0.1c: under the line, hidden.
    const kaom = hit('Glorious Plate', { socketGroups: [] } as Partial<ItemFacts>)
    expect(kaom).toMatchObject({ type: CURRENCY_TYPE, visibility: 'Hide' })
    expect(kaom?.conditions.some(x => x.key === 'Sockets')).toBe(true)
    // Without the special roll, the base is the plain uniques' (1c, not s5).
    expect(hit('Vaal Regalia')?.tier).not.toBe('s5')
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })

  it('a 6-linked unique on a base worth more than Big keeps its own step', () => {
    const rich: PriceLookup = (g, base) => !g.special && !g.links && g.unique && base === 'Vaal Regalia' ? { chaos: 5000, thin: false } : lookup(g, base)
    const cfg = defaultCurrency()
    cfg.on = true
    const doc = parseFilter(REGULAR)
    applyCurrency(doc, cfg, rich)
    const six = { socketGroups: ['RRRRRR'] } as Partial<ItemFacts>
    expect(matchItem(doc, unique('Vaal Regalia', six)).final?.block).toMatchObject({ type: CURRENCY_TYPE, tier: 's5' })
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
    // Your step on the row decides for every base.
    cfg.items['Any unique, 6-link'] = { step: 2 }
    const doc2 = parseFilter(REGULAR)
    applyCurrency(doc2, cfg, rich)
    expect(matchItem(doc2, unique('Vaal Regalia', six)).final?.block).toMatchObject({ type: CURRENCY_TYPE, tier: 's2' })
  })
})
