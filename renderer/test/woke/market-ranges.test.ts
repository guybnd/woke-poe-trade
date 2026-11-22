// The Prices tab's time ranges (market/ranges.ts).
import { describe, it, expect } from 'vitest'
import { ninjaRange, rangeInfo, rowRange, savedRange } from '@/web/woke/market/ranges'
import type { MarketRow } from '@/web/woke/market/browser'

const row = (over: Partial<MarketRow> = {}): MarketRow => ({
  key: 'Divine Orb\u0000', type: 'Currency', name: 'Divine Orb', variant: '', chaos: 200,
  trend: [100, 200], change: 100, dayChange: 25, gaps: 0,
  // % against a week ago: 100c, ..., 160c yesterday, 200c today.
  graph: [0, 10, 20, 40, 50, 60, 100],
  ...over
})

describe('price ranges', () => {
  it('falls back to 7 days for an unknown saved range', () => {
    expect(rangeInfo(undefined).id).toBe('7d')
    expect(rangeInfo('1h').id).toBe('7d')
    expect(rangeInfo('3h').local).toBe(true)
  })

  it("reads 1 and 3 days from poe.ninja's daily line", () => {
    expect(ninjaRange(200, row().graph, 1).change).toBeCloseTo(25)
    const three = ninjaRange(200, row().graph, 3)
    expect(three.change).toBeCloseTo((2 / 1.4 - 1) * 100)
    expect(three.trend).toHaveLength(4)
    expect(three.trend[3]).toBe(200)
    expect(ninjaRange(200, [null, 5], 3).change).toBeNull()
    // All zeros reads as no data, as at 7 days.
    expect(ninjaRange(1, [0, 0, 0, 0, 0, 0, 0], 3).change).toBeNull()
  })

  it('ends a saved line at the current price', () => {
    const own = savedRange(210, [200, null, 205])
    expect(own?.trend).toEqual([200, 205, 210])
    expect(own?.change).toBeCloseTo(5)
    expect(savedRange(210, [null, 205])).toBeNull()
    expect(savedRange(210, undefined)).toBeNull()
  })

  it('uses saved prices when there are some, else poe.ninja where it has the range', () => {
    const saved = { 'Divine Orb\u0000': [190, 195] }
    expect(rowRange(row(), '3h', saved).change).toBeCloseTo((200 / 190 - 1) * 100)
    expect(rowRange(row(), '3h', {})).toEqual({ trend: [], change: null })
    expect(rowRange(row(), '24h', null).change).toBeCloseTo(25)
    expect(rowRange(row(), '7d', saved)).toEqual({ trend: [100, 200], change: 100 })
  })
})
