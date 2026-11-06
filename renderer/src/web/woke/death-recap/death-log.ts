// What a death recap can know, worked out from Client.txt lines and map checks.
// Pure apart from the shared log parser, so it can be tested on real lines.
//
// The game logs "<name> has been slain." and nothing else about a death: no
// killer, no damage, no map mods. Mods only exist if the map was checked with
// the item copy hotkeys before it was opened, so they're matched to the map by
// name and level, and a match says how sure it is.
import { isMapArea, isMapSideArea } from '../farming/farming'
import { parseLogLine, speakerOf } from '../campaign/log-parse'
import { lineTime } from '../campaign/log-tail'

export interface ModLine {
  matcher: string
  roll?: number
}

// A map whose mods were read from its item text.
export interface MapCheck {
  at: number
  name: string
  tier?: number
  mods: ModLine[]
  // Lines the stat data couldn't read.
  unknown: string[]
  // Where the mouse was. The same spot again means this map, rerolled.
  position?: { x: number, y: number }
}

export type ModMatch = 'exact' | 'likely'

// One map instance entered with a check matched to it. Runs without one aren't
// saved: they have nothing to say about mods.
export interface RunRecord {
  // "areaId:seed". A portal back into the map logs the same seed.
  key: string
  name: string
  level: number
  at: number
  tier?: number
  mods?: ModLine[]
  unknown?: string[]
  match?: ModMatch
  // How many checks could have been this map.
  candidates?: number
  checkedAt?: number
}

export interface DeathRecord {
  id: string
  at: number
  character: string
  areaId: string
  // This instance, for counting deaths in it.
  key: string
  // The map this happened in, side areas included. Null outside maps.
  runKey: string | null
  name: string
  level: number
  // Which death this was in the instance.
  nth: number
  // Time since entering, this visit.
  sinceEnterMs: number
  // Already been in this instance: the time above is since coming back.
  returned: boolean
  // The last NPC to speak. A clue, not the killer.
  voice: { name: string, msBefore: number } | null
}

// Older checks are too likely to be some other map of the same name.
const CHECK_MAX_AGE_MS = 12 * 60 * 60 * 1000
// Past this a single candidate still might not be the map you opened.
const EXACT_MAX_AGE_MS = 30 * 60 * 1000
const VOICE_WINDOW_MS = 60 * 1000

