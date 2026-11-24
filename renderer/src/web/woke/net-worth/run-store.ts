// Strategy runs' state (runs.ts): the run going now and finished ones, one
// small doc per league. Net worth's store feeds each counted read in
// (recordRunRead), so the tally is complete from the start; the Runs view
// reads and edits the rest. No import of store.ts: it imports this.
import { shallowRef } from 'vue'
import { hostRequest } from '../shared/host'
import { toast } from '../ui/layer'
import { readMapDay, dayKey, NIGHTS_COLLECTION, RECENT_MAPS_KEY } from '../session-story/store'
import { isSkippedArea } from '../session-story/skip-areas'
import type { MapRecord } from '../session-story/map-log'
import { addToTally, cleanDoc, compareRows, emptyRun, isLastRun, isRunGlance, lastRunKey, mapsIn, relive, runBoardKey, runGlanceKey, runsKey, runTotals, tallyFrom, topDrop, MAX_DONE_RUNS } from './runs'
import type { CostLine, LivePrice, OnceCost, Outside, Run, RunBoard, RunGlance, RunsDoc } from './runs'
import type { LedgerPoint } from './ledger'
import type { StashDiff } from './valuation'

const COLLECTION = 'net-worth'

export const runsDoc = shallowRef<RunsDoc>({ live: null, done: [] })
// Map instances (enteredAt, leftAt) across the shown run's days.
// The maps of the run the Runs view shows, with that run's id (a read for
// another run never counts against this one).
export const runMaps = shallowRef<{ id: string | null, maps: Array<{ enteredAt: number, leftAt: number }> }>({ id: null, maps: [] })
let loadedFor: string | null = null
let loading: Promise<void> | null = null
let busy: Promise<void> = Promise.resolve()

function queue (fn: () => Promise<void>): Promise<void> {
  busy = busy.then(fn).catch((e) => { console.warn('[runs]', e) })
  return busy
}

// false until the doc has been read: nothing is saved over a doc that
// couldn't be read (it would wipe past runs).
let readOk = false

export function loadRuns (league: string): Promise<void> {
  if (loadedFor === league && loading) return loading
  loadedFor = league
  readOk = false
  runsDoc.value = { live: null, done: [] }
  runGlance.value = null
  const glance = (hostRequest('doc-get', { collection: COLLECTION, key: runGlanceKey(league) }) as Promise<unknown>)
    .then((g) => { if (loadedFor === league && runGlance.value == null && isRunGlance(g) && g.league === league) runGlance.value = g })
    .catch(() => {})
  loading = (hostRequest('doc-get', { collection: COLLECTION, key: runsKey(league) }) as Promise<unknown>)
    .then((d) => { if (loadedFor === league) { runsDoc.value = cleanDoc(d); readOk = true; saveBoard(league, runsDoc.value) } })
    .catch(() => { if (loadedFor === league) loading = null })
    .then(() => glance)
  return loading
}

async function save (league: string, next: RunsDoc): Promise<boolean> {
  if (!readOk || loadedFor !== league) {
    toast("Couldn't read your saved runs. Try again")
    return false
  }
  try {
    await hostRequest('doc-put', { collection: COLLECTION, key: runsKey(league), value: next })
  } catch {
    toast("Couldn't save the run. Try again")
    return false
  }
  if (loadedFor === league) runsDoc.value = next
  saveBoard(league, next)
  return true
}

// Past runs by strategy, small, for Ctrl+Space (no tallies to load there).
// Per hour under each Per hour choice, so the answer follows the setting.
let boardWas = ''
function saveBoard (league: string, doc: RunsDoc) {
  const [play, hub, all] = (['play', 'hub', 'all'] as const).map(t => compareRows(doc.done, t, true))
  const board: RunBoard = {
    league,
    rows: all.map((r, i) => ({
      name: r.name,
      count: r.count,
      maps: r.maps,
      fights: r.fights,
      profitChaos: r.profitChaos,
      perMapChaos: r.perMapChaos,
      perHour: { play: play[i]?.perHourChaos ?? null, hub: hub[i]?.perHourChaos ?? null, all: r.perHourChaos },
      costPerMapChaos: r.costPerMapChaos,
      perMapNoTopChaos: r.perMapNoTopChaos,
      ...(r.top ? { top: r.top } : {}),
      small: r.sample != null
    }))
  }
  const json = JSON.stringify(board)
  if (json === boardWas) return
  boardWas = json
  hostRequest('doc-put', { collection: COLLECTION, key: runBoardKey(league), value: board }).catch(() => { boardWas = '' })
}

