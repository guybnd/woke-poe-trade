// The item tooltip's price strip: one's price, a stack's value when the
// caller says how many, and poe.ninja's 7-day change.
import { describe, it, expect } from 'vitest'
import { marketFromRow } from '@/web/woke/ui/tooltip/tooltip'

const VAAL = { name: 'Vaal Orb', chaos: 5.4, graph: [0, 40, null, 113] }

describe('tooltip price strip', () => {
  it('is one item\'s price, and the change over poe.ninja\'s 7 days', () => {
    const m = marketFromRow(VAAL, {})
    expect(m.chaos).toBe(5.4)
    expect(m.change).toBeCloseTo(1.13)
    expect(m.graph).toEqual([0, 40, 113])
    expect(m.count).toBeUndefined()
  })

  it('carries how many, so the strip can show the stack too', () => {
    expect(marketFromRow(VAAL, { count: 20 }).count).toBe(20)
    expect(marketFromRow(VAAL, { count: 1 }).count).toBeUndefined()
  })
})
