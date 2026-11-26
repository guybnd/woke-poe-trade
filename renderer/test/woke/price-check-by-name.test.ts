// Ctrl+Space and the item menu price check items poe.ninja has no saved price
// for: a base as a white copy, the rest with no category by name. Every item
// in the data either builds a trade search or is one of the few that can't.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loadGameData } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '', language: 'en' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import-x/first */
import { ITEM_BY_REF, ITEMS_ITERATOR } from '@/assets/data'
import { parseClipboard } from '@/parser'
import { createPresets } from '@/web/price-check/filters/create-presets'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { kindOf, priceCheckInput } from '@/web/woke/ui/tooltip/item-menu-logic'
/* eslint-enable import-x/first */

beforeAll(loadGameData)

const OPTS = { league: 'Standard', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: true }

function query (name: string) {
  const info = ITEM_BY_REF('ITEM', name)![0]
  const ref = { name }
  const input = priceCheckInput(ref, kindOf(ref), info)
  expect(input, name).not.toBeNull()
  const item = input!.item ?? parseClipboard(input!.clipboard)._unsafeUnwrap()
  const { presets, active } = createPresets(item, OPTS)
  const preset = presets.find(p => p.id === active)!
  return createTradeRequest(preset.filters, preset.stats).query
}

// What can't be priced by name: each needs something only a real copy says.
const CANT = new Set([
  'Scrying Orb', 'Mercenary Warrant', 'Viscera', 'Timeless Jewel', 'Map', 'Blighted Map', 'Blight-ravaged Map'
])
const CANT_CATEGORY = new Set(['Viscera', 'Chart', 'Heist Blueprint', 'Unique Fragment'])

describe('price check by name', () => {
  it('prices a base as a white copy at item level 86', () => {
    const q = query('Manifold Ring')
    expect(q.type).toBe('Manifold Ring')
    expect(q.filters.misc_filters?.filters.ilvl).toEqual({ min: 86 })
  })

  it('prices a cluster jewel in the 84+ bracket', () => {
    expect(query('Large Cluster Jewel').filters.misc_filters?.filters.ilvl).toEqual({ min: 84, max: 100 })
  })

  it('prices flasks, heist gear, corpses and coins by name', () => {
    for (const name of ['Divine Life Flask', 'Hooded Cloak', 'Perfect Hydra', 'Silver Coin', 'Lavish Wombgift']) {
      expect(query(name).type).toBe(name)
    }
  })

  it('prices area-level items at area level 83', () => {
    expect(query('Mirrored Tablet').filters.map_filters?.filters.area_level).toEqual({ min: 83 })
    expect(query('Expedition Logbook').filters.map_filters?.filters.area_level).toEqual({ min: 83 })
  })

  it('never prices a rare by its base', () => {
    const info = ITEM_BY_REF('ITEM', 'Two-Stone Ring')![0]
    expect(priceCheckInput({ name: 'Dread Shell', base: 'Two-Stone Ring' }, 'item', info)).toBeNull()
    expect(priceCheckInput({ name: 'Two-Stone Ring', rarity: 'rare' }, 'item', info)).toBeNull()
  })

  it('builds a trade search for every item, bar the few that need a real copy', () => {
    const seen = new Set<string>()
    const failed: string[] = []
    for (const info of ITEMS_ITERATOR('"namespace":"ITEM"')) {
      if (info.namespace !== 'ITEM' || seen.has(info.refName)) continue
      seen.add(info.refName)
      const ref = { name: info.refName }
      const input = priceCheckInput(ref, kindOf(ref), info)
      const cant = CANT.has(info.refName) || CANT_CATEGORY.has(info.craftable?.category ?? '')
      if (!input) {
        if (!cant) failed.push(`${info.refName}: no price check`)
        continue
      }
      if (cant) failed.push(`${info.refName}: priced, but listed as can't`)
      try {
        query(info.refName)
      } catch (e) {
        failed.push(`${info.refName}: ${String(e)}`)
      }
    }
    expect(seen.size).toBeGreaterThan(1000)
    expect(failed).toEqual([])
  })
})
