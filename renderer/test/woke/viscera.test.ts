// 3.30 Wickerman trophies (Viscera): parsed by base, slot and implicit, and
// searched on the trade site by base or by the slot's Viscera category.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import/first */
import { ItemCategory } from '@/parser'
import { ModifierType } from '@/parser/modifiers'
import { createFilters } from '@/web/price-check/filters/create-item-filters'
import { createPresets } from '@/web/price-check/filters/create-presets'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
/* eslint-enable import/first */

const OPTS = { league: 'Covens', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false }

// Rebuilt from Guy's price check screenshot of a copied Ghostly Claw.
const CLAW = () => fixture('items/viscera-ghostly-claw.txt')

describe('Viscera', () => {
  beforeAll(loadGameData)

  it('parses the base, slot, item level and implicit', () => {
    const item = parseItem(CLAW())
    expect(item.info.refName).toBe('Ghostly Claw')
    expect(item.category).toBe(ItemCategory.Viscera)
    expect(item.visceraSlot).toBe('Upper Limb')
    expect(item.itemLevel).toBe(56)
    expect(item.unknownModifiers).toEqual([])
    const implicit = item.statsByType.find(s => s.type === ModifierType.Implicit)
    expect(implicit?.stat.ref).toBe('#% chance to gain Elusive on Kill')
    expect(implicit?.sources[0].contributes?.value).toBe(9)
  })

  it('reads the slot even when a copy puts it under the name', () => {
    const item = parseItem(CLAW().replace('Ghostly Claw\n--------\nUpper Limb', 'Ghostly Claw\nUpper Limb'))
    expect(item.info.refName).toBe('Ghostly Claw')
    expect(item.visceraSlot).toBe('Upper Limb')
  })

  it('searches the base, or every Viscera of its slot', () => {
    const item = parseItem(CLAW())
    const exact = createTradeRequest(createFilters(item, { ...OPTS, exact: true }), [])
    expect(exact.query.type).toBe('Ghostly Claw')

    const filters = createFilters(item, { ...OPTS, exact: false })
    filters.searchRelaxed!.disabled = false
    const relaxed = createTradeRequest(filters, [])
    expect(relaxed.query.type).toBeUndefined()
    expect(relaxed.query.filters.type_filters?.filters.category?.option).toBe('viscera.arm')
  })

  it('maps every slot to its trade category', () => {
    for (const [slot, id] of [['Head', 'viscera.head'], ['Torso', 'viscera.body'], ['Lower Limb', 'viscera.leg']]) {
      const item = parseItem(CLAW().replace('Upper Limb', slot))
      const filters = createFilters(item, { ...OPTS, exact: false })
      filters.searchRelaxed!.disabled = false
      expect(createTradeRequest(filters, []).query.filters.type_filters?.filters.category?.option, slot).toBe(id)
    }
  })

  it('offers the implicit as a stat filter', () => {
    const item = parseItem(CLAW())
    const { presets } = createPresets(item, OPTS)
    const stats = presets[0].stats.flatMap(g => g.group ? g.stats : [g])
    const elusive = stats.find(s => s.tradeId.includes('implicit.stat_922882178'))
    expect(elusive?.roll?.value).toBe(9)
  })
})
