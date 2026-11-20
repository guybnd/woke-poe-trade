// Profit per hour of play: stash gains over the last 1, 2 and 3 hours (and
// today) divided by the time spent out of hideouts and towns. Where you were
// comes from Client.txt zone lines. Pure: no Vue, no requests.
import { isTownLike, parseLogLine } from '../campaign/log-parse'
import { lineTime } from '../campaign/log-tail'

// play: in a map or other area; hub: hideout, town and the like; off: the
// game closed (between a log's last line and its next start) or AFK.
export type PlayState = 'play' | 'hub' | 'off'

export interface PlayMarks {
  // From each mark's time until the next one, you were in that state.
  marks: Array<{ at: number, s: PlayState }>
  // The newest line read, and the lines read at that second (a later read
  // starts at that second again, so they aren't counted twice).
  lastAt: number | null
  lastLines: string[]
  // Where you are apart from AFK, to go back to when it ends.
  here: PlayState
}

// `offFrom`: a fresh read of Client.txt from that time. Until its first zone
// line the game wasn't running (or you sat in one place since before it).
export const emptyMarks = (offFrom?: number): PlayMarks => offFrom == null
  ? { marks: [], lastAt: null, lastLines: [], here: 'play' }
  : { marks: [{ at: offFrom, s: 'off' }], lastAt: null, lastLines: [], here: 'off' }

const OPENING = '***** LOG FILE OPENING *****'
const AFK_ON = /\] : AFK mode is now ON/
const AFK_OFF = /\] : AFK mode is now OFF/

function push (marks: PlayMarks['marks'], at: number, s: PlayState) {
  const last = marks[marks.length - 1]
  if (last && last.s === s) return
  if (last && last.at === at) marks[marks.length - 1] = { at, s }
  else marks.push({ at, s })
}

// Adds lines from 'game-log-range' (with sessions), oldest first.
export function feedMarks (m: PlayMarks, lines: readonly string[]): PlayMarks {
  const marks = [...m.marks]
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
        here = isTownLike(ev.areaId) ? 'hub' : 'play'
        push(marks, at, here)
      }
    }
    if (at !== lastAt) { lastAt = at; lastLines = [line] } else lastLines = [...lastLines, line]
  }
  return { marks, lastAt, lastLines, here }
}

// Drops marks before `from`, keeping the one in force at `from`.
export function trimMarks (m: PlayMarks, from: number): PlayMarks {
  let i = 0
  while (i + 1 < m.marks.length && m.marks[i + 1].at <= from) i++
  return i ? { ...m, marks: m.marks.slice(i) } : m
}

// Time in each state between two times. Before the first mark is unknown and
// left out; with no marks at all (no Client.txt) it all counts as play.
export function timeIn (marks: PlayMarks['marks'], from: number, to: number): Record<PlayState, number> {
  const out: Record<PlayState, number> = { play: 0, hub: 0, off: 0 }
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
  playMs: number
  // Time left out: hideout and town, and the game closed or AFK.
  hubMs: number
  offMs: number
}

// Needs this much play in the window before giving a rate.
export const MIN_PLAY_MS = 10 * 60_000

// Gains from reads in [from, to] over play time. A read's gain happened
// between it and the read before; one that started before `from` counts the
// share of its play that falls inside the window.
export function playRate (points: readonly ReadPoint[], marks: PlayMarks['marks'], from: number, to: number): PlayRate {
  let chaos = 0
  const total: Record<PlayState, number> = { play: 0, hub: 0, off: 0 }
  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    if (p.at < from || p.at > to || p.netChaos == null) continue
    const start = points[i - 1].at
    const inside = timeIn(marks, Math.max(start, from), p.at)
    let share = 1
    if (start < from) {
      const whole = timeIn(marks, start, p.at).play
      share = whole > 0 ? inside.play / whole : (p.at - from) / (p.at - start)
    }
    chaos += p.netChaos * share
    total.play += inside.play
    total.hub += inside.hub
    total.off += inside.off
  }
  return {
    perHour: total.play >= MIN_PLAY_MS ? chaos / (total.play / 3_600_000) : null,
    chaos,
    playMs: total.play,
    hubMs: total.hub,
    offMs: total.off
  }
}

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
}

const WINDOW_NAME: Record<string, string> = { '1h': 'Last hour', '2h': 'Last 2 hours', '3h': 'Last 3 hours', 'today': 'Today' }
const span = (ms: number) => {
  const m = Math.round(ms / 60_000)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}

// A window's hover text, the same in the window and the dock card.
// `amount`: a chaos sum as shown, unit included ("+0.8 d").
export function rateTip (id: string, r: PlayRate, fromLog: boolean, amount: (chaos: number) => string): string {
  const head = r.perHour == null
    ? `${WINDOW_NAME[id]}: under 10 min of play`
    : `${WINDOW_NAME[id]}: ${amount(r.chaos)} in ${span(r.playMs)} of play`
  if (!fromLog) return `${head}. Client.txt not found: hideout time not left out`
  const out = [r.hubMs >= 60_000 ? `${span(r.hubMs)} in hideout and town` : '', r.offMs >= 60_000 ? `${span(r.offMs)} closed or AFK` : ''].filter(Boolean)
  return out.length ? `${head}. Left out: ${out.join(', ')}` : head
}

export function startOfDay (at: number): number {
  const d = new Date(at)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function playRates (points: readonly ReadPoint[], marks: PlayMarks['marks'], now: number, fromLog: boolean): PlayRates {
  const m = fromLog ? marks : []
  return {
    'at': now,
    '1h': playRate(points, m, now - RATE_WINDOWS[0].ms, now),
    '2h': playRate(points, m, now - RATE_WINDOWS[1].ms, now),
    '3h': playRate(points, m, now - RATE_WINDOWS[2].ms, now),
    'today': playRate(points, m, startOfDay(now), now),
    'fromLog': fromLog
  }
}
