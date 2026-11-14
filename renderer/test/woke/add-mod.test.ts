// "Add a mod": any trade stat the item doesn't have, found by its text and
// searched for on top of the item's own stats.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import-x/first */
import { STATS_ITERATOR } from '@/assets/data'
import { createFilters } from '@/web/price-check/filters/create-item-filters'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { addedModFrom, buildAddIndex, kindCounts, searchAddIndex, AddEntry } from '@/web/woke/price-insight/add-mod-search'
/* eslint-enable import-x/first */

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false, exact: false }

describe('Add a mod', () => {
  let index: AddEntry[]
  beforeAll(async () => {
    await loadGameData()
    index = buildAddIndex(STATS_ITERATOR(''))
  })

  it('finds the plain mod first, each kind on its own', () => {
    expect(searchAddIndex(index, 'rarity', 'pseudo')[0].entry.ref).toBe('#% increased Rarity of Items found')
    expect(searchAddIndex(index, 'rarity', 'pseudo')[0].entry.ids.pseudo).toEqual(['pseudo.pseudo_increased_rarity'])
    expect(searchAddIndex(index, 'maximum life', 'explicit')[0].entry.ref).toBe('+# to maximum Life')
    expect(searchAddIndex(index, 'max life', 'pseudo')[0].entry.ref).toBe('+# total maximum Life')
  })

  it('lists every kind of each match with All, pseudo first', () => {
    const hits = searchAddIndex(index, 'rarity of items found', 'all', 50)
    const rarity = hits.filter(h => h.entry.ref === '#% increased Rarity of Items found').map(h => h.kind)
    expect(rarity[0]).toBe('pseudo')
    expect(rarity).toEqual(expect.arrayContaining(['pseudo', 'explicit', 'implicit', 'crafted']))
    expect(searchAddIndex(index, 'rarity', 'all', 3)).toHaveLength(3)
  })

  it('needs every typed word, in any order', () => {
    const hits = searchAddIndex(index, 'resistance cold', 'explicit', 50)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every(h => /cold/i.test(h.entry.ref) && /resistance/i.test(h.entry.ref))).toBe(true)
    expect(searchAddIndex(index, 'zzqq nothing', 'explicit')).toEqual([])
    expect(searchAddIndex(index, '   ', 'explicit')).toEqual([])
  })

  it('counts matches per kind for the chips', () => {
    const counts = kindCounts(index, 'rarity of items found')
    expect(counts.pseudo).toBeGreaterThan(0)
    expect(counts.explicit).toBeGreaterThan(0)
    expect(counts.all).toBeGreaterThan(counts.pseudo)
    expect(kindCounts(index, '')).toEqual({ all: 0, pseudo: 0, explicit: 0, implicit: 0, crafted: 0, fractured: 0, enchant: 0 })
  })

  it('searches for an added mod with the item, and only when ticked', () => {
    const filters = createFilters(parseItem(fixture('items/rare-ring.txt')), OPTS)
    const life = searchAddIndex(index, 'maximum life', 'explicit')[0].entry
    const mod = addedModFrom(life, 'explicit')
    mod.min = 40
    filters.addedMods = [mod]
    const and = createTradeRequest(filters, []).query.stats[0]
    expect(and.filters).toContainEqual({ id: 'explicit.stat_3299347043', value: { min: 40, max: undefined, option: undefined }, disabled: false })

    mod.disabled = true
    const off = createTradeRequest(filters, []).query.stats[0]
    expect(off.filters).toContainEqual(expect.objectContaining({ id: 'explicit.stat_3299347043', disabled: true }))
  })

  it('flips the range of a stat the trade site stores the other way', () => {
    const filters = createFilters(parseItem(fixture('items/rare-ring.txt')), OPTS)
    const speed = index.find(e => e.ref === '#% increased Action Speed')!
    const mod = addedModFrom(speed, 'explicit')
    mod.min = 10
    filters.addedMods = [mod]
    const and = createTradeRequest(filters, []).query.stats[0]
    expect(and.filters).toContainEqual(expect.objectContaining({ id: 'explicit.stat_2878959938', value: expect.objectContaining({ min: undefined, max: -10 }) }))
  })
})
