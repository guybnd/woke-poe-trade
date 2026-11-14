// Prefix / suffix caps: the most prefixes and suffixes a listing may have, to find
// rares with room to craft. Empty caps change nothing; a cap is a "not" group.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import-x/first */
import { createFilters } from '@/web/price-check/filters/create-item-filters'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
/* eslint-enable import-x/first */

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false, exact: false }
const filtersOf = (file: string) => createFilters(parseItem(fixture(file)), OPTS)
const notGroup = (filters: ReturnType<typeof filtersOf>) =>
  createTradeRequest(filters, []).query.stats.find(g => g.type === 'not')

describe('Affix caps', () => {
  beforeAll(loadGameData)

  it('gives rare gear two empty caps out of three', () => {
    expect(filtersOf('items/rare-body-armour-es.txt').affixCaps).toEqual({ prefix: null, suffix: null, most: 3 })
  })

  it('gives rare jewels a ceiling of two', () => {
    expect(filtersOf('items/rare-cluster-large.txt').affixCaps?.most).toBe(2)
  })

  it('gives uniques, magic flasks and maps none', () => {
    expect(filtersOf('items/unique-kaoms-heart.txt').affixCaps).toBeUndefined()
    expect(filtersOf('items/magic-flask.txt').affixCaps).toBeUndefined()
    expect(filtersOf('items/map-rare-t16.txt').affixCaps).toBeUndefined()
  })

  it('adds nothing to the search while empty', () => {
    expect(notGroup(filtersOf('items/rare-body-armour-es.txt'))).toBeUndefined()
  })

  it('leaves out listings with more than the cap', () => {
    const filters = filtersOf('items/rare-body-armour-es.txt')
    filters.affixCaps!.prefix = 0
    filters.affixCaps!.suffix = 2
    expect(notGroup(filters)?.filters).toEqual([
      { id: 'pseudo.pseudo_number_of_prefix_mods', value: { min: 1 } },
      { id: 'pseudo.pseudo_number_of_suffix_mods', value: { min: 3 } }
    ])
  })

  it('ignores a cap at the ceiling', () => {
    const filters = filtersOf('items/rare-body-armour-es.txt')
    filters.affixCaps!.prefix = 3
    expect(notGroup(filters)).toBeUndefined()
  })
})
