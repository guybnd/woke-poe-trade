// Socket colours count only where nothing can change them: Skin of the Loyal / Lords
// ("Sockets cannot be modified") search them by default, corrupted 5L/6L offer them off.
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
import { ninjaFitsSearch } from '@/web/woke/price-insight/search-scope'
import { ownSocketDots, socketDots } from '@/web/woke/price-insight/listing-tip'
/* eslint-enable import/first */

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false, exact: true }

const SKIN = () => fixture('items/unique-skin-of-the-lords.txt')
const RARE_6L = `Item Class: Body Armours
Rarity: Rare
Gale Shell
Astral Plate
--------
Armour: 711
--------
Sockets: R-R-R-G-G-B
--------
Item Level: 84
--------
{ Prefix Modifier "Virile" (Tier: 6) — Life }
+60(55-69) to maximum Life`

describe('Socket colours', () => {
  beforeAll(loadGameData)

  it('reads each colour from the copy text', () => {
    expect(parseItem(SKIN()).sockets).toMatchObject({ linked: 6, white: 0, colours: { r: 3, g: 2, b: 1, w: 0 } })
    expect(parseItem(RARE_6L.replace('R-R-R-G-G-B', 'W-R A-DV')).sockets?.colours).toEqual({ r: 1, g: 0, b: 0, w: 1 })
  })

  it('searches the colours of an item whose sockets cannot be modified', () => {
    const item = parseItem(SKIN())
    const filters = createFilters(item, OPTS)
    expect(filters.socketColours).toEqual({ value: { r: 3, g: 2, b: 1, w: 0 }, disabled: false })
    const query = createTradeRequest(filters, [], item).query
    expect(query.filters.socket_filters?.filters.sockets).toEqual({ r: 3, g: 2, b: 1 })
  })

  it('offers them off on a corrupted 6L, and not at all on an uncorrupted one', () => {
    const corrupted = parseItem(RARE_6L + '\n--------\nCorrupted')
    const filters = createFilters(corrupted, OPTS)
    expect(filters.socketColours).toEqual({ value: { r: 3, g: 2, b: 1, w: 0 }, disabled: true })
    expect(createTradeRequest(filters, [], corrupted).query.filters.socket_filters?.filters.sockets).toBeUndefined()

    expect(createFilters(parseItem(RARE_6L), OPTS).socketColours).toBeUndefined()
  })

  it('stops trusting poe.ninja once colours are searched', () => {
    const item = parseItem(SKIN().replace('\n--------\nCorrupted', ''))
    expect(ninjaFitsSearch(item, [], 'not-corrupted')).toBe(true)
    expect(ninjaFitsSearch(item, [], 'not-corrupted', true)).toBe(false)
  })

  it('draws listing sockets in order with link breaks', () => {
    const dots = socketDots([{ group: 0, sColour: 'R' }, { group: 0, sColour: 'G' }, { group: 1, sColour: 'W' }])
    expect(dots).toEqual([{ colour: 'r', link: false }, { colour: 'g', link: true }, { colour: 'w', link: false }])
    expect(ownSocketDots({ r: 1, g: 0, b: 1, w: 0 }, undefined).map(d => d.colour)).toEqual(['r', 'b'])
  })
})