// Every map from the start's day to today (map history keeps one file a day).
export async function readRunMaps (run: Run, now: number): Promise<Array<{ enteredAt: number, leftAt: number }>> {
  return (await readRunDays(run, now)).map(m => ({ enteredAt: m.enteredAt, leftAt: m.leftAt }))
}

// The maps in the run itself, whole (time inside, deaths, NPCs), oldest
// first: the run summary's map times.
export async function readRunMapRecords (run: Run, now: number): Promise<MapRecord[]> {
  const end = run.stoppedAt ?? now
  return (await readRunDays(run, now)).filter(m => m.leftAt > run.startAt && m.enteredAt <= end).sort((a, b) => a.enteredAt - b.enteredAt)
}

async function readRunDays (run: Run, now: number): Promise<MapRecord[]> {
  const end = run.stoppedAt ?? now
  // Calendar days (a DST day is 23 or 25 hours).
  const keys: string[] = []
  const d = new Date(run.startAt)
  d.setHours(12, 0, 0, 0)
  for (; ; d.setDate(d.getDate() + 1)) {
    const k = dayKey(Math.min(d.getTime(), end))
    if (!keys.includes(k)) keys.push(k)
    if (d.getTime() >= end || keys.length > 60) break
  }
  // Session story's recent maps too: the same list the glance bar counts, so
  // a day file that can't be read (or isn't written yet) never reads 0.
  const [days, recent] = await Promise.all([
    Promise.all(keys.map(k => readMapDay(k).catch(() => []))),
    readMapDay(RECENT_MAPS_KEY, false, NIGHTS_COLLECTION).catch(() => [])
  ])
  const byKey = new Map<string, MapRecord>()
  for (const m of [...days.flat(), ...recent]) {
    const was = byKey.get(m.key)
    byKey.set(m.key, was ? (m.leftAt > was.leftAt ? m : was) : m)
  }
  return [...byKey.values()].filter(m => !isSkippedArea(m.name))
}

let mapsSeq = 0
export async function refreshRunMaps (run: Run | null, now = Date.now()) {
  const seq = ++mapsSeq
  const maps = run ? await readRunMaps(run, now) : []
  // A newer call (another run opened) wins.
  if (seq === mapsSeq) runMaps.value = { id: run?.id ?? null, maps }
}

// Sales and Faustus listings (faustus.ts) need the sales store, which the
// Runs view loads; it hands its sum in here. Until then a run's last known
// one stands (no import of sales-store here: it isn't loaded at startup).
// The dock's glance works it out itself (glanceOutside), as Stop does.
let outsideFn: ((r: Run) => Outside) | null = null
const lastOutside = new Map<string, Outside>()
export function setOutside (fn: ((r: Run) => Outside) | null) { const was = outsideFn; outsideFn = fn; return was }
function outsideOf (r: Run): Outside | undefined {
  if (outsideFn) {
    const o = outsideFn(r)
    lastOutside.set(r.id, o)
    return o
  }
  return lastOutside.get(r.id)
}

// The live run's outside line for the glance: the Runs view's hook when it's
// open, else the same sum from the sales file (run-stop.ts does this too), so
// the dock and Ctrl+Space agree with the Runs view before it's ever opened.
async function glanceOutside (league: string, r: Run): Promise<Outside | undefined> {
  if (outsideFn) return outsideOf(r)
  try {
    const [store, f] = await Promise.all([import('./sales-store'), import('./faustus')])
    await store.loadSales(league).catch(() => {})
    // The Runs view opened meanwhile: its sum.
    if (outsideFn) return outsideOf(r)
    const o = f.outsideSums(f.outsideTotals(r, store.sales.value, store.rates.value))
    lastOutside.set(r.id, o)
    return o
  } catch {
    return lastOutside.get(r.id)
  }
}

// The live run's fights and where its time went, for its per hour (null
// without Client.txt).
const runSpent = (startAt: number, now: number) => import('./run-time').then(m => m.runTimeIn(startAt, now)).catch(() => null)

