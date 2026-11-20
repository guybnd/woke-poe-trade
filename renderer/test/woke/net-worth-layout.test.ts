// Net worth window: dragging section sizes (net-worth/layout.ts).
import { describe, it, expect } from 'vitest'
import { chartHOf, colWeights, dragCols, edges, topOf } from '@/web/woke/net-worth/layout'

describe('net worth section sizes', () => {
  it('falls back to the defaults for missing or broken values', () => {
    expect(topOf(undefined)).toBe(0.6)
    expect(topOf({ top: 2 })).toBe(0.8)
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
})
