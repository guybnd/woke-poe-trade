// Run timeline: every zone entered, level gained and death during one
// campaign run, from Client.txt. Saved per run in its own small file
// (<userData>/woke-docs/run-timeline/<run id>.json, 10-12 KB for a whole
// campaign), outside config.json, and only read while you look at a run.
// Pure functions here; WidgetRunTimer records and RunReview shows.

import type { CampaignRun } from './run-timer'
import { actFromAreaId, isTownLike, parseLogLine, slainName } from './log-parse'

export const TIMELINE_COLLECTION = 'run-timeline'
// A campaign is about 400 steps (10-12 KB). A run left open into maps keeps
// growing, so stop well past that (about 100 KB).
export const MAX_STEPS = 4000

// One step of the run, at run time `t` (whole seconds, pauses left out, same
// clock as the splits).
//   [t, 'z', zone]  entered zones[zone]
//   [t, 'l', level] the run's character reached level
//   [t, 'd']        the run's character died
export type TimelineEvent = [number, 'z', number] | [number, 'l', number] | [number, 'd']

export interface RunTimeline {
  v: 1
  runId: number
  // [area id, zone name] for each zone entered; the name is '' until the
  // "You have entered" line that follows the area line.
  zones: Array<[string, string]>
  ev: TimelineEvent[]
  // Log time (ms) of the last line recorded, so a replay after a restart
  // doesn't record a line twice.
  lastAt: number
  // Campaign card steps finished, in step order: [run time s, step index,
  // step text]. A step finished again after stepping back keeps the new time.
  steps?: Array<[number, number, string]>
  // Rebuilt from Client.txt after the run: run times are estimated between
  // the act splits, and there are no step times.
  rebuilt?: boolean
}

export function newTimeline (runId: number): RunTimeline {
  return { v: 1, runId, zones: [], ev: [], lastAt: 0 }
}

// A timeline read back from disk, or null if it isn't one.
export function asTimeline (x: unknown, runId: number): RunTimeline | null {
  const t = x as RunTimeline | null
  if (!t || t.v !== 1 || t.runId !== runId || !Array.isArray(t.zones) || !Array.isArray(t.ev)) return null
  return t
}

function zoneIndex (tl: RunTimeline, areaId: string): number {
  // Zones repeat often (towns, backtracking): one entry each, matched by area.
  const i = tl.zones.findIndex(z => z[0] === areaId)
  if (i >= 0) return i
  tl.zones.push([areaId, ''])
  return tl.zones.length - 1
}

function sameAsLast (tl: RunTimeline, e: TimelineEvent): boolean {
  const last = tl.ev[tl.ev.length - 1]
  return last != null && last.length === e.length && last.every((v, i) => v === e[i])
}

export type TimelineInput =
  { kind: 'area', areaId: string } |
  { kind: 'zone', name: string } |
  { kind: 'level', level: number } |
  { kind: 'death' }

// Adds one step at run time `runMs`, from a log line written at `at`.
// Returns true when the timeline changed.
export function recordStep (tl: RunTimeline, input: TimelineInput, runMs: number, at: number): boolean {
  // Already recorded before a restart (the log replays from the last
  // config save, which can be older than the last timeline save).
  if (at < tl.lastAt) return false
  const t = Math.max(0, Math.round(runMs / 1000))
  let e: TimelineEvent | null = null
  if (input.kind === 'area') e = [t, 'z', zoneIndex(tl, input.areaId)]
  else if (input.kind === 'level') e = [t, 'l', input.level]
  else if (input.kind === 'death') e = [t, 'd']
  else {
    // The zone's name follows its area line.
    const last = [...tl.ev].reverse().find(x => x[1] === 'z') as [number, 'z', number] | undefined
    if (!last) return false
    const z = tl.zones[last[2]]
    if (z[1] === input.name) return false
    z[1] = input.name
    tl.lastAt = at
    return true
  }
  if (at === tl.lastAt && sameAsLast(tl, e)) return false
  if (tl.ev.length >= MAX_STEPS) return false
  tl.ev.push(e)
  tl.lastAt = at
  return true
}

const MAX_ROUTE_STEPS = 1000

// Campaign card step `index` was finished at run time `runMs`.
export function recordRouteStep (tl: RunTimeline, index: number, text: string, runMs: number): boolean {
  const t = Math.max(0, Math.round(runMs / 1000))
  const label = text.trim().slice(0, 80)
  const steps = tl.steps ?? (tl.steps = [])
  const i = steps.findIndex(x => x[1] === index)
  if (i >= 0) {
    if (steps[i][0] === t) return false
    steps.splice(i, 1)
  } else if (steps.length >= MAX_ROUTE_STEPS) return false
  steps.push([t, index, label])
  steps.sort((a, b) => a[1] - b[1])
  return true
}

