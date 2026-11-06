// The Corrupted chip has three states. Each opens on the right items and sends
// the matching option to the trade site; Any sends none, so both kinds come back.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import/first */
import { createFilters } from '@/web/price-check/filters/create-item-filters'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import type { ParsedItem } from '@/parser'
import type { CorruptedSearch } from '@/web/price-check/filters/interfaces'
/* eslint-enable import/first */

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false, exact: true }

const filtersOf = (item: ParsedItem) => createFilters(item, OPTS)
const opening = (text: string) => filtersOf(parseItem(text)).corrupted?.search

const CORRUPTED = '\n--------\nCorrupted'
const unique = () => fixture('items/unique-kaoms-heart.txt')
const JEWEL = `Item Class: Jewels
Rarity: Magic
Vivid Cobalt Jewel of Hatred
Cobalt Jewel
--------
Item Level: 84
--------
{ Suffix Modifier "of Hatred" (Tier: 3) — Damage, Physical, Cold }
Adds 2 to 4 Cold Damage to Attacks
--------
Place into an allocated Jewel Socket on the Passive Skill Tree. Right click to remove from the Socket.`

describe('Corrupted chip', () => {
  beforeAll(loadGameData)

  it('opens uncorrupted items on Uncorrupted', () => {
    expect(opening(unique())).toBe<CorruptedSearch>('not-corrupted')
    expect(opening(JEWEL)).toBe<CorruptedSearch>('not-corrupted')
  })

  it('opens corrupted items on Any, so the search matches what it did before', () => {
    expect(opening(unique() + CORRUPTED)).toBe<CorruptedSearch>('any')
  })

  it('opens gems on the same terms', () => {
    const gem = fixture('items/gem-enlighten.txt')
    expect(opening(gem)).toBe<CorruptedSearch>('not-corrupted')
    expect(opening(gem + CORRUPTED)).toBe<CorruptedSearch>('any')
  })

  it('opens a corrupted magic jewel on Corrupted', () => {
    expect(opening(JEWEL + CORRUPTED)).toBe<CorruptedSearch>('corrupted')
  })

  it.each<[CorruptedSearch, string | undefined]>([
    ['any', undefined],
    ['corrupted', 'true'],
    ['not-corrupted', 'false']
  ])('%s sends option %s to the trade site', (search, option) => {
    const filters = filtersOf(parseItem(unique()))
    filters.corrupted = { search }
    const body = createTradeRequest(filters, [])
    expect(body.query.filters.misc_filters?.filters.corrupted?.option).toBe(option)
  })
})
