// WOKEPOET-523: bulk map buying. The No Elder filter on a map's first search,
// and the bulk exchange entry the Exchange button searches.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import-x/first */
import { createPresets } from '@/web/price-check/filters/create-presets'
import { createFilters } from '@/web/price-check/filters/create-item-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { createTradeRequest as createExchangeRequest } from '@/web/price-check/trade/pathofexile-bulk'
import { mapExchange, asExchangeItem } from '@/web/woke/price-insight/map-exchange'
/* eslint-enable import-x/first */

const OPTS = { league: 'Covens', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false, exact: false }

// Both presets: the props one (opens on a rare map) and the bulk one (by type).
function noElder (file: string, preset = 'filters.preset_pseudo') {
  const item = parseItem(fixture(`items/${file}`))
  const { presets } = createPresets(item, OPTS)
  const stats = presets.find(p => p.id === preset)!.stats
  return { item, stats, filter: stats.find((s): s is StatFilter => !s.group && !!s.noElder) }
}

beforeAll(loadGameData)

describe('No Elder on a map search', () => {
  it('leaves out Elder and Shaper maps from the first search of a map without either', () => {
    const { item, stats, filter } = noElder('map-originator-t16.txt')
    expect(filter?.disabled).toBe(false)
    const query = createTradeRequest(createFilters(item, OPTS), stats).query
    const not = query.stats.find(g => g.type === 'not')
    // Each influence by its option: with none, the trade site matches nothing, so
    // "not" left nothing out (Guy's 29c Elder map, 2026-11-24).
    expect(not?.filters.filter(f => f.id === 'implicit.stat_1792283443')).toEqual([
      { id: 'implicit.stat_1792283443', value: { option: 1 }, disabled: false },
      { id: 'implicit.stat_1792283443', value: { option: 2 }, disabled: false }
    ])
    // The Originator's Memories still searched.
    expect(JSON.stringify(query.stats)).toContain('implicit.stat_2696470877')
  })

  it('on the bulk preset too', () => {
    expect(noElder('map-originator-t16.txt', 'filters.preset_bulk').filter?.disabled).toBe(false)
  })

  it('is not offered on a map that is Elder-influenced itself', () => {
    expect(noElder('map-originator-elder.txt').filter).toBeUndefined()
  })

  it('off, it leaves the search alone', () => {
    const { item, stats, filter } = noElder('map-originator-t16.txt')
    filter!.disabled = true
    const query = createTradeRequest(createFilters(item, OPTS), stats).query
    // Sent switched off, as every unticked row is: the trade site skips it.
    const sent = query.stats.flatMap(g => g.filters).filter(f => f.id === 'implicit.stat_1792283443')
    expect(sent).toHaveLength(2)
    expect(sent.every(f => f.disabled)).toBe(true)
  })
})

describe('the bulk exchange entry of a map', () => {
  it('an Originator map trades as Memory-Influenced, a plain one by its tier', () => {
    expect(mapExchange(parseItem(fixture('items/map-originator-t16.txt')))?.tag).toBe('zana-map-tier-16')
    expect(mapExchange(parseItem(fixture('items/map-rare-t16-deadly.txt')))?.tag).toBe('map-tier-16')
  })

  it('a guardian map trades under its guardian', () => {
    expect(mapExchange(parseItem(fixture('items/map-originator-elder.txt')))).toMatchObject({ tag: 'purifier-map', label: 'Purifier-Occupied Map' })
  })

  it('a Valdo map has none', () => {
    expect(mapExchange(parseItem(fixture('items/map-valdo.txt')))).toBeNull()
  })

  it('the exchange search asks for the entry', () => {
    const item = parseItem(fixture('items/map-originator-t16.txt'))
    const req = createExchangeRequest(createFilters(item, OPTS), asExchangeItem(item, 'zana-map-tier-16'), ['chaos'])
    expect(req.query.want).toEqual(['zana-map-tier-16'])
    expect(req.query.have).toEqual(['chaos'])
    // The checked item is left as it was.
    expect(item.info.tradeTag).toBeUndefined()
  })
})
