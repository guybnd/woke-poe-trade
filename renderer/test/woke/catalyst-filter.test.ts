// The price check's Q tag: rows a catalyst raised, and the item's catalyst quality filter.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { createExactStatFilters } from '@/web/price-check/filters/create-stat-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { catalystQualityFilter, raisedBy, toggleCatalyst } from '@/web/woke/price-insight/catalyst-filter'

function beltStats () {
  const item = parseItem(fixture('items/rare-belt-catalysed.txt'))
  return createExactStatFilters(item, item.statsByType, { searchStatRange: 10, mode: 'props' }) as StatFilter[]
}

describe('catalyst quality filter', () => {
  beforeAll(loadGameData)

  it('finds the item\'s catalyst filter, off and at its quality', () => {
    const quality = catalystQualityFilter(beltStats())!
    expect(quality.tradeId).toEqual(['pseudo.pseudo_jewellery_attribute_quality'])
    expect(quality.disabled).toBe(true)
    expect(quality.roll?.min).toBe(20)
  })

  it('tags only rows the catalyst raised', () => {
    const stats = beltStats()
    const str = stats.find(f => f.text.includes('Strength'))!
    expect(raisedBy(str)).toBe(20)
    expect(raisedBy(catalystQualityFilter(stats)!)).toBeUndefined()
  })

  it('switches the one shared filter on and off', () => {
    const stats = beltStats()
    toggleCatalyst(stats)
    expect(catalystQualityFilter(stats)!.disabled).toBe(false)
    toggleCatalyst(stats)
    expect(catalystQualityFilter(stats)!.disabled).toBe(true)
  })

  it('has no filter on an item without catalyst quality', () => {
    const item = parseItem(fixture('items/rare-ring.txt'))
    const stats = createExactStatFilters(item, item.statsByType, { searchStatRange: 10, mode: 'props' })
    expect(catalystQualityFilter(stats)).toBeUndefined()
  })
})
