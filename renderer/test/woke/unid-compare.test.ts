// Identify or sell unid, for gamble uniques (WOKEPOET-542).
import { describe, expect, it } from 'vitest'
import { identifiedSpread, unidRead, rangeText } from '@/web/woke/price-insight/unid-compare'

describe('identifiedSpread', () => {
  it('gives low, high, median and count of priced versions', () => {
    expect(identifiedSpread([{ chaos: 600 }, { chaos: 100 }, { chaos: 0 }, { chaos: 12000 }, { chaos: 300 }]))
      .toEqual({ low: 100, high: 12000, median: 450, count: 4 })
  })
  it('needs two versions', () => {
    expect(identifiedSpread([{ chaos: 100 }])).toBeNull()
  })
})

describe('unidRead', () => {
  const s = { low: 100, high: 12000, median: 600, count: 9 }
  it('points to the side worth 1.5x or more', () => {
    expect(unidRead(300, s)).toBe('identify')
    expect(unidRead(900, s)).toBe('unid')
    expect(unidRead(500, s)).toBe('even')
  })
})

describe('rangeText', () => {
  const num = (v: number) => String(Number(v.toPrecision(2)))
  it('writes both ends in one unit', () => {
    expect(rangeText(50, 500, 200, num)).toBe('0.25 to 2.5 div')
    expect(rangeText(50, 150, 200, num)).toBe('50 to 150c')
    expect(rangeText(50, 500, null, num)).toBe('50 to 500c')
  })
})
