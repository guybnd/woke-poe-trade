// Profit per hour of play: stash gains over the last 1, 2 and 3 hours (and
// today) divided by the time spent out of hideouts and towns. Where you were
// comes from Client.txt zone lines. Pure: no Vue, no requests.
import { isTownLike, parseLogLine } from '../campaign/log-parse'
import { lineTime } from '../campaign/log-tail'
import { isFarmedMap, isMapSideArea } from '../farming/farming'

// map: in a map (its side areas too); play: any other area (campaign, boss
// arenas); hub: hideout, town and the like; off: the game closed (between a
// log's last line and its next start) or AFK.
export type PlayState = 'map' | 'play' | 'hub' | 'off'
const STATES: readonly PlayState[] = ['map', 'play', 'hub', 'off']
const zero = (): Record<PlayState, number> => ({ map: 0, play: 0, hub: 0, off: 0 })

export interface PlayMarks {
  // From each mark's time until the next one, you were in that state.
  marks: Array<{ at: number, s: PlayState }>
  // The newest line read, and the lines read at that second (a later read
  // starts at that second again, so they aren't counted twice).
  lastAt: number | null
  lastLines: string[]
  // Where you are apart from AFK, to go back to when it ends.
  here: PlayState
  // When each new map was opened (a portal back in is the same map), and the
  // last few maps' area and seed, to tell them apart.
  maps: number[]
  recent: string[]
}

// `offFrom`: a fresh read of Client.txt from that time. Until its first zone
// line the game wasn't running (or you sat in one place since before it).
export const emptyMarks = (offFrom?: number): PlayMarks => offFrom == null
  ? { marks: [], lastAt: null, lastLines: [], here: 'play', maps: [], recent: [] }
  : { marks: [{ at: offFrom, s: 'off' }], lastAt: null, lastLines: [], here: 'off', maps: [], recent: [] }

const RECENT_MAPS = 16
const OPENING = '***** LOG FILE OPENING *****'
const AFK_ON = /\] : AFK mode is now ON/
const AFK_OFF = /\] : AFK mode is now OFF/

function push (marks: PlayMarks['marks'], at: number, s: PlayState) {
  const last = marks[marks.length - 1]
  if (last && last.s === s) return
  if (last && last.at === at) marks[marks.length - 1] = { at, s }
  else marks.push({ at, s })
}

export function stateOfArea (areaId: string): PlayState {
  if (isTownLike(areaId)) return 'hub'
  return isFarmedMap(areaId) || isMapSideArea(areaId) ? 'map' : 'play'
}

// Adds lines from 'game-log-range' (with sessions), oldest first.
export function feedMarks (m: PlayMarks, lines: readonly string[]): PlayMarks {
  const marks = [...m.marks]
  const maps = [...m.maps]
  let recent = m.recent
  let lastAt = m.lastAt
  let lastLines = m.lastLines
  let here = m.here
  for (const line of lines) {
    const at = lineTime(line)
    if (at == null) continue
    if (lastAt != null && at < lastAt) continue
    if (lastAt != null && at === lastAt && lastLines.includes(line)) continue
    if (line.includes(OPENING)) {
      // The game was closed from its last line until now.
      if (lastAt != null && lastAt < at) push(marks, lastAt, 'off')
      push(marks, at, 'off')
      here = 'off'
    } else if (AFK_ON.test(line)) {
      push(marks, at, 'off')
    } else if (AFK_OFF.test(line)) {
      push(marks, at, here)
    } else {
      const ev = parseLogLine(line)
      if (ev?.kind === 'area') {
        here = stateOfArea(ev.areaId)
        push(marks, at, here)
        if (isFarmedMap(ev.areaId)) {
          const key = `${ev.areaId}:${ev.seed ?? ''}`
          // Without a seed a map can't be told apart: every entry counts.
          if (!ev.seed || !recent.includes(key)) maps.push(at)
          recent = [...recent.filter(k => k !== key), key].slice(-RECENT_MAPS)
        }
      }
    }
    if (at !== lastAt) { lastAt = at; lastLines = [line] } else lastLines = [...lastLines, line]
  }
  return { marks, lastAt, lastLines, here, maps, recent }
}

// Drops marks before `from`, keeping the one in force at `from`.
export function trimMarks (m: PlayMarks, from: number): PlayMarks {
  let i = 0
  while (i + 1 < m.marks.length && m.marks[i + 1].at <= from) i++
  const maps = m.maps.filter(at => at >= from)
  return i || maps.length !== m.maps.length ? { ...m, marks: m.marks.slice(i), maps } : m
}

function stateAt (marks: PlayMarks['marks'], at: number): PlayState | null {
  let s: PlayState | null = null
  for (const mk of marks) {
    if (mk.at > at) break
    s = mk.s
  }
  return s
}

// Time in each state between two times. Before the first mark is unknown and
// left out; with no marks at all (no Client.txt) it all counts as play.
export function timeIn (marks: PlayMarks['marks'], from: number, to: number): Record<PlayState, number> {
  const out = zero()
  if (to <= from) return out
  let s: PlayState = marks.length ? 'off' : 'play'
  let t = from
  for (const mk of marks) {
    if (mk.at <= from) { s = mk.s; continue }
    if (mk.at >= to) break
    out[s] += mk.at - t
    t = mk.at
    s = mk.s
  }
  out[s] += to - t
  return out
}

// A read of the stash: its time and the net gain since the read before
// (null when there was nothing to compare with, such as other tabs).
export interface ReadPoint { at: number, netChaos: number | null }

