// Swappable mods: which mods get a ⇄, what a swap search sends, and how the
// listings that come back are split by element.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'

import { createPresets } from '@/web/price-check/filters/create-presets'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import type { PricingResult } from '@/web/price-check/trade/pathofexile-trade'
import { detectSwaps } from '@/web/woke/harvest-swap/detect'
import { buildSwapRequest, priceByKey } from '@/web/woke/harvest-swap/search'
import type { ParsedItem } from '@/parser'

// vi.mock is hoisted above the imports.
vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false }

function setup (text: string) {
  const item = parseItem(text)
  const presets = createPresets(item, OPTS)
  const preset = presets.presets.find(p => p.id === presets.active)!
  return { item, filters: preset.filters, stats: preset.stats }
}

function jewel (mods: string, extra = '') {
  return `Item Class: Jewels
Rarity: Rare
Corruption Spark
Cobalt Jewel
--------
Item Level: 83
--------
${mods}
--------
Place into an allocated Jewel Socket on the Passive Skill Tree. Right click to remove from the Socket.${extra}`
}

const MAX_COLD = `{ Suffix Modifier "of the Ice" (Tier: 1) — Elemental, Cold, Resistance }
+1(1-2)% to maximum Cold Resistance`
const LIFE = `{ Prefix Modifier "Healthy" (Tier: 1) — Life }
7(5-7)% increased maximum Life`
const FIRE_DMG = `{ Prefix Modifier "Flaming" (Tier: 1) — Damage, Elemental, Fire }
15(14-16)% increased Fire Damage`
const COLD_DMG = `{ Prefix Modifier "Chilling" (Tier: 1) — Damage, Elemental, Cold }
15(14-16)% increased Cold Damage`
const STR = `{ Suffix Modifier "of the Brute" (Tier: 1) — Attribute }
+14(13-16) to Strength`
const DEX = `{ Suffix Modifier "of the Lynx" (Tier: 1) — Attribute }
+14(13-16) to Dexterity`

function refsOf (stats: FilterOrGroup[]) {
  return stats.filter((s): s is StatFilter => !('group' in s && s.group)).map(s => s.statRef)
}

describe('detectSwaps', () => {
  beforeAll(loadGameData)

  it('marks maximum resistance and elemental damage on a jewel', () => {
    const { item, stats } = setup(jewel([MAX_COLD, FIRE_DMG, LIFE].join('\n')))
    const found = detectSwaps(item, stats)
    const byRef = Object.fromEntries(found.map(c => [c.filter.statRef, c]))
    expect(byRef['+#% to maximum Cold Resistance']?.targets).toEqual(['fire', 'lightning'])
    expect(byRef['+#% to maximum Cold Resistance']?.tierMin).toBe(1)
    expect(byRef['#% increased Fire Damage']?.targets).toEqual(['cold', 'lightning'])
    expect(byRef['#% increased Fire Damage']?.randomTarget).toBe(false)
    expect(byRef['#% increased maximum Life']).toBeUndefined()
  })

  it('tells its own mod apart from the others when the filters are reactive, as in the app', () => {
    const { item, stats } = setup(jewel([MAX_COLD, LIFE].join('\n')))
    const found = detectSwaps(item, reactive(stats) as FilterOrGroup[])
    expect(found.map(c => c.randomTarget)).toEqual([false])
  })

  it("doesn't offer an element the item already has", () => {
    const { item, stats } = setup(jewel([FIRE_DMG, COLD_DMG].join('\n')))
    const fire = detectSwaps(item, stats).find(c => c.filter.statRef === '#% increased Fire Damage')
    expect(fire?.targets).toEqual(['lightning'])
  })

  it('offers nothing on corrupted, mirrored-free uniques or fractured mods', () => {
    const corrupted = setup(jewel(MAX_COLD, '\n--------\nCorrupted'))
    expect(detectSwaps(corrupted.item, corrupted.stats)).toEqual([])

    const fractured = setup(jewel(FIRE_DMG.replace('{ Prefix', '{ Fractured Prefix'), '\n--------\nFractured Item'))
    expect(detectSwaps(fractured.item, fractured.stats)).toEqual([])
  })

  it('marks a resistance only while its own element is ticked', () => {
    const { item, stats } = setup(jewel(`{ Suffix Modifier "of the Volcano" (Tier: 2) — Elemental, Fire, Resistance }
+14(12-15)% to Fire Resistance`))
    const fire = () => detectSwaps(item, stats).find(c => c.family.id === 'res')
    const filter = stats.find((s): s is StatFilter => !('group' in s && s.group) && s.statRef === '+#% total to Fire Resistance')
    expect(filter).toBeDefined()
    filter!.disabled = true
    expect(fire()).toBeUndefined()
    filter!.disabled = false
    expect(fire()?.targets).toEqual(['cold', 'lightning'])
  })

  it('marks no resistance on a ring whose fire resistance also comes from other mods', () => {
    const { item, stats } = setup(fixture('items/rare-ring.txt'))
    for (const s of stats) if (!('group' in s && s.group)) (s as StatFilter).disabled = false
    expect(detectSwaps(item, stats).filter(c => c.family.id === 'res').map(c => c.filter.statRef)).toEqual([])
  })

  it('respects families switched off', () => {
    const { item, stats } = setup(jewel([MAX_COLD, FIRE_DMG].join('\n')))
    const found = detectSwaps(item, stats, { on: { eleDamage: false } })
    expect(found.map(c => c.family.id)).toEqual(['maxRes'])
  })

  it('offers the ducat only for the single attribute mod, and only when on', () => {
    const one = setup(jewel([STR, LIFE].join('\n')))
    expect(detectSwaps(one.item, one.stats).some(c => c.family.id === 'attribute')).toBe(false)
    const ducat = detectSwaps(one.item, one.stats, { on: { attribute: true } }).find(c => c.family.id === 'attribute')
    expect(ducat?.targets).toEqual(['dex', 'int'])
    expect(ducat?.family.random).toBe(true)

    const two = setup(jewel([STR, DEX].join('\n')))
    expect(detectSwaps(two.item, two.stats, { on: { attribute: true } }).some(c => c.family.id === 'attribute')).toBe(false)
  })
})

