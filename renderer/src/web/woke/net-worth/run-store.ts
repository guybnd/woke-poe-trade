// Strategy runs' state (runs.ts): the run going now and finished ones, one
// small doc per league. Net worth's store feeds each counted read in
// (recordRunRead), so the tally is complete from the start; the Runs view
// reads and edits the rest. No import of store.ts: it imports this.
import { shallowRef } from 'vue'
import { hostRequest } from '../shared/host'
import { toast } from '../ui/layer'
import { readMapDay, dayKey } from '../session-story/store'
import { isSkippedArea } from '../session-story/skip-areas'
import { addToTally, cleanDoc, emptyRun, isRunGlance, mapsIn, runGlanceKey, runsKey, runTotals, tallyFrom, MAX_DONE_RUNS } from './runs'
import type { CostLine, OnceCost, Outside, Run, RunGlance, RunsDoc } from './runs'
import type { LedgerPoint } from './ledger'
import type { StashDiff } from './valuation'

const COLLECTION = 'net-worth'

export const runsDoc = shallowRef<RunsDoc>({ live: null, done: [] })
// Map instances (enteredAt, leftAt) across the shown run's days.
export const runMaps = shallowRef<Array<{ enteredAt: number, leftAt: number }>>([])
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
    .then((d) => { if (loadedFor === league) { runsDoc.value = cleanDoc(d); readOk = true } })
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
  return true
}

// Every map from the start's day to today (map history keeps one file a day).
export async function readRunMaps (run: Run, now: number): Promise<Array<{ enteredAt: number, leftAt: number }>> {
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
  const days = await Promise.all(keys.map(k => readMapDay(k).catch(() => [])))
  return days.flat().filter(m => !isSkippedArea(m.name)).map(m => ({ enteredAt: m.enteredAt, leftAt: m.leftAt }))
}

let mapsSeq = 0
export async function refreshRunMaps (run: Run | null, now = Date.now()) {
  const seq = ++mapsSeq
  const maps = run ? await readRunMaps(run, now) : []
  // A newer call (another run opened) wins.
  if (seq === mapsSeq) runMaps.value = maps
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

// Boss fights from Client.txt (run-time.ts, loaded when first needed).
const runFights = (startAt: number, now: number) => import('./run-time').then(m => m.fightsIn(startAt, now)).catch(() => 0)

// The dock number and Ctrl+Space's answer for the live run (null: none).
async function saveGlance (league: string, run: Run | null, points: readonly LedgerPoint[], divine: number | null) {
  let g: RunGlance | null = null
  if (run) {
    const now = Date.now()
    const maps = mapsIn(run, await readRunMaps(run, now), now)
    const fights = await runFights(run.startAt, now)
    const t = runTotals(run, points, { maps, fights }, now, undefined, await glanceOutside(league, run))
    g = { league, name: run.name, startAt: run.startAt, at: now, profitChaos: t.profitChaos, maps, perHourChaos: t.perHourChaos, costPerMapChaos: t.costPerMapChaos, divine }
    if (fights) g.fights = fights
    if (t.faustusChaos) g.faustusChaos = t.faustusChaos
  }
  await hostRequest('doc-put', { collection: COLLECTION, key: runGlanceKey(league), value: g }).catch(() => {})
  runGlance.value = g
}
export const runGlance = shallowRef<RunGlance | null>(null)

// A counted read (store.ts): into the live run's tally.
export function recordRunRead (league: string, diff: StashDiff | null, points: readonly LedgerPoint[], divine: number | null): Promise<void> {
  return queue(async () => {
    await loadRuns(league)
    const live = runsDoc.value.live
    if (!readOk || !live || live.league !== league) return
    const next = diff ? addToTally(live, diff) : live
    if (next !== live) await save(league, { ...runsDoc.value, live: next })
    await saveGlance(league, next, points, divine)
  })
}

let idSeq = 0
const newId = () => `${Date.now().toString(36)}${(idSeq++).toString(36)}`

// Starts a run at a chart point (the last read for "now"). A run going
// already is stopped first. Earlier reads' changes come from the kept diffs.
// `extra`: what Start read of your Faustus listings (RunsView).
export function startRun (league: string, name: string, startAt: number, diffs: readonly StashDiff[], points: readonly LedgerPoint[], divine: number | null, costs: CostLine[] = [], extra: Pick<Run, 'startListings' | 'faustus' | 'carried' | 'carriedSales' | 'carriedFrom'> = {}) {
  return queue(async () => {
    await loadRuns(league)
    const doc = runsDoc.value
    const done = doc.live ? [await withFinal({ ...doc.live, stoppedAt: doc.live.stoppedAt ?? Date.now() }, points), ...doc.done] : doc.done
    let run = emptyRun(newId(), league, name, startAt)
    run = { ...tallyFrom(run, diffs), costs: costs.map(c => ({ ...c, id: newId() })), ...extra }
    if (!run.tallyPartial) delete run.tallyPartial
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
  const fights = await runFights(run.startAt, run.stoppedAt)
  const t = runTotals(run, points, { maps, fights }, run.stoppedAt, undefined, outsideOf(run))
  const final: Run['final'] = { profitChaos: t.profitChaos, maps, perMapChaos: t.perMapChaos, perHourChaos: t.perHourChaos }
  if (fights) final.fights = fights
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
  })
}

export function addCost (r: Run, c: Omit<CostLine, 'id'>): Run {
  return { ...r, costs: [...r.costs, { ...c, id: newId() }] }
}
export function addOnce (r: Run, o: Omit<OnceCost, 'id'>): Run {
  return { ...r, once: [...r.once, { ...o, id: newId() }] }
}
