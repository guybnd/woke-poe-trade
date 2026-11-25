// Numbers for Session analytics. Pure functions over saved sessions.
import type { AnalyticsRange, AnalyticsUnit, MapRun, SavedLoot, SessionRecord } from './types'
import type { RateTime } from '../shared/rate-time'

export const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS
// Fewer maps than this and the range is too wide to be useful.
export const MIN_UNITS_FOR_RANGE = 5

// One piece of play to average over: a map (with its share of the hideout
// time and loot not tied to a map), a whole session without map detail, or
// a boss kill.
export interface Unit {
  profit: number
  ms: number
  ts: number
  name: string
}

export function lootValue (lines: SavedLoot[]): number {
  let n = 0
  for (const l of lines) if (!l.out) n += (l.chaos ?? 0) * l.qty
  return n
}

// Your price for one line (null: back to poe.ninja's from the session's end).
export function setLootPrice (l: SavedLoot, chaos: number | null): void {
  if (chaos == null) {
    if (l.read !== undefined) l.chaos = l.read
    delete l.read
    return
  }
  if (l.read === undefined) l.read = l.chaos
  l.chaos = chaos
}

export interface SessionTotals {
  loot: number
  cost: number
  profit: number
}

export function sessionTotals (s: SessionRecord): SessionTotals {
  if (s.imported) {
    return { loot: s.imported.lootChaos, cost: s.imported.costChaos, profit: s.imported.lootChaos - s.imported.costChaos }
  }
  let loot = lootValue(s.loot) + (s.extraChaos || 0)
  for (const r of s.runs) loot += lootValue(r.loot)
  const cost = s.costPerMapChaos * s.maps
  return { loot, cost, profit: loot - cost }
}

// A map's own result in chaos: what dropped in it minus one map's cost.
export function runProfit (run: MapRun, s: SessionRecord): number {
  return lootValue(run.loot) - s.costPerMapChaos
}

// Chaos per unit shown: 1 for chaos, the session's own divine rate for div.
export function rateFor (s: { divine: number | null }, unit: AnalyticsUnit, fallbackDivine: number | null): number | null {
  if (unit === 'chaos') return 1
  return s.divine ?? fallbackDivine
}

// Splits a session into units. Loot and time not tied to a map (before the
// first map, typed-in chaos, maps added by hand) are shared out evenly, so
// the units add up to the session's totals. `time`: the Per hour setting
// (shared/rate-time.ts). Farming's sessions kept hideout and AFK as one
// "other" time, so "play" counts the time inside maps only and the others
// count it all; a session without map detail has only its whole length.
export function sessionUnits (s: SessionRecord, unit: AnalyticsUnit, fallbackDivine: number | null, time: RateTime, keepExcluded = false): Unit[] {
  const rate = rateFor(s, unit, fallbackDivine)
  if (!rate) return []
  const total = sessionTotals(s)
  if (!s.runs.length) {
    return [{ profit: total.profit / rate, ms: s.durationMs, ts: s.endedAt, name: '' }]
  }
  let runsMs = 0
  let runsProfit = 0
  for (const r of s.runs) {
    runsMs += r.mapMs + r.otherMs
    runsProfit += runProfit(r, s)
  }
  const mapOnly = time === 'play'
  const shareMs = mapOnly ? 0 : Math.max(0, s.durationMs - runsMs) / s.runs.length
  const shareProfit = (total.profit - runsProfit) / s.runs.length
  return s.runs
    .filter(r => keepExcluded || !r.excluded)
    .map(r => ({
      profit: (runProfit(r, s) + shareProfit) / rate,
      ms: r.mapMs + (mapOnly ? 0 : r.otherMs) + shareMs,
      ts: r.enteredAt,
      name: r.name
    }))
}

export function perHour (units: Unit[]): number | null {
  let p = 0
  let ms = 0
  for (const u of units) { p += u.profit; ms += u.ms }
  return ms > 60_000 ? p / (ms / HOUR_MS) : null
}

