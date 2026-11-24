// Strategy runs (WOKEPOET-515): profit from a start point on the Net worth
// chart to now (or Stop), with what got used up and what came in.
//
// The rule: a run's profit is the stash at the end minus the stash at the
// start, read by read (each read's counted change, so purchases count as in
// the rest of Net worth: spend.ts). Typed cost lines only cover what the
// stash can't see, like maps bought into the inventory. A typed line takes
// over its item: that item's own stash change is left out, so it never
// counts twice. Pure: no Vue, no IO.
import { arrivalsOf, edited, rowKey } from './faustus'
import type { Arrival, FaustusRead, HeldItem, RowEdit, SaleMark } from './faustus'
import type { LedgerPoint } from './ledger'
import type { StashDiff } from './valuation'
import { countedMs } from '../shared/rate-time'
import type { RateTime, TimeSplit } from '../shared/rate-time'

// One item's change over the run, from each read's diff.
export interface TallyLine {
  name: string
  icon: string
  added: number
  removed: number
  addedChaos: number
  removedChaos: number
  // A map, scarab or fragment (isMapCostItem): cost per map counts it used up.
  cost?: true
  // Currency: its change sums trades and collected sales, never one drop.
  currency?: true
}

// A cost the stash can't see: `qty` a map at `unitChaos` each (the price you
// paid, starting at poe.ninja's). `bought`: a batch bought up front, so the
// run can say how many are left.
export interface CostLine {
  id: string
  // The stash item it stands for (its diff key), so its stash change is left
  // out; null for a cost with no stash item.
  key: string | null
  name: string
  qty: number
  unitChaos: number
  bought?: number
  // Priced live (pick K1): unitChaos follows the item's price at each read
  // while the run goes, and stays as it was at Stop. Typing a price pins it.
  live?: true
}

// A one-time cost (a Kirac mission, a fee).
export interface OnceCost { id: string, name: string, chaos: number }

export interface Run {
  id: string
  league: string
  name: string
  // The read the run counts from: its chart point's time.
  startAt: number
  // Set when stopped; reads after it don't count.
  stoppedAt?: number
  // Item changes from each read after the start.
  tally: Record<string, TallyLine>
  // The start was before the run existed: the tally came from the saved
  // diffs, which keep only each read's biggest changes.
  tallyPartial?: boolean
  // The last read put into the tally.
  tallyAt: number
  costs: CostLine[]
  once: OnceCost[]
  // Totals when stopped, for the past runs list (edits after Stop update it).
  final?: RunFinal
  // Your Faustus listings, last read (faustus.ts).
  faustus?: FaustusRead
  // Item ids listed at Faustus at the start (their sales are from before).
  startListings?: string[]
  // Currency that came into the stash at each read (collects sales).
  arrivals?: Arrival[]
  // Your overrides on sales during the run, by sale id.
  saleMarks?: Record<string, SaleMark>
  // Added with the hotkey: held outside the stash (faustus.ts).
  held?: HeldItem[]
  // Left over from the last run (H1): held items, sales not collected.
  carried?: HeldItem[]
  carriedSales?: string[]
  // The run those came from (it carries over once).
  carriedFrom?: string
  // Your edits on rows (faustus.ts rowKey): left out, count, price.
  edits?: Record<string, RowEdit>
  // Items you added by hand: came in (in) or went out (out).
  manual?: ManualLine[]
}

export interface ManualLine { id: string, name: string, key?: string | null, icon?: string, count: number, each: number, side: 'in' | 'out' }

// `fights`: boss arenas (Maven, Uber Elder...), which aren't maps. Each counts
// as one run of the strategy, like a map: per-map figures and typed costs
// are per map or fight.
// `stashChaos`: the stash change at Stop, for when the chart's reads no
// longer go back to the run's start (the ledger keeps the newest reads only).
// `time`: where the run's time went (Client.txt), for per hour under the Per
// hour setting in the past runs table; old runs have the clock only.
export interface RunFinal { profitChaos: number, maps: number, fights?: number, perMapChaos: number | null, perHourChaos: number | null, faustusChaos?: number, stashChaos?: number, time?: TimeSplit }

