import { describe, expect, it } from 'vitest'
import { lootValue, setLootPrice } from '@/web/woke/analytics/stats'
import type { SavedLoot } from '@/web/woke/analytics/types'

const line = (name: string, qty: number, chaos: number | null): SavedLoot => ({ type: 'DivinationCard', name, variant: '', qty, chaos })

describe('Session analytics loot lines (shared line item)', () => {
  it('a left-out line stays listed but is not counted', () => {
    const lines = [line('The Apothecary', 1, 500), { ...line('Rain of Chaos', 4, 1), out: true as const }]
    expect(lootValue(lines)).toBe(500)
  })

  it('your price replaces poe.ninja\'s, and back again', () => {
    const l = line('The Doctor', 1, 900)
    setLootPrice(l, 1200)
    expect(l).toMatchObject({ chaos: 1200, read: 900 })
    setLootPrice(l, 1100)
    expect(l).toMatchObject({ chaos: 1100, read: 900 })
    setLootPrice(l, null)
    expect(l.chaos).toBe(900)
    expect('read' in l).toBe(false)
  })

  it('an unpriced line can take your price and go back to none', () => {
    const l = line('Mysterious card', 2, null)
    setLootPrice(l, 3)
    expect(lootValue([l])).toBe(6)
    setLootPrice(l, null)
    expect(l.chaos).toBeNull()
  })
})
