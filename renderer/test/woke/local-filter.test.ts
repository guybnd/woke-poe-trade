// Tighter stat ranges filter the listings already loaded; anything wider needs a search.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import-x/first */
import type { ParsedItem } from '@/parser'
import type { FilterOrGroup, ItemFilters, StatFilter } from '@/web/price-check/filters/interfaces'
import type { ListingItem } from '@/web/woke/price-insight/listing-tip'
import { createPresets } from '@/web/price-check/filters/create-presets'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { compareToSearched, listingFits, LocalCheck } from '@/web/woke/price-insight/local-filter'
/* eslint-enable import-x/first */

const OPTS = { league: 'x', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false }

let armour: ParsedItem
function setup (prep?: (stats: FilterOrGroup[]) => void) {
  const { presets, active } = createPresets(armour, OPTS)
  const preset = presets.find(p => p.id === active)!
  const filters = preset.filters as ItemFilters
  const stats = preset.stats as FilterOrGroup[]
  prep?.(stats)
  const searchedQuery = JSON.stringify(createTradeRequest(filters, stats))
  const searchedStats = JSON.parse(JSON.stringify(stats)) as FilterOrGroup[]
  const row = (text: RegExp) => stats.find(s => !s.group && text.test(s.statRef)) as StatFilter
  const compare = () => compareToSearched(searchedQuery, searchedStats, filters, stats)
  return { filters, stats, row, compare }
}

const listing = (life: number, stun?: number): ListingItem => ({
  explicitMods: [`+${life} to maximum Life`, ...(stun != null ? [`${stun}% increased Stun and Block Recovery`] : [])]
})

describe('comparing the filters with the search on screen', () => {
  beforeAll(async () => {
    await loadGameData()
    armour = parseItem(fixture('items/rare-body-armour-es.txt'))
  })

  it('is current until something changes', () => {
    expect(setup().compare()).toEqual({ kind: 'current' })
  })

  it('a raised min on a ticked stat filters here, by that stat', () => {
    const { row, compare } = setup()
    const life = row(/total maximum Life/)
    expect(life.disabled).toBe(false)
    life.roll!.min = 125
    const state = compare()
    expect(state.kind).toBe('narrowed')
    const checks = (state as { checks: LocalCheck[] }).checks
    expect(checks).toHaveLength(1)
    expect(checks[0]).toMatchObject({ min: 125, max: null, required: false })
    expect(listingFits(listing(124), checks, armour.category)).toBe(false)
    expect(listingFits(listing(126), checks, armour.category)).toBe(true)
  })

  it('a lowered max filters here too', () => {
    const { row, compare } = setup()
    const life = row(/total maximum Life/)
    life.roll!.max = 130
    expect(compare().kind).toBe('narrowed')
  })

  it('a ticked stat filters here, and a listing without it no longer fits', () => {
    const { row, compare } = setup()
    const stun = row(/Stun and Block Recovery/)
    expect(stun.disabled).toBe(true)
    stun.disabled = false
    const state = compare()
    expect(state.kind).toBe('narrowed')
    const checks = (state as { checks: LocalCheck[] }).checks
    expect(checks[0].required).toBe(true)
    expect(listingFits(listing(120), checks, armour.category)).toBe(false)
    expect(listingFits(listing(120, 18), checks, armour.category)).toBe(true)
  })

  it('back to the searched numbers is current again', () => {
    const { row, compare } = setup()
    const life = row(/total maximum Life/)
    const before = life.roll!.min
    life.roll!.min = 125
    life.roll!.min = before
    expect(compare()).toEqual({ kind: 'current' })
  })

  it('a wider range, an unticked stat or a cleared min needs a search', () => {
    const lower = setup()
    lower.row(/total maximum Life/).roll!.min = 50
    expect(lower.compare().kind).toBe('stale')

    const cleared = setup()
    cleared.row(/total maximum Life/).roll!.min = ''
    expect(cleared.compare().kind).toBe('stale')

    const unticked = setup()
    unticked.row(/total maximum Life/).disabled = true
    expect(unticked.compare().kind).toBe('stale')
  })

  it('any other filter changed needs a search, even with a tighter range', () => {
    const { filters, row, compare } = setup()
    row(/total maximum Life/).roll!.min = 125
    filters.itemLevel = { value: 86, disabled: false }
    expect(compare().kind).toBe('stale')
  })

  it('a tighter and a wider range together need a search', () => {
    const { row, compare } = setup()
    row(/total maximum Life/).roll!.min = 125
    const res = row(/Fire Resistance|total Elemental Resistance|total Resistance/)
    res.roll!.min = 1
    expect(compare().kind).toBe('stale')
  })
})

describe('what the search ignores', () => {
  beforeAll(async () => {
    await loadGameData()
    armour = parseItem(fixture('items/rare-body-armour-es.txt'))
  })

  it('a ticked stat checks its number when the search sends it', () => {
    const { row, compare } = setup()
    const stun = row(/Stun and Block Recovery/)
    stun.disabled = false
    stun.roll!.min = 18
    const checks = (compare() as { checks: LocalCheck[] }).checks
    expect(checks[0].min).toBe(18)
    expect(listingFits(listing(120, 17), checks, armour.category)).toBe(false)
  })

  it('an {empty} id only asks for the stat, so its number is not checked', () => {
    const { row, compare } = setup(stats => {
      const stun = stats.find(f => !f.group && /Stun and Block Recovery/.test(f.statRef)) as StatFilter
      stun.tradeId = stun.tradeId.map(id => `{empty}${id}`)
    })
    const stun = row(/Stun and Block Recovery/)
    stun.disabled = false
    stun.roll!.min = 18
    const checks = (compare() as { checks: LocalCheck[] }).checks
    expect(checks[0]).toMatchObject({ min: null, required: true })
    expect(listingFits(listing(120, 17), checks, armour.category)).toBe(true)
    expect(listingFits(listing(120), checks, armour.category)).toBe(false)
  })
})