export interface RunCount { maps: number, fights: number }
// "4 maps · 2 fights", "1 fight", "0 maps".
export function countLabel (maps: number, fights = 0): string {
  const m = `${maps} ${maps === 1 ? 'map' : 'maps'}`
  const f = `${fights} ${fights === 1 ? 'fight' : 'fights'}`
  return fights > 0 ? (maps > 0 ? `${m} · ${f}` : f) : m
}
// What one "run" is: a map, a boss fight, or either.
export function unitOf (maps: number, fights = 0): 'map' | 'fight' | 'run' {
  return fights > 0 ? (maps > 0 ? 'run' : 'fight') : 'map'
}

// Outside the stash (faustus.ts outsideTotals): sales of items from before
// the run that were collected come off profit; the Faustus line is apart.
// `leftOutChaos`: left-out sales whose currency the stash counted (off profit);
// `leftOutShownChaos`: everything left out outside the stash (shown only).
export interface Outside { beforeChaos: number, faustusChaos: number, leftOutChaos?: number, leftOutShownChaos?: number }

// What a run's view and the dock icon show.
export interface RunTotals {
  // The counted stash change since the start, before the typed lines.
  stashChaos: number
  // Typed costs, and the stash change they take over (left out).
  costChaos: number
  takenOverChaos: number
  onceChaos: number
  // Collected sales of items from before the run (off profit).
  beforeChaos: number
  profitChaos: number
  // Listed at Faustus during the run and sales not collected yet.
  faustusChaos: number
  // profit + faustus
  totalChaos: number
  // Left out of the run (long shots): items that came in, listings, holds
  // and sales you marked. Shown apart; none of it counts.
  leftOutChaos: number
  // Your edits on stash rows, and items added by hand (in minus out).
  editChaos: number
  manualChaos: number
  maps: number
  fights: number
  // maps + fights: what per-map figures and typed costs go by.
  runs: number
  perMapChaos: number | null
  // What a map costs: typed lines, plus what the stash says was used up of
  // map-cost items per map.
  costPerMapChaos: number | null
  ms: number
  perHourChaos: number | null
}

// Shorter than this: no per-hour figure (too noisy).
export const MIN_RATE_MS = 10 * 60_000
export const MAX_DONE_RUNS = 50
export const MAX_ARRIVALS = 400

export function emptyRun (id: string, league: string, name: string, startAt: number): Run {
  return { id, league, name: name.trim() || 'Run', startAt, tally: {}, tallyAt: startAt, costs: [], once: [] }
}

// Adds one read's diff to the run's tally. A read already counted, or one
// outside the run, changes nothing.
export function addToTally (run: Run, diff: StashDiff): Run {
  if (diff.at <= run.tallyAt || diff.at <= run.startAt) return run
  if (run.stoppedAt != null && diff.at > run.stoppedAt) return run
  const tally = { ...run.tally }
  for (const [lines, dir] of [[diff.added, 1], [diff.removed, -1]] as const) {
    for (const l of lines) {
      const t: TallyLine = tally[l.key] ? { ...tally[l.key] } : { name: l.name, icon: l.icon, added: 0, removed: 0, addedChaos: 0, removedChaos: 0 }
      if (!t.cost && isMapCostItem(l.name, l.cat)) t.cost = true
      if (!t.currency && l.cat === 'currency') t.currency = true
      if (dir > 0) { t.added += l.count; t.addedChaos += l.chaos } else { t.removed += l.count; t.removedChaos += l.chaos }
      tally[l.key] = t
    }
  }
  const came = arrivalsOf(diff)
  // The newest MAX_ARRIVALS: older ones collected what they could long ago.
  return { ...run, tally, tallyAt: diff.at, ...(came.length ? { arrivals: [...(run.arrivals ?? []), ...came].slice(-MAX_ARRIVALS) } : {}) }
}

// The tally for a start in the past, from the diffs the chart kept.
export function tallyFrom (run: Run, diffs: readonly StashDiff[]): Run {
  let r = run
  for (const d of [...diffs].sort((a, b) => a.at - b.at)) r = addToTally(r, d)
  return { ...r, tallyPartial: diffs.some(d => d.at > run.startAt) }
}

// The run's reads: after the start, up to Stop.
function inRun (run: Run, at: number): boolean {
  return at > run.startAt && (run.stoppedAt == null || at <= run.stoppedAt)
}

// A stopped run whose start is older than the chart's first read: the stash
// change kept at Stop (what's left of the reads would undercount it).
export function runStash (run: Run, points: readonly LedgerPoint[]): number {
  const kept = run.final?.stashChaos
  if (run.stoppedAt != null && kept != null && !(points.length && points[0].at <= run.startAt)) return kept
  return stashChange(run, points)
}

