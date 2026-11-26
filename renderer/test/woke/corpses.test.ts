import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import-x/first */
import { parseClipboard } from '@/parser'
import { CORPSE_MONSTERS, isCorpse } from '@/web/woke/shared/corpses'
import { fixedPriceItem } from '@/web/woke/price-insight/ninja-first'
import { createFilters } from '@/web/price-check/filters/create-item-filters'
import { CORPSE_ITEM } from '@/web/woke/tab-bar/news-demos'
import { loadGameData } from '../helpers/game-data'
/* eslint-enable import-x/first */

beforeAll(loadGameData)

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false, exact: false }

const items: Array<{ name: string, namespace: string, craftable?: unknown }> = readFileSync(join(__dirname, '../../public/data/en/items.ndjson'), 'utf8')
  .trim().split('\n').map(l => JSON.parse(l))

describe('corpses', () => {
  it('lists every monster the item data has a Perfect and an Imperfect corpse of', () => {
    const names = new Set(items.filter(i => i.namespace === 'ITEM' && !i.craftable).map(i => i.name))
    const inData = [...names].filter(n => n.startsWith('Perfect ') && names.has(`Imperfect ${n.slice('Perfect '.length)}`)).map(n => n.slice('Perfect '.length))
    expect([...CORPSE_MONSTERS].sort()).toEqual(inData.sort())
  })

  it('knows a corpse by any of its three names', () => {
    expect(isCorpse('Perfect Hydra')).toBe(true)
    expect(isCorpse('Imperfect Guardian Turtle')).toBe(true)
    expect(isCorpse('Meatsack')).toBe(true)
    expect(isCorpse('Perfect Jewel')).toBe(false)
    expect(isCorpse('Divine Orb')).toBe(false)
  })

  it('takes the What\'s new sample corpse to the quick card', () => {
    const item = parseClipboard(CORPSE_ITEM)._unsafeUnwrap()
    expect(item.info.refName).toBe('Perfect Hydra')
    expect(fixedPriceItem(item)).toBe(true)
  })

  // Its item level doesn't change its price (Guy, 2026-11-26).
  it('searches the trade site with the item level chip off', () => {
    const filters = createFilters(parseClipboard(CORPSE_ITEM)._unsafeUnwrap(), OPTS)
    expect(filters.itemLevel).toEqual({ value: 84, disabled: true })
  })
})
