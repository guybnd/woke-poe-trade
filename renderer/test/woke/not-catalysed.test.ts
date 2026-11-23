// Jewellery without catalyst quality gets a "Not Catalysed" chip (upstream 35b967e5),
// off by default (Guy's pick). On, the search asks for quality 0.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import/first */
import { createFilters } from '@/web/price-check/filters/create-item-filters'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
/* eslint-enable import/first */

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false, exact: true }

const qualityFilter = (filters: ReturnType<typeof createFilters>) =>
  createTradeRequest(filters, []).query.filters.misc_filters?.filters.quality

describe('Not Catalysed', () => {
  beforeAll(loadGameData)

  it('is offered off on jewellery without quality, and searches quality 0 when on', () => {
    const filters = createFilters(parseItem(fixture('items/rare-ring.txt')), OPTS)
    expect(filters.notCatalysed).toEqual({ disabled: true })
    expect(qualityFilter(filters)).toBeUndefined()
    filters.notCatalysed!.disabled = false
    expect(qualityFilter(filters)).toEqual({ max: 0 })
  })

  it('is not offered on catalysed jewellery or on other gear', () => {
    expect(createFilters(parseItem(fixture('items/rare-belt-catalysed.txt')), OPTS).notCatalysed).toBeUndefined()
    expect(createFilters(parseItem(fixture('items/rare-body-armour-es.txt')), OPTS).notCatalysed).toBeUndefined()
  })
})