export function stashChange (run: Run, points: readonly LedgerPoint[]): number {
  let sum = 0
  for (const p of points) {
    if (!inRun(run, p.at) || p.netChaos == null) continue
    sum += p.counted ?? p.netChaos
  }
  return sum
}

// A typed line's item: its stash change over the run (in minus out).
function netOf (t: TallyLine | undefined): number {
  return t ? t.addedChaos - t.removedChaos : 0
}

// `runs`: maps and boss fights.
export function lineCost (c: CostLine, runs: number): number {
  return Math.max(0, c.qty) * Math.max(0, c.unitChaos) * runs
}

// How many of a bought batch are left after `runs` maps and fights.
export function leftOf (c: CostLine, runs: number): number | null {
  return c.bought != null ? Math.max(0, c.bought - c.qty * runs) : null
}

export function runTotals (run: Run, points: readonly LedgerPoint[], count: number | RunCount, now: number, mapCostKeys: ReadonlySet<string> = new Set(), outside: Outside = { beforeChaos: 0, faustusChaos: 0 }): RunTotals {
  const { maps, fights } = typeof count === 'number' ? { maps: count, fights: 0 } : count
  const runs = maps + fights
  const stashChaos = runStash(run, points)
  const typedKeys = new Set(run.costs.map(c => c.key).filter((k): k is string => k != null))
  let takenOverChaos = 0
  for (const k of typedKeys) takenOverChaos += netOf(run.tally[k])
  const costChaos = run.costs.reduce((s, c) => s + lineCost(c, runs), 0)
  const onceChaos = run.once.reduce((s, o) => s + Math.max(0, o.chaos), 0)
  const beforeChaos = outside.beforeChaos
  // Your edits on stash rows (count, price, left out) change what they add.
  let editChaos = 0
  let leftOutStash = 0
  for (const [k, t] of Object.entries(run.tally)) {
    const e = run.edits?.[rowKey.tally(k)]
    if (!e || typedKeys.has(k)) continue
    const was = netOf(t)
    const now = tallyValue(t, e)
    editChaos += now - was
    if (e.out) leftOutStash += Math.abs(was)
  }
  const manualChaos = (run.manual ?? []).reduce((s, m) => s + (m.side === 'in' ? 1 : -1) * Math.max(0, m.count) * Math.max(0, m.each), 0)
  const leftOutChaos = leftOutStash + (outside.leftOutShownChaos ?? 0)
  const profitChaos = stashChaos - takenOverChaos - costChaos - onceChaos - beforeChaos + editChaos + manualChaos - (outside.leftOutChaos ?? 0)
  const faustusChaos = outside.faustusChaos
  const usedChaos = usedUp(run, mapCostKeys)
  const end = run.stoppedAt ?? now
  const ms = Math.max(0, end - run.startAt)
  return {
    stashChaos,
    costChaos,
    takenOverChaos,
    onceChaos,
    beforeChaos,
    profitChaos,
    faustusChaos,
    totalChaos: profitChaos + faustusChaos,
    leftOutChaos,
    editChaos,
    manualChaos,
    maps,
    fights,
    runs,
    perMapChaos: runs > 0 ? profitChaos / runs : null,
    costPerMapChaos: runs > 0 ? (costChaos + usedChaos) / runs : null,
    ms,
    perHourChaos: ms >= MIN_RATE_MS ? profitChaos / (ms / 3_600_000) : null
  }
}

// Used up from the stash: map-cost items that went down, not typed.
function usedUp (run: Run, mapCostKeys: ReadonlySet<string> = new Set()): number {
  const typedKeys = new Set(run.costs.map(c => c.key).filter((k): k is string => k != null))
  let used = 0
  for (const [k, t] of Object.entries(run.tally)) {
    if (typedKeys.has(k) || !(t.cost || mapCostKeys.has(k))) continue
    const net = tallyValue(t, run.edits?.[rowKey.tally(k)])
    if (net < 0) used += -net
  }
  return used
}

// What a map (or fight) cost: typed lines and map-cost items used up. Needs
// no chart reads, so a past run's comes from the run alone.
export function costPerRun (run: Run, runs: number, mapCostKeys?: ReadonlySet<string>): number | null {
  if (runs <= 0) return null
  return (run.costs.reduce((s, c) => s + lineCost(c, runs), 0) + usedUp(run, mapCostKeys)) / runs
}

