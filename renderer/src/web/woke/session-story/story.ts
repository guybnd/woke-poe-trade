// A night of play read from Client.txt: the maps, the time out of maps, and
// the deaths, from the first zone change until the log goes quiet. Pure: no Vue or IO.
//
// The game logs no logout line (checked in a real Client.txt), so a night
// ends when nothing is written for NIGHT_GAP_MS, or when the game starts a new
// log section (it was closed and opened again). AFK time, as Net worth reads
// it, doesn't count: chat while AFK doesn't keep a night going, 15 minutes AFK
// ends it, and a shorter AFK is left out of the night's time.
import { lineTime } from '../campaign/log-tail'
import { isTownLike, parseLogLine, slainName } from '../campaign/log-parse'
import { isMapArea, mapNameFromArea } from '../farming/farming'
import { staysInRun } from '../death-recap/death-log'
import { isSkippedArea, knownAreaName } from './skip-areas'

export const NIGHT_GAP_MS = 15 * 60_000
const OPENING = '***** LOG FILE OPENING *****'
const AFK_ON = /\] : AFK mode is now ON/
const AFK_OFF = /\] : AFK mode is now OFF/
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
  // Hideout or town.
  hub?: boolean
}

export interface NightDraft {
  startedAt: number
  // Time of the last line written.
  lastAt: number
  segs: Seg[]
  deaths: Array<{ at: number, key: string }>
  levels?: Array<{ char: string, level: number }>
  // AFK since then (lastAt stays there), and the AFK stretches that ended.
  afkAt?: number
  afk?: Array<[number, number]>
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
  // An area on the skip list (a vault): drawn faint, never a map; its time
  // counts as time out of maps, with the hideout's.
  skipped?: boolean
  // AFK: counts as neither.
  afk?: boolean
}

export interface NightStory {
  id: string
  startedAt: number
  endedAt: number
  maps: StoryMap[]
  strip: StripPart[]
  mapMs: number
  // Hideout, town and anything else that isn't a map, AFK left out.
  otherMs: number
  // Of that, hideout and town.
  hubMs?: number
  // AFK inside the night (shorter than NIGHT_GAP_MS each).
  afkMs?: number
  // When each death happened (ms).
  deathsAt: number[]
  // From the stash reader, when it read during the night.
  profitChaos: number | null
  divine: number | null
  // `item`: the item's own name (`name` has the count: "3 × Divine Orb").
  best: { name: string, chaos: number, item?: string } | null
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
  // The last line before the game closed, while nothing has come since.
  private openedAt: number | null = null

  // `charOf`: your character's name (map-log.ts follows it), so a party
  // member's death isn't yours.
  constructor (private readonly onFinished: (draft: NightDraft) => void, private readonly charOf?: () => string | null) {}

  feed (line: string, fallbackAt: number): void {
    const at = lineTime(line) ?? fallbackAt
    if (line.includes(OPENING)) {
      // The game closed (a crash, a restart): the night ends there only if
      // nothing comes for NIGHT_GAP_MS. Back sooner, it goes on, and the time
      // closed is a stretch outside any map.
      const d = this.draft
      if (d) {
        this.openedAt = d.lastAt
        // Not a hub either: hideout time is time you were there.
        d.segs.push({ at: d.lastAt, map: false, key: '', name: '', named: true, level: 0 })
      }
      return
    }
    if (this.draft && at - this.draft.lastAt >= NIGHT_GAP_MS) this.finish()
    this.openedAt = null
    const d = this.draft
    if (d && AFK_ON.test(line)) {
      if (d.afkAt == null) {
        d.afkAt = at
        d.lastAt = Math.max(d.lastAt, at)
      }
      return
    }
    const ev = parseLogLine(line)
    // AFK ends with its OFF line or a zone change; other lines (chat) don't
    // keep the night going meanwhile.
    let away = false
    if (d?.afkAt != null) {
      if (AFK_OFF.test(line) || ev?.kind === 'area') {
        if (at > d.afkAt) (d.afk ??= []).push([d.afkAt, at])
        d.afkAt = undefined
      } else away = true
    }
    if (ev?.kind === 'area') {
      this.draft ??= { startedAt: at, lastAt: at, segs: [], deaths: [] }
      const prev = this.draft.segs[this.draft.segs.length - 1]
      // Side areas, encounters and towers inside a map stay part of it.
      const side = staysInRun(ev.areaId) && !!prev?.map
      const map = isMapArea(ev.areaId) || side
      const key = side ? prev.key : `${ev.areaId}:${ev.seed ?? ''}`
      const known = map && !side ? knownAreaName(ev.areaId) : null
      this.draft.segs.push({ at, map, key, name: map && !side ? known ?? mapNameFromArea(ev.areaId) : '', named: side || !!known, level: ev.areaLevel, ...(isTownLike(ev.areaId) ? { hub: true } : {}) })
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
      const slain = slainName(line)
      const me = this.charOf?.() ?? null
      if (seg && slain && (me == null || slain === me)) this.draft.deaths.push({ at, key: seg.key })
    }
    if (this.draft && !away) this.draft.lastAt = Math.max(this.draft.lastAt, at)
  }

