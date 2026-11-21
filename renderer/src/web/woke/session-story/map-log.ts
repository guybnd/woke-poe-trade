// Each map you run, read from Client.txt: time inside, deaths, level-ups, the
// league NPCs that spoke, and the character. Pure: no Vue or IO.
//
// The log has no character on a zone line: the character is the last one seen
// levelling (or dying), kept between runs. Kills, XP and loot aren't logged.
import { lineTime } from '../campaign/log-tail'
import { parseLogLine, slainName, speakerOf } from '../campaign/log-parse'
import { isMapArea, mapNameFromArea } from '../farming/farming'
import { staysInRun } from '../death-recap/death-log'
import { isSkippedArea, knownAreaName } from './skip-areas'
import { NIGHT_GAP_MS } from './story'

const OPENING = '***** LOG FILE OPENING *****'

// Maps kept in one day's file (a lot more than a day of play).
export const MAX_MAPS = 1000
// Maps the "faster than usual" figure averages over.
export const USUAL_OF = 10

export interface CharInfo { name: string, className: string, level: number }

export interface MapRecord {
  // `${areaId}:${seed}`: one map instance.
  key: string
  name: string
  areaLevel: number
  enteredAt: number
  // When you last came out of it.
  leftAt: number
  mapMs: number
  deaths: number
  // Mechanics seen in the map: an NPC spoke ("Einhar", "Delirium"…), or you
  // stepped into a Mirage.
  npcs: string[]
  char: string | null
  className: string | null
  // Character level when entering, and levels gained inside.
  charLevel: number | null
  levelsGained: number
  league?: string
}

// Who speaks, and the mechanic it means. Checked against a real Client.txt.
const NPCS: Array<[RegExp, string]> = [
  [/^Einhar\b/, 'Einhar'],
  [/^Alva\b/, 'Alva'],
  [/^Niko\b/, 'Niko'],
  [/^Jun\b/, 'Jun'],
  [/^The Envoy$/, 'Envoy'],
  [/^Strange Voice$/, 'Delirium'],
  [/^Sister Cassia$/, 'Blight'],
  [/^Zana\b/, 'Zana'],
  [/^Oshabi$/, 'Harvest'],
  [/^(Tujen|Rog|Dannig|Gwennen)\b/, 'Expedition']
]

// Stepping into a Mirage reloads the same map instance, and only the
// loading screen tells: "[LOADING SCREEN] (Mirage of Fortress) Duration = …".
// Checked against a real Client.txt.
const MIRAGE_RE = /\[INFO Client \d+\] \[LOADING SCREEN\] \(Mirage of [^)]+\)/
export const MIRAGE = 'Mirage'

export function isMirageLoad (line: string): boolean {
  return MIRAGE_RE.test(line)
}

export function npcOf (speaker: string): string | null {
  for (const [re, label] of NPCS) if (re.test(speaker)) return label
  return null
}

// "T16" for area levels 68-83, else the level.
export function tierText (areaLevel: number): string {
  return areaLevel >= 68 && areaLevel <= 83 ? `T${areaLevel - 67}` : `Level ${areaLevel}`
}

export interface MapLogEvents {
  // Out of a map into the hideout or town (again, after a portal back in).
  onLeave: (rec: MapRecord) => void
  // The map is over: another map started, or the night ended.
  onDone: (rec: MapRecord) => void
  // Into a map (a new one, or back through a portal).
  onEnter?: () => void
}

export class MapLog {
  current: MapRecord | null = null
  char: CharInfo | null = null
  // Time of the last line read.
  lastAt = 0
  private inMap = false
  private since = 0
  // The next "You have entered" names the map just generated.
  private naming = false

  constructor (private readonly events: MapLogEvents) {}

  // Inside a counted map right now (not a vault on the skip list), and since when
  // (this time through the portal). Read by the glance bar.
  get inCountedMap (): boolean { return this.inMap && !!this.current && !this.skipped }
  get enteredThisTime (): number { return this.since }

