// Special maps on the Loot tab (Guy's M1, 2026-11-28): blighted and
// blight-ravaged maps priced by tier, in NeverSink's blighted section, never
// touching plain maps of the same tier.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, applyCurrency, currencyItems, defaultCurrency, kindOf, offSteps } from '@/web/woke/loot-filter/currency-weights'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { neverSink } from '../helpers/neversink'

const REGULAR = neverSink('1-REGULAR')
const PRICES: Record<string, number> = {
  'Divine Orb': 160,
  'Blighted Map (Tier 16)': 40,
  'Blighted Map (Tier 3)': 0.05,
  'Blight-ravaged Map (Tier 16)': 300,
  'Nightmare Map': 400,
  'Vaal Temple Map': 90,
  'Baran Map (Tier 16)': 20,
  'Drox Map (Tier 16)': 15
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
    expect([...items.values()].filter(i => i.cat === 'mapblight' || i.cat === 'mapravaged')).toHaveLength(3)
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

  it('has a fold for each kind of special map, priced or guessed', () => {
    const items = new Map(currencyItems(parseFilter(REGULAR), lookup).filter(i => kindOf(i.cat) === 'maps').map(i => [i.name, i]))
    expect(items.get('Nightmare Map')).toMatchObject({ cat: 'mapend', chaos: 400, est: false })
    // The cheapest Citadel line prices the fold's row.
    expect(items.get('Citadel maps (Tier 16)')).toMatchObject({ cat: 'mapguard', chaos: 15 })
    // No poe.ninja price: no row.
    expect(items.has('Shaper Guardian Map')).toBe(false)
    expect(items.get('Originator Map (Tier 16)')).toMatchObject({ cat: 'maporig', est: true })
    expect(items.get('8 mods')).toMatchObject({ cat: 'mapcorr', est: true })
  })

  it('writes the special map rules above NeverSink\'s, and a guess never hides a map', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    const doc = parseFilter(REGULAR)
    applyCurrency(doc, cfg, lookup)
    const hit = (f: ItemFacts) => matchItem(doc, f).final?.block
    const nightmare = map(17, { name: 'Nightmare Map', baseType: 'Nightmare Map' })
    expect(hit(nightmare)?.type).toBe(CURRENCY_TYPE)
    expect(hit(map(16, { zanaMemory: true }))?.type).toBe(CURRENCY_TYPE)
    expect(hit(map(16, { rarity: 'Rare', influences: ['Warlord'] }))?.type).toBe(CURRENCY_TYPE)
    expect(hit(map(16, { rarity: 'Rare', identified: true, explicitModNames: ['Fecund', 'of Zarokh'] }))?.type).toBe(CURRENCY_TYPE)
    // 8 mods: counted the way the game counts.
    const eight = ['Magnifying', 'Fecund', 'Chaining', 'Savage', 'of Balance', 'of Exposure', 'of Stasis', 'of Toughness']
    expect(hit(map(16, { rarity: 'Rare', identified: true, corrupted: true, explicitModNames: eight }))?.tier).toMatch(/^s[1-5]$/)
    // A guess under the line never hides: from the normal maps' floor it
    // shows Small in its kind's tint, below it NeverSink decides.
    const strict = parseFilter(REGULAR)
    applyCurrency(strict, { ...cfg, mult: 50, mapFrom: 14 }, lookup)
    const corr = matchItem(strict, map(16, { corruptedMods: 1, corrupted: true }))
    expect(corr.visibility).toBe('Show')
    expect(corr.final?.block.tier).toBe('s1')
    expect(corr.final?.block.actions.find(a => a.key === 'SetTextColor')?.args.slice(0, 3)).toEqual(['255', '120', '165'])
    const low = matchItem(strict, map(10, { corruptedMods: 1, corrupted: true }))
    expect(low.final?.block.type).not.toBe(CURRENCY_TYPE)
    // A unique map is never caught.
    expect(hit(map(16, { rarity: 'Unique', zanaMemory: true }))?.type).not.toBe(CURRENCY_TYPE)
    // Plain maps are still NeverSink's.
    expect(hit(map(16))?.type).not.toBe(CURRENCY_TYPE)
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })

  it('special maps are black on white from Normal up, edged in their tint, with a square icon', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    const doc = parseFilter(REGULAR)
    applyCurrency(doc, cfg, lookup)
    // Citadel maps at 15c: Big.
    const m = matchItem(doc, map(16, { rarity: 'Rare', influences: ['Warlord'] }))
    expect(m.final?.block.tier).toBe('s4')
    const act = (k: string) => m.final?.block.actions.find(a => a.key === k)?.args
    expect(act('SetTextColor')?.slice(0, 3)).toEqual(['0', '0', '0'])
    expect(act('SetBackgroundColor')?.slice(0, 3)).toEqual(['255', '255', '255'])
    expect(act('SetBorderColor')?.slice(0, 3)).toEqual(['200', '165', '255'])
    expect(act('MinimapIcon')?.slice(1)).toEqual(['Purple', 'Square'])
  })

  it('hides a special map only when its section is Off', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    cfg.catMode = { ...cfg.catMode, maporig: 'off' }
    const doc = parseFilter(REGULAR)
    applyCurrency(doc, cfg, lookup)
    expect(matchItem(doc, map(16, { zanaMemory: true })).visibility).toBe('Hide')
    expect(matchItem(doc, map(16)).visibility).toBe('Show')
  })

  it('leaves a corrupted or anointed blighted map to its own priced rule', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    cfg.catMode = { mapcorr: 'off' }
    const doc = parseFilter(REGULAR)
    applyCurrency(doc, cfg, lookup)
    const ravaged = matchItem(doc, map(16, { rarity: 'Rare', uberBlightedMap: true, corrupted: true, corruptedMods: 1, anyEnchantment: true } as Partial<ItemFacts>))
    expect(ravaged.visibility).toBe('Show')
    expect(ravaged.final?.block.comment).not.toContain('mapcorr')
    expect(Number(ravaged.final?.block.tier?.slice(1))).toBeGreaterThanOrEqual(4)
  })
})

describe('Originator maps from the clipboard', () => {
  it('reads "Originator\'s Memories" as a Zana memory map', async () => {
    const fs = await import('fs')
    const { itemFacts } = await import('@/web/woke/loot-filter/item-facts')
    for (const f of ['map-originator-t16', 'map-originator-implicit']) {
      const text = fs.readFileSync(`../testing/fixtures/items/${f}.txt`, 'utf8')
      expect(itemFacts(text, null).zanaMemory, f).toBe(true)
    }
  })
})

describe('a guessed special map on a step turned off', () => {
  it('still shows: Originator T16 with every step off', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    cfg.offBy = { all: [1, 2, 3, 4] }
    const doc = parseFilter(REGULAR)
    applyCurrency(doc, cfg, lookup)
    const orig = map(16, { rarity: 'Rare', zanaMemory: true, hasImplicitMod: true })
    const hit = matchItem(doc, orig)
    expect(hit.visibility).toBe('Show')
    expect(hit.final?.block.type).toBe(CURRENCY_TYPE)
    // At its own step, not the guessed-under-the-line fallback, and the tab
    // doesn't call it hidden.
    expect(hit.final?.block.comment).not.toMatch(/under the line/)
    const it = currencyItems(parseFilter(REGULAR), lookup).find(i => i.name === 'Originator Map (Tier 16)')!
    expect(offSteps(it, cfg)).toEqual([])
  })
})
