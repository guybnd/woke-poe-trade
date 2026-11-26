// The editor's undo steps (Changes tab) and save points, kept in their own file
// (<userData>/woke-docs/loot-filter/history.json) instead of the settings
// file. With a few price applies in them they run to hundreds of KB, and the
// settings file is sent and written whole on every save of any setting.
import { shallowRef, toRaw } from 'vue'
import { hostRequest } from '../shared/host'
import { emptyTimeline, normalizeTimeline } from './timeline'
import type { Timeline } from './timeline'
import { isValidEdit } from './edits'
import type { SavePoint } from './widget'

export const HISTORY_DOC = { collection: 'loot-filter', key: 'history' } as const

// Each filter profile keeps its own steps and save points. The first profile
// (what was there before profiles) keeps the file it always had.
export function historyDocFor (profileId: number): { collection: string, key: string } {
  return profileId <= 1 ? HISTORY_DOC : { collection: HISTORY_DOC.collection, key: `history-${profileId}` }
}
// Changes come in bursts (a slider): write once they settle.
export const HISTORY_SAVE_DELAY_MS = 1000

type Request = (op: string, args: Record<string, unknown>) => Promise<unknown>

export function normalizeSaves (x: unknown): SavePoint[] {
  if (!Array.isArray(x)) return []
  return x.filter((s): s is SavePoint => s != null && typeof s.ts === 'number' && typeof s.label === 'string' &&
    Array.isArray(s.edits) && s.edits.every(isValidEdit) &&
    Array.isArray(s.moves) && s.moves.every((m: { type?: unknown, base?: unknown }) => m && typeof m.type === 'string' && typeof m.base === 'string'))
}

export interface Legacy {
  // What an older version kept in the widget's settings, or undefined.
  read: () => { timeline?: unknown, history?: unknown }
  // Takes it out of the settings once the file holds it.
  drop: () => void
}

export function useFilterHistory (legacy: Legacy, request: Request = hostRequest as unknown as Request, startDoc: { collection: string, key: string } = HISTORY_DOC) {
  let docRef = startDoc
  const timeline = shallowRef<Timeline>(emptyTimeline())
  const saves = shallowRef<SavePoint[]>([])
  let loaded = false
  // The file is there but couldn't be read: never write over it this run.
  let readOnly = false
  let timer: ReturnType<typeof setTimeout> | undefined

  async function flush (): Promise<void> {
    clearTimeout(timer)
    timer = undefined
    if (!loaded || readOnly) return
    await request('doc-put', { ...docRef, value: { timeline: toRaw(timeline.value), saves: toRaw(saves.value) } })
  }

  function changed () {
    if (!loaded || readOnly) return
    clearTimeout(timer)
    timer = setTimeout(() => { flush().catch(() => {}) }, HISTORY_SAVE_DELAY_MS)
  }

  async function load () {
    // Older settings only ever held the first profile's steps.
    const old: ReturnType<Legacy['read']> = docRef.key === HISTORY_DOC.key ? legacy.read() : {}
    const hasLegacy = old.timeline != null || old.history != null
    let file = null as { timeline?: unknown, saves?: unknown } | null
    try {
      // Null when there's no file, or a broken one (main keeps it aside).
      file = await request('doc-get-strict', docRef) as typeof file
    } catch {
      // There, but can't be read right now (locked): work from memory this run.
      readOnly = true
      if (hasLegacy) {
        timeline.value = normalizeTimeline(old.timeline)
        saves.value = normalizeSaves(old.history)
      }
      loaded = true
      return
    }
    if (file != null && typeof file === 'object') {
      timeline.value = normalizeTimeline(file.timeline)
      saves.value = normalizeSaves(file.saves)
      loaded = true
      // Already moved; an older copy of the settings brought it back.
      if (hasLegacy) legacy.drop()
      return
    }
    // First run with the file: move what the settings held.
    timeline.value = normalizeTimeline(old.timeline)
    saves.value = normalizeSaves(old.history)
    loaded = true
    if (!hasLegacy) return
    try {
      await flush()
      legacy.drop()
    } catch {
      // Stays in the settings until a later run can write the file.
    }
  }

  let ready = load()

  // Another profile: write what's waiting for this one, then read that one's.
  async function switchTo (next: { collection: string, key: string }) {
    if (next.key === docRef.key && next.collection === docRef.collection) return
    await ready.catch(() => {})
    await flush().catch(() => {})
    docRef = next
    loaded = false
    readOnly = false
    timeline.value = emptyTimeline()
    saves.value = []
    ready = load()
    await ready
  }

  return {
    timeline,
    saves,
    get ready () { return ready },
    switchTo,
    isLoaded: () => loaded,
    setTimeline (t: Timeline) { timeline.value = t; changed() },
    setSaves (s: SavePoint[]) { saves.value = s; changed() },
    flush,
    pending: () => timer != null
  }
}
