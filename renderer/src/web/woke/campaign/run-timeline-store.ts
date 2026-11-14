// Keeps the current run's timeline and saves it to its own file. Only the
// run being recorded stays in memory; past runs' timelines are read on demand.

import { hostRequest } from '../shared/host'
import { TIMELINE_COLLECTION, asTimeline, newTimeline, recordStep } from './run-timeline'
import type { RunTimeline, TimelineInput } from './run-timeline'

const SAVE_DELAY_MS = 3000

export async function loadTimeline (runId: number): Promise<RunTimeline | null> {
  try {
    return asTimeline(await hostRequest('doc-get', { collection: TIMELINE_COLLECTION, key: String(runId) }), runId)
  } catch {
    return null
  }
}

export function deleteTimelines (runIds: number[]): Promise<unknown> {
  return Promise.all(runIds.map(id =>
    hostRequest('doc-delete', { collection: TIMELINE_COLLECTION, key: String(id) }).catch(() => false)))
}

type Step = [TimelineInput, number, number]

// One run's timeline. Its saved copy is read first; steps that arrive
// meanwhile wait in `queued`, and still land in this run's file if another
// run has started by the time the read finishes (start-up catch-up can end
// one run and start the next in a single batch).
interface Slot {
  id: number
  tl: RunTimeline | null
  queued: Step[] | null
  dirty: boolean
  timer: ReturnType<typeof setTimeout> | null
}

function save (slot: Slot) {
  if (slot.timer) { clearTimeout(slot.timer); slot.timer = null }
  if (!slot.dirty || !slot.tl || slot.queued) return
  slot.dirty = false
  hostRequest('doc-put', { collection: TIMELINE_COLLECTION, key: String(slot.id), value: slot.tl }).catch(() => { slot.dirty = true })
}

function saveSoon (slot: Slot) {
  slot.dirty = true
  if (!slot.timer) slot.timer = setTimeout(() => save(slot), SAVE_DELAY_MS)
}

export function timelineRecorder () {
  let cur: Slot | null = null

  function open (id: number): Slot {
    if (cur) save(cur)
    const slot: Slot = { id, tl: null, queued: [], dirty: false, timer: null }
    cur = slot
    loadTimeline(id).then(saved => {
      const tl = slot.tl = saved ?? newTimeline(id)
      const steps = slot.queued ?? []
      slot.queued = null
      let changed = false
      for (const [input, runMs, at] of steps) if (recordStep(tl, input, runMs, at)) changed = true
      if (!changed) return
      // A run that's no longer recorded is written now.
      if (slot === cur) saveSoon(slot)
      else { slot.dirty = true; save(slot) }
    })
    return slot
  }

  return {
    // Records one step of run `id` at run time `runMs`, from a line written at `at`.
    record (id: number, input: TimelineInput, runMs: number, at: number) {
      const slot = cur?.id === id ? cur : open(id)
      if (slot.queued) { slot.queued.push([input, runMs, at]); return }
      if (slot.tl && recordStep(slot.tl, input, runMs, at)) saveSoon(slot)
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