  feed (line: string, fallbackAt: number): void {
    const at = lineTime(line) ?? fallbackAt
    // The game was closed, or nothing was written for a long time: the map
    // ended with the last line, not whenever the next one comes.
    if (line.includes(OPENING) || (this.lastAt && at - this.lastAt >= NIGHT_GAP_MS)) this.finish(this.lastAt || at)
    this.lastAt = Math.max(this.lastAt, at)
    if (line.includes(OPENING)) return
    const ev = parseLogLine(line)
    if (ev?.kind === 'area') {
      this.naming = false
      const side = staysInRun(ev.areaId) && this.inMap
      if (side) return
      if (isMapArea(ev.areaId)) {
        // A vault on the skip list is still saved (Map history can show it),
        // but gets no toast and fires no map entry: see `skipped`.
        const known = knownAreaName(ev.areaId)
        const key = `${ev.areaId}:${ev.seed ?? ''}`
        if (this.current?.key !== key) {
          this.finish(at)
          this.current = {
            key,
            name: known ?? mapNameFromArea(ev.areaId),
            areaLevel: ev.areaLevel,
            enteredAt: at,
            leftAt: at,
            mapMs: 0,
            deaths: 0,
            npcs: [],
            char: this.char?.name ?? null,
            className: this.char?.className ?? null,
            charLevel: this.char?.level ?? null,
            levelsGained: 0
          }
          this.naming = true
        }
        // Back from a side area: still the same stretch inside.
        if (!this.inMap) {
          this.inMap = true
          if (!this.skipped) this.events.onEnter?.()
          this.since = at
        }
        return
      }
      this.leave(at)
      return
    }
    if (ev?.kind === 'zone') {
      // "You have entered Strand." names the map just generated.
      if (this.naming && this.inMap && this.current) {
        this.current.name = ev.name
      }
      this.naming = false
      return
    }
    if (ev?.kind === 'level') {
      const cur = this.current
      // Party members' level-ups are logged too: inside a map run on a known
      // character, another name is someone else's. Anywhere else it's yours
      // (you switched characters).
      if (this.inMap && cur?.char && cur.char !== ev.charName) return
      this.char = { name: ev.charName, className: ev.className, level: ev.level }
      if (this.inMap && cur) {
        if (cur.char == null) {
          cur.char = ev.charName
          cur.className = ev.className
          cur.charLevel = ev.level - 1
        }
        if (cur.char === ev.charName) cur.levelsGained++
      }
      return
    }
    if (ev) return
    const slain = slainName(line)
    if (slain) {
      const cur = this.current
      if (this.inMap && cur && (cur.char == null || cur.char === slain)) cur.deaths++
      return
    }
    const speaker = speakerOf(line)
    const npc = speaker && /\[INFO Client \d+\]/.test(line) ? npcOf(speaker) : isMirageLoad(line) ? MIRAGE : null
    if (npc && this.inMap && this.current && !this.current.npcs.includes(npc)) this.current.npcs.push(npc)
  }

  // The current record is an area on the skip list (a vault): kept, never toasted.
  private get skipped (): boolean {
    return !!this.current && isSkippedArea(this.current.name)
  }

  private leave (at: number): void {
    if (!this.inMap || !this.current) return
    this.current.mapMs += Math.max(0, at - this.since)
    this.current.leftAt = at
    this.inMap = false
    if (!this.skipped) this.events.onLeave(this.current)
  }

  // Ends the current map (the night is over, or another map started).
  finish (at: number): void {
    if (this.inMap && this.current) {
      this.current.mapMs += Math.max(0, at - this.since)
      this.current.leftAt = at
      this.inMap = false
    }
    const done = this.current
    this.current = null
    if (done) this.events.onDone(done)
  }
}

// Mean time of the last few finished maps before this one, or null with too few.
export function usualMapMs (history: readonly MapRecord[], n = USUAL_OF): number | null {
  const recent = history.filter(m => m.mapMs > 30_000 && !isSkippedArea(m.name)).slice(0, n)
  if (recent.length < 3) return null
  return recent.reduce((s, m) => s + m.mapMs, 0) / recent.length
}

// Newest first, one copy per map instance: going back into a map saved
// already (after a long break) adds to it.
export function keepMap (history: MapRecord[], rec: MapRecord): MapRecord[] {
  const old = history.find(m => m.key === rec.key)
  const merged = !old || old.enteredAt === rec.enteredAt
    ? rec
    : {
        ...old,
        leftAt: Math.max(old.leftAt, rec.leftAt),
        mapMs: old.mapMs + rec.mapMs,
        deaths: old.deaths + rec.deaths,
        npcs: [...new Set([...old.npcs, ...rec.npcs])],
        levelsGained: old.levelsGained + rec.levelsGained
      }
  return [merged, ...history.filter(m => m.key !== rec.key)]
    .sort((a, b) => b.enteredAt - a.enteredAt)
    .slice(0, MAX_MAPS)
}

export function isMapRecord (v: unknown): v is MapRecord {
  const m = v as MapRecord
  return !!m && typeof m.key === 'string' && typeof m.enteredAt === 'number' && typeof m.mapMs === 'number' && Array.isArray(m.npcs)
}
