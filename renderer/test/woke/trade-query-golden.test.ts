// The trade search each copied item sends, written out in full: the price
// check as it opens, and with every stat row ticked. Most price check bugs
// came from how this query is built (bottom of tier on totals, catalysed
// rows, fractured mods, local stats), so any change to it shows up here as a
// diff to look over. After a deliberate change: npx vitest run -u trade-query-golden
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fixture, fixtureFiles, loadGameData, parseItem } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import-x/first */
import { createFilters } from '@/web/price-check/filters/create-item-filters'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { FilterOrGroup } from '@/web/price-check/filters/interfaces'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
/* eslint-enable import-x/first */

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false, exact: false }

function tickAll (stats: FilterOrGroup[]): FilterOrGroup[] {
  return stats.map(f => 'group' in f && f.group
    ? { ...f, meta: { ...f.meta, disabled: false }, stats: f.stats.map(s => ({ ...s, disabled: false })) }
    : { ...f, disabled: false })
}

function queries (file: string): unknown {
  try {
    const item = parseItem(fixture(`items/${file}`))
    const filters = createFilters(item, OPTS)
    const stats = initUiModFilters(item, { searchStatRange: OPTS.searchStatRange })
    return {
      opened: createTradeRequest(filters, stats).query,
      allTicked: createTradeRequest(filters, tickAll(stats)).query
    }
  } catch (e) {
    return { error: String(e) }
  }
}

describe('trade queries for every copied item', () => {
  beforeAll(loadGameData)

  it('match testing/fixtures/trade-queries.json', async () => {
    const all = Object.fromEntries(fixtureFiles('items', '.txt').map(f => [f, queries(f)]))
    await expect(JSON.stringify(all, null, 1) + '\n').toMatchFileSnapshot('../../../testing/fixtures/trade-queries.json')
  })
})
