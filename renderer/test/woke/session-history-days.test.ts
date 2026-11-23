import { describe, expect, it } from 'vitest'
import { dayLabel, dayStart, openIndex, withDays } from '@/web/woke/session-story/history-days'
import { incomeRows, interleave } from '@/web/woke/session-story/income'
import type { MapRecord } from '@/web/woke/session-story/map-log'

const MIN = 60_000
// Local times, so day boundaries are the machine's own.
const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m).getTime()
const map = (name: string, enteredAt: number, mapMs: number, extra: Partial<MapRecord> = {}): MapRecord => ({
  key: `${name}:${enteredAt}`,
  name,
  areaLevel: 83,
  enteredAt,
  leftAt: enteredAt + mapMs,
  mapMs,
  deaths: 0,
  npcs: [],
  char: 'whekq',
  className: 'Necromancer',
  charLevel: 98,
  levelsGained: 0,
  ...extra
})
const skipped = (name: string) => name === 'Vault'

describe('withDays', () => {
  const maps = [
    map('Fortress', at(23, 13, 5), 4 * MIN),
    map('Vault', at(23, 2, 50), 2 * MIN),
    map('Fortress', at(23, 2, 41), 2 * MIN, { char: 'other', charLevel: 90 }),
    map('Fortress', at(23, 2, 37), 3 * MIN),
    map('Fortress', at(22, 23, 58), 10_000)
  ]
  const reads = incomeRows([
    { at: at(23, 2, 45), since: at(23, 2, 30), netChaos: 400, netDivine: 2, added: 0, removed: 0 }
  ], maps)
  const items = interleave(maps, reads)

  it('puts a header with that day\'s totals above each day', () => {
    const lines = withDays(items, items.length, skipped).lines
    const days = lines.filter(l => l.kind === 'day')
    expect(days.map(d => d.kind === 'day' && d.at)).toEqual([dayStart(at(23, 0)), dayStart(at(22, 0))])
    const today = days[0]
    if (today.kind !== 'day') throw new Error('day')
    // The vault isn't counted; the read's 400c and its divine rate are.
    expect(today.maps).toBe(3)
    expect(today.avgMs).toBe(3 * MIN)
    expect(today.chaos).toBe(400)
    expect(today.rate).toBe(200)
    const before = days[1]
    // A quick look in: counted as a map, left out of the average.
    if (before.kind !== 'day') throw new Error('day')
    expect(before.maps).toBe(1)
    expect(before.avgMs).toBeNull()
  })

  it('names the character at the top of each day and when it changes', () => {
    const lines = withDays(items, items.length, skipped).lines
    const chars = lines.filter(l => l.kind === 'char').map(l => l.kind === 'char' && `${l.char} ${l.level}`)
    expect(chars).toEqual(['whekq 98', 'other 90', 'whekq 98', 'whekq 98'])
  })

  it('draws only the shown items but totals the whole day', () => {
    const { lines, more } = withDays(items, 1, skipped)
    expect(lines.map(l => l.kind)).toEqual(['day', 'char', 'map'])
    expect(more).toBe(items.length - 1)
    const day = lines[0]
    if (day.kind !== 'day') throw new Error('day')
    expect(day.maps).toBe(3)
  })
})

describe('day totals', () => {
  it('add up the whole day under a filter, and reads in divines at their own rates', () => {
    const maps = [map('Fortress', at(23, 13), 4 * MIN, { npcs: ['Einhar'] }), map('Fortress', at(23, 12), 2 * MIN)]
    const reads = incomeRows([
      { at: at(23, 12, 30), since: at(23, 11), netChaos: 400, netDivine: 2, added: 0, removed: 0 },
      { at: at(23, 13, 30), since: at(23, 12, 30), netChaos: 300, netDivine: 1, added: 0, removed: 0 }
    ], maps)
    const filtered = interleave(maps.filter(m => m.npcs.includes('Einhar')), reads)
    const day = withDays(filtered, 100, skipped, new Set(), interleave(maps, reads)).lines[0]
    if (day.kind !== 'day') throw new Error('day')
    expect(day.maps).toBe(2)
    expect(day.avgMs).toBe(3 * MIN)
    // 400c at 200 and 300c at 300: 3 div, not 700c at the newest rate.
    expect(day.div).toBe(3)
  })
})

describe('folding', () => {
  const maps = [map('Fortress', at(23, 13), 3 * MIN), map('Fortress', at(22, 20), 3 * MIN), map('Fortress', at(22, 19), 3 * MIN), map('Fortress', at(21, 20), 3 * MIN)]
  const items = interleave(maps, [])
  const folded = new Set([dayStart(at(22, 0))])

  it('shows a folded day as its header only, its items not using the page', () => {
    const { lines } = withDays(items, 2, skipped, folded)
    expect(lines.map(l => l.kind)).toEqual(['day', 'char', 'map', 'day', 'day', 'char', 'map'])
  })

  it('stops at the first open item past the page, so order holds', () => {
    const { lines, more } = withDays(items, 1, skipped, folded)
    // The folded day before it still shows; the open day after waits for Show more.
    expect(lines.map(l => l.kind)).toEqual(['day', 'char', 'map', 'day'])
    expect(more).toBe(1)
  })

  it('finds an item among the open days only', () => {
    expect(openIndex(items, folded, it => it.at === at(21, 20))).toBe(1)
    expect(openIndex(items, folded, it => it.at === at(22, 20))).toBe(-1)
  })
})

describe('dayLabel', () => {
  it('says Today and Yesterday, else the date', () => {
    const now = at(23, 13)
    expect(dayLabel(dayStart(now), now).title).toBe('Today')
    expect(dayLabel(dayStart(at(22, 5)), now).title).toBe('Yesterday')
    expect(dayLabel(dayStart(at(20, 5)), now).date).toBe('')
  })
})
