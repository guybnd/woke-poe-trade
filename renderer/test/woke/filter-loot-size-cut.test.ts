// The size cut on big uniques (Guy's picks S2, Z1, W2, E1, 2026-11-28):
// 2x2 counts 75% of its price, 2x3 60%, 2x4 50%; Auto turns it on from
// Strict; Always sections skip it.
import { describe, it, expect } from 'vitest'
import { defaultCurrency, scaled, sizeCut, sizeCutNow, stacksFor } from '@/web/woke/loot-filter/currency-weights'
import type { CurrencyItem } from '@/web/woke/loot-filter/currency-weights'
import { normalizeCurrency } from '@/web/woke/loot-filter/currency-settings'

const axe = { name: 'Ezomyte Axe', cls: 'Rarity Unique', type: 'uniques', tier: 't3', cat: 'uniqplain', chaos: 12, full: 1, size: '2x4' } as CurrencyItem

describe('size cut', () => {
  it('cuts by size', () => {
    expect([sizeCut('1x1'), sizeCut('2x1'), sizeCut('2x2'), sizeCut('2x3'), sizeCut('2x4'), sizeCut(undefined)]).toEqual([1, 1, 0.75, 0.6, 0.5, 1])
  })
  it('Auto is on from Strict, and On and Off win', () => {
    const c = defaultCurrency()
    expect(scaled(c, '2-SEMI-STRICT').sizeOn).toBe(false)
    expect(scaled(c, '3-STRICT').sizeOn).toBe(true)
    expect(scaled({ ...c, sizeCut: 'on' }, '0-SOFT').sizeOn).toBe(true)
    expect(scaled({ ...c, sizeCut: 'off' }, '5-UBER-STRICT').sizeOn).toBe(false)
    expect(normalizeCurrency({ ...c, sizeCut: 'on' }).sizeCut).toBe('on')
  })
  it('a 12c 2x4 counts 6c: Decent, not Big; Always sections skip it', () => {
    const on = { ...defaultCurrency(), sizeCut: 'on' as const, sizeOn: true }
    expect(stacksFor(axe, defaultCurrency())[3]).toBe(1)
    expect(stacksFor(axe, on)[3]).toBeNull()
    expect(stacksFor(axe, on)[2]).toBe(1)
    expect(sizeCutNow({ ...axe, cat: 'uniqchase' }, on)).toBe(1)
  })
})
