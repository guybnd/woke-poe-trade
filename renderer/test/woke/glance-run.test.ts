import { describe, expect, it } from 'vitest'
import { runMapsNow } from '@/web/woke/session-story/glance-run'

const m = (enteredAt: number, leftAt = enteredAt + 50) => ({ enteredAt, leftAt })

describe('glance bar run maps', () => {
  it('adds maps logged after the newest counted one', () => {
    // A and B counted at a read (B the newest); C was still unlogged in hideout.
    const recent = [m(400), m(300), m(200), m(100)]
    expect(runMapsNow({ maps: 2, startAt: 50, lastMapAt: 200, at: 350 }, recent)).toBe(4)
  })
  it('no map counted yet: everything since the start, the map you were in included', () => {
    const recent = [m(300), m(90, 150), m(10, 40)]
    expect(runMapsNow({ maps: 0, startAt: 100, at: 120 }, recent)).toBe(2)
  })
  it('an older glance without the newest-map time: maps after its save', () => {
    expect(runMapsNow({ maps: 2, startAt: 0, at: 250 }, [m(300), m(200)])).toBe(3)
  })
})
