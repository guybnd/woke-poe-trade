// A unique priced from the item menu or the search (no game text): it carries
// its base, so the trade search sends the base type and not the unique's name.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loadGameData } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import/first */
import { ITEM_BY_REF } from '@/assets/data'
import { createFilters } from '@/web/price-check/filters/create-item-filters'
import { priceCheckInput, virtualUnique } from '@/web/woke/ui/tooltip/item-menu-logic'
/* eslint-enable import/first */

beforeAll(loadGameData)

const OPTS = { league: 'Standard', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, useEn: true, exact: true }

describe('a unique priced without game text', () => {
  it.each([
    ['Mageblood', 'Heavy Belt'],
    ['Headhunter', 'Leather Belt'],
    ["Shavronne's Wrappings", "Occultist's Vestment"]
  ])('gives %s its base %s', (name, base) => {
    const info = ITEM_BY_REF('UNIQUE', name)![0]
    const item = priceCheckInput({ name }, 'unique', info)!.item!
    expect(item.uniqueBase?.refName).toBe(base)
    expect(item.category).toBe(ITEM_BY_REF('ITEM', base)![0].craftable!.category)
    const exact = createFilters(item, OPTS).searchExact
    expect(exact.nameTrade).toBe(name)
    expect(exact.baseTypeTrade).toBe(base)
  })

  it('keeps a unique with no base data as before', () => {
    const info = { ...ITEM_BY_REF('UNIQUE', 'Mageblood')![0], unique: undefined }
    expect(virtualUnique(info).uniqueBase).toBeUndefined()
  })
})
