// 3.30's Primordial and Originator's Exalted Orbs: in the item data with their
// trade tags, so price check uses the bulk exchange and poe.ninja instead of the
// new-item name search, and Ctrl+Space search lists them.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loadGameData, parseItem } from '../helpers/game-data'
import { ITEM_BY_REF } from '@/assets/data'
import type { ItemFilters } from '@/web/price-check/filters/interfaces'
import { apiToSatisfySearch } from '@/web/price-check/trade/common'
import { kindOfName, priceCheckInput } from '@/web/woke/ui/tooltip/item-menu-logic'

// vi.mock is hoisted above the imports.
vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

const copy = (name: string) => `Item Class: Stackable Currency
Rarity: Currency
${name}
--------
Stack Size: 3/20
--------
Augments a Rare item with a new random modifier
--------
Right click this item then left click a rare item to apply it.`

const ORBS = [
  ['Primordial Exalted Orb', 'primordial-exalted-orb'],
  ["Originator's Exalted Orb", 'originators-exalted-orb']
] as const

describe('3.30 Exalted Orb variants', () => {
  beforeAll(loadGameData)

  for (const [name, tag] of ORBS) {
    it(`${name} parses as known currency with its trade tag`, () => {
      const item = parseItem(copy(name))
      expect(item.info.refName).toBe(name)
      expect(item.info.tradeTag).toBe(tag)
      expect(item.stackSize?.value).toBe(3)
      expect(apiToSatisfySearch(item, [], {} as ItemFilters)).toBe('bulk')
    })

    it(`${name} is price checked from Ctrl+Space search`, () => {
      const info = ITEM_BY_REF('ITEM', name)![0]
      const input = priceCheckInput({ name }, kindOfName(name), info)
      expect(input).not.toBeNull()
      expect(parseItem(input!.clipboard).info.tradeTag).toBe(tag)
    })
  }
})
