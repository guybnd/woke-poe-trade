import type { Widget, Anchor } from '@/web/overlay/widgets'
import { BULK_TYPES } from '../league-invest/invest'
import { itemKey } from '../market/types'
import { isBossArea } from '../shared/boss-areas'
import type { SavedLoot, SessionRecord } from '../analytics/types'

export const FARMING_TYPE = 'woke-farming'
// copy-item target for the "add hovered item to loot" hotkey.
export const FARMING_LOOT_TARGET = 'woke-farming-loot'
// Pause the session after this long without a zone change.
export const AUTO_PAUSE_MS = 5 * 60 * 1000

export interface PricedRef {
  type: string
  name: string
  variant: string
}

export interface CostLine extends PricedRef {
  // Quantity spent per map.
  qty: number
}

export interface LootLine extends PricedRef {
  qty: number
}

// One map instance in a running session (saved for Session analytics).
export interface LiveRun {
  areaId: string
  name: string
  // The name came from "You have entered", not guessed from the area id.
  named?: boolean
  level: number
  enteredAt: number
  mapMs: number
  otherMs: number
  // Loot added while in this map, or in the hideout after it.
  loot: LootLine[]
}

export interface FarmingSession {
  strategy: string
  startedAt: number
  // Time counted before the current running stretch.
  elapsedMs: number
  // When the timer was last started; null while paused.
  runningSince: number | null
  maps: number
  loot: LootLine[]
  // Chaos value not tied to a priced item (e.g. sold items, raw currency).
  extraChaos: number
  // Zone tracking from Client.txt: last zone change, what kind of zone we
  // are in, and time spent in maps vs everywhere else (hideout, town…).
  lastZoneAt?: number
  inMap?: boolean
  mapMs?: number
  otherMs?: number
  // Paused by the idle rule (resumes on the next zone change).
  autoPaused?: boolean
  // Last map instance counted ("areaId:seed"), so going back into the same
  // map through a portal doesn't count it again.
  lastMapInstance?: string
  // Maps run so far, oldest first. Older sessions don't have it.
  runs?: LiveRun[]
}

export interface FarmingResult {
  strategy: string
  endedAt: number
  durationMs: number
  maps: number
  costChaos: number
  lootChaos: number
  divine: number | null
}

export interface FarmingWidget extends Widget {
  anchor: Anchor
  strategy: string
  costs: CostLine[]
  autoCountMaps: boolean
  session: FarmingSession | null
  history: FarmingResult[]
  // Hotkey that adds the hovered item to the session's loot.
  lootHotkey?: string | null
  // Share of poe.ninja price you actually get for bulk items (0..1).
  bulkFactor?: number
  // Items worth less than this each (chaos) count as vendor junk (0).
  junkBelow?: number
  autoPause?: boolean
  // Map costs saved per strategy name; `costs` is the current strategy's.
  costsByStrategy?: Record<string, CostLine[]>
  // Old `history` was copied into Session analytics' files.
  historyExported?: boolean
}

export interface SellRules { bulkFactor: number, junkBelow: number }

export function sellRules (w: FarmingWidget): SellRules {
  return {
    bulkFactor: typeof w.bulkFactor === 'number' ? Math.min(1, Math.max(0, w.bulkFactor)) : 0.8,
    junkBelow: typeof w.junkBelow === 'number' ? Math.max(0, w.junkBelow) : 0
  }
}

// What a loot line is really worth when sold: bulk items at a discount,
// cheap items as nothing.
export function sellPrice (r: PricedRef, ninja: number | null, rules: SellRules): number | null {
  if (ninja == null) return null
  if (ninja < rules.junkBelow) return 0
  return BULK_TYPES.has(r.type) ? ninja * rules.bulkFactor : ninja
}

// First mount. Atlas strategies may already have set a strategy and costs on a
// widget that hasn't mounted yet (its module was off): those stay.
export function initFarmingData (w: FarmingWidget) {
  w.strategy ??= ''
  w.costs ??= []
  w.autoCountMaps = true
  w.session = null
  w.history = []
}

