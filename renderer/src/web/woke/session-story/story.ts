// A night of play read from Client.txt: the maps, the time out of maps, and
// the deaths, from the first zone change until the log goes quiet. Pure: no Vue or IO.
//
// The game logs no logout line (checked in a real Client.txt), so a night
// ends when nothing is written for NIGHT_GAP_MS, or when the game starts a new
// log section (it was closed and opened again).
import { lineTime } from '../campaign/log-tail'
import { parseLogLine, slainName } from '../campaign/log-parse'
import { isMapArea, mapNameFromArea } from '../farming/farming'
import { staysInRun } from '../death-recap/death-log'
import { isSkippedArea, knownAreaName } from './skip-areas'

export const NIGHT_GAP_MS = 15 * 60_000
const OPENING = '***** LOG FILE OPENING *****'
// Nights kept on disk.
export const MAX_NIGHTS = 20

interface Seg {
  at: number
  map: boolean
  // The map instance ("areaId:seed"); side areas keep their map's.
  key: string
  name: string
  named: boolean
  level: number
}

export interface NightDraft {
  startedAt: number
  // Time of the last line written.
  lastAt: number
  segs: Seg[]
  deaths: Array<{ at: number, key: string }>
  levels?: Array<{ char: string, level: number }>
  // The game was closed and opened again: the next night can start right away.
  endedByOpening?: boolean
}

export interface StoryMap {
  name: string
  level: number
  enteredAt: number
  mapMs: number
  // Time out of maps after this one, until the next.
  otherMs: number
  deaths: number
}

// One stretch of the strip: a map (index into maps) or time out of maps.
export interface StripPart {
  ms: number
  map: number | null
  // An area on the skip list (a vault): drawn faint, counted as neither map nor
  // hideout time, so the strip still matches the clock.
  skipped?: boolean
}

export interface NightStory {
  id: string
  startedAt: number
  endedAt: number
  maps: StoryMap[]
  strip: StripPart[]
  mapMs: number
  // Hideout, town and anything else that isn't a map.
  otherMs: number
  // When each death happened (ms).
  deathsAt: number[]
  // From the stash reader, when it read during the night.
  profitChaos: number | null
  divine: number | null
  best: { name: string, chaos: number } | null
  // Characters that levelled: the level before the first level-up, and the last.
  levelUps?: Array<{ char: string, from: number, to: number }>
  // The longest time out of maps between two maps.
  longestBreakMs?: number
  // Stash reads up to here count for this night (the next one starts after).
  stashTo?: number
  endedByOpening?: boolean
}

export class NightTracker {
  draft: NightDraft | null = null

  constructor (private readonly onFinished: (draft: NightDraft) => void) {}

  feed (line: string, fallbackAt: number): void {
    const at = lineTime(line) ?? fallbackAt
    if (line.includes(OPENING)) {
      if (this.draft) this.draft.endedByOpening = true
      this.finish()
      return
    }
    if (this.draft && at - this.draft.lastAt >= NIGHT_GAP_MS) this.finish()
    const ev = parseLogLine(line)
    if (ev?.kind === 'area') {
      this.draft ??= { startedAt: at, lastAt: at, segs: [], deaths: [] }
      const prev = this.draft.segs[this.draft.segs.length - 1]
      // Side areas, encounters and towers inside a map stay part of it.
      const side = staysInRun(ev.areaId) && !!prev?.map
      const map = isMapArea(ev.areaId) || side
      const key = side ? prev.key : `${ev.areaId}:${ev.seed ?? ''}`
      const known = map && !side ? knownAreaName(ev.areaId) : null
      this.draft.segs.push({ at, map, key, name: map && !side ? known ?? mapNameFromArea(ev.areaId) : '', named: side || !!known, level: ev.areaLevel })
    } else if (ev?.kind === 'zone') {
      const seg = this.draft?.segs[this.draft.segs.length - 1]
      // "You have entered Strand." names the map it follows.
      if (seg?.map && !seg.named) {
        seg.name = ev.name
        seg.named = true
      }
    } else if (ev?.kind === 'level' && this.draft) {
      (this.draft.levels ??= []).push({ char: ev.charName, level: ev.level })
    } else if (!ev && this.draft) {
      const seg = this.draft.segs[this.draft.segs.length - 1]
      if (seg && slainName(line)) this.draft.deaths.push({ at, key: seg.key })
    }
    if (this.draft) this.draft.lastAt = Math.max(this.draft.lastAt, at)
  }

  // Ends a night that has been quiet long enough. Call on a timer.
  tick (now: number): void {
    if (this.draft && now - this.draft.lastAt >= NIGHT_GAP_MS) this.finish()
  }

  finish (): void {
    const d = this.draft
    this.draft = null
    if (d && hasMaps(d)) this.onFinished(d)
  }
}

export function hasMaps (d: NightDraft): boolean {
  const skip = skippedKeys(d)
  return d.segs.some(s => s.map && !skip.has(s.key))
}