// The dock number and Ctrl+Space's answer for the live run (null: none).
async function saveGlance (league: string, run: Run | null, points: readonly LedgerPoint[], divine: number | null) {
  let g: RunGlance | null = null
  if (run) {
    const now = Date.now()
    const logged = await readRunMaps(run, now)
    const maps = mapsIn(run, logged, now)
    // The newest map counted: the glance bar adds the maps logged after it.
    const end = run.stoppedAt ?? now
    const counted = logged.filter(m => m.leftAt > run.startAt && m.enteredAt <= end)
    const lastMapAt = counted.reduce((t, m) => Math.max(t, m.enteredAt), 0)
    // Profit runs to the last read, so its time does too (Start and edits
    // save the glance between reads).
    const timeTo = Math.max(run.startAt, points[points.length - 1]?.at ?? run.startAt)
    const spent = await runSpent(run.startAt, timeTo)
    const fights = spent?.fights ?? 0
    const time = spent?.ms
    const t = runTotals(run, points, { maps, fights }, now, undefined, await glanceOutside(league, run))
    g = { league, name: run.name, startAt: run.startAt, at: now, profitChaos: t.profitChaos, maps, perHourChaos: t.perHourChaos, costPerMapChaos: t.costPerMapChaos, divine }
    if (fights) g.fights = fights
    if (lastMapAt) g.lastMapAt = lastMapAt
    const top = topDrop(run)
    if (top) g.top = top
    if (time) { g.time = time; g.timeTo = timeTo }
    if (t.faustusChaos) g.faustusChaos = t.faustusChaos
  }
  await hostRequest('doc-put', { collection: COLLECTION, key: runGlanceKey(league), value: g }).catch(() => {})
  runGlance.value = g
}
export const runGlance = shallowRef<RunGlance | null>(null)

// A run that just stopped (run-stop.ts): the Runs view opens its summary
// (pick W1) and clears it.
// Only for a minute: a summary nobody opened by then doesn't jump in later.
export const summaryFor = shallowRef<{ id: string, at: number } | null>(null)
export const SUMMARY_FOR_MS = 60_000
// What Stop is doing (run-stop.ts): its final stash read, then your Faustus
// listings. null when no Stop is under way.
export const stopPhase = shallowRef<'stash' | 'listings' | null>(null)
// The newest read recordRunRead has taken in, and the newest read Net worth
// handled at all, counted or skipped (Stop waits for its final read).
export const lastRunReadAt = shallowRef(0)
export const runReadSeen = shallowRef(0)
export function markReadSeen (at: number) { if (at > runReadSeen.value) runReadSeen.value = at }

// Set by run-stop.ts from the press until the run is stopped.
let pendingStop: { id: string, at: number } | null = null
export function setPendingStop (p: { id: string, at: number } | null) { pendingStop = p }

// A counted read (store.ts): into the live run's tally, and its kit lines at
// this read's prices (`price`, pick K1).
export function recordRunRead (league: string, diff: StashDiff | null, points: readonly LedgerPoint[], divine: number | null, price?: LivePrice): Promise<void> {
  return queue(async () => {
    await loadRuns(league)
    const live = runsDoc.value.live
    if (!readOk || !live || live.league !== league) return
    // Stop was pressed and is waiting on its Faustus read: a read after the
    // press is past the run's end (its stash change isn't counted either).
    const cap = pendingStop?.id === live.id ? { ...live, stoppedAt: pendingStop.at } : live
    const added = diff ? addToTally(cap, diff) : cap
    let next = live
    if (added !== cap) {
      next = { ...added }
      if (live.stoppedAt == null) delete next.stoppedAt
      else next.stoppedAt = live.stoppedAt
    }
    // Stop is pending: the kit keeps the prices it had at the press.
    if (price && pendingStop?.id !== live.id) next = relive(next, price)
    if (next !== live) await save(league, { ...runsDoc.value, live: next })
    await saveGlance(league, next, points, divine)
  }).finally(() => {
    const at = points[points.length - 1]?.at ?? 0
    if (at > lastRunReadAt.value) lastRunReadAt.value = at
  })
}

let idSeq = 0
const newId = () => `${Date.now().toString(36)}${(idSeq++).toString(36)}`