// ---------- cost kits (pick K1) ----------
// A price for a kit line: its stash item's (by key) or poe.ninja's by name;
// null when neither has one (the line keeps its last price).
export type LivePrice = (key: string | null, name: string) => number | null

// The live run's kit lines at today's price. The same run back when nothing
// moved (so a save can be skipped).
export function relive (run: Run, price: LivePrice): Run {
  if (run.stoppedAt != null) return run
  let changed = false
  const costs = run.costs.map(c => {
    if (!c.live) return c
    const p = price(c.key, c.name)
    if (p == null || !(p > 0) || Math.abs(p - c.unitChaos) < 1e-6) return c
    changed = true
    return { ...c, unitChaos: p }
  })
  return changed ? { ...run, costs } : run
}

// ---------- the biggest drop, small samples (pick S1) ----------
export interface TopDrop { name: string, chaos: number }

// Tallied before rows knew their category: the usual currency names.
const CURRENCY_NAME = /\b(Orb|Shard|Scroll|Splinter|Fossil|Resonator|Catalyst|Oil|Essence|Scarab|Delirium Orb|Prism|Bauble|Whetstone|Chisel|Sextant)\b|Orb of /

// The single biggest thing that came in: a stash row (with your edit; left
// out ones don't count) or an item added by hand. null: nothing came in.
// Currency (sums of trades and sales; a Mirror counts) and map-cost items
// (restocks) are never a drop.
export function topDrop (run: Run): TopDrop | null {
  const typed = new Set(run.costs.map(c => c.key))
  let top: TopDrop | null = null
  for (const [k, t] of Object.entries(run.tally)) {
    if (typed.has(k) || t.cost || isMapCostItem(t.name, undefined)) continue
    // Mirrors are the lucky drop itself, not trade money.
    if ((t.currency || CURRENCY_NAME.test(t.name)) && !/^Mirror/.test(t.name)) continue
    const v = tallyValue(t, run.edits?.[rowKey.tally(k)])
    if (v > 0 && (!top || v > top.chaos)) top = { name: t.name, chaos: v }
  }
  for (const m of run.manual ?? []) {
    const v = m.side === 'in' ? Math.max(0, m.count) * Math.max(0, m.each) : 0
    if (v > 0 && (!top || v > top.chaos)) top = { name: m.name, chaos: v }
  }
  return top
}

// Fewer maps than this, or one drop over this share of the profit: per map
// is a small sample.
export const SAMPLE_MIN_RUNS = 30
export const SAMPLE_TOP_SHARE = 0.5

export interface SmallSample { few: boolean, share: number | null }
// null when the sample is fine. `share`: the top drop's part of the profit
// when it's over half of it.
export function smallSample (runs: number, profitChaos: number, top: TopDrop | null): SmallSample | null {
  if (runs <= 0) return null
  const few = runs < SAMPLE_MIN_RUNS
  const share = top && profitChaos > 0 && top.chaos > profitChaos * SAMPLE_TOP_SHARE ? Math.min(1, top.chaos / profitChaos) : null
  return few || share != null ? { few, share } : null
}

// ---------- past runs compared (pick C2) ----------
export interface CompareRow {
  // A run's id, or the strategy's name when grouped.
  id: string
  name: string
  // How many runs it adds up (1 for a single run).
  count: number
  startAt: number
  ms: number
  maps: number
  fights: number
  runs: number
  profitChaos: number
  perMapChaos: number | null
  perHourChaos: number | null
  costPerMapChaos: number | null
  top: TopDrop | null
  // Per map without the top drop.
  perMapNoTopChaos: number | null
  sample: SmallSample | null
}