// Map instances in an area on the skip list (vaults): read at summary time, so
// a list changed in Settings applies to tonight too.
function skippedKeys (d: NightDraft): Set<string> {
  return new Set(d.segs.filter(s => s.map && s.name && isSkippedArea(s.name)).map(s => s.key))
}

// The night as the card shows it. `endedAt`: the last line, or now for a night still going.
export function summarize (d: NightDraft, endedAt = d.lastAt): NightStory {
  const maps: StoryMap[] = []
  const byKey = new Map<string, number>()
  const strip: StripPart[] = []
  let mapMs = 0
  let otherMs = 0
  let lastMap: number | null = null
  const skip = skippedKeys(d)
  d.segs.forEach((s, i) => {
    const end = i + 1 < d.segs.length ? d.segs[i + 1].at : endedAt
    const ms = Math.max(0, end - s.at)
    // A vault counts as neither map nor hideout time: its own faint part.
    if (s.map && skip.has(s.key)) {
      const prev = strip[strip.length - 1]
      if (prev?.skipped) prev.ms += ms
      else strip.push({ ms, map: null, skipped: true })
      return
    }
    let part: number | null = null
    if (s.map) {
      let idx = byKey.get(s.key)
      if (idx == null) {
        idx = maps.length
        byKey.set(s.key, idx)
        maps.push({ name: s.name, level: s.level, enteredAt: s.at, mapMs: 0, otherMs: 0, deaths: 0 })
      } else if (s.named && s.name) {
        maps[idx].name = s.name
      }
      maps[idx].mapMs += ms
      mapMs += ms
      lastMap = idx
      part = idx
    } else {
      otherMs += ms
      if (lastMap != null) maps[lastMap].otherMs += ms
    }
    const prev = strip[strip.length - 1]
    if (prev && !prev.skipped && prev.map === part) prev.ms += ms
    else strip.push({ ms, map: part })
  })
  // Only gaps with a map on both sides: not the time before the first or after the last.
  let longestBreakMs = 0
  strip.forEach((p, i) => {
    if (p.map == null && !p.skipped && i > 0 && i < strip.length - 1) longestBreakMs = Math.max(longestBreakMs, p.ms)
  })
  // Party members' level-ups are logged too: follow the first character
  // that levels, as the run timer does.
  const levelUps: Array<{ char: string, from: number, to: number }> = []
  const mine = d.levels?.[0]?.char
  for (const l of d.levels ?? []) {
    if (l.char !== mine) continue
    if (levelUps[0]) levelUps[0].to = Math.max(levelUps[0].to, l.level)
    else levelUps.push({ char: l.char, from: l.level - 1, to: l.level })
  }
  for (const death of d.deaths) {
    const idx = byKey.get(death.key)
    if (idx != null) maps[idx].deaths++
  }
  return {
    id: String(d.startedAt),
    startedAt: d.startedAt,
    endedAt,
    maps,
    strip: strip.filter(p => p.ms > 0),
    mapMs,
    otherMs,
    // Deaths in a vault aren't the night's map deaths.
    deathsAt: d.deaths.filter(x => !skip.has(x.key)).map(x => x.at),
    profitChaos: null,
    divine: null,
    best: null,
    levelUps,
    longestBreakMs,
    endedByOpening: d.endedByOpening
  }
}

// The newest night first; the same night again replaces the old copy.
export function keepNight (nights: NightStory[], story: NightStory): NightStory[] {
  return [story, ...nights.filter(n => n.id !== story.id)]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, MAX_NIGHTS)
}

export function isNightStory (v: unknown): v is NightStory {
  const n = v as NightStory
  return !!n && typeof n.id === 'string' && typeof n.startedAt === 'number' && Array.isArray(n.maps) && Array.isArray(n.strip)
}

// Profit from Farming sessions of the night (loot minus map costs, as
// Session analytics counts them), or null when there were none. A session
// belongs to the night it started in (or just before), never to two:
// `nextStartedAt` is the next night's start.
export function farmingProfit (night: Pick<NightStory, 'startedAt' | 'endedAt'>, nextStartedAt: number | null, sessions: Array<{ startedAt: number, endedAt: number, profit: number }>): { chaos: number, sessions: number } | null {
  const inside = sessions.filter(s => s.startedAt + NIGHT_GAP_MS >= night.startedAt &&
    s.startedAt <= night.endedAt + NIGHT_GAP_MS &&
    (nextStartedAt == null || s.startedAt + NIGHT_GAP_MS < nextStartedAt))
  if (!inside.length) return null
  return { chaos: inside.reduce((n, s) => n + s.profit, 0), sessions: inside.length }
}

// The biggest single gain in stash changes between two times.
export function bestDrop (diffs: Array<{ at: number, added: Array<{ name: string, count: number, chaos: number }> }>, from: number, to: number): { name: string, chaos: number } | null {
  let best: { name: string, chaos: number } | null = null
  for (const diff of diffs) {
    if (diff.at < from || diff.at > to) continue
    for (const line of diff.added) {
      if (!(line.chaos > 0)) continue
      if (!best || line.chaos > best.chaos) best = { name: line.count > 1 ? `${line.count} × ${line.name}` : line.name, chaos: line.chaos }
    }
  }
  return best
}
