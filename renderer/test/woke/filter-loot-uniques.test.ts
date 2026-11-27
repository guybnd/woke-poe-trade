// Uniques on the Loot tab (Guy's picks, 2026-11-27): a base is priced by the
// most valuable unique that drops on it, folded by NeverSink's tier kinds,
// with NeverSink's special rules (corrupted implicits, links) kept above the
// priced ones and boss-only bases Always.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, applyCurrency, currencyItems, defaultCurrency, kindOf, sectionMode, stacksFor } from '@/web/woke/loot-filter/currency-weights'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { neverSink } from '../helpers/neversink'

const REGULAR = neverSink('1-REGULAR')
// Leather Belt: Headhunter. Simple Robe: cheap. Hubris Circlet: boss only.
const PRICES: Record<string, { chaos: number, note?: string }> = {
  'Divine Orb': { chaos: 160 },
  'Leather Belt': { chaos: 9000, note: 'Headhunter, 1 of 3' },
  'Simple Robe': { chaos: 0.05, note: 'Tabula Rasa' },
  'Prismatic Jewel': { chaos: 3, note: 'Watcher\'s Eye' }
}
const lookup: PriceLookup = (g, base) => g.unique && PRICES[base] ? { ...PRICES[base], thin: false } : !g.unique && PRICES[base] ? { ...PRICES[base], thin: false } : null
const unique = (baseType: string, more: Partial<ItemFacts> = {}): ItemFacts => ({
  name: baseType, baseType, itemClass: 'Belts', rarity: 'Unique', areaLevel: 83, influences: [], explicitModNames: [], ...more
} as ItemFacts)

describe('uniques on the Loot tab', () => {
  it('reads bases from NeverSink\'s plain unique tiers, priced by their best unique', () => {
    const items = new Map(currencyItems(parseFilter(REGULAR), lookup).filter(i => kindOf(i.cat) === 'uniques').map(i => [i.name, i]))
    expect(items.get('Leather Belt')).toMatchObject({ chaos: 9000, est: false, top: 'Headhunter', of: 3, full: 1 })
    expect(items.get('Hubris Circlet')).toMatchObject({ cat: 'uniqboss', est: true })
    expect(items.get('Bone Helmet')?.cat).toBe('uniqearly')
    expect(items.get('Small Cluster Jewel')?.cat).toBe('uniqvar')
    expect(items.size).toBeGreaterThan(200)
  })

  it('boss-only bases default to Always', () => {
    const cfg = defaultCurrency()
    expect(sectionMode(cfg, 'uniqboss')).toBe('always')
    expect(sectionMode(cfg, 'uniqplain')).toBe('auto')
    const boss = currencyItems(parseFilter(REGULAR), lookup).find(i => i.name === 'Hubris Circlet')!
    expect(stacksFor({ ...boss, chaos: 0.01 }, cfg)[0]).toBe(1)
    cfg.catMode = { uniqboss: 'auto' }
    expect(stacksFor({ ...boss, chaos: 0.01 }, cfg)[0]).toBeNull()
  })

  it('writes the rules in the unique section, under NeverSink\'s specials', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    const doc = parseFilter(REGULAR)
    applyCurrency(doc, cfg, lookup)
    const hit = (base: string, more: Partial<ItemFacts> = {}) => matchItem(doc, unique(base, more)).final?.block
    expect(hit('Leather Belt')).toMatchObject({ type: CURRENCY_TYPE, tier: 's5' })
    // Cheap base: hidden in maps, shown while levelling.
    expect(hit('Simple Robe', { itemClass: 'Body Armours' })?.visibility).toBe('Hide')
    expect(hit('Simple Robe', { itemClass: 'Body Armours', areaLevel: 40 })?.visibility).toBe('Show')
    // A 6-link Tabula keeps NeverSink's own rule.
    expect(hit('Simple Robe', { itemClass: 'Body Armours', socketGroups: ['RRRRRR'] } as Partial<ItemFacts>)?.type).toBe('uniques')
    // A corrupted implicit on a cheap base: NeverSink's copied rule shows it.
    const corr = hit('Simple Robe', { itemClass: 'Belts', corrupted: true, corruptedMods: 1 })
    expect(corr?.visibility).toBe('Show')
    // Headhunter corrupted keeps its loud price look.
    expect(hit('Leather Belt', { corrupted: true, corruptedMods: 1 })?.tier).toBe('s5')
    // Foulborn and non-uniques are untouched.
    expect(hit('Leather Belt', { foulborn: true })?.type).not.toBe(CURRENCY_TYPE)
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })
})