// Stepped back to `index`: it and the steps after it aren't finished any more.
export function dropRouteStepsFrom (tl: RunTimeline, index: number): boolean {
  if (!tl.steps?.some(x => x[1] >= index)) return false
  tl.steps = tl.steps.filter(x => x[1] < index)
  return true
}

// ---- rebuilding a past run from Client.txt ----

// Run time (ms) of each log time: exact at the run's start and at each act
// split (the first entry into the next act), straight lines in between, so
// pauses and breaks spread over the act they were in.
function wallToRun (run: CampaignRun, lines: Array<{ at: number, actEntered: number | null }>): (at: number) => number {
  const anchors: Array<[number, number]> = [[run.startedAt, 0]]
  let i = 0
  for (const s of run.splits) {
    while (i < lines.length && lines[i].actEntered !== s.act + 1) i++
    if (i >= lines.length) break
    const wall = lines[i].at
    if (wall > anchors[anchors.length - 1][0] && s.totalMs >= anchors[anchors.length - 1][1]) anchors.push([wall, s.totalMs])
  }
  const end = runEndSec(run)
  if (run.endedAt != null && end != null && run.endedAt > anchors[anchors.length - 1][0] && end * 1000 >= anchors[anchors.length - 1][1]) {
    anchors.push([run.endedAt, end * 1000])
  }
  return (at: number) => {
    let k = 0
    while (k + 1 < anchors.length && anchors[k + 1][0] <= at) k++
    const [w0, r0] = anchors[k]
    const next = anchors[k + 1]
    if (!next) return r0 + Math.max(0, at - w0)
    return r0 + (at - w0) / (next[0] - w0) * (next[1] - r0)
  }
}

// A past run's timeline from the Client.txt lines written during it.
export function rebuildTimeline (run: CampaignRun, raw: Array<{ line: string, at: number }>): RunTimeline {
  const tl = newTimeline(run.id)
  tl.rebuilt = true
  const until = run.endedAt ?? Infinity
  const lines = raw
    // Log times are whole seconds; a run started live begins a moment after
    // its Twilight Strand line.
    .filter(l => l.at >= run.startedAt - 1000 && l.at <= until)
    .map(l => {
      const ev = parseLogLine(l.line)
      return { ...l, ev, actEntered: ev?.kind === 'area' ? actFromAreaId(ev.areaId) : null }
    })
  const runMs = wallToRun(run, lines)
  let level: number | null = null
  for (const { line, at, ev } of lines) {
    if (ev?.kind === 'area') {
      if (ev.areaId === '1_1_1' && tl.ev.length && level != null) break // a new character
      recordStep(tl, { kind: 'area', areaId: ev.areaId }, runMs(at), at)
      if (actFromAreaId(ev.areaId) === 11) break // the Epilogue ends the run
    } else if (ev?.kind === 'zone') recordStep(tl, { kind: 'zone', name: ev.name }, runMs(at), at)
    else if (ev?.kind === 'level') {
      if (run.charName && ev.charName === run.charName && ev.level !== level) {
        level = ev.level
        recordStep(tl, { kind: 'level', level: ev.level }, runMs(at), at)
      }
    } else if (run.charName && slainName(line) === run.charName) recordStep(tl, { kind: 'death' }, runMs(at), at)
  }
  return tl
}

// ---- review ----

export interface ZoneVisit {
  areaId: string
  name: string
  act: number | null
  town: boolean
  // Run time on entering, and time spent until the next zone (null for the
  // last zone of an unfinished run).
  t: number
  dur: number | null
  // Level on entering, levels gained and deaths in this visit.
  level: number | null
  levelsUp: number
  deaths: number
}

// Zone visits in order. `endSec`: run time the last visit ends at.
export function zoneVisits (tl: RunTimeline, endSec: number | null): ZoneVisit[] {
  const out: ZoneVisit[] = []
  let level: number | null = null
  for (const e of tl.ev) {
    if (e[1] === 'z') {
      const [areaId, name] = tl.zones[e[2]] ?? ['', '']
      const prev = out[out.length - 1]
      if (prev) prev.dur = Math.max(0, e[0] - prev.t)
      out.push({ areaId, name: name || areaId, act: actFromAreaId(areaId), town: isTownLike(areaId), t: e[0], dur: null, level, levelsUp: 0, deaths: 0 })
    } else if (e[1] === 'l') {
      level = e[2]
      const cur = out[out.length - 1]
      if (cur) cur.levelsUp++
    } else {
      const cur = out[out.length - 1]
      if (cur) cur.deaths++
    }
  }
  const last = out[out.length - 1]
  if (last && endSec != null) last.dur = Math.max(0, endSec - last.t)
  return out
}

// Level steps [run time s, level], for the chart.
export function levelSteps (tl: RunTimeline): Array<[number, number]> {
  return tl.ev.filter((e): e is [number, 'l', number] => e[1] === 'l').map(e => [e[0], e[2]])
}

