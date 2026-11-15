// A rolled unique (Watcher's Eye...) price checked from Search or the item
// menu searches unidentified copies, with a chip to turn that off.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loadGameData } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '', language: 'en' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import-x/first */
import { ITEM_BY_REF } from '@/assets/data'
import { createFilters } from '@/web/price-check/filters/create-item-filters'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { virtualUnique } from '@/web/woke/ui/tooltip/item-menu-logic'
/* eslint-enable import-x/first */

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false, exact: false }

describe('price check of a rolled unique', () => {
  beforeAll(loadGameData)

  it.each(["Watcher's Eye", 'Forbidden Flame'])('searches unidentified %s', (name) => {
    const filters = createFilters(virtualUnique(ITEM_BY_REF('UNIQUE', name)![0]), OPTS)
    expect(filters.unidentified).toEqual({ value: true, disabled: false })
    const query = createTradeRequest(filters, []).query
    expect(query.filters.misc_filters?.filters.identified).toEqual({ option: 'false' })
    expect(query.name).toBe(name)
  })

  it('searches identified copies once the chip is off', () => {
    const filters = createFilters(virtualUnique(ITEM_BY_REF('UNIQUE', "Watcher's Eye")![0]), OPTS)
    filters.unidentified!.disabled = true
    expect(createTradeRequest(filters, []).query.filters.misc_filters?.filters.identified).toBeUndefined()
  })
})
