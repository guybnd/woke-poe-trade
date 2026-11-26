// Pick today-after-break: the first read after a break says "since Tue", not "today".
import { describe, expect, it } from 'vitest'
import { emptyHistory, recordRead, sinceDayOf, sinceYesterday } from '@/web/woke/net-worth/valuation'
import type { Valuation } from '@/web/woke/net-worth/valuation'
import { glanceLabel, sinceLabel } from '@/web/woke/net-worth/glance'
import type { Glance } from '@/web/woke/net-worth/glance'

const cats = (c: number) => ({ currency: c, fragments: 0, cards: 0, gear: 0, other: 0 })
const v = (chaos: number): Valuation => ({ chaos, byCategory: cats(chaos), lines: [], unpricedLines: [], ignoredLines: [], unpriced: 0 } as unknown as Valuation)
// November 2026: the 24th is a Tuesday.
const day = (d: number, h = 12) => new Date(2026, 10, d, h).getTime()

describe('since which day', () => {
  it('is yesterday after a read yesterday: plain "today"', () => {
    const h = recordRead(emptyHistory(), v(1000), 100, day(24, 22))
    expect(sinceDayOf(h, day(25))).toBe('2026-11-24')
    expect(sinceLabel(sinceDayOf(h, day(25)), day(25))).toEqual({ label: 'today', tip: "Since yesterday's last read" })
  })

  it('names the weekday after a break of a few days, and keeps the number', () => {
    const h = recordRead(emptyHistory(), v(1000), 100, day(20, 22))
    expect(sinceYesterday(h, 2200, 100, day(24))).toBe(12)
    const l = sinceLabel(sinceDayOf(h, day(24)), day(24))
    expect(l.label).toBe('since Fri')
    expect(l.tip).toBe('Since the last read, on Fri (4 days of price moves)')
  })

  it('names the date once it is more than 6 days back', () => {
    const h = recordRead(emptyHistory(), v(1000), 100, day(3))
    expect(sinceLabel(sinceDayOf(h, day(24)), day(24)).label).toBe('since 3 Nov')
    // 6 days back is still a weekday.
    expect(sinceLabel('2026-11-18', day(24)).label).toBe('since Wed')
  })

  it('has no day before the first one', () => {
    const h = recordRead(emptyHistory(), v(1000), 100, day(24, 9))
    expect(sinceDayOf(h, day(24, 12))).toBeNull()
    expect(sinceLabel(null, day(24)).label).toBe('today')
  })
})

describe('the dock wheel name', () => {
  const g = (extra: Partial<Glance> = {}): Glance => ({ league: 'L', at: day(24), chaos: 0, netChaos: null, divine: 100, todayChaos: 1200, ...extra })
  it('says "Since Fri" for a glance read after a break', () => {
    expect(glanceLabel(g({ todayFrom: '2026-11-20' }), 'today', day(24, 13))).toBe('Since Fri')
  })
  it('stays "Today" otherwise', () => {
    expect(glanceLabel(g(), 'today', day(24, 13))).toBe('Today')
    expect(glanceLabel(g({ todayFrom: '2026-11-20' }), 'total', day(24, 13))).toBe('Net worth')
  })
})
