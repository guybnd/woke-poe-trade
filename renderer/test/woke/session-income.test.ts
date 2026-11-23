import { describe, expect, it } from 'vitest'
import { incomeRows, interleave } from '@/web/woke/session-story/income'
import type { MapRecord } from '@/web/woke/session-story/map-log'
import type { StashGain } from '@/web/woke/net-worth/valuation'

const MIN = 60_000
const map = (name: string, enteredAt: number, leftAt: number): MapRecord => ({
  key: `${name}:${enteredAt}`,
  name,
  areaLevel: 83,
  enteredAt,
  leftAt,
  mapMs: leftAt - enteredAt,
  deaths: 0,
  npcs: [],
  char: null,
  className: null,
  charLevel: null,
  levelsGained: 0
})
const gain = (at: number, since: number | null, netChaos: number, extra: Partial<StashGain> = {}): StashGain => ({
  at, since, netChaos, netDivine: netChaos / 200, added: 0, removed: 0, ...extra
})

describe('incomeRows', () => {
  const maps = [map('Fortress', 0, 3 * MIN), map('Fortress', 4 * MIN, 7 * MIN), map('Fortress', 8 * MIN, 11 * MIN)]

  it('counts the maps left since the read before, newest read first', () => {
    const rows = incomeRows([gain(5 * MIN, null, 0), gain(12 * MIN, 5 * MIN, 140)], maps)
    expect(rows.map(r => r.at)).toEqual([12 * MIN, 5 * MIN])
    expect(rows[0].maps).toBe(2)
    expect(rows[1].maps).toBe(0)
  })

  it('gives chaos per hour over the time since the read before', () => {
    const [r] = incomeRows([gain(20 * MIN, 10 * MIN, 100)], maps)
    expect(r.perHour).toBeCloseTo(600)
    expect(r.rate).toBeCloseTo(200)
  })

  it('leaves out reads too close together for a per-hour figure', () => {
    const [r] = incomeRows([gain(12 * MIN, 10 * MIN, 100)], maps)
    expect(r.perHour).toBeNull()
  })

  it('counts a purchase as spent, not as a loss', () => {
    const [r] = incomeRows([gain(30 * MIN, 20 * MIN, -4000, { cashChaos: -4000, auto: 'spend' })], maps)
    expect(r.purchase).toBe(true)
    expect(r.chaos).toBe(0)
    expect(r.spent).toBe(4000)
  })
})

describe('interleave', () => {
  it('puts each read above the maps it followed', () => {
    const maps = [map('A', 0, 3 * MIN), map('B', 4 * MIN, 7 * MIN)]
    const reads = incomeRows([gain(8 * MIN, 1 * MIN, 50)], maps)
    expect(interleave(maps, reads).map(i => i.kind === 'map' ? i.map.name : 'read')).toEqual(['read', 'B', 'A'])
  })
})