describe('buildSwapRequest', () => {
  beforeAll(loadGameData)

  it('searches the mod as any element from the bottom of its tier, other filters untouched', () => {
    const { item, filters, stats } = setup(jewel([FIRE_DMG, LIFE].join('\n')))
    const cand = detectSwaps(item, stats).find(c => c.filter.statRef === '#% increased Fire Damage')!
    const before = refsOf(stats)
    const body = buildSwapRequest(filters, stats, cand, 'any')
    const group = body.query.stats.find(g => g.type === 'count' && g.filters.length === 3)!
    expect(group.value).toEqual({ min: 1 })
    expect(group.filters.map(f => f.value?.min)).toEqual([14, 14, 14])
    expect(new Set(group.filters.map(f => f.id)).size).toBe(3)
    // The UI's filters weren't changed by the search.
    expect(refsOf(stats)).toEqual(before)
    expect(cand.filter.tradeId.length).toBe(1)
  })

  it('searches one element when one is picked', () => {
    const { item, filters, stats } = setup(jewel([FIRE_DMG, LIFE].join('\n')))
    const cand = detectSwaps(item, stats).find(c => c.filter.statRef === '#% increased Fire Damage')!
    const body = buildSwapRequest(filters, stats, cand, 'cold')
    const ids = body.query.stats.flatMap(g => g.filters.map(f => f.id))
    expect(ids).not.toContain(cand.filter.tradeId[0])
    expect(body.query.stats.some(g => g.type === 'count' && g.filters.length === 3)).toBe(false)
  })
})

describe('priceByKey', () => {
  beforeAll(loadGameData)

  function listing (id: string, chaos: number, mods: string[]): PricingResult {
    return {
      id,
      relativeDate: '',
      tipItem: null,
      listedItem: { explicitMods: mods },
      priceAmount: chaos,
      priceCurrency: 'chaos',
      isMine: false,
      hasNote: true,
      hasFee: false,
      accountName: `seller-${id}`,
      accountStatus: 'online',
      ign: ''
    }
  }

  it('splits listings by element and needs a few of each', () => {
    const { item, stats } = setup(jewel([FIRE_DMG, LIFE].join('\n')))
    const cand = detectSwaps(item, stats).find(c => c.filter.statRef === '#% increased Fire Damage')!
    const listings = [
      listing('a', 100, ['15% increased Fire Damage']),
      listing('b', 110, ['16% increased Fire Damage']),
      listing('c', 120, ['14% increased Fire Damage']),
      listing('d', 300, ['15% increased Cold Damage']),
      listing('e', 310, ['15% increased Cold Damage']),
      listing('f', 320, ['14% increased Cold Damage']),
      listing('g', 50, ['15% increased Lightning Damage']),
      // Fire under the searched roll: it only matched on Lightning.
      listing('h', 55, ['10% increased Fire Damage', '15% increased Lightning Damage']),
      // Both elements high enough: no telling which one the price is for.
      listing('i', 999, ['15% increased Fire Damage', '15% increased Cold Damage'])
    ]
    const prices = priceByKey(listings, cand, ['fire', 'cold', 'lightning'], { divine: 200 }, (item as ParsedItem).category)
    const by = Object.fromEntries(prices.map(p => [p.key, p]))
    expect(by.fire.listings).toBe(3)
    expect(by.cold.listings).toBe(3)
    expect(by.fire.chaos).toBeGreaterThan(90)
    expect(by.cold.chaos!).toBeGreaterThan(by.fire.chaos!)
    expect(by.lightning).toEqual({ key: 'lightning', listings: 2, chaos: null })
  })
})

describe('3.30 swap costs', () => {
  it('prices 300 of the target colour, 300 of the cheaper other one, and a Rancour for damage', async () => {
    const { SWAP_FAMILIES, swapChaos, swapCostText } = await import('@/web/woke/harvest-swap/families')
    const price: Record<string, number> = {
      'Wild Crystallised Lifeforce': 0.1,
      'Vivid Crystallised Lifeforce': 0.05,
      'Primal Crystallised Lifeforce': 0.08,
      'Crystallised Rancour': 4
    }
    const lookup = (name: string) => price[name] ?? null
    const res = SWAP_FAMILIES.find(f => f.id === 'res')!.cost('fire')
    expect(swapCostText(res)).toBe('300 Wild + 300 Vivid or Primal')
    expect(swapChaos(res, lookup)).toBeCloseTo(300 * 0.1 + 300 * 0.05)
    const dmg = SWAP_FAMILIES.find(f => f.id === 'eleDamage')!.cost('cold')
    expect(swapChaos(dmg, lookup)).toBeCloseTo(300 * 0.05 + 300 * 0.08 + 4)
    expect(swapChaos(dmg, name => name === 'Crystallised Rancour' ? null : 1)).toBeNull()
  })
})