export interface PlayRate {
  // Chaos per hour of play, or null with too little play to say.
  perHour: number | null
  chaos: number
  // The time the rate is over: maps and other areas, plus hideout and town
  // when they count.
  playMs: number
  // Each kind of time in the window's reads.
  mapMs: number
  otherMs: number
  hubMs: number
  offMs: number
  // Maps opened in the window.
  maps: number
  // The middle map's time (from opening it to opening the next): short
  // visits such as reward vaults barely move it. Null without a whole map.
  medianMapMs: number | null
}

// Needs this much play in the window before giving a rate.
export const MIN_PLAY_MS = 10 * 60_000

// Gains from reads in [from, to] over play time. A read's gain happened
// between it and the read before; one that started before `from` counts the
// share of its play that falls inside the window. `withHub`: hideout and
// town time counts as play.
export function playRate (
  points: readonly ReadPoint[], marks: PlayMarks['marks'], from: number, to: number,
  withHub = false, mapTimes: readonly number[] = []
): PlayRate {
  const counted = (t: Record<PlayState, number>) => t.map + t.play + (withHub ? t.hub : 0)
  let chaos = 0
  let maps = 0
  const opened: number[] = []
  let last: number | null = null
  const total = zero()
  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    if (p.at < from || p.at > to || p.netChaos == null) continue
    const start = points[i - 1].at
    const inside = timeIn(marks, Math.max(start, from), p.at)
    let share = 1
    if (start < from) {
      const whole = counted(timeIn(marks, start, p.at))
      share = whole > 0 ? counted(inside) / whole : (p.at - from) / (p.at - start)
    }
    chaos += p.netChaos * share
    for (const k of STATES) total[k] += inside[k]
    // Maps opened in the same stretch whose time counts, and one already
    // running when the window starts.
    const a = Math.max(start, from)
    const here = mapTimes.filter(t => (t > a || (t === a && a === from)) && t <= p.at)
    maps += here.length
    opened.push(...here)
    last = p.at
    if (start < from && marks.length && stateAt(marks, a) === 'map') maps++
  }
  const playMs = counted(total)
  // Each map's time runs until the next map opens. The newest counts only
  // once you've left it by the last read (a map still running isn't whole).
  const end = last
  const durations = end == null ? [] : opened.flatMap(t => {
    const next = mapTimes.find(x => x > t)
    if (next != null && next <= end) return [timeIn(marks, t, next).map]
    return stateAt(marks, end) === 'map' ? [] : [timeIn(marks, t, end).map]
  }).filter(ms => ms > 0).sort((x, y) => x - y)
  const mid = durations.length >> 1
  const medianMapMs = !durations.length ? null : durations.length % 2 ? durations[mid] : (durations[mid - 1] + durations[mid]) / 2
  return {
    perHour: playMs >= MIN_PLAY_MS ? chaos / (playMs / 3_600_000) : null,
    chaos,
    playMs,
    mapMs: total.map,
    otherMs: total.play,
    hubMs: total.hub,
    offMs: total.off,
    maps,
    medianMapMs
  }
}

export type RateWindow = '1h' | '2h' | '3h' | 'today'
export const RATE_WINDOWS = [
  { id: '1h', label: '1h', ms: 3_600_000 },
  { id: '2h', label: '2h', ms: 2 * 3_600_000 },
  { id: '3h', label: '3h', ms: 3 * 3_600_000 }
] as const

export interface PlayRates {
  'at': number
  '1h': PlayRate
  '2h': PlayRate
  '3h': PlayRate
  'today': PlayRate
  // false: Client.txt wasn't readable, so nothing was left out.
  'fromLog': boolean
  // Hideout and town time counted as play (the window's checkbox off).
  'withHub': boolean
}

const WINDOW_NAME: Record<string, string> = { '1h': 'Last hour', '2h': 'Last 2 hours', '3h': 'Last 3 hours', 'today': 'Today' }
// "1m 40s" under ten minutes, else as span.
export const shortSpan = (ms: number) => {
  const s = Math.round(ms / 1000)
  if (s >= 600) return span(ms)
  return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`
}
export const span = (ms: number) => {
  const m = Math.round(ms / 60_000)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}

// A window's hover text, the same in the window and the dock card.
// `amount`: a chaos sum as shown, unit included ("+0.8 d").
export function rateTip (id: string, r: PlayRate, fromLog: boolean, amount: (chaos: number) => string, withHub = false): string {
  const head = r.perHour == null
    ? `${WINDOW_NAME[id]}: under 10 min of play`
    : `${WINDOW_NAME[id]}: ${amount(r.chaos)} in ${span(r.playMs)} of play`
  if (!fromLog) return `${head}. Client.txt not found: hideout time not left out`
  const out = [!withHub && r.hubMs >= 60_000 ? `${span(r.hubMs)} in hideout and town` : '', r.offMs >= 60_000 ? `${span(r.offMs)} closed or AFK` : ''].filter(Boolean)
  return out.length ? `${head}. Left out: ${out.join(', ')}` : head
}

export function startOfDay (at: number): number {
  const d = new Date(at)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function playRates (
  points: readonly ReadPoint[], marks: PlayMarks['marks'], now: number, fromLog: boolean,
  withHub = false, mapTimes: readonly number[] = []
): PlayRates {
  const m = fromLog ? marks : []
  const rate = (from: number) => playRate(points, m, from, now, withHub, fromLog ? mapTimes : [])
  return {
    'at': now,
    '1h': rate(now - RATE_WINDOWS[0].ms),
    '2h': rate(now - RATE_WINDOWS[1].ms),
    '3h': rate(now - RATE_WINDOWS[2].ms),
    'today': rate(startOfDay(now)),
    'fromLog': fromLog,
    'withHub': withHub
  }
}