export function median (values: number[]): number | null {
  if (!values.length) return null
  const v = [...values].sort((a, b) => a - b)
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

function mulberry32 (seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Per-hour values from resampling the units with replacement. A fixed seed
// keeps the range from jumping between redraws.
export function bootstrap (units: Unit[], runs = 400, seed = 1): number[] {
  if (!units.length) return []
  const rnd = mulberry32(seed)
  const out: number[] = []
  for (let i = 0; i < runs; i++) {
    let p = 0
    let ms = 0
    for (let j = 0; j < units.length; j++) {
      const u = units[Math.floor(rnd() * units.length)]
      p += u.profit
      ms += u.ms
    }
    if (ms > 0) out.push(p / (ms / HOUR_MS))
  }
  return out.sort((a, b) => a - b)
}

// The middle 90% of resampled per-hour values.
export function hourRange (units: Unit[]): [number, number] | null {
  if (units.length < MIN_UNITS_FOR_RANGE) return null
  const s = bootstrap(units)
  if (!s.length) return null
  return [s[Math.floor(s.length * 0.05)], s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]]
}

// How often A earns more per hour than B across resamples (0..1).
export function chanceBetter (a: Unit[], b: Unit[]): number | null {
  if (a.length < MIN_UNITS_FOR_RANGE || b.length < MIN_UNITS_FOR_RANGE) return null
  const sa = bootstrap(a, 400, 11)
  const sb = bootstrap(b, 400, 23)
  // Compare in random pairs, not sorted order.
  const rnd = mulberry32(5)
  let wins = 0
  for (let i = 0; i < sa.length; i++) {
    if (sa[i] > sb[Math.floor(rnd() * sb.length)]) wins++
  }
  return wins / sa.length
}

export function inRange (ts: number, range: AnalyticsRange, now: number): boolean {
  return range !== '7d' || ts >= now - 7 * DAY_MS
}

export function filterSessions (list: SessionRecord[], range: AnalyticsRange, league: string, now: number): SessionRecord[] {
  return list.filter(s => (range === 'all' || s.league === league) && inRange(s.endedAt, range, now))
}

export interface StrategyRow {
  key: string
  strategy: string
  kind: 'maps' | 'boss'
  sessions: number
  // Maps (or kills) with detail, used for the averages.
  units: Unit[]
  maps: number
  hours: number
  profit: number
  perHour: number | null
  perMap: number | null
  typicalMap: number | null
  range: [number, number] | null
  costPerMap: number | null
  mapsPerHour: number | null
  losingShare: number | null
  bestMap: number | null
  // Share of time inside maps; null without map detail.
  mapShare: number | null
  // Per hour of each session, oldest first (last 12).
  trend: number[]
}

export function buildRow (key: string, strategy: string, kind: 'maps' | 'boss', units: Unit[], extra: { sessions: number, maps: number, costPerMap: number | null, mapShare: number | null, trend: number[] }): StrategyRow {
  const profit = units.reduce((n, u) => n + u.profit, 0)
  const ms = units.reduce((n, u) => n + u.ms, 0)
  const hours = ms / HOUR_MS
  const profits = units.map(u => u.profit)
  return {
    key,
    strategy,
    kind,
    sessions: extra.sessions,
    units,
    maps: extra.maps,
    hours,
    profit,
    perHour: perHour(units),
    // A session saved without map detail is one unit of many maps.
    perMap: !units.length ? null : extra.maps ? profit / extra.maps : profit / units.length,
    typicalMap: median(profits),
    range: hourRange(units),
    costPerMap: extra.costPerMap,
    mapsPerHour: hours > 1 / 60 ? extra.maps / hours : null,
    losingShare: units.length ? profits.filter(p => p < 0).length / units.length : null,
    bestMap: profits.length ? Math.max(...profits) : null,
    mapShare: extra.mapShare,
    trend: extra.trend
  }
}

export function strategyRows (sessions: SessionRecord[], unit: AnalyticsUnit, fallbackDivine: number | null, time: RateTime): StrategyRow[] {
  const groups = new Map<string, SessionRecord[]>()
  for (const s of sessions) {
    const name = s.strategy.trim() || 'Unnamed'
    const list = groups.get(name)
    if (list) list.push(s)
    else groups.set(name, [s])
  }
  const rows: StrategyRow[] = []
  for (const [name, list] of groups) {
    list.sort((a, b) => a.endedAt - b.endedAt)
    const units: Unit[] = []
    const trend: number[] = []
    let maps = 0
    let costSum = 0
    let mapMs = 0
    let allMs = 0
    for (const s of list) {
      const u = sessionUnits(s, unit, fallbackDivine, time)
      units.push(...u)
      const ph = perHour(sessionUnits(s, unit, fallbackDivine, time, true))
      if (ph != null) trend.push(ph)
      // Maps left out don't count, as in the averages: their share of the time
      // isn't in `units`, so counting them would inflate maps per hour.
      const counted = Math.max(0, s.maps - s.runs.filter(r => r.excluded).length)
      // No rate (divines with no divine price): its profit isn't in `units`
      // either, so its maps would only drag profit per map down.
      const rate = rateFor(s, unit, fallbackDivine)
      if (rate) {
        maps += counted
        costSum += (s.imported ? s.imported.costChaos : s.costPerMapChaos * counted) / rate
      }
      for (const r of s.runs) {
        if (r.excluded) continue
        mapMs += r.mapMs
        allMs += r.mapMs + r.otherMs
      }
    }
    rows.push(buildRow(`maps:${name}`, name, 'maps', units, {
      sessions: list.length,
      maps,
      costPerMap: maps ? costSum / maps : null,
      mapShare: allMs > 60_000 ? mapMs / allMs : null,
      trend: trend.slice(-12)
    }))
  }
  return rows
}

export function sortRows (rows: StrategyRow[]): StrategyRow[] {
  return [...rows].sort((a, b) => (b.perHour ?? -Infinity) - (a.perHour ?? -Infinity))
}

export interface MapTileRow {
  name: string
  runs: number
  perMap: number
  typical: number
  minutes: number
  best: number
}

// Results by map tile (Strand, Cemetery…) across sessions with map detail.
export function mapTileRows (sessions: SessionRecord[], unit: AnalyticsUnit, fallbackDivine: number | null, time: RateTime): MapTileRow[] {
  const groups = new Map<string, Unit[]>()
  for (const s of sessions) {
    if (!s.runs.length) continue
    for (const u of sessionUnits(s, unit, fallbackDivine, time)) {
      const list = groups.get(u.name)
      if (list) list.push(u)
      else groups.set(u.name, [u])
    }
  }
  return Array.from(groups, ([name, units]) => {
    const profits = units.map(u => u.profit)
    return {
      name: name || 'Unknown map',
      runs: units.length,
      perMap: profits.reduce((a, b) => a + b, 0) / units.length,
      typical: median(profits) ?? 0,
      minutes: units.reduce((n, u) => n + u.ms, 0) / units.length / 60_000,
      best: Math.max(...profits)
    }
  }).sort((a, b) => b.runs - a.runs || b.perMap - a.perMap)
}

// A map whose drops are far above the session's usual map: worth leaving
// out of the averages if it was a once-a-league drop.
export function isBigDrop (run: MapRun, s: SessionRecord): boolean {
  const value = lootValue(run.loot)
  const others = s.runs.filter(r => r !== run).map(r => lootValue(r.loot))
  const typical = median(others) ?? 0
  const floor = s.divine ?? 150
  return value >= floor && value > Math.max(typical, 1) * 8
}

export function formatSessionDate (ts: number): string {
  const d = new Date(ts)
  const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/,/g, '')
  return `${day} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function dropsText (lines: SavedLoot[]): string {
  return lines.map(l => `${l.qty}x ${l.name}${l.variant ? ` (${l.variant})` : ''}${l.out ? ' (left out)' : ''}`).join('; ')
}

// CSV rows: one per map, or one per session without map detail. Chaos.
export function exportRows (sessions: SessionRecord[]): Array<Record<string, string | number>> {
  const out: Array<Record<string, string | number>> = []
  for (const s of [...sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    const base = { league: s.league, strategy: s.strategy, session_start: new Date(s.startedAt).toISOString(), divine_chaos: s.divine ?? '' }
    if (!s.runs.length) {
      const t = sessionTotals(s)
      out.push({ ...base, map: '', area_level: '', entered: '', minutes_in_map: '', minutes_other: Math.round(s.durationMs / 6000) / 10, loot_chaos: Math.round(t.loot), cost_chaos: Math.round(t.cost), profit_chaos: Math.round(t.profit), left_out: '', drops: '' })
      continue
    }
    for (const r of s.runs) {
      const loot = lootValue(r.loot)
      out.push({
        ...base,
        map: r.name,
        area_level: r.level,
        entered: new Date(r.enteredAt).toISOString(),
        minutes_in_map: Math.round(r.mapMs / 6000) / 10,
        minutes_other: Math.round(r.otherMs / 6000) / 10,
        loot_chaos: Math.round(loot),
        cost_chaos: Math.round(s.costPerMapChaos),
        profit_chaos: Math.round(loot - s.costPerMapChaos),
        left_out: r.excluded ? 'yes' : '',
        drops: dropsText(r.loot)
      })
    }
    // Loot, typed-in chaos and map costs not tied to a run (maps counted by hand),
    // so the rows add up to the session.
    const loose = lootValue(s.loot) + (s.extraChaos || 0)
    const looseCost = (s.maps - s.runs.length) * s.costPerMapChaos
    if (loose || looseCost) {
      out.push({ ...base, map: '(not tied to a map)', area_level: '', entered: '', minutes_in_map: '', minutes_other: '', loot_chaos: Math.round(loose), cost_chaos: Math.round(looseCost), profit_chaos: Math.round(loose - looseCost), left_out: '', drops: dropsText(s.loot) })
    }
  }
  return out
}
