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
  return { item, stats, filter: stats.find((s): s is StatFilter => !s.group && !!s.mapKind && s.tradeId[0] === 'implicit.stat_1792283443') }
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

// Guy (2026-11-24): a map's kind is its influence, and the search finds only that kind.
describe('the map kind', () => {
  const kinds = (file: string) => noElder(file).stats
    .filter((s): s is StatFilter => !s.group && !!s.mapKind && !s.disabled)
    .map(s => s.tradeId[0]).sort()
  it('an Originator map leaves out Elder/Shaper and conqueror Citadel maps', () => {
    expect(kinds('map-originator-t16.txt')).toEqual(['implicit.stat_1792283443', 'implicit.stat_2563183002'])
    const { item, stats } = noElder('map-originator-t16.txt')
    const not = createTradeRequest(createFilters(item, OPTS), stats).query.stats.find(g => g.type === 'not')!
    expect(not.filters.filter(f => f.id === 'implicit.stat_2563183002').map(f => f.value)).toEqual([1, 2, 3, 4].map(option => ({ option })))
  })
  it('an Elder Originator map (with its guardian) leaves out only Citadel maps', () => {
    expect(kinds('map-originator-elder.txt')).toEqual(['implicit.stat_2563183002'])
  })
  it('a conqueror Citadel map leaves out Elder/Shaper and Originator maps', () => {
    expect(kinds('map-citadel.txt')).toEqual(['implicit.stat_1792283443', 'implicit.stat_2696470877'])
  })
  it('a normal map leaves out every influenced kind, the Originator too', () => {
    expect(kinds('map-rare-t16.txt')).toEqual(['implicit.stat_1792283443', 'implicit.stat_2563183002', 'implicit.stat_2696470877'])
    const { item, stats } = noElder('map-rare-t16.txt')
    const not = createTradeRequest(createFilters(item, OPTS), stats).query.stats.find(g => g.type === 'not')!
    expect(not.filters.filter(f => f.id === 'implicit.stat_2696470877')).toHaveLength(1)
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

describe('a bulk seller whisper', () => {
  it('fills the trade site template for the lots asked', async () => {
    const { bulkWhisper } = await import('@/web/price-check/trade/pathofexile-bulk')
    const row = {
      id: 'x',
      relativeDate: '',
      exchangeAmount: 5,
      itemAmount: 1,
      stock: 36,
      accountStatus: 'online' as const,
      isMine: false,
      accountName: 'a#1',
      ign: 'Seller',
      whisper: { text: "@Seller Hi, I'd like to buy your {0} for my {1} in Covens.", item: '{0} Map (Tier 16) (Memory-Influenced)', pay: '{0} Chaos Orb' }
    }
    expect(bulkWhisper(row, 10)).toBe("@Seller Hi, I'd like to buy your 10 Map (Tier 16) (Memory-Influenced) for my 50 Chaos Orb in Covens.")
    expect(bulkWhisper({ ...row, whisper: undefined }, 1)).toBeNull()
  })
})

describe('a rare map opens with none of its own mods ticked', () => {
  it('top tier mods, a buried Sentinel among them, start Any', () => {
    const item = parseItem(fixture('items/map-sentinel-t16.txt'))
    const { presets } = createPresets(item, OPTS)
    const mods = presets.find(p => p.id === 'filters.preset_pseudo')!.stats
      .filter((s): s is StatFilter => !s.group && !!s.mapMod)
    expect(mods.map(m => m.statRef)).toContain('Area contains a buried Stalker Sentinel')
    expect(mods.filter(m => !m.disabled).map(m => m.statRef)).toEqual([])
  })
})

describe('a map mod with sibling kinds', () => {
  it('Has searches any Evocator by default, and only this one once narrowed', () => {
    const item = parseItem(fixture('items/map-sentinel-t16.txt'))
    const { presets } = createPresets(item, OPTS)
    const stats = presets.find(p => p.id === 'filters.preset_pseudo')!.stats
    const evocator = stats.find((s): s is StatFilter => !s.group && s.statRef === 'Area contains an Evocator of Beidat')!
    expect(evocator.anyOf?.label).toBe('Evocator')
    expect(evocator.tradeId).toHaveLength(3)
    evocator.disabled = false
    const evocatorGroup = (q: ReturnType<typeof createTradeRequest>['query']) =>
      q.stats.find(g => g.type === 'count' && g.filters.some(f => f.id === 'explicit.stat_260515856'))
    const count = evocatorGroup(createTradeRequest(createFilters(item, OPTS), stats).query)
    expect(count?.value).toEqual({ min: 1 })
    expect(count?.disabled).toBe(false)
    expect(count?.filters.map(f => f.id).sort()).toEqual(['explicit.stat_1290924623', 'explicit.stat_260515856', 'explicit.stat_2896557935'])
    evocator.tradeId = evocator.anyOf!.exact
    const query = createTradeRequest(createFilters(item, OPTS), stats).query
    expect(evocatorGroup(query)).toBeUndefined()
    expect(query.stats[0].filters).toContainEqual(expect.objectContaining({ id: 'explicit.stat_260515856', disabled: false }))
  })
})

// Guy (2026-11-24): one place for a map's lines. Its implicit lines (the influence)
// join the strip's list, keep being searched, and leave the rows below.
describe('a map\'s implicit lines are strip lines', () => {
  it('the Originator influence is a strip line, searched by default', () => {
    const item = parseItem(fixture('items/map-originator-implicit.txt'))
    const { presets } = createPresets(item, OPTS)
    const stats = presets.find(p => p.id === 'filters.preset_pseudo')!.stats
    const lines = stats.filter((s): s is StatFilter => !s.group && !!s.mapLine)
    expect(lines).toHaveLength(1)
    expect(lines[0].statRef).toMatch(/^Area is influenced by the Originator's Memories$/i)
    expect(lines[0].disabled).toBe(false)
    expect(lines[0].mapMod).toBeUndefined()
    // The No Elder filter stays its own button, not a line.
    expect(stats.some(s => !s.group && s.mapKind && s.mapLine)).toBe(false)
  })
})