export function newSession (strategy: string, now: number): FarmingSession {
  return { strategy, startedAt: now, elapsedMs: 0, runningSince: now, maps: 0, loot: [], extraChaos: 0 }
}

export function elapsed (s: FarmingSession, now: number): number {
  return s.elapsedMs + (s.runningSince != null ? now - s.runningSince : 0)
}

export function lineValue (lines: Array<PricedRef & { qty: number }>, price: (r: PricedRef) => number | null): { total: number, missing: number } {
  let total = 0
  let missing = 0
  for (const line of lines) {
    const p = price(line)
    if (p == null) missing++
    else total += p * line.qty
  }
  return { total, missing }
}

export interface Totals {
  costPerMap: number
  cost: number
  loot: number
  profit: number
  perHour: number | null
  perMap: number | null
  missingPrices: number
}

export function totals (
  session: FarmingSession,
  costs: CostLine[],
  price: (r: PricedRef) => number | null,
  now: number,
  rules?: SellRules
): Totals {
  const c = lineValue(costs, price)
  const l = lineValue(session.loot, rules ? (r) => sellPrice(r, price(r), rules) : price)
  const cost = c.total * session.maps
  const loot = l.total + session.extraChaos
  const profit = loot - cost
  const hours = elapsed(session, now) / 3_600_000
  return {
    costPerMap: c.total,
    cost,
    loot,
    profit,
    perHour: hours > 1 / 60 ? profit / hours : null,
    perMap: session.maps ? profit / session.maps : null,
    missingPrices: c.missing + l.missing
  }
}

// Endgame maps are generated with an area id starting with "Map"
// (e.g. "MapWorldsStrand"); hideouts, towns and campaign areas are not, and
// neither are pinnacle boss arenas (MapWorldsShapersRealm...).
export function isMapArea (areaId: string): boolean {
  return /^Map/i.test(areaId) && !/hideout/i.test(areaId) && !isBossArea(areaId) && !isMapSideArea(areaId)
}

// Areas you reach from inside a map: Vaal side areas, abyssal depths, trials
// of ascendancy, Settlers' fallen stars (prefixes as Exile-UI's map tracker
// has them). Time there is map time, but they aren't new maps: counting the
// side area also made the map count again on the way back.
export function isMapSideArea (areaId: string): boolean {
  return /^(MapSideArea|AbyssLeague|EndGame_Labyrinth_Trials|SettlersBossFallenStar)/i.test(areaId)
}

export function strategyStats (history: FarmingResult[]): Array<{ strategy: string, sessions: number, maps: number, hours: number, perHour: number, perMap: number }> {
  const groups = new Map<string, FarmingResult[]>()
  for (const r of history) {
    const key = r.strategy || 'Unnamed'
    const list = groups.get(key)
    if (list) list.push(r)
    else groups.set(key, [r])
  }
  return Array.from(groups, ([strategy, list]) => {
    const maps = list.reduce((n, r) => n + r.maps, 0)
    const hours = list.reduce((n, r) => n + r.durationMs, 0) / 3_600_000
    const profit = list.reduce((n, r) => n + r.lootChaos - r.costChaos, 0)
    return { strategy, sessions: list.length, maps, hours, perHour: hours ? profit / hours : 0, perMap: maps ? profit / maps : 0 }
  }).sort((a, b) => b.perHour - a.perHour)
}

// Whether entering this map is a new map (not the same instance again).
// Records it as counted when it is.
export function countNewMap (s: FarmingSession, areaId: string, seed: string | undefined): boolean {
  // Without a seed (older clients) every entry counts, as before.
  if (!seed) return true
  const key = `${areaId}:${seed}`
  if (s.lastMapInstance === key) return false
  s.lastMapInstance = key
  return true
}

