import { describe, it, expect } from 'vitest'
import { listedTotal, staleIds } from '@/web/woke/net-worth/pending-glance'
import type { PendingGlance } from '@/web/woke/net-worth/pending-glance'

const D = 86_400_000
const T0 = 1_000_000_000_000

describe('a Faustus listing you left out', () => {
  const g: PendingGlance = {
    league: 'L',
    readAt: T0,
    items: [['a', T0 - 5 * D, 100, 'chaos'], ['b', T0 - 5 * D, 2, 'divine']]
  }
  const out = new Set(['b'])

  it("isn't in the dock card's or the chart's At Faustus total", () => {
    expect(listedTotal(g, null, [], 200)).toBe(500)
    expect(listedTotal(g, null, [], 200, out)).toBe(100)
    expect(listedTotal(g, { league: 'L', at: T0, items: [['a', 90], ['b', 380]] }, [], 200, out)).toBe(90)
  })

  it("isn't counted stale", () => {
    expect(staleIds(g, [], T0, 3)).toEqual(['a', 'b'])
    expect(staleIds(g, [], T0, 3, out)).toEqual(['a'])
  })
})
