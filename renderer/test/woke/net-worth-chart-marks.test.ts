import { describe, expect, it } from 'vitest'
import { groupSales, mapOf, slotOf, timeTicks, valueTicks } from '@/web/woke/net-worth/chart-marks'
import { listedAt } from '@/web/woke/net-worth/pending'
import type { PendingDoc } from '@/web/woke/net-worth/pending'
import { addPoint, seriesFor } from '@/web/woke/net-worth/ledger'
import type { Sale } from '@/web/woke/net-worth/sales'

const H = 3_600_000
const T0 = 1_000_000_000_000
const RATES = { chaos: 1, divine: 200 }
const item = (id: string, at: number, amount: number, currency = 'chaos'): Sale =>
  ({ id, at, name: id, typeLine: id, baseType: id, frameType: 3, icon: '', stack: 1, price: { amount, currency } })
const cats = { currency: 0, fragments: 0, cards: 0, gear: 0, other: 0 }

describe('Faustus band (pick A)', () => {
  it('counts each listing from first seen until it sold', () => {
    const doc: PendingDoc = {
      league: 'L',
      readAt: T0 + 3 * H,
      listings: [item('a', T0, 100), item('b', T0 + H, 1, 'divine')],
      firstSeen: { a: T0, b: T0 + H }
    }
    // b sold for 1 divine at T0 + 2h; a is still listed, worth 80 now.
    const sales = [item('b', T0 + 2 * H, 1, 'divine')]
    const worth = (l: Sale) => l.id === 'a' ? 80 : 0
    expect(listedAt(doc, sales, RATES, worth, [T0 - H, T0, T0 + H, T0 + 2 * H, T0 + 5 * H])).toEqual([0, 80, 280, 80, 80])
    expect(listedAt(null, sales, RATES, worth, [T0])).toEqual([0])
  })

  it('a refresh keeps what was listed, and the series passes it on', () => {
    const p = addPoint([], { at: T0, chaos: 1000, divine: 200, byCategory: cats, netChaos: null, top: [], listed: 400.04 })
    expect(p[0].listed).toBe(400)
    const s = seriesFor(p, {}, 'league', T0 + H, 200)
    expect(s[0].listedDiv).toBe(2)
    const none = addPoint([], { at: T0, chaos: 1000, divine: 200, byCategory: cats, netChaos: null, top: [], listed: 0 })
    expect('listed' in none[0]).toBe(false)
  })
})

describe('map columns (pick D)', () => {
  it('a read belongs to the map before it, if soon after', () => {
    const maps = [{ from: T0, to: T0 + 600_000, name: 'Map 1 · Strand', gainDiv: 2 }, { from: T0 + H, to: T0 + H + 600_000, name: 'Map 2 · Tower', gainDiv: 5 }]
    expect(mapOf(maps, T0 - 1)).toBeNull()
    expect(mapOf(maps, T0 + 700_000)?.name).toBe('Map 1 · Strand')
    expect(mapOf(maps, T0 + 50 * 60_000)).toBeNull()
    expect(mapOf(maps, T0 + H + 650_000)?.name).toBe('Map 2 · Tower')
  })
})

describe('sale ticks by slot', () => {
  it('folds sales in one slot into one tick worth their total', () => {
    const M = 60_000
    const t0 = 1_000_000_000_000 - (1_000_000_000_000 % (12 * 60 * M))
    expect(slotOf(t0, t0 + 3 * 60 * M)).toBe(15 * M)
    expect(slotOf(t0, t0 + 7 * 24 * 60 * M)).toBe(720 * M)
    const sales = [
      { at: t0 + M, text: '', name: 'Blunderbore', div: 20 },
      { at: t0 + 2 * M, text: '', name: 'Dusk Scarab', div: 0.5 },
      { at: t0 + 3 * M, text: '', name: 'Odd currency', div: null },
      { at: t0 + 2000 * M, text: '', name: 'Hollow Lands', div: 1.4 }
    ]
    const g = groupSales(sales, t0, t0 + 7 * 24 * 60 * M)
    expect(g.map(x => [x.name, x.div, x.count])).toEqual([['Blunderbore', 20.5, 3], ['Hollow Lands', 1.4, 1]])
  })
})

describe('chart axes', () => {
  it('puts round values inside the range', () => {
    expect(valueTicks(720, 890)).toEqual([750, 800, 850])
    expect(valueTicks(0, 10)).toEqual([0, 5, 10])
    expect(valueTicks(1.2, 1.9)).toEqual([1.2, 1.4, 1.6, 1.8])
    expect(valueTicks(5, 5)).toEqual([])
  })
  it('puts round local times inside the range', () => {
    const t0 = new Date(2026, 10, 24, 3, 36).getTime()
    const day = timeTicks(t0, t0 + 24 * 3600_000)
    expect(day.length).toBeGreaterThanOrEqual(4)
    expect(day.length).toBeLessThanOrEqual(6)
    for (const x of day) { expect(new Date(x.at).getMinutes()).toBe(0); expect(new Date(x.at).getHours() % 6).toBe(0) }
    const week = timeTicks(t0, t0 + 7 * 24 * 3600_000)
    expect(week.every(x => x.day && new Date(x.at).getHours() === 0)).toBe(true)
  })
})

describe('time axis edge cases', () => {
  it('stays on midnight across a daylight saving change, and thins a long league', () => {
    const t0 = new Date(2026, 9, 21, 9).getTime()
    const week = timeTicks(t0, t0 + 14 * 86_400_000, 14)
    expect(week.every(x => new Date(x.at).getHours() === 0)).toBe(true)
    const league = timeTicks(t0, t0 + 120 * 86_400_000, 7)
    expect(league.length).toBeLessThanOrEqual(9)
  })
})
