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

export function timelineRecorder () {
  let tl: RunTimeline | null = null
  let runId: number | null = null
  // Steps that arrive while the saved timeline is still being read.
  let queued: Array<[TimelineInput, number, number]> | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let dirty = false

  function save () {
    if (timer) { clearTimeout(timer); timer = null }
    if (!dirty || !tl || queued) return
    dirty = false
    hostRequest('doc-put', { collection: TIMELINE_COLLECTION, key: String(tl.runId), value: tl }).catch(() => { dirty = true })
  }

  function saveSoon () {
    dirty = true
    if (!timer) timer = setTimeout(save, SAVE_DELAY_MS)
  }

  function open (id: number) {
    save()
    runId = id
    tl = null
    queued = []
    loadTimeline(id).then(saved => {
      if (runId !== id) return
      tl = saved ?? newTimeline(id)
      const steps = queued ?? []
      queued = null
      let changed = false
      for (const [input, runMs, at] of steps) if (recordStep(tl, input, runMs, at)) changed = true
      if (changed) saveSoon()
    })
  }

  return {
    // Records one step of run `id` at run time `runMs`, from a line written at `at`.
    record (id: number, input: TimelineInput, runMs: number, at: number) {
      if (id !== runId) open(id)
      if (queued) { queued.push([input, runMs, at]); return }
      if (tl && recordStep(tl, input, runMs, at)) saveSoon()
    },
    // Writes now (a run ended, or the widget is going away).
    flush: save,
    // The live timeline of run `id`, if it's the one being recorded.
    current (id: number): RunTimeline | null {
      return id === runId && !queued ? tl : null
    }
  }
}