// One row a finished run (with its final totals), newest first; `byName`
// adds up runs with the same name (per hour over their summed time, the top
// drop the biggest of any of them). `time`: the Per hour setting.
export function compareRows (done: readonly Run[], time: RateTime, byName = false, mapCostKeys?: ReadonlySet<string>): CompareRow[] {
  interface Acc { id: string, name: string, count: number, startAt: number, ms: number, rateMs: number, maps: number, fights: number, profit: number, cost: number, top: TopDrop | null }
  const accs: Acc[] = []
  const byKey = new Map<string, Acc>()
  for (const r of done) {
    const f = r.final
    if (!f || r.stoppedAt == null) continue
    const clockMs = Math.max(0, r.stoppedAt - r.startAt)
    const known = f.time && f.time.map + f.time.play + f.time.hub > 0 ? f.time : null
    const rateMs = known && time !== 'all' ? countedMs(known, time) : clockMs
    const runs = f.maps + (f.fights ?? 0)
    const cost = (costPerRun(r, runs, mapCostKeys) ?? 0) * runs
    const top = topDrop(r)
    const key = byName ? r.name : r.id
    let a = byKey.get(key)
    if (!a) {
      a = { id: key, name: r.name, count: 0, startAt: r.startAt, ms: 0, rateMs: 0, maps: 0, fights: 0, profit: 0, cost: 0, top: null }
      byKey.set(key, a)
      accs.push(a)
    }
    a.count++
    a.startAt = Math.max(a.startAt, r.startAt)
    a.ms += clockMs
    a.rateMs += rateMs
    a.maps += f.maps
    a.fights += f.fights ?? 0
    a.profit += f.profitChaos
    a.cost += cost
    if (top && (!a.top || top.chaos > a.top.chaos)) a.top = top
  }
  return accs.map(a => {
    const runs = a.maps + a.fights
    return {
      id: a.id,
      name: a.name,
      count: a.count,
      startAt: a.startAt,
      ms: a.ms,
      maps: a.maps,
      fights: a.fights,
      runs,
      profitChaos: a.profit,
      perMapChaos: runs > 0 ? a.profit / runs : null,
      perHourChaos: a.rateMs >= MIN_RATE_MS ? a.profit / (a.rateMs / 3_600_000) : null,
      costPerMapChaos: runs > 0 ? a.cost / runs : null,
      top: a.top,
      perMapNoTopChaos: runs > 0 ? (a.profit - (a.top?.chaos ?? 0)) / runs : null,
      sample: smallSample(runs, a.profit, a.top)
    }
  })
}

export type CompareSort = 'new' | 'maps' | 'profit' | 'perMap' | 'perHour' | 'cost' | 'noTop'
// Biggest first (cost: cheapest first); a row without the figure goes last.
export function sortCompare (rows: readonly CompareRow[], by: CompareSort): CompareRow[] {
  if (by === 'new') return [...rows].sort((a, b) => b.startAt - a.startAt)
  const val = (r: CompareRow): number | null => by === 'maps' ? r.runs : by === 'profit' ? r.profitChaos : by === 'perMap' ? r.perMapChaos : by === 'perHour' ? r.perHourChaos : by === 'cost' ? r.costPerMapChaos : r.perMapNoTopChaos
  const dir = by === 'cost' ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = val(a)
    const y = val(b)
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1
    return (x - y) * dir
  })
}

// Per hour over the time the Per hour setting counts (shared/rate-time.ts).
// `split`: where the run's time went (run-time.ts); null without Client.txt,
// and then the clock (`clockMs`) is all there is. A split with no zone time
// at all (a Client.txt with nothing written in the run) counts as none.
export function runPerHour (profitChaos: number, clockMs: number, split: TimeSplit | null | undefined, time: RateTime): number | null {
  const known = split && split.map + split.play + split.hub > 0 ? split : null
  const ms = known && time !== 'all' ? countedMs(known, time) : clockMs
  return ms >= MIN_RATE_MS ? profitChaos / (ms / 3_600_000) : null
}

// A stash row's value with your edit: signed as it went (in +, used up −).
export function tallyValue (t: TallyLine, e: RowEdit | undefined): number {
  const was = netOf(t)
  if (!e) return was
  if (e.out) return 0
  const n = Math.abs(t.added - t.removed)
  return Math.sign(was || 1) * edited(e, n, Math.abs(was)).chaos
}

export interface TallyRow { key: string, line: TallyLine, netChaos: number, net: number }

// Items that went down (used up) and up (came in), biggest first. Typed
// lines' items are left out: their cost is the typed one.
export function tallyRows (run: Run): { used: TallyRow[], came: TallyRow[] } {
  const typed = new Set(run.costs.map(c => c.key))
  const rows = Object.entries(run.tally)
    .filter(([k]) => !typed.has(k))
    .map(([key, line]) => ({ key, line, netChaos: netOf(line), net: line.added - line.removed }))
    .filter(r => Math.abs(r.netChaos) >= 0.5)
  return {
    used: rows.filter(r => r.netChaos < 0).sort((a, b) => a.netChaos - b.netChaos),
    came: rows.filter(r => r.netChaos > 0).sort((a, b) => b.netChaos - a.netChaos)
  }
}

