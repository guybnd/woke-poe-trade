// Guy's pick: "Exclude my bad mods" on a map's price check. A farming template's
// Not mods go into every search, even ones the checked map hasn't got, so the
// results can't hold maps with the mods you avoid. Off by default, remembered on
// the template.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'

const config = {
  apiLatencySeconds: 2,
  accountName: '',
  woke: { off: [] as string[] },
  widgets: [{ wmType: 'woke-map-mods', farmTemplates: [] as unknown[], farmTemplate: undefined as string | undefined }]
}
vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => config,
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import-x/first */
import { activeTemplate, notToSave, saveTemplate, setExcludeNot, templateNotMods } from '@/web/woke/map-mods/farm-templates'
import { createFilters } from '@/web/price-check/filters/create-item-filters'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
/* eslint-enable import-x/first */

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false, exact: false }
const MIRAGE = 'Area contains an Empowered Mirage which covers the entire Map'

describe('Exclude my bad mods', () => {
  beforeAll(async () => { await loadGameData() })

  it('is off on a new template, and remembered once turned on', () => {
    const t = saveTemplate({ name: 'Juiced', on: [], not: [MIRAGE] })!
    expect(activeTemplate()?.excludeNot).toBeUndefined()
    setExcludeNot(t.id, true)
    expect(activeTemplate()?.excludeNot).toBe(true)
    setExcludeNot(t.id, false)
    expect(activeTemplate()).not.toHaveProperty('excludeNot')
  })

  it('takes the Not mods this map hasn\'t got, with their trade ids', () => {
    const t = { id: 'x', name: 'X', on: [], not: ['A', 'B', 'C'] }
    const ids = (ref: string) => ref === 'C' ? [] : [`explicit.${ref}`]
    expect(templateNotMods(t, new Set(['A']), ids)).toEqual([{ statRef: 'B', tradeId: ['explicit.B'] }])
    expect(templateNotMods({ ...t, not: undefined }, new Set(), ids)).toEqual([])
  })

  it('a save over the same name keeps its Not mods this map hasn\'t got, only with Exclude on', () => {
    const prev = { id: 'x', name: 'X', on: [], not: ['A', 'B'], excludeNot: true as const }
    expect(notToSave(prev, ['A', 'C'], ['C'])).toEqual(['C', 'B'])
    expect(notToSave({ ...prev, excludeNot: undefined }, ['A', 'C'], ['C'])).toEqual(['C'])
    expect(notToSave(undefined, [], ['C'])).toEqual(['C'])
  })

  it('reads a map mod\'s trade id from the data', () => {
    expect(templateNotMods({ id: 'x', name: 'X', on: [], not: [MIRAGE] }, new Set())).toEqual([{ statRef: MIRAGE, tradeId: ['explicit.stat_2436559047'] }])
  })

  it('puts them in the search\'s Not group', () => {
    const filters = createFilters(parseItem(fixture('items/map-originator-more.txt')), OPTS)
    filters.templateNot = templateNotMods({ id: 'x', name: 'X', on: [], not: [MIRAGE] }, new Set())
    const not = createTradeRequest(filters, []).query.stats.find(g => g.type === 'not')
    expect(not?.filters).toContainEqual({ id: 'explicit.stat_2436559047', disabled: false })
    filters.templateNot = undefined
    const off = createTradeRequest(filters, []).query.stats.find(g => g.type === 'not')
    expect(off?.filters.some(f => f.id === 'explicit.stat_2436559047') ?? false).toBe(false)
  })
})
