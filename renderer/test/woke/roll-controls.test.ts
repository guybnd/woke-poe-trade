// The price check's roll controls: the Low/Current rolls presets, and the
// roll bar where left-click sets the min and right-click the max.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { createExactStatFilters, initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { activeRollPreset, applyRollPreset, isOpenBound } from '@/web/woke/price-insight/roll-presets'
import { editRange, sliderEnd, sliderValueAt } from '@/web/ui/stat-roll-slider'

function mapStats () {
  const item = parseItem(fixture('items/map-rare-t16.txt'))
  return { stats: createExactStatFilters(item, item.statsByType, { searchStatRange: 10, mode: 'props' }) }
}

function stat (stats: FilterOrGroup[], tradeId: string) {
  return stats.find((f): f is StatFilter => !f.group && f.tradeId[0] === tradeId)!
}

describe('roll presets', () => {
  beforeAll(loadGameData)

  it('Current rolls on a map searches from each roll up, with no max', () => {
    const { stats } = mapStats()
    applyRollPreset(stats, 'current')

    expect(stat(stats, 'item.map_item_quantity').roll).toMatchObject({ min: 87, max: undefined })
    expect(stat(stats, 'item.map_pack_size').roll).toMatchObject({ min: 29, max: undefined })
    expect(activeRollPreset(stats)).toBe('current')
  })

  it('Low rolls on a map leaves the max empty too', () => {
    const { stats } = mapStats()
    applyRollPreset(stats, 'low')
    expect(stat(stats, 'item.map_item_quantity').roll).toMatchObject({ min: 0, max: undefined })
    expect(activeRollPreset(stats)).toBe('low')
  })

  it('Current rolls on a tiered mod stays a window around the roll', () => {
    const filter = {
      disabled: false,
      roll: { value: 30, min: 27, max: undefined, default: { min: 27, max: 33 }, bounds: { min: 20, max: 40 }, dp: false, isNegated: false, better: 1 }
    } as unknown as StatFilter
    applyRollPreset([filter], 'current')
    expect(filter.roll).toMatchObject({ min: 28, max: 32 })
  })
})

describe('roll bar', () => {
  it('maps the left button to min and the right button to max', () => {
    expect(sliderEnd(0)).toBe('min')
    expect(sliderEnd(2)).toBe('max')
    expect(sliderEnd(1)).toBe(null)
  })

  it('rounds the min down and the max up', () => {
    const bounds = { min: 24, max: 40 }
    expect(sliderValueAt(0.47, bounds, 'min', false)).toBe(31)
    expect(sliderValueAt(0.47, bounds, 'max', false)).toBe(32)
    // Rounding a fractional bound never steps outside the bar.
    expect(sliderValueAt(0, { min: 12.5, max: 20.5 }, 'min', true)).toBeGreaterThanOrEqual(12.5)
    expect(sliderValueAt(1, { min: 12.5, max: 20.5 }, 'max', true)).toBeLessThanOrEqual(20.5)
  })

  it('keeps the other end, unless the new value crosses it', () => {
    expect(editRange([26, 30], 'min', 28)).toEqual([28, 30])
    expect(editRange([26, 30], 'max', 28)).toEqual([26, 28])
    expect(editRange([26, undefined], 'max', 35)).toEqual([26, 35])
    expect(editRange([26, 30], 'min', 35)).toEqual([35, undefined])
    expect(editRange([26, 30], 'max', 20)).toEqual([undefined, 20])
  })
})

describe('unique abyssal socket count', () => {
  beforeAll(loadGameData)

  function sockets (text: string) {
    const item = parseItem(text)
    const stats = initUiModFilters(item, { searchStatRange: 10 })
    return stats.find((f): f is StatFilter => !f.group && f.statRef === 'Has # Abyssal Sockets')!
  }

  it('shows, ticks and pins the count on a unique that drops with 1 or 2', () => {
    const filter = sockets(fixture('items/unique-bubonic-trail.txt'))
    expect(filter.hidden).toBeFalsy()
    expect(filter.disabled).toBe(false)
    expect(filter.roll).toMatchObject({ value: 2, min: 2, max: 2 })
  })

  it('pins a single socket too, so 2-socket listings stay out', () => {
    const text = fixture('items/unique-bubonic-trail.txt')
      .replace('Sockets: A A', 'Sockets: A')
      .replace('Has 2 Abyssal Sockets', 'Has 1 Abyssal Socket')
    expect(sockets(text).roll).toMatchObject({ value: 1, min: 1, max: 1 })
  })
})

describe('open-ended bounds', () => {
  it('never sends the MAX_SAFE_INTEGER placeholder from any preset', () => {
    const { stats } = mapStats()
    for (const preset of ['low', 'current'] as const) {
      applyRollPreset(stats, preset)
      for (const f of stats) {
        const r = (f as StatFilter).roll
        if (!r) continue
        for (const v of [r.min, r.max]) if (typeof v === 'number') expect(isOpenBound(v)).toBe(false)
      }
    }
  })
})
