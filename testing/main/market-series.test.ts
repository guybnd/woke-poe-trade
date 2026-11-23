// Short-range price lines from saved snapshots (main/src/woke/market-series.ts).
import { describe, it, expect, beforeEach } from 'vitest'
import { pickTimes, priceSeries, resetSeriesCache, seriesPoints } from '../../main/src/woke/market-series'

const MIN = 60 * 1000
const HOUR = 60 * MIN
const NOW = Date.UTC(2026, 10, 22, 12)

// A snapshot every 30 minutes for the last `hours`.
const every30 = (hours: number) => Array.from({ length: hours * 2 + 1 }, (_, i) => NOW - i * 30 * MIN)

describe('pickTimes', () => {
  it('takes one snapshot per half hour, oldest first', () => {
    const got = pickTimes(every30(10), NOW, 3 * HOUR)
    expect(seriesPoints(3 * HOUR)).toBe(7)
    expect(got).toEqual(Array.from({ length: 7 }, (_, i) => NOW - 3 * HOUR + i * 30 * MIN))
  })

  it('reads fewer points when asked: the instant card wants one every 4 hours', () => {
    const got = pickTimes(every30(60), NOW, 24 * HOUR, 7)
    expect(got).toHaveLength(7)
    expect(got[got.length - 1] - got[0]).toBe(24 * HOUR)
  })

  it('caps a long range at 13 points', () => {
    expect(pickTimes(every30(60), NOW, 48 * HOUR)).toHaveLength(13)
  })

  it('gives nothing when no snapshot is near the start of the range', () => {
    // The app was started 2 hours ago: a 3 hour change would really be 2 hours.
    expect(pickTimes(every30(2), NOW, 3 * HOUR)).toEqual([])
  })

  it('accepts a start a little off, and skips the gaps while the app was off', () => {
    const times = [NOW - 3 * HOUR + 20 * MIN, NOW - 30 * MIN, NOW]
    expect(pickTimes(times, NOW, 3 * HOUR)).toEqual(times)
  })
})

describe('priceSeries', () => {
  beforeEach(() => { resetSeriesCache() })

  const snap = (ts: number) => ({
    items: [
      { type: 'Currency', name: 'Divine Orb', variant: '', chaos: 200 + (NOW - ts) / HOUR },
      { type: 'Currency', name: 'Exalted Orb', variant: '', chaos: 1 },
      { type: 'SkillGem', name: 'Empower Support', variant: '4', chaos: 900 }
    ]
  })

  it("returns one category's prices at each picked snapshot", async () => {
    let reads = 0
    const read = { times: async () => every30(4), snapshot: async (ts: number) => { reads++; return snap(ts) } }
    const got = await priceSeries('L', 'Currency', 3 * HOUR, NOW, read)
    expect(got.times).toHaveLength(7)
    expect(got.rows['Divine Orb\u0000'][0]).toBe(203)
    expect(got.rows['Divine Orb\u0000'][6]).toBe(200)
    expect(Object.keys(got.rows)).toEqual(['Divine Orb\u0000', 'Exalted Orb\u0000'])
    // Read once, then served from memory.
    await priceSeries('L', 'SkillGem', 3 * HOUR, NOW, read)
    expect(reads).toBe(7)
  })

  it('keeps only the named items, and marks missing prices', async () => {
    const read = {
      times: async () => every30(4),
      snapshot: async (ts: number) => ts === NOW - HOUR ? { items: [] } : snap(ts)
    }
    const got = await priceSeries('M', 'Currency', 3 * HOUR, NOW, read, ['Divine Orb'])
    expect(Object.keys(got.rows)).toEqual(['Divine Orb\u0000'])
    expect(got.rows['Divine Orb\u0000'][4]).toBeNull()
  })
})