export function deathCount (tl: RunTimeline): number {
  return tl.ev.reduce((n, e) => n + (e[1] === 'd' ? 1 : 0), 0)
}

export interface ZoneSum {
  areaId: string
  name: string
  town: boolean
  visits: number
  sec: number
  deaths: number
  // The same zone's time in the other run (null: never went there in that act).
  cmpSec: number | null
}

export interface ActSum {
  act: number
  zones: ZoneSum[]
}

// The act a visit counts toward: the act you were in by the run's splits, so
// a trip back to an earlier town counts toward the act you were doing.
function actAt (run: CampaignRun, t: number): number {
  // Whole seconds on both sides: the area line that starts an act is stored
  // rounded, and must not fall back into the act before.
  for (const s of run.splits) if (t < Math.round(s.totalMs / 1000)) return s.act
  return run.splits.length ? Math.min(run.splits[run.splits.length - 1].act + 1, 10) : 1
}

// Zone visits of each act, in order (the Epilogue left out).
export function visitsByAct (run: CampaignRun, visits: ZoneVisit[]): Map<number, ZoneVisit[]> {
  const out = new Map<number, ZoneVisit[]>()
  for (const v of visits) {
    if (v.act === 11) continue
    const act = actAt(run, v.t)
    const list = out.get(act)
    if (list) list.push(v)
    else out.set(act, [v])
  }
  return out
}

export interface StepRow {
  index: number
  text: string
  act: number
  // Run time (s) it was finished, and how long it took since the step before.
  t: number
  took: number | null
  // The same step's time in the other run (matched by its text).
  cmpTook: number | null
}

function stepTimes (run: CampaignRun, tl: RunTimeline): StepRow[] {
  const out: StepRow[] = []
  let prev: [number, number, string] | null = null
  for (const s of tl.steps ?? []) {
    // Only right after the step before it: a skipped step has no time, and
    // nor do steps passed together in one jump (the same moment).
    const took: number | null = prev && prev[1] === s[1] - 1 && s[0] > prev[0] ? s[0] - prev[0] : null
    out.push({ index: s[1], text: s[2], act: actAt(run, s[0]), t: s[0], took, cmpTook: null })
    prev = s
  }
  return out
}

// Campaign card steps finished, with how long each took against the other run.
export function stepRows (run: CampaignRun, tl: RunTimeline, cmp: CampaignRun | null, cmpTl: RunTimeline | null): StepRow[] {
  const mine = stepTimes(run, tl)
  if (!cmp || !cmpTl?.steps?.length) return mine
  const theirs = new Map<string, number | null>()
  for (const r of stepTimes(cmp, cmpTl)) if (!theirs.has(r.text)) theirs.set(r.text, r.took)
  return mine.map(r => ({ ...r, cmpTook: theirs.get(r.text) ?? null }))
}

function sumByAct (run: CampaignRun, visits: ZoneVisit[]): Map<number, Map<string, ZoneSum>> {
  const acts = new Map<number, Map<string, ZoneSum>>()
  for (const v of visits) {
    if (v.act === 11) continue // the Epilogue ends the run
    const act = actAt(run, v.t)
    let zones = acts.get(act)
    if (!zones) acts.set(act, zones = new Map())
    const z = zones.get(v.areaId) ?? { areaId: v.areaId, name: v.name, town: v.town, visits: 0, sec: 0, deaths: 0, cmpSec: null }
    z.visits++
    z.sec += v.dur ?? 0
    z.deaths += v.deaths
    zones.set(v.areaId, z)
  }
  return acts
}

// Time per zone, grouped by act, in the order first entered, with the other
// run's time in the same zone and act.
export function zonesByAct (run: CampaignRun, tl: RunTimeline, cmp: CampaignRun | null, cmpTl: RunTimeline | null): ActSum[] {
  const mine = sumByAct(run, zoneVisits(tl, runEndSec(run)))
  const theirs = cmp && cmpTl ? sumByAct(cmp, zoneVisits(cmpTl, runEndSec(cmp))) : null
  const out: ActSum[] = []
  for (const [act, zones] of [...mine.entries()].sort((a, b) => a[0] - b[0])) {
    const other = theirs?.get(act)
    out.push({
      act,
      zones: [...zones.values()].map(z => ({ ...z, cmpSec: other?.get(z.areaId)?.sec ?? null }))
    })
  }
  return out
}

// Run time (s) a saved run ended at.
export function runEndSec (run: CampaignRun): number | null {
  if (!run.finished) return null
  const last = run.splits[run.splits.length - 1]
  return Math.round(Math.max(run.elapsedMs, last?.totalMs ?? 0) / 1000)
}

export function townSec (visits: ZoneVisit[]): number {
  return visits.reduce((s, v) => s + (v.town ? v.dur ?? 0 : 0), 0)
}
