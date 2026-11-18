// poe.ninja lookups as its 3.30 feed names rows (checked against the live
// dense overview, 2026-11-19): tiered map names, gem top levels, Wombgift item
// levels, double influence, unique tinctures, and rows it stopped splitting.
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import type { ParsedItem } from '@/parser'
import { ItemCategory, ItemRarity } from '@/parser'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import-x/first */
import { getDetailsId } from '@/web/price-check/trends/getDetailsId'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import { pickStatColumns, listingStatValue, statTone } from '@/web/woke/price-insight/stat-columns'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
/* eslint-enable import-x/first */

const gem = (name: string, level: number, corrupted: boolean) => [
  'Item Class: Support Gems',
  'Rarity: Gem',
  name,
  '--------',
  'Support, Awakened',
  `Level: ${level}`,
  '--------',
  'This is a Support Gem.',
  ...(corrupted ? ['--------', 'Corrupted'] : []),
  ''
].join('\n')

const WOMBGIFT = (ilvl: number) => [
  'Item Class: Wombgifts',
  'Rarity: Currency',
  'Ancient Wombgift',
  '--------',
  `Item Level: ${ilvl}`,
  ''
].join('\n')

describe('poe.ninja lookups, 3.30 names', () => {
  beforeAll(loadGameData)

  it('names a tiered map as poe.ninja does', () => {
    const item = parseItem(fixture('items/map-rare-t16-330.txt'))
    expect(getDetailsId(item)).toEqual({ ns: 'ITEM', name: 'Map (Tier 16)', variant: 'T0, Gen-24' })
  })

  it('lists an Awakened gem at its own level', () => {
    expect(getDetailsId(parseItem(gem('Awakened Enlighten Support', 4, false)))?.variant).toBe('4')
    expect(getDetailsId(parseItem(gem('Awakened Enlighten Support', 5, true)))?.variant).toBe('5c')
    // Below the top, the level 1 row ("1", "1/20"), as before.
    expect(getDetailsId(parseItem(gem('Awakened Enlighten Support', 2, false)))?.variant).toBe('1')
    // Other gems are untouched: a level 3 Greater Multistrike has only "3/20" rows.
    expect(getDetailsId(parseItem(gem('Greater Multistrike Support', 3, false)))?.variant).toBe('1')
  })

  it('prices a Wombgift by its item level band', () => {
    expect(getDetailsId(parseItem(WOMBGIFT(83)))).toEqual({ ns: 'ITEM', name: 'Ancient Wombgift', variant: '75' })
    expect(getDetailsId(parseItem(WOMBGIFT(84)))?.variant).toBe('84')
    expect(getDetailsId(parseItem(WOMBGIFT(52)))?.variant).toBe('40')
  })

  it('names two influences in poe.ninja order', () => {
    const one = parseItem(fixture('items/rare-body-armour-es-crusader.txt'))
    expect(getDetailsId({ ...one, rarity: ItemRarity.Normal })?.variant).toBe('86+, Crusader')
    const text = fixture('items/rare-body-armour-es-crusader.txt').replace('Crusader Item', 'Crusader Item\nShaper Item')
    const two = parseItem(text)
    expect(two.influences).toHaveLength(2)
    expect(getDetailsId({ ...two, rarity: ItemRarity.Normal })?.variant).toBe('86+, Shaper/Crusader')
  })

  it('gives an imbued gem no plain gem price', () => {
    const plain = parseItem(gem('Awakened Enlighten Support', 4, false))
    expect(getDetailsId({ ...plain, imbuedGem: true })).toBeUndefined()
  })

  it('lists a unique tincture as Tincture, and Vinktar and Yriel by base only', () => {
    const fake = (name: string, base: string, category: ItemCategory, stat?: string) => ({
      rarity: ItemRarity.Unique,
      category,
      info: { namespace: 'UNIQUE', refName: name },
      uniqueBase: { refName: base },
      statsByType: stat ? [{ stat: { ref: stat }, type: 'explicit', sources: [] }] : [],
      influences: []
    }) as unknown as ParsedItem
    expect(getDetailsId(fake('Mightblood Ire', 'Rosethorn Tincture', ItemCategory.Tincture))?.variant).toBe('Tincture')
    expect(getDetailsId(fake('Vessel of Vinktar', 'Topaz Flask', ItemCategory.Flask,
      'Adds # to # Lightning Damage to Attacks during Flask effect'))?.variant).toBeUndefined()
    expect(getDetailsId(fake("Yriel's Fostering", 'Exquisite Leather', ItemCategory.BodyArmour,
      'Projectiles from Attacks have #% chance to Maim on Hit while\nyou have a Bestial Minion'))?.variant).toBe('Exquisite Leather')
  })
})

describe('stat columns on a fractured item', () => {
  beforeAll(loadGameData)

  it('counts the fractured share in yours, so the same item reads the same', () => {
    const item = parseItem(fixture('items/rare-shield-fractured-res.txt'))
    const stats = initUiModFilters(item, { searchStatRange: 10 })
    const total = stats.find((s): s is StatFilter => !s.group && s.statRef === '+#% total Elemental Resistance')!
    expect(total.fracShare).toBe(18)
    total.disabled = false
    const col = pickStatColumns(stats).find(c => c.source.kind === 'total')!
    expect(col.yours).toBe(33)
    // A listing of this very item: 18 fractured to cold, 5 to each element.
    const listing = {
      fracturedMods: ['+18% to Cold and Chaos Resistances'],
      explicitMods: ['+5% to all Elemental Resistances']
    }
    const value = listingStatValue(listing as never, col, item.category)
    expect(value).toBe(33)
    expect(statTone(value, col)).toBeNull()
  })
})

describe('poe.ninja note with no listings', () => {
  it('says a price that doesn\'t fit the search isn\'t this item\'s', async () => {
    const { buildBlend } = await import('@/web/woke/price-insight/sources')
    const insight = { kept: [], dropped: new Map(), prices: new Map(), range: null, suggest: null, confidence: 'none', risk: 'none', signals: [] } as const
    const unfit = buildBlend({ insight: insight as never, ninja: { chaos: 100, gaps: 0, fits: false } })
    expect(unfit.points[0].note).toMatch(/Foulborn.*no listings/)
    const fits = buildBlend({ insight: insight as never, ninja: { chaos: 100, gaps: 0, fits: true } })
    expect(fits.points[0].note).toBe('Average of recent listings across the league')
  })
})
