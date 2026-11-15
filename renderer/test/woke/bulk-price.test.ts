import { describe, expect, it } from 'vitest'
import { bulkPerDivine, formatUnitPrice } from '@/web/woke/ui/format'

describe('bulkPerDivine', () => {
  it('counts how many a divine buys, rounded to read at a glance', () => {
    expect(bulkPerDivine(0.009, 110)).toBe(12000)
    expect(bulkPerDivine(0.5, 150)).toBe(300)
    expect(bulkPerDivine(0.9, 150)).toBe(170)
    expect(bulkPerDivine(0.75, 60)).toBe(80)
    expect(bulkPerDivine(0.99, 50)).toBe(51)
  })
  it('leaves 1c and up, zero, negatives and missing rates alone', () => {
    expect(bulkPerDivine(1, 150)).toBeNull()
    expect(bulkPerDivine(4, 150)).toBeNull()
    expect(bulkPerDivine(0, 150)).toBeNull()
    expect(bulkPerDivine(-0.5, 150)).toBeNull()
    expect(bulkPerDivine(0.5, null)).toBeNull()
    expect(bulkPerDivine(0.5, 0)).toBeNull()
    expect(bulkPerDivine(null, 150)).toBeNull()
    expect(bulkPerDivine(NaN, 150)).toBeNull()
  })
})

describe('formatUnitPrice', () => {
  it('reads bulk items as 1 div / N, the rest as chaos or div', () => {
    expect(formatUnitPrice(0.009, 110)).toBe('1 div / 12,000')
    expect(formatUnitPrice(0.009, null)).toBe('0.009 c')
    expect(formatUnitPrice(45, 150)).toBe('45 c')
    expect(formatUnitPrice(300, 150)).toBe('2 div')
  })
})