// Starts a run at a chart point (the last read for "now"). A run going
// already is stopped first. Earlier reads' changes come from the kept diffs.
// `extra`: what Start read of your Faustus listings (RunsView).
// `price`: today's prices for the kit's live lines (else the next read sets them).
export function startRun (league: string, name: string, startAt: number, diffs: readonly StashDiff[], points: readonly LedgerPoint[], divine: number | null, costs: CostLine[] = [], extra: Pick<Run, 'startListings' | 'faustus' | 'carried' | 'carriedSales' | 'carriedFrom'> = {}, price?: LivePrice) {
  return queue(async () => {
    await loadRuns(league)
    const doc = runsDoc.value
    const done = doc.live ? [await withFinal({ ...doc.live, stoppedAt: doc.live.stoppedAt ?? Date.now() }, points), ...doc.done] : doc.done
    let run = emptyRun(newId(), league, name, startAt)
    run = { ...tallyFrom(run, diffs), costs: costs.map(c => ({ ...c, id: newId() })), ...extra }
    if (!run.tallyPartial) delete run.tallyPartial
    if (price) run = relive(run, price)
    if (await save(league, { live: run, done: done.slice(0, MAX_DONE_RUNS) })) {
      await saveGlance(league, run, points, divine)
      await refreshRunMaps(run)
    }
  })
}

// The totals a stopped run keeps for the past runs list.
async function withFinal (run: Run, points: readonly LedgerPoint[]): Promise<Run> {
  if (run.stoppedAt == null) return run
  const maps = mapsIn(run, await readRunMaps(run, run.stoppedAt), run.stoppedAt)
  // An edit on a past run keeps the time it had (Client.txt may be gone).
  // A Client.txt that no longer covers the run reads as no time at all:
  // the fights it had stand, and no time is saved.
  const read = run.final?.time ? null : await runSpent(run.startAt, run.stoppedAt)
  const spent = read && Object.values(read.ms).some(ms => ms > 0) ? read : null
  const fights = spent ? spent.fights : (run.final?.fights ?? 0)
  const t = runTotals(run, points, { maps, fights }, run.stoppedAt, undefined, outsideOf(run))
  const final: Run['final'] = { profitChaos: t.profitChaos, maps, perMapChaos: t.perMapChaos, perHourChaos: t.perHourChaos, stashChaos: t.stashChaos }
  if (fights) final.fights = fights
  const time = spent?.ms ?? run.final?.time
  if (time) final.time = time
  if (t.faustusChaos) final.faustusChaos = t.faustusChaos
  return { ...run, final }
}

// `id` and `at`: the run and the moment Stop was pressed (a read in between
// doesn't move them).
export function stopRun (league: string, points: readonly LedgerPoint[], divine: number | null, id?: string, at = Date.now()) {
  return queue(async () => {
    await loadRuns(league)
    const live = runsDoc.value.live
    if (!live || (id != null && live.id !== id)) return
    const stopped = await withFinal({ ...live, stoppedAt: Math.max(live.startAt, at) }, points)
    if (await save(league, { live: null, done: [stopped, ...runsDoc.value.done].slice(0, MAX_DONE_RUNS) })) {
      await saveGlance(league, null, points, divine)
    }
  })
}

// Edits the live run or a finished one (by id).
export function editRun (league: string, id: string, fn: (r: Run) => Run, points: readonly LedgerPoint[], divine: number | null) {
  return queue(async () => {
    await loadRuns(league)
    const doc = runsDoc.value
    const done = await Promise.all(doc.done.map(r => r.id === id ? withFinal(fn(r), points) : r))
    const next: RunsDoc = { live: doc.live?.id === id ? fn(doc.live) : doc.live, done }
    // No points (Net worth not loaded yet): the glance would read 0.
    if (await save(league, next) && next.live?.id === id && points.length) await saveGlance(league, next.live, points, divine)
  })
}

export function deleteRun (league: string, id: string) {
  return queue(async () => {
    await loadRuns(league)
    const doc = runsDoc.value
    await save(league, { live: doc.live, done: doc.done.filter(r => r.id !== id) })
    // Ctrl+Space's last run, if it was this one.
    const last = await (hostRequest('doc-get', { collection: COLLECTION, key: lastRunKey(league) }) as Promise<unknown>).catch(() => null)
    if (isLastRun(last) && last.id === id) await hostRequest('doc-put', { collection: COLLECTION, key: lastRunKey(league), value: null }).catch(() => {})
  })
}

export function addCost (r: Run, c: Omit<CostLine, 'id'>): Run {
  return { ...r, costs: [...r.costs, { ...c, id: newId() }] }
}
export function addOnce (r: Run, o: Omit<OnceCost, 'id'>): Run {
  return { ...r, once: [...r.once, { ...o, id: newId() }] }
}