// Map-cost items (for cost per map): maps, scarabs and fragments.
export function isMapCostItem (name: string, category: string | undefined): boolean {
  return category === 'fragments' || /\bMap( \(|$)/.test(name)
}

// Maps in the run: came out of after the start, entered before the end.
export function mapsIn (run: Run, maps: ReadonlyArray<{ enteredAt: number, leftAt: number }>, now: number): number {
  const end = run.stoppedAt ?? now
  return maps.filter(m => m.leftAt > run.startAt && m.enteredAt <= end).length
}

// The saved doc: the run going now and finished ones, newest first.
export interface RunsDoc { live: Run | null, done: Run[] }

export function isRun (x: unknown): x is Run {
  if (x == null || typeof x !== 'object') return false
  const r = x as Record<string, unknown>
  return typeof r.id === 'string' && typeof r.name === 'string' && typeof r.startAt === 'number' &&
    typeof r.tally === 'object' && r.tally != null && Array.isArray(r.costs) && Array.isArray(r.once)
}

export function cleanDoc (x: unknown): RunsDoc {
  const o = x != null && typeof x === 'object' ? x as Record<string, unknown> : {}
  return {
    live: isRun(o.live) ? o.live : null,
    done: Array.isArray(o.done) ? o.done.filter(isRun).slice(0, MAX_DONE_RUNS) : []
  }
}

// The dock icon's and Ctrl+Space's numbers for the live run, saved small.
export interface RunGlance {
  league: string
  name: string
  startAt: number
  at: number
  profitChaos: number
  maps: number
  fights?: number
  // Over the whole run (the clock); runPerHour with `time` for the setting's.
  perHourChaos: number | null
  // Where the run's time went (Client.txt), from the start to `timeTo` (the
  // last stash read, which the profit runs to).
  time?: TimeSplit
  timeTo?: number
  costPerMapChaos: number | null
  divine: number | null
  // The Faustus line (left out when nothing is there).
  faustusChaos?: number
  // The biggest single drop, for "without top drop" and the small-sample note.
  top?: TopDrop
  // When the newest map in `maps` was entered (the glance bar counts the
  // maps logged after it; a map is logged only once the next one starts).
  lastMapAt?: number
}

// Past runs by strategy (compareRows grouped), saved small for Ctrl+Space.
export interface RunBoardRow {
  name: string
  count: number
  maps: number
  fights: number
  profitChaos: number
  perMapChaos: number | null
  perHour: Record<RateTime, number | null>
  costPerMapChaos: number | null
  perMapNoTopChaos: number | null
  top?: TopDrop
  small: boolean
}
export interface RunBoard { league: string, rows: RunBoardRow[] }
export const runBoardKey = (league: string) => `${league}-run-board`
export function isRunBoard (b: unknown): b is RunBoard {
  return b != null && typeof b === 'object' && typeof (b as RunBoard).league === 'string' && Array.isArray((b as RunBoard).rows)
}

export const runsKey = (league: string) => `${league}-runs`
export const runGlanceKey = (league: string) => `${league}-run-glance`

export function isRunGlance (g: unknown): g is RunGlance {
  if (g == null || typeof g !== 'object') return false
  const o = g as Record<string, unknown>
  return typeof o.league === 'string' && typeof o.name === 'string' && typeof o.profitChaos === 'number' && Number.isFinite(o.profitChaos)
}

// ---------- the last run's summary (run-summary.ts), for Ctrl+Space ----------
export interface LastRun {
  league: string
  id: string
  name: string
  startAt: number
  stoppedAt: number
  profitChaos: number
  maps: number
  fights?: number
  perMapChaos: number | null
  usualPerMapChaos: number | null
  best?: { name: string, chaos: number }
  tips: Array<{ lead: string, text: string }>
}
export const lastRunKey = (league: string) => `${league}-run-last`
export function isLastRun (x: unknown): x is LastRun {
  if (x == null || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return typeof o.league === 'string' && typeof o.name === 'string' && typeof o.profitChaos === 'number' && Array.isArray(o.tips)
}
