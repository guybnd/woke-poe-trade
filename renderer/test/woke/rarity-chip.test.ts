// The rarity chip on gear: Any / Magic / Rare, to hunt magic bases from a rare.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import-x/first */
import { createFilters, hasRarityChip } from '@/web/price-check/filters/create-item-filters'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { nextRarity, rarityStep, magicAffixClash } from '@/web/price-check/filters/rarity-chip'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
/* eslint-enable import-x/first */

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false, exact: false }
const rarityOption = (filters: ReturnType<typeof createFilters>) =>
  createTradeRequest(filters, []).query.filters.type_filters?.filters.rarity?.option

describe('Rarity chip', () => {
  beforeAll(loadGameData)

  it('is on rare gear, jewellery and jewels, not on uniques, flasks or maps', () => {
    expect(hasRarityChip(parseItem(fixture('items/rare-body-armour-es.txt')))).toBe(true)
    expect(hasRarityChip(parseItem(fixture('items/rare-ring.txt')))).toBe(true)
    expect(hasRarityChip(parseItem(fixture('items/rare-cluster-large.txt')))).toBe(true)
    expect(hasRarityChip(parseItem(fixture('items/unique-kaoms-heart.txt')))).toBe(false)
    expect(hasRarityChip(parseItem(fixture('items/magic-flask.txt')))).toBe(false)
    expect(hasRarityChip(parseItem(fixture('items/map-rare-t16.txt')))).toBe(false)
  })

  it('steps Any, Magic, Rare, Any and searches that rarity', () => {
    const filters = createFilters(parseItem(fixture('items/rare-body-armour-es.txt')), OPTS)
    const rarity = filters.rarity!
    expect(rarityStep(rarity)).toBe('nonunique')
    expect(rarityOption(filters)).toBe('nonunique')
    nextRarity(rarity)
    expect(rarityOption(filters)).toBe('magic')
    nextRarity(rarity)
    expect(rarityOption(filters)).toBe('rare')
    nextRarity(rarity)
    expect(rarityOption(filters)).toBe('nonunique')
  })

  it('reads a turned-off Magic (exact mode) as Any, and steps on to Magic', () => {
    const rarity = { value: 'magic', disabled: true }
    expect(rarityStep(rarity)).toBe('nonunique')
    nextRarity(rarity)
    expect(rarity).toEqual({ value: 'magic', disabled: false })
  })

  it('warns when more than one prefix or suffix is ticked', () => {
    const item = parseItem(fixture('items/rare-body-armour-es.txt'))
    const stats = initUiModFilters(item, { searchStatRange: 10 })
    const rows = stats.filter((f): f is StatFilter => !f.group)
    const pick = (re: RegExp) => rows.find(f => re.test(f.text))!
    for (const row of rows) row.disabled = true
    // Totals summed from several mods (both resistance suffixes) can't be told apart.
    pick(/Elemental Resistance/).disabled = false
    pick(/maximum Life/).disabled = false
    pick(/Chaos Resistance/).disabled = false
    expect(magicAffixClash(stats)).toBeNull()
    pick(/Stun and Block Recovery/).disabled = false
    expect(magicAffixClash(stats)).toMatch(/2 prefixes/)
  })
})
