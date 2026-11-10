// Every item that takes quality gets a Quality filter, even with none, so you can
// search for a 20% gem or a 27% body armour. Off until you turn it on.
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
/* eslint-enable import/first */

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false, exact: false }
const qualityOf = (text: string) => createFilters(parseItem(text), OPTS).quality

const withQuality = (text: string, q: number) =>
  text.replace(/(Armour: \d+ \(augmented\)\n)/, `Quality: +${q}% (augmented)\n$1`)

describe('Quality filter', () => {
  beforeAll(loadGameData)

  it('gives a gem with no quality a box waiting at 20, off', () => {
    expect(qualityOf(fixture('items/gem-transfigured.txt'))).toEqual({ value: 20, disabled: true, suggested: true })
  })

  it('gives none to Enlighten, which takes no quality', () => {
    expect(qualityOf(fixture('items/gem-enlighten.txt'))).toBeUndefined()
  })

  it('gives none to Awakened Enhance either', () => {
    const text = fixture('items/gem-enlighten.txt').replace(/Enlighten Support/g, 'Awakened Enhance Support').replace('Level: 3 (Max)', 'Level: 1')
    expect(qualityOf(text)).toBeUndefined()
  })

  it('gives body armour with no quality a box waiting at 20, off', () => {
    expect(qualityOf(fixture('items/unique-kaoms-heart.txt'))).toEqual({ value: 20, disabled: true, suggested: true })
  })

  it('keeps armour quality above 20 as its own value', () => {
    expect(qualityOf(withQuality(fixture('items/unique-kaoms-heart.txt'), 27))).toEqual({ value: 27, disabled: true })
  })

  it('gives rings none: their quality comes from catalysts', () => {
    expect(qualityOf(fixture('items/rare-ring.txt'))).toBeUndefined()
  })

  it('searches the quality once switched on', () => {
    const item = parseItem(fixture('items/unique-kaoms-heart.txt'))
    const filters = createFilters(item, OPTS)
    filters.quality!.value = 27
    filters.quality!.disabled = false
    const req = createTradeRequest(filters, [])
    expect(req.query.filters.misc_filters?.filters.quality).toEqual({ min: 27 })
  })

  it('sends nothing while off', () => {
    const item = parseItem(fixture('items/unique-kaoms-heart.txt'))
    const req = createTradeRequest(createFilters(item, OPTS), [])
    expect(req.query.filters.misc_filters?.filters?.quality).toBeUndefined()
  })
})
