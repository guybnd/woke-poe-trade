// The trade cache finds a query again whatever order its fields were set in.
import { describe, expect, it } from 'vitest'
import { Cache } from '@/web/price-check/trade/Cache'

describe('trade cache keys', () => {
  it('ignores field order, keeps array order', () => {
    const c = new Cache()
    c.set({ a: 1, b: { y: 2, x: [1, 2] } }, 'hit', 60)
    expect(c.get({ b: { x: [1, 2], y: 2 }, a: 1 })).toBe('hit')
    expect(c.get({ a: 1, b: { y: 2, x: [2, 1] } })).toBeUndefined()
    c.clear()
  })
})
