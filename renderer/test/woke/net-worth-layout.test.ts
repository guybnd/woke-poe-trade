// Net worth window: dragging section sizes (net-worth/layout.ts).
import { describe, it, expect } from 'vitest'
import { chartHOf, colWeights, dragCols, dragTop, edges, foldedOf, hasChartH, midHOf, toggleFold, topOf } from '@/web/woke/net-worth/layout'

describe('net worth section sizes', () => {
  it('falls back to the defaults for missing or broken values', () => {
    expect(topOf(undefined)).toBe(0.5)
    expect(topOf({ half: 2 })).toBe(0.8)
    expect(topOf({ top: 0.7 } as never)).toBe(0.5)
    expect(chartHOf({ chartH: -5 })).toBe(60)
    expect(chartHOf({ chartH: 1000 })).toBe(320)
    expect(colWeights({ cols: { changes: 2 } }, ['changes', 'side'])).toEqual([2, 1])
  })

  it('moves one column edge, never below 15% of the row', () => {
    const w = dragCols([1, 1, 1], 0, 100, 300)
    expect(w[0]).toBeCloseTo(1.55)
    expect(w[1]).toBeCloseTo(0.45)
    expect(w[2]).toBe(1)
    expect(dragCols([1, 1], 0, -1000, 200)[0]).toBeCloseTo(0.3)
    // Old sizes too small to keep 15% each: leave them as they are, never negative.
    expect(dragCols([0.05, 0.05, 10], 0, 10, 100)).toEqual([0.05, 0.05, 10])
  })

  it('places the handles at the column edges', () => {
    expect(edges([1, 1, 2])).toEqual([0.25, 0.5])
    expect(edges([1])).toEqual([])
  })

  it('keeps the halves, middle row and chart heights in range', () => {
    expect(dragTop(0.5, 100, 1000)).toBeCloseTo(0.6)
    expect(dragTop(0.5, -900, 1000)).toBe(0.3)
    expect(dragTop(0.5, 10, 0)).toBe(0.5)
    expect(midHOf(undefined)).toBeNull()
    expect(midHOf({ midH: 5 })).toBe(60)
    expect(midHOf({ midH: 5000 })).toBe(900)
    expect(hasChartH({})).toBe(false)
    expect(hasChartH({ chartH: 90 })).toBe(true)
  })

  it('folds and opens sections, dropping unknown ones', () => {
    expect(toggleFold(undefined, 'sold')).toEqual(['sold'])
    expect(toggleFold(['sold', 'where'], 'sold')).toEqual(['where'])
    expect(toggleFold(['sold', 'bogus' as never], 'moves')).toEqual(['sold', 'moves'])
    const f = foldedOf({ folded: ['chart', 'moves'] })
    expect(f.chart && f.moves && !f.sold && !f.perHour).toBe(true)
    expect(foldedOf({ folded: 'x' as never }).chart).toBe(false)
  })
})
