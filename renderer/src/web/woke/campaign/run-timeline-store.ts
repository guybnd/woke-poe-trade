// Keeps the current run's timeline and saves it to its own file. Only the
// run being recorded stays in memory; past runs' timelines are read on demand.

import { shallowRef } from 'vue'
import { hostRequest } from '../shared/host'
import { lineTime } from './log-tail'
import { TIMELINE_COLLECTION, asTimeline, dropRouteStepsFrom, newTimeline, rebuildTimeline, recordRouteStep, recordStep } from './run-timeline'
import type { RunTimeline, TimelineInput } from './run-timeline'
import type { CampaignRun } from './run-timer'

const SAVE_DELAY_MS = 3000

export async function loadTimeline (runId: number): Promise<RunTimeline | null> {
  try {
    return asTimeline(await hostRequest('doc-get', { collection: TIMELINE_COLLECTION, key: String(runId) }), runId)
  } catch {
    return null
  }
}

function putTimeline (tl: RunTimeline): Promise<unknown> {
  return hostRequest('doc-put', { collection: TIMELINE_COLLECTION, key: String(tl.runId), value: tl })
}

export function deleteTimelines (runIds: number[]): Promise<unknown> {
  return Promise.all(runIds.map(id =>
    hostRequest('doc-delete', { collection: TIMELINE_COLLECTION, key: String(id) }).catch(() => false)))
}

// True only when the run has no timeline file at all. A file that is there
// but can't be read now (locked, or the app didn't answer) is not missing,
// so it is never rebuilt over.
export async function timelineMissing (runId: number): Promise<boolean> {
  try {
    return !(await hostRequest('doc-exists', { collection: TIMELINE_COLLECTION, key: String(runId) }))
  } catch {
    return false
  }
}

// A run saved before timelines existed, rebuilt from Client.txt and saved.
// An empty result is saved too, so a run the log no longer has isn't read
// for again. Null when Client.txt can't be read right now.
export async function rebuildFromLog (run: CampaignRun): Promise<RunTimeline | null> {
  const to = run.endedAt ?? (run.startedAt + Math.max(run.elapsedMs, 0) + 7 * 24 * 3600_000)
  let res: { path: string | null, lines: string[] }
  try {
    res = await hostRequest('game-log-range', { from: run.startedAt - 1000, to }, 120_000)
  } catch {
    return null
  }
  if (!res.path) return null
  const lines: Array<{ line: string, at: number }> = []
  for (const line of res.lines) {
    const at = lineTime(line)
    if (at != null) lines.push({ line, at })
  }
  const tl = rebuildTimeline(run, lines)
  await putTimeline(tl).catch(() => {})
  return tl
}

type Change = (tl: RunTimeline) => boolean

// One run's timeline. Its saved copy is read first; changes that arrive
// meanwhile wait in `queued`, and still land in this run's file if another
// run has started by the time the read finishes (start-up catch-up can end
// one run and start the next in a single batch).
interface Slot {
  id: number
  tl: RunTimeline | null
  queued: Change[] | null
  dirty: boolean
  timer: ReturnType<typeof setTimeout> | null
}

function save (slot: Slot) {
  if (slot.timer) { clearTimeout(slot.timer); slot.timer = null }
  if (!slot.dirty || !slot.tl || slot.queued) return
  slot.dirty = false
  putTimeline(slot.tl).catch(() => { slot.dirty = true })
}

function saveSoon (slot: Slot) {
  slot.dirty = true
  if (!slot.timer) slot.timer = setTimeout(() => save(slot), SAVE_DELAY_MS)
}

export function timelineRecorder () {
  let cur: Slot | null = null
  // Moves on every change to the live timeline, so a view of it can redraw.
  const rev = shallowRef(0)

  function open (id: number): Slot {
    if (cur) save(cur)
    const slot: Slot = { id, tl: null, queued: [], dirty: false, timer: null }
    cur = slot
    loadTimeline(id).then(saved => {
      const tl = slot.tl = saved ?? newTimeline(id)
      const changes = slot.queued ?? []
      slot.queued = null
      let changed = false
      for (const change of changes) if (change(tl)) changed = true
      rev.value++
      if (!changed) return
      // A run that's no longer recorded is written now.
      if (slot === cur) saveSoon(slot)
      else { slot.dirty = true; save(slot) }
    })
    return slot
  }

  function apply (id: number, change: Change) {
    const slot = cur?.id === id ? cur : open(id)
    if (slot.queued) { slot.queued.push(change); return }
    if (slot.tl && change(slot.tl)) {
      rev.value++
      saveSoon(slot)
    }
  }

  return {
    rev,
    // Records one step of run `id` at run time `runMs`, from a line written at `at`.
    record (id: number, input: TimelineInput, runMs: number, at: number) {
      apply(id, tl => recordStep(tl, input, runMs, at))
    },
    // Campaign card step `index` of run `id` finished at run time `runMs`.
    routeStep (id: number, index: number, text: string, runMs: number) {
      apply(id, tl => recordRouteStep(tl, index, text, runMs))
    },
    // Stepped back to `index` on the campaign card.
    routeBack (id: number, index: number) {
      apply(id, tl => dropRouteStepsFrom(tl, index))
    },
    // Writes now (a run ended, or the widget is going away). A timeline still
    // being read is written once the read finishes.
    flush () { if (cur) save(cur) },
    // The live timeline of run `id`, if it's the one being recorded.
    current (id: number): RunTimeline | null {
      return cur?.id === id && !cur.queued ? cur.tl : null
    }
  }
}
