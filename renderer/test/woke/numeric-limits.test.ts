import { describe, expect, it } from 'vitest'
import { clampToLimit, filterCeiling, NUMERIC_LIMITS } from '@/web/price-check/filters/numeric-limits'

describe('numeric filter limits', () => {
  it('stops links at six', () => {
    const ceiling = filterCeiling(NUMERIC_LIMITS.links, { value: 5 })
    expect(clampToLimit(7, ceiling)).toBe(6)
    expect(clampToLimit(6, ceiling)).toBe(6)
  })

  it('never goes below zero', () => {
    expect(clampToLimit(-3, 6)).toBe(0)
  })

  it('leaves filters without a limit alone', () => {
    expect(clampToLimit(5000, filterCeiling(undefined, { value: 1 }))).toBe(5000)
  })

  it('keeps the room after the value is lowered', () => {
    const filter = { value: 33 }
    filterCeiling(NUMERIC_LIMITS.quality, filter)
    filter.value = 25
    expect(filterCeiling(NUMERIC_LIMITS.quality, filter)).toBe(33)
  })

  it('makes room for an item above the limit', () => {
    expect(filterCeiling(NUMERIC_LIMITS.quality, { value: 33 })).toBe(33)
    expect(filterCeiling(NUMERIC_LIMITS.itemLevel, { value: 84, max: 101 })).toBe(101)
  })
})