// Books zone time and decides auto-pause/resume. Call on each zone change.
// Adds running time to the session's map/other split and to the current map run.
function bookSpan (s: FarmingSession, span: number): void {
  if (span <= 0) return
  if (s.inMap) s.mapMs = (s.mapMs ?? 0) + span
  else s.otherMs = (s.otherMs ?? 0) + span
  const run = currentRun(s)
  if (run) {
    if (s.inMap) run.mapMs += span
    else run.otherMs += span
  }
}

export function onZoneChange (s: FarmingSession, inMap: boolean, now: number): void {
  const since = s.lastZoneAt ?? s.startedAt
  if (s.runningSince != null) {
    bookSpan(s, now - Math.max(since, s.runningSince))
  } else if (s.autoPaused) {
    s.runningSince = now
    s.autoPaused = false
  }
  s.lastZoneAt = now
  s.inMap = inMap
}

// Manual pause (and session end): books the open zone span into the map/other
// split and the current run, then stops the clock.
export function pauseSession (s: FarmingSession, now: number): void {
  if (s.runningSince == null) return
  bookSpan(s, now - Math.max(s.lastZoneAt ?? s.startedAt, s.runningSince))
  s.elapsedMs += Math.max(0, now - s.runningSince)
  s.lastZoneAt = now
  s.runningSince = null
  s.autoPaused = false
}

// Pauses a running session that saw no zone change for AUTO_PAUSE_MS,
// counting time only up to the idle limit. Returns true if it paused.
export function maybeAutoPause (s: FarmingSession, now: number): boolean {
  if (s.runningSince == null) return false
  const last = Math.max(s.lastZoneAt ?? s.startedAt, s.runningSince)
  if (now - last < AUTO_PAUSE_MS) return false
  const until = last + AUTO_PAUSE_MS
  const span = until - s.runningSince
  s.elapsedMs += Math.max(0, span)
  bookSpan(s, until - Math.max(s.lastZoneAt ?? s.startedAt, s.runningSince))
  s.lastZoneAt = until
  s.runningSince = null
  s.autoPaused = true
  return true
}

// --- Map runs (for Session analytics) ---

export function currentRun (s: FarmingSession): LiveRun | null {
  return s.runs?.length ? s.runs[s.runs.length - 1] : null
}

// "MapWorldsStrand" -> "Strand", "MapAtlasCemetery" -> "Cemetery".
export function mapNameFromArea (areaId: string): string {
  const rest = areaId.replace(/^Map(Worlds|Atlas)?/i, '').replace(/_/g, ' ')
  return rest.replace(/([a-z])([A-Z])/g, '$1 $2').trim() || areaId
}

// Starts a new map run; call after the map was counted.
export function startRun (s: FarmingSession, areaId: string, level: number, now: number): LiveRun {
  const run: LiveRun = { areaId, name: mapNameFromArea(areaId), level, enteredAt: now, mapMs: 0, otherMs: 0, loot: [] }
  ;(s.runs ??= []).push(run)
  return run
}

// "You have entered Strand." right after a map was generated names the run.
export function nameRun (s: FarmingSession, zoneName: string): void {
  const run = currentRun(s)
  if (run && s.inMap && !run.named) {
    run.name = zoneName
    run.named = true
  }
}

function addTo (lines: LootLine[], ref: PricedRef, qty: number) {
  const k = itemKey(ref)
  const line = lines.find(l => itemKey(l) === k)
  if (line) line.qty += qty
  else lines.push({ type: ref.type, name: ref.name, variant: ref.variant, qty })
}

// Adds loot to the session and to the map it came from (the current map,
// or the last one while sorting loot in the hideout).
export function addLoot (s: FarmingSession, ref: PricedRef, qty: number): void {
  addTo(s.loot, ref, qty)
  const run = currentRun(s)
  if (run) addTo(run.loot, ref, qty)
}