const DEATH_RE = /\] : (\S+) has been slain\.\s*$/
// Speakers are capitalised names on INFO lines. DEBUG and CRIT lines hold plenty
// of "Word: value" too ("ALTERNATE TREE JEWEL: ...", "[...] Bone: ...").
const VOICE_LINE_RE = /\[INFO Client \d+\] (?!Successfully )[A-Z][\w ,'-]{1,40}: /

export function slainName (line: string): string | null {
  return DEATH_RE.exec(line)?.[1] ?? null
}

// "Blighted Beach Map" and "Beach" name the same area.
export function areaName (name: string): string {
  return name.replace(/^(Blighted|Blight-ravaged) /, '').replace(/ Map$/, '').trim().toLowerCase()
}

// T15 and below: level is tier + 67. T16 and up vary (83 to 85 in real logs).
export function levelFits (tier: number | undefined, level: number): boolean {
  if (tier == null) return true
  return tier >= 16 ? level >= 83 : level === tier + 67
}

export interface CheckMatch {
  check: MapCheck
  match: ModMatch
  candidates: number
}

export function matchCheck (checks: MapCheck[], map: { name: string, level: number, at: number }): CheckMatch | null {
  const name = areaName(map.name)
  const fits = checks.filter(c =>
    c.at <= map.at + 1000 &&
    map.at - c.at <= CHECK_MAX_AGE_MS &&
    areaName(c.name) === name &&
    levelFits(c.tier, map.level))
  if (!fits.length) return null
  const check = fits.reduce((a, b) => b.at >= a.at ? b : a)
  const exact = fits.length === 1 && map.at - check.at <= EXACT_MAX_AGE_MS
  return { check, match: exact ? 'exact' : 'likely', candidates: fits.length }
}

export function runFromCheck (key: string, map: { name: string, level: number, at: number }, m: CheckMatch): RunRecord {
  return {
    key,
    name: map.name,
    level: map.level,
    at: map.at,
    tier: m.check.tier,
    mods: m.check.mods,
    unknown: m.check.unknown,
    match: m.match,
    candidates: m.candidates,
    checkedAt: m.check.at
  }
}

export interface LogEvents {
  // A map opened (not returned to), with this line's time.
  onMap: (map: { key: string, name: string, level: number, at: number }) => void
  onDeath: (death: Omit<DeathRecord, 'nth'>) => void
}

// Reached from inside a map, on top of the areas farming counts: they stay that
// map's run. Only keeps a run that's going, so one entered from a hideout has none.
function staysInRun (areaId: string): boolean {
  return isMapSideArea(areaId) || /^(MapAtlasEncounter|ChayulaLeagueTower)/i.test(areaId)
}

// Which deaths count together for "2nd death in this map".
export function deathGroup (d: Pick<DeathRecord, 'key' | 'runKey' | 'character'>): string {
  return `${d.runKey ?? d.key}|${d.character}`
}

// Follows Client.txt in order. Replaying lines is safe: the store drops a death
// it has already saved.
export class DeathTracker {
  private areaId = ''
  private level = 0
  private key = ''
  private name = ''
  private enteredAt = 0
  private returned = false
  private runKey: string | null = null
  private voices: Array<{ name: string, at: number }> = []
  private readonly visited = new Set<string>()

  constructor (private readonly events: LogEvents) {}

  feed (line: string, fallbackAt: number) {
    const at = lineTime(line) ?? fallbackAt
    const ev = parseLogLine(line)
    if (ev?.kind === 'area') {
      this.areaId = ev.areaId
      this.level = ev.areaLevel
      this.key = `${ev.areaId}:${ev.seed ?? ''}`
      this.name = ''
      this.enteredAt = at
      this.voices = []
      this.returned = this.visited.has(this.key)
      this.visited.add(this.key)
      if (staysInRun(ev.areaId)) {
        // Keeps the run.
      } else {
        this.runKey = isMapArea(ev.areaId) ? this.key : null
      }
      return
    }
    if (ev?.kind === 'zone') {
      this.name = ev.name
      if (isMapArea(this.areaId) && !staysInRun(this.areaId) && !this.returned) {
        this.events.onMap({ key: this.key, name: ev.name, level: this.level, at })
      }
      return
    }
    if (ev) return
    const slain = slainName(line)
    if (slain) {
      if (!this.areaId) return
      // Your own skills speak too, under your name.
      const heard = this.voices.findLast(v => v.name !== slain && at - v.at <= VOICE_WINDOW_MS)
      this.events.onDeath({
        id: `${at}:${slain}`,
        at,
        character: slain,
        areaId: this.areaId,
        key: this.key,
        runKey: this.runKey,
        name: this.name || this.areaId,
        level: this.level,
        sinceEnterMs: Math.max(0, at - this.enteredAt),
        returned: this.returned,
        voice: heard ? { name: heard.name, msBefore: at - heard.at } : null
      })
      return
    }
    const speaker = VOICE_LINE_RE.test(line) ? speakerOf(line) : null
    if (speaker) this.voices = [...this.voices.slice(-5), { name: speaker, at }]
  }
}

export interface ModDeaths {
  matcher: string
  deaths: number
  maps: number
  rate: number
}

export interface ModDeathStats {
  rows: ModDeaths[]
  maps: number
  deaths: number
  // Deaths per checked map, over all of them.
  usual: number
}

const MIN_DEATHS = 2

// Mods that come with more deaths than your usual checked map.
export function modDeathStats (runs: RunRecord[], deaths: DeathRecord[]): ModDeathStats {
  const withMods = runs.filter(r => r.mods)
  const byRun = new Map<string, number>()
  for (const d of deaths) {
    if (d.runKey) byRun.set(d.runKey, (byRun.get(d.runKey) ?? 0) + 1)
  }
  const mods = new Map<string, { deaths: number, maps: number }>()
  let total = 0
  for (const run of withMods) {
    const died = byRun.get(run.key) ?? 0
    total += died
    // A mod twice on one map still counts one map.
    for (const matcher of new Set(run.mods!.map(m => m.matcher))) {
      const m = mods.get(matcher) ?? { deaths: 0, maps: 0 }
      m.deaths += died
      m.maps += 1
      mods.set(matcher, m)
    }
  }
  const usual = withMods.length ? total / withMods.length : 0
  const rows = [...mods]
    .map(([matcher, m]) => ({ matcher, ...m, rate: m.deaths / m.maps }))
    .filter(r => r.deaths >= MIN_DEATHS && r.rate > usual)
    .sort((a, b) => b.rate - a.rate || b.deaths - a.deaths)
  return { rows, maps: withMods.length, deaths: total, usual }
}

export function ordinal (n: number): string {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

// "5s", "1:57", "1h 02m".
export function shortTime (ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}:${String(s % 60).padStart(2, '0')}`
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}

export function whenText (at: number, now = Date.now()): string {
  const d = new Date(at)
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === new Date(now).toDateString()) return `today ${time}`
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`
}

export function usualText (usual: number): string {
  if (usual <= 0) return ''
  const per = 1 / usual
  return per >= 1.5 ? `1 death in ${Math.round(per)} checked maps` : `${usual.toFixed(1)} deaths per checked map`
}
