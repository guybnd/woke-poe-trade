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
import { kindChoices, mapKindOf, setPick } from '@/web/price-check/filters/pseudo/map-kind'
/* eslint-enable import-x/first */

const OPTS = { league: 'Covens', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false, exact: false }

// Both presets: the props one (opens on a rare map) and the bulk one (by type).
function noElder (file: string, preset = 'filters.preset_pseudo') {
  const item = parseItem(fixture(`items/${file}`))
  const { presets } = createPresets(item, OPTS)
  const stats = presets.find(p => p.id === preset)!.stats
  return { item, stats }
}

beforeAll(loadGameData)

type Q = { type: string, disabled?: boolean, value?: { min?: number }, filters: Array<{ id: string, value?: { option?: number }, disabled?: boolean }> }
const ELDER = 'implicit.stat_1792283443'
const CITADEL = 'implicit.stat_2563183002'
const ORIGINATOR = 'implicit.stat_2696470877'
function kindQuery (file: string, preset = 'filters.preset_pseudo') {
  const { item, stats } = noElder(file, preset)
  const q = createTradeRequest(createFilters(item, OPTS), stats).query.stats as Q[]
  const on = (type: string) => q.filter(g => g.type === type && !g.disabled).flatMap(g => g.filters.filter(f => !f.disabled)
    .filter(f => [ELDER, CITADEL, ORIGINATOR].includes(f.id)).map(f => f.value?.option ? `${f.id}|${f.value.option}` : f.id))
  return { and: on('and').sort(), not: on('not').sort(), count: on('count').sort(), stats }
}

// Guy (2026-11-24): a map's kind is its influence, and the search finds only that kind
// (it replaced No Elder, WOKEPOET-523). Each option goes in on its own: an option stat
// with no option matched nothing (Guy's 29c Elder map).
describe('the map kind', () => {
  it('an Originator map: has the Originator, not Elder/Shaper, not a Citadel', () => {
    expect(kindQuery('map-originator-t16.txt')).toMatchObject({
      and: [ORIGINATOR],
      not: [`${ELDER}|1`, `${ELDER}|2`, `${CITADEL}|1`, `${CITADEL}|2`, `${CITADEL}|3`, `${CITADEL}|4`]
    })
  })
  it('on the bulk preset too', () => {
    expect(kindQuery('map-originator-t16.txt', 'filters.preset_bulk').and).toEqual([ORIGINATOR])
  })
  it('an Elder Originator map (with its guardian): has Elder and the Originator, not a Citadel', () => {
    const k = kindQuery('map-originator-elder.txt')
    expect(k.and).toEqual([`${ELDER}|2`, ORIGINATOR])
    expect(k.not).toEqual([1, 2, 3, 4].map(o => `${CITADEL}|${o}`))
    // The influence line left the filters: the kind stands in for it. The guardian stays a
    // line of its own (each guardian sells at its own price).
    expect(k.stats.some(s => !s.group && !s.mapKind && /influenced by The Elder/i.test(s.statRef))).toBe(false)
    expect(k.stats.some(s => !s.group && s.mapLine && /occupied by/i.test(s.statRef))).toBe(true)
  })
  it('a Citadel map: has its own conqueror, not Elder/Shaper or the Originator', () => {
    const k = kindQuery('map-citadel.txt')
    expect(k.and).toEqual([`${CITADEL}|1`])
    expect(k.not).toEqual([`${ELDER}|1`, `${ELDER}|2`, ORIGINATOR])
  })
  it('a normal map leaves out every influenced kind, the Originator too', () => {
    const k = kindQuery('map-rare-t16.txt')
    expect(k.and).toEqual([])
    expect(k.not).toContain(ORIGINATOR)
  })
  it('the menu: Any Originator keeps only the Originator, Conqueror counts any Citadel', () => {
    const { stats } = noElder('map-rare-t16.txt')
    const fs = stats.filter((s): s is StatFilter => !s.group && !!s.mapKind)
    const choices = kindChoices(mapKindOf(parseItem(fixture('items/map-rare-t16.txt'))))
    expect(choices.map(c => c.label)).toEqual(['Normal', 'Originator', 'Elder', 'Elder Originator', 'Shaper', 'Shaper Originator', 'Conqueror', 'Conqueror Originator', 'Any Originator', 'Any kind'])
    for (const f of fs) setPick(f, choices.find(c => c.key === 'any-originator')!.picks[f.mapKind!.family])
    const item = parseItem(fixture('items/map-rare-t16.txt'))
    let q = createTradeRequest(createFilters(item, OPTS), stats).query.stats as Q[]
    const ids = (g: Q[]) => g.filter(x => !x.disabled).flatMap(x => x.filters.filter(f => !f.disabled).map(f => f.id)).filter(id => [ELDER, CITADEL, ORIGINATOR].includes(id))
    expect(ids(q)).toEqual([ORIGINATOR])
    for (const f of fs) setPick(f, choices.find(c => c.key === 'citadel')!.picks[f.mapKind!.family])
    q = createTradeRequest(createFilters(item, OPTS), stats).query.stats as Q[]
    const count = q.find(g => g.type === 'count' && g.filters.some(f => f.id === CITADEL))!
    expect(count.value).toEqual({ min: 1 })
    expect(count.filters.map(f => f.value?.option)).toEqual([1, 2, 3, 4])
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

// Guy (2026-11-24): one place for a map's lines. Its implicit and enchant lines join the
// strip's list; its influence lines become the kind's filters.
describe('a map\'s implicit lines are strip lines', () => {
  it('the Originator influence becomes the kind, not a line', () => {
    const item = parseItem(fixture('items/map-originator-implicit.txt'))
    const { presets } = createPresets(item, OPTS)
    const stats = presets.find(p => p.id === 'filters.preset_pseudo')!.stats
    expect(stats.filter(s => !s.group && s.mapLine)).toEqual([])
    expect(stats.filter((s): s is StatFilter => !s.group && !!s.mapKind).map(s => s.mapKind!.family)).toEqual(['elder', 'citadel', 'originator'])
  })
})
