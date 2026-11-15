// The number on the dock's net worth icon (glance.ts).
import { describe, it, expect } from 'vitest'
import { glanceFromPoints, glanceText, isGlance, nextShows } from '@/web/woke/net-worth/glance'
import type { Glance } from '@/web/woke/net-worth/glance'
import type { LedgerPoint } from '@/web/woke/net-worth/ledger'

const g = (chaos: number, netChaos: number | null, divine: number | null = 200): Glance => ({ league: 'L', at: 1, chaos, netChaos, divine })

describe('glanceText', () => {
  it('shows a gain in divines once it is worth one', () => {
    expect(glanceText(g(62400, 280), 'change')).toEqual({ text: '+1.4d', tone: 'up' })
  })
  it('shows chaos under a divine, and a loss with a minus', () => {
    expect(glanceText(g(62400, -35), 'change')).toEqual({ text: '−35c', tone: 'down' })
  })
  it('shows the total on swap', () => {
    expect(glanceText(g(62400, 280), 'total')).toEqual({ text: '312d', tone: null })
  })
  it('shows nothing for no change, or nothing to compare', () => {
    expect(glanceText(g(100, 0), 'change')).toBeNull()
    expect(glanceText(g(100, null), 'change')).toBeNull()
    expect(glanceText(g(100, null), 'total')).toEqual({ text: '100c', tone: null })
  })
  it('falls back to chaos without a divine rate', () => {
    expect(glanceText(g(5000, 450, null), 'change')).toEqual({ text: '+450c', tone: 'up' })
  })
})

describe('per hour, today and the wheel', () => {
  const at = new Date(2026, 10, 15, 12).getTime()
  const day = { league: 'L', at, chaos: 62400, netChaos: 280, divine: 200, perHourChaos: 100, todayChaos: 640 }
  it('shows per hour and today for the day of the read only', () => {
    expect(glanceText(day, 'perHour', at + 60_000)).toEqual({ text: '+100c/h', tone: 'up' })
    expect(glanceText(day, 'today', at + 60_000)).toEqual({ text: '+3.2d', tone: 'up' })
    expect(glanceText(day, 'today', at + 24 * 3_600_000)).toBeNull()
    expect(glanceText({ ...day, perHourChaos: undefined }, 'perHour', at)).toBeNull()
  })
  it('steps through in order and wraps', () => {
    expect(nextShows(undefined, 1)).toBe('total')
    expect(nextShows('total', 1)).toBe('perHour')
    expect(nextShows('today', 1)).toBe('change')
    expect(nextShows('change', -1)).toBe('today')
    expect(nextShows('bogus' as never, 1)).toBe('total')
  })
})

describe('glanceFromPoints', () => {
  it('takes the last chart point', () => {
    const p = (at: number, chaos: number, netChaos: number | null): LedgerPoint => ({ at, chaos, divine: 200, byCategory: { currency: 0, fragments: 0, cards: 0, gear: 0, other: 0 }, netChaos, top: [] }) as LedgerPoint
    expect(glanceFromPoints('L', [p(1, 10, null), p(2, 30, 20)])).toEqual({ league: 'L', at: 2, chaos: 30, netChaos: 20, divine: 200 })
    expect(glanceFromPoints('L', [])).toBeNull()
    expect(glanceFromPoints('L', null)).toBeNull()
  })
  it('checks saved docs', () => {
    expect(isGlance(g(1, null))).toBe(true)
    expect(isGlance({ league: 'L' })).toBe(false)
    expect(isGlance(null)).toBe(false)
  })
})
