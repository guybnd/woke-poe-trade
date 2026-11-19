// The map check card's "Your rewards" block: each minimum the profile sets,
// against the map's own stats.
import { describe, it, expect, vi } from 'vitest'
import type { ParsedItem } from '@/parser'
import { rewardGoals } from '@/web/woke/map-mods/check'

vi.mock('@/web/Config', () => ({ AppConfig: () => ({ widgets: [] }), pushHostConfig: () => {} }))

const map = (stats: Partial<ParsedItem>) => stats as ParsedItem

describe('rewardGoals', () => {
  it('lists only the minimums that are set, in table order', () => {
    const goals = rewardGoals(map({ areaAtlasDrops: 112, mapMoreCurrency: 18, areaPackSize: 31 }),
      { currency: 40, quantity: 80, packSize: 25, rarity: 0 })
    expect(goals.map(g => [g.stat, g.value, g.met])).toEqual([
      ['quantity', 112, true],
      ['packSize', 31, true],
      ['currency', 18, false]
    ])
  })

  it('reads a missing stat as 0, so the minimum is missed', () => {
    expect(rewardGoals(map({}), { scarabs: 10 })).toEqual([
      { stat: 'scarabs', label: 'More scarabs', need: 10, value: 0, met: false }
    ])
  })

  it('falls back to item quantity on maps without Atlas drops', () => {
    expect(rewardGoals(map({ areaItemQuantity: 90 }), { quantity: 80 })[0].met).toBe(true)
  })

  it('a value equal to the minimum meets it', () => {
    expect(rewardGoals(map({ quality: 20 }), { quality: 20 })[0].met).toBe(true)
  })
})