  // Ends a night that has been quiet long enough. Call on a timer.
  tick (now: number): void {
    if (this.draft && now - this.draft.lastAt >= NIGHT_GAP_MS) this.finish()
  }

  finish (): void {
    const d = this.draft
    this.draft = null
    if (d && this.openedAt != null && this.openedAt >= d.lastAt) d.endedByOpening = true
    this.openedAt = null
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
  let hubMs = 0
  let afkMs = 0
  let lastMap: number | null = null
  const skip = skippedKeys(d)
  const afk = [...(d.afk ?? []), ...(d.afkAt != null && endedAt > d.afkAt ? [[d.afkAt, endedAt] as [number, number]] : [])]
  // Draws a stretch, with any AFK inside it where it happened (counted as neither).
  const draw = (from: number, to: number, map: number | null, skipped: boolean) => {
    const add = (ms: number, isAfk: boolean) => {
      if (ms <= 0) return
      const prev = strip[strip.length - 1]
      if (prev && !!prev.afk === isAfk && (isAfk || (!!prev.skipped === skipped && prev.map === map))) prev.ms += ms
      else strip.push(isAfk ? { ms, map: null, afk: true } : skipped ? { ms, map: null, skipped: true } : { ms, map })
    }
    let t = from
    for (const [a, b] of afk) {
      const x = Math.max(a, t)
      const y = Math.min(b, to)
      if (y <= x) continue
      add(x - t, false)
      add(y - x, true)
      t = y
    }
    add(to - t, false)
  }
  d.segs.forEach((s, i) => {
    const end = i + 1 < d.segs.length ? d.segs[i + 1].at : endedAt
    const away = afk.reduce((n, [a, b]) => n + Math.max(0, Math.min(b, end) - Math.max(a, s.at)), 0)
    const ms = Math.max(0, end - s.at - away)
    if (s.hub) hubMs += ms
    afkMs += away
    // A vault isn't a map: its time counts with the hideout's (time out of
    // maps), drawn as its own faint part.
    if (s.map && skip.has(s.key)) {
      otherMs += ms
      if (lastMap != null) maps[lastMap].otherMs += ms
      draw(s.at, end, null, true)
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
    draw(s.at, end, part, false)
  })
  // Only gaps with a map on both sides: not the time before the first or after
  // the last. Hideout and vault stretches next to each other are one break;
  // AFK isn't part of one.
  let longestBreakMs = 0
  let gap = 0
  let afterMap = false
  for (const p of strip) {
    if (p.map != null) {
      if (afterMap) longestBreakMs = Math.max(longestBreakMs, gap)
      gap = 0
      afterMap = true
    } else if (!p.afk) gap += p.ms
  }
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
    hubMs,
    afkMs,
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

// The best drop's item name (nights saved before `item` keep it in `name`).
export function bestItem (b: { name: string, item?: string }): string {
  return b.item ?? b.name.replace(/^\d+ × /, '')
}

// The biggest single gain in stash changes between two times.
export function bestDrop (diffs: Array<{ at: number, added: Array<{ name: string, count: number, chaos: number, tip?: string }> }>, from: number, to: number): { name: string, chaos: number, item: string } | null {
  let best: { name: string, chaos: number, item: string } | null = null
  for (const diff of diffs) {
    if (diff.at < from || diff.at > to) continue
    for (const line of diff.added) {
      if (!(line.chaos > 0)) continue
      if (!best || line.chaos > best.chaos) best = { name: line.count > 1 ? `${line.count} × ${line.name}` : line.name, chaos: line.chaos, item: line.tip ?? line.name }
    }
  }
  return best
}