// Takes loot off the session (qty > 0), from the newest map that has it first.
export function removeLoot (s: FarmingSession, ref: PricedRef, qty: number): void {
  const k = itemKey(ref)
  const line = s.loot.find(l => itemKey(l) === k)
  if (!line) return
  const take = Math.min(qty, line.qty)
  line.qty -= take
  if (line.qty <= 0) s.loot = s.loot.filter(l => l !== line)
  let left = take
  for (let i = (s.runs?.length ?? 0) - 1; i >= 0 && left > 0; i--) {
    const run = s.runs![i]
    const rl = run.loot.find(l => itemKey(l) === k)
    if (!rl) continue
    const n = Math.min(left, rl.qty)
    rl.qty -= n
    left -= n
    if (rl.qty <= 0) run.loot = run.loot.filter(l => l !== rl)
  }
}

// The finished session as Session analytics saves it, priced now.
export function toSessionRecord (
  s: FarmingSession,
  costs: CostLine[],
  price: (r: PricedRef) => number | null,
  rules: SellRules,
  info: { now: number, league: string, divine: number | null, strategy: string }
): SessionRecord {
  const unitPrice = (r: PricedRef) => sellPrice(r, price(r), rules)
  const save = (l: LootLine): SavedLoot => ({ type: l.type, name: l.name, variant: l.variant, qty: l.qty, chaos: unitPrice(l) })
  const runs = (s.runs ?? []).map(r => ({
    areaId: r.areaId,
    name: r.name,
    level: r.level,
    enteredAt: r.enteredAt,
    mapMs: Math.round(r.mapMs),
    otherMs: Math.round(r.otherMs),
    loot: r.loot.filter(l => l.qty > 0).map(save)
  }))
  // Loot not in any run: added before the first map.
  const inRuns = new Map<string, number>()
  for (const r of s.runs ?? []) for (const l of r.loot) inRuns.set(itemKey(l), (inRuns.get(itemKey(l)) ?? 0) + l.qty)
  const loose = s.loot
    .map(l => ({ ...l, qty: l.qty - (inRuns.get(itemKey(l)) ?? 0) }))
    .filter(l => l.qty > 0)
    .map(save)
  return {
    id: `${s.startedAt}-${Math.floor(Math.random() * 1e6)}`,
    league: info.league,
    strategy: (s.strategy || info.strategy).trim(),
    startedAt: s.startedAt,
    endedAt: info.now,
    durationMs: Math.round(elapsed(s, info.now)),
    maps: s.maps,
    costPerMapChaos: lineValue(costs, price).total,
    loot: loose,
    extraChaos: Number(s.extraChaos) || 0,
    divine: info.divine,
    runs
  }
}

// Farming's old history (totals only) as analytics sessions.
export function historyToRecords (history: FarmingResult[], league: string): SessionRecord[] {
  return history.map(h => ({
    id: `history-${h.endedAt}`,
    league,
    strategy: h.strategy,
    startedAt: h.endedAt - h.durationMs,
    endedAt: h.endedAt,
    durationMs: h.durationMs,
    maps: h.maps,
    costPerMapChaos: h.maps ? h.costChaos / h.maps : 0,
    loot: [],
    extraChaos: 0,
    divine: h.divine,
    runs: [],
    imported: { costChaos: h.costChaos, lootChaos: h.lootChaos }
  }))
}

// Switches the map cost list when the strategy name changes to one with
// saved costs. Returns the list to use, or null to keep the current one.
export function costsForStrategy (w: FarmingWidget, strategy: string): CostLine[] | null {
  const saved = w.costsByStrategy?.[strategy.trim()]
  return saved ? saved.map(c => ({ ...c })) : null
}

// Map costs with the scarabs swapped for these. A Farming widget that never
// mounted has no costs yet.
export function withScarabCosts (costs: CostLine[] | undefined, scarabs: CostLine[]): CostLine[] {
  return [...(costs ?? []).filter(c => c.type !== 'Scarab'), ...scarabs]
}

export function rememberCosts (w: FarmingWidget): void {
  const name = w.strategy.trim()
  if (!name) return
  ;(w.costsByStrategy ??= {})[name] = w.costs.map(c => ({ ...c }))
}
