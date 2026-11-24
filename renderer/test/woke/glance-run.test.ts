import { describe, expect, it } from 'vitest'
import { runMapsNow } from '@/web/woke/session-story/glance-run'

describe('glance bar run maps', () => {
  it('adds maps finished since the saved glance', () => {
    const recent = [{ enteredAt: 500 }, { enteredAt: 400 }, { enteredAt: 300 }, { enteredAt: 100 }]
    // Saved at 200 with 1 map: three more since.
    expect(runMapsNow(1, 200, recent)).toBe(4)
    expect(runMapsNow(4, 600, recent)).toBe(4)
    // An old glance without its time: the saved count only.
    expect(runMapsNow(2, 0, recent)).toBe(2)
  })
})
