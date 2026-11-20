// Net worth per hour of play: hideout, town, closed and AFK time left out,
// over the last 1, 2 and 3 hours (play-time.ts), and its Ctrl+Space card.
import { describe, it, expect } from 'vitest'
import { emptyMarks, feedMarks, playRate, playRates, rateTip, timeIn, trimMarks } from '@/web/woke/net-worth/play-time'
import { glanceRates } from '@/web/woke/net-worth/glance'
import { netWorthLookup } from '@/web/woke/search/lookups/net-worth'
import type { Glance } from '@/web/woke/net-worth/glance'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const T0 = new Date(2026, 10, 20, 12, 0, 0).getTime()
const MIN = 60_000
const pad = (n: number) => String(n).padStart(2, '0')
function line (min: number, text: string) {
  const d = new Date(T0 + min * MIN)
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} 1 abc [DEBUG Client 1] ${text}`
}
const area = (min: number, id: string) => line(min, `Generating level 83 area "${id}" with seed 7`)

describe('play time from Client.txt', () => {
  it('splits time into maps, hideout and closed', () => {
    const m = feedMarks(emptyMarks(), [
      area(0, 'MapWorldsStrand'),
      area(20, 'HideoutArenaSearingExarch'),
      area(30, 'MapWorldsFortress'),
      area(50, '1_2_town'),
      line(60, '***** LOG FILE OPENING *****').replace(' 1 abc [DEBUG Client 1]', ''),
      area(90, 'MapWorldsStrand')
    ])
    const t = timeIn(m.marks, T0, T0 + 100 * MIN)
    // Closed from the last line (town at 50) till the game started again at 60, then the login screen.
    expect(t).toEqual({ map: 50 * MIN, play: 0, hub: 10 * MIN, off: 40 * MIN })
  })

  it('AFK is left out and goes back to where you were', () => {
    const m = feedMarks(emptyMarks(), [
      area(0, 'MapWorldsStrand'),
      line(10, ': AFK mode is now ON. Autoreply "x"'),
      line(25, ': AFK mode is now OFF.')
    ])
    expect(timeIn(m.marks, T0, T0 + 30 * MIN)).toEqual({ map: 15 * MIN, play: 0, hub: 0, off: 15 * MIN })
  })

  it('a crash in a map keeps the play up to the last line before the game started again', () => {
    const m = feedMarks(emptyMarks(), [
      area(0, 'MapWorldsStrand'),
      line(40, '#Someone: chat while mapping'),
      line(60, '***** LOG FILE OPENING *****').replace(' 1 abc [DEBUG Client 1]', ''),
      area(61, 'HideoutFoo')
    ])
    expect(timeIn(m.marks, T0, T0 + 70 * MIN)).toEqual({ map: 40 * MIN, play: 0, hub: 9 * MIN, off: 21 * MIN })
  })

  it('a fresh read leaves out time before the game started', () => {
    // Read from 10:00; the game started at 12:00 (T0). The last stash read was yesterday.
    const m = feedMarks(emptyMarks(T0 - 120 * MIN), [
      line(0, '***** LOG FILE OPENING *****').replace(' 1 abc [DEBUG Client 1]', ''),
      area(1, 'MapWorldsStrand'),
      area(31, 'HideoutFoo')
    ])
    const points = [{ at: T0 - 20 * 3600_000, netChaos: null }, { at: T0 + 31 * MIN, netChaos: 600 }]
    const r = playRate(points, m.marks, T0 - 60 * MIN, T0 + 31 * MIN)
    expect(r.playMs).toBe(30 * MIN)
    expect(r.perHour).toBeCloseTo(1200)
  })

  it('AFK ends back in the hideout even after old marks are trimmed', () => {
    const a = trimMarks(feedMarks(emptyMarks(), [area(0, 'HideoutFoo'), line(5, ': AFK mode is now ON. Autoreply "x"')]), T0 + 10 * MIN)
    const b = feedMarks(a, [line(20, ': AFK mode is now OFF.')])
    expect(b.marks[b.marks.length - 1].s).toBe('hub')
  })

  it('a later read adds only new lines', () => {
    const a = feedMarks(emptyMarks(), [area(0, 'MapWorldsStrand'), area(10, 'HideoutFoo')])
    // The range is read again from the last line's second.
    const b = feedMarks(a, [area(10, 'HideoutFoo'), area(15, 'MapWorldsStrand')])
    expect(b.marks.map(x => x.s)).toEqual(['map', 'hub', 'map'])
    expect(trimMarks(b, T0 + 12 * MIN).marks.map(x => x.s)).toEqual(['hub', 'map'])
  })
})

describe('profit per hour of play', () => {
  const marks = feedMarks(emptyMarks(), [
    area(0, 'MapWorldsStrand'),
    area(30, 'HideoutFoo'),
    area(60, 'MapWorldsStrand')
  ]).marks

  it('leaves hideout time out of the hours', () => {
    const points = [{ at: T0, netChaos: null }, { at: T0 + 90 * MIN, netChaos: 600 }]
    const r = playRate(points, marks, T0, T0 + 90 * MIN)
    // 60 min of maps, 30 in the hideout: 600c per hour of play, not 400.
    expect(r.perHour).toBeCloseTo(600)
    expect(r.hubMs).toBe(30 * MIN)
  })

  it('a read that started before the window counts its share inside it', () => {
    const points = [{ at: T0, netChaos: null }, { at: T0 + 90 * MIN, netChaos: 600 }]
    // From minute 45: 30 min of the read's 60 min of play.
    const r = playRate(points, marks, T0 + 45 * MIN, T0 + 90 * MIN)
    expect(r.chaos).toBeCloseTo(300)
    expect(r.playMs).toBe(30 * MIN)
    expect(r.perHour).toBeCloseTo(600)
  })

  it('needs 10 minutes of play, and skips reads with nothing to compare', () => {
    const points = [{ at: T0, netChaos: null }, { at: T0 + 5 * MIN, netChaos: 50 }, { at: T0 + 60 * MIN, netChaos: null }]
    expect(playRate(points, marks, T0, T0 + 60 * MIN).perHour).toBeNull()
  })

  it('without Client.txt nothing is left out', () => {
    const points = [{ at: T0, netChaos: null }, { at: T0 + 90 * MIN, netChaos: 600 }]
    const r = playRates(points, marks, T0 + 90 * MIN, false)
    expect(r['3h'].perHour).toBeCloseTo(400)
    expect(r.fromLog).toBe(false)
  })
})

describe('maps and hideout time', () => {
  const lines = [
    area(0, 'MapWorldsStrand'),
    area(10, 'HideoutFoo'),
    // Back through the portal: the same map.
    area(12, 'MapWorldsStrand'),
    area(20, 'HideoutFoo'),
    line(25, 'Generating level 83 area "MapWorldsFortress" with seed 9'),
    area(45, 'HideoutFoo')
  ]
  const m = feedMarks(emptyMarks(), lines)
  const points = [{ at: T0, netChaos: null }, { at: T0 + 45 * MIN, netChaos: 450 }]

  it('counts a map once, however often you go back in', () => {
    expect(m.maps).toHaveLength(2)
    const r = playRate(points, m.marks, T0, T0 + 45 * MIN, false, m.maps)
    expect(r.maps).toBe(2)
    expect(r.mapMs).toBe(38 * MIN)
    expect(r.hubMs).toBe(7 * MIN)
  })

  it('a map already running when the window starts counts once', () => {
    // Window from minute 5: Strand (opened at 0) is still running, then Fortress.
    const r = playRate(points, m.marks, T0 + 5 * MIN, T0 + 45 * MIN, false, m.maps)
    expect(r.maps).toBe(2)
    expect(r.mapMs).toBe(33 * MIN)
  })

  it('maps in a stretch with nothing to compare are left out with its time', () => {
    const pts = [{ at: T0, netChaos: null }, { at: T0 + 20 * MIN, netChaos: null }, { at: T0 + 45 * MIN, netChaos: 300 }]
    const r = playRate(pts, m.marks, T0, T0 + 45 * MIN, false, m.maps)
    expect(r.maps).toBe(1)
    expect(r.mapMs).toBe(20 * MIN)
  })

  it('hideout time counts as play with the box unticked', () => {
    expect(playRate(points, m.marks, T0, T0 + 45 * MIN, false, m.maps).playMs).toBe(38 * MIN)
    const r = playRate(points, m.marks, T0, T0 + 45 * MIN, true, m.maps)
    expect(r.playMs).toBe(45 * MIN)
    expect(r.perHour).toBeCloseTo(600)
    expect(rateTip('1h', r, true, c => `+${c}c`, true)).toBe('Last hour: +450c in 45m of play')
  })
})

describe('hover text', () => {
  it('names the unit, the play time and what was left out', () => {
    const r = { perHour: 600, chaos: 300, playMs: 30 * MIN, mapMs: 30 * MIN, otherMs: 0, hubMs: 15 * MIN, offMs: 0, maps: 4 }
    const amount = (c: number) => `+${(c / 200).toFixed(1)} d`
    expect(rateTip('1h', r, true, amount)).toBe('Last hour: +1.5 d in 30m of play. Left out: 15m in hideout and town')
    expect(rateTip('2h', { ...r, perHour: null }, false, amount)).toBe('Last 2 hours: under 10 min of play. Client.txt not found: hideout time not left out')
  })
})

describe('Ctrl+Space per hour card', () => {
  const points = [{ at: T0, netChaos: null }, { at: T0 + 90 * MIN, netChaos: 600 }]
  const marks = feedMarks(emptyMarks(), [area(0, 'MapWorldsStrand'), area(30, 'HideoutFoo'), area(60, 'MapWorldsStrand')]).marks
  const glance: Glance = { league: 'L', at: T0 + 90 * MIN, chaos: 1000, netChaos: 600, divine: 200, rates: glanceRates(playRates(points, marks, T0 + 90 * MIN, true)) }
  const ctx = { price: () => null, items: [], tools: new Set<string>(), divine: 200, now: T0 + 95 * MIN, league: null } as LookupContext

  it('answers "per hour" and "profit", not a bare start', () => {
    const look = netWorthLookup(glance)
    const [card] = look('per hour', ctx)
    expect(card.name).toBe('Profit per hour, last hour: +3.0 div/h')
    expect(look('profit', ctx)).toHaveLength(1)
    expect(look('pro', ctx)).toEqual([])
    expect(netWorthLookup(null)('per hour', ctx)).toEqual([])
  })
})
