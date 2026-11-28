// Day-1 prices: they fill in only what the live prices lack, marked as day-1,
// and the script takes the middle of a league's first three days.
import { describe, expect, it } from 'vitest'
import { day1Applies, withDay1 } from '@/web/woke/loot-filter/day1-prices'
import type { Day1Table } from '@/web/woke/loot-filter/day1-prices'
import { priceLookup } from '@/web/woke/loot-filter/economy'

// The script is plain .mjs outside the app; loaded by path, untyped.
const SCRIPT = '../../../scripts/gen-day1-prices.mjs'

const table: Day1Table = {
  league: 'Test',
  made: '2026-11-27',
  divine: 120,
  items: [['Currency', 'Divine Orb', '', 120], ['Currency', 'Orb of Unmaking', '', 3], ['DivinationCard', 'The Doctor', '', 900]]
}

describe('day-1 prices', () => {
  it('adds a line only for names the live prices lack', () => {
    const live = [{ type: 'Currency', name: 'Divine Orb', variant: '', chaos: 400 }]
    const all = withDay1(live, table)
    expect(all.find(i => i.name === 'Divine Orb')).toEqual(live[0])
    expect(all.find(i => i.name === 'Orb of Unmaking')).toMatchObject({ chaos: 3, day1: true })
    const look = priceLookup(all, () => [])
    expect(look({ type: 'currency', label: 'Currency', ninja: ['Currency'] }, 'Orb of Unmaking')).toMatchObject({ chaos: 3, thin: false, day1: true })
    expect(look({ type: 'currency', label: 'Currency', ninja: ['Currency'] }, 'Divine Orb')?.day1).toBeUndefined()
    expect(withDay1(live, null)).toBe(live)
  })

  it('takes the middle of the first three days', async () => {
    const { firstDays } = await import(/* @vite-ignore */ SCRIPT) as { firstDays: (p: Array<{ daysAgo: number, value: number }>) => number | null }
    const pts = [{ daysAgo: 30, value: 5 }, { daysAgo: 29, value: 9 }, { daysAgo: 28, value: 7 }, { daysAgo: 1, value: 100 }]
    expect(firstDays(pts)).toBe(7)
    expect(firstDays([{ daysAgo: 3, value: 2 }])).toBe(2)
    expect(firstDays([])).toBeNull()
  })

  it('applies only in another league\'s first week', () => {
    const start = Date.parse('2027-03-06T20:00:00Z')
    const day = 86400e3
    expect(day1Applies('Next', 'Covens', start, start + day)).toBe(true)
    expect(day1Applies('Covens', 'Covens', start, start + day)).toBe(false)
    expect(day1Applies('Next', 'Covens', start, start + 8 * day)).toBe(false)
    expect(day1Applies('Standard', 'Covens', null, start)).toBe(false)
    expect(day1Applies('Next', '', start, start + day)).toBe(false)
  })

  it('the typical price is the middle of the league after its first three days', async () => {
    const { typical } = await import(/* @vite-ignore */ SCRIPT) as { typical: (p: Array<{ daysAgo: number, value: number }>) => number | null }
    // Days 10..1: the first three (500, 400, 300) are left out.
    const pts = [500, 400, 300, 9, 1, 5, 3, 7, 2, 4].map((value, i) => ({ daysAgo: 10 - i, value }))
    expect(typical(pts)).toBe(4)
    expect(typical([{ daysAgo: 2, value: 6 }, { daysAgo: 1, value: 2 }])).toBe(4)
    expect(typical([])).toBeNull()
  })

  it('reads an exchange details answer as dated points', async () => {
    const { exchangePoints, firstDays } = await import(/* @vite-ignore */ SCRIPT) as {
      exchangePoints: (d: unknown, now: number) => Array<{ daysAgo: number, value: number }>
      firstDays: (p: Array<{ daysAgo: number, value: number }>) => number | null
    }
    const now = Date.parse('2026-11-28T06:00:00Z')
    const d = {
      pairs: [{ id: 'divine', history: [] }, {
        id: 'chaos',
        history: [
          { timestamp: '2026-11-28T00:00:00Z', rate: 9 },
          { timestamp: '2026-10-31T00:00:00Z', rate: 30 },
          { timestamp: '2026-10-30T00:00:00Z', rate: 50 },
          { timestamp: '2026-10-29T00:00:00Z', rate: 40 }
        ]
      }]
    }
    const pts = exchangePoints(d, now)
    expect(pts[0]).toEqual({ daysAgo: 0, value: 9 })
    expect(firstDays(pts)).toBe(40)
    expect(exchangePoints(null, now)).toEqual([])
  })
})
