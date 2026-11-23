// Strategy runs (WOKEPOET-515): profit from a start point on the Net worth
// chart to now (or Stop), with what got used up and what came in.
//
// The rule: a run's profit is the stash at the end minus the stash at the
// start, read by read (each read's counted change, so purchases count as in
// the rest of Net worth: spend.ts). Typed cost lines only cover what the
// stash can't see, like maps bought into the inventory. A typed line takes
// over its item: that item's own stash change is left out, so it never
// counts twice. Pure: no Vue, no IO.
import type { LedgerPoint } from './ledger'
import type { StashDiff } from './valuation'

// One item's change over the run, from each read's diff.
export interface TallyLine {
  name: string
  icon: string
  added: number
  removed: number
  addedChaos: number
  removedChaos: number
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
}

export interface RunFinal { profitChaos: number, maps: number, perMapChaos: number | null, perHourChaos: number | null }

// What a run's view and the dock icon show.
export interface RunTotals {
  // The counted stash change since the start, before the typed lines.
  stashChaos: number
  // Typed costs, and the stash change they take over (left out).
  costChaos: number
  takenOverChaos: number
  onceChaos: number
  profitChaos: number
  maps: number
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
      const t = tally[l.key] ? { ...tally[l.key] } : { name: l.name, icon: l.icon, added: 0, removed: 0, addedChaos: 0, removedChaos: 0 }
      if (dir > 0) { t.added += l.count; t.addedChaos += l.chaos } else { t.removed += l.count; t.removedChaos += l.chaos }
      tally[l.key] = t
    }
  }
  return { ...run, tally, tallyAt: diff.at }
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

export function lineCost (c: CostLine, maps: number): number {
  return Math.max(0, c.qty) * Math.max(0, c.unitChaos) * maps
}

// How many of a bought batch are left after `maps` maps.
export function leftOf (c: CostLine, maps: number): number | null {
  return c.bought != null ? Math.max(0, c.bought - c.qty * maps) : null
}

export function runTotals (run: Run, points: readonly LedgerPoint[], maps: number, now: number, mapCostKeys: ReadonlySet<string> = new Set()): RunTotals {
  const stashChaos = stashChange(run, points)
  const typedKeys = new Set(run.costs.map(c => c.key).filter((k): k is string => k != null))
  let takenOverChaos = 0
  for (const k of typedKeys) takenOverChaos += netOf(run.tally[k])
  const costChaos = run.costs.reduce((s, c) => s + lineCost(c, maps), 0)
  const onceChaos = run.once.reduce((s, o) => s + Math.max(0, o.chaos), 0)
  const profitChaos = stashChaos - takenOverChaos - costChaos - onceChaos
  // Used up from the stash: map-cost items that went down, not typed.
  let usedChaos = 0
  for (const [k, t] of Object.entries(run.tally)) {
    if (typedKeys.has(k) || !mapCostKeys.has(k)) continue
    const net = netOf(t)
    if (net < 0) usedChaos += -net
  }
  const end = run.stoppedAt ?? now
  const ms = Math.max(0, end - run.startAt)
  return {
    stashChaos,
    costChaos,
    takenOverChaos,
    onceChaos,
    profitChaos,
    maps,
    perMapChaos: maps > 0 ? profitChaos / maps : null,
    costPerMapChaos: maps > 0 ? (costChaos + usedChaos) / maps : null,
    ms,
    perHourChaos: ms >= MIN_RATE_MS ? profitChaos / (ms / 3_600_000) : null
  }
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
  perHourChaos: number | null
  costPerMapChaos: number | null
  divine: number | null
}

export const runsKey = (league: string) => `${league}-runs`
export const runGlanceKey = (league: string) => `${league}-run-glance`

export function isRunGlance (g: unknown): g is RunGlance {
  if (g == null || typeof g !== 'object') return false
  const o = g as Record<string, unknown>
  return typeof o.league === 'string' && typeof o.name === 'string' && typeof o.profitChaos === 'number' && Number.isFinite(o.profitChaos)
}
