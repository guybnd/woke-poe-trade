// The loot filter's undo steps and save points live in their own file, and
// move there from the settings of older versions.
import { describe, expect, it, vi } from 'vitest'
import { HISTORY_DOC, HISTORY_SAVE_DELAY_MS, useFilterHistory } from '@/web/woke/loot-filter/history-file'
import type { Timeline } from '@/web/woke/loot-filter/timeline'

const KEY = `${HISTORY_DOC.collection}/${HISTORY_DOC.key}`
const step = (n: number) => ({ ts: n, label: `step ${n}`, before: { edits: [] }, after: { edits: [] } })
const timeline = (n: number): Timeline => ({ steps: Array.from({ length: n }, (_, i) => step(i + 1)), at: n })
const save = (ts: number) => ({ ts, label: 'saved', edits: [], moves: [] })

function fakeDocs (start: Record<string, unknown> = {}, opts: { locked?: boolean, putFails?: boolean } = {}) {
  const docs = new Map(Object.entries(start))
  const puts: unknown[] = []
  const request = async (op: string, args: Record<string, unknown>) => {
    const key = `${String(args.collection)}/${String(args.key)}`
    if (op === 'doc-get-strict') {
      if (opts.locked) throw new Error('EBUSY')
      return docs.get(key) ?? null
    }
    if (op === 'doc-put') {
      if (opts.putFails) throw new Error('EPERM')
      puts.push(args.value)
      docs.set(key, JSON.parse(JSON.stringify(args.value)))
      return true
    }
    throw new Error(op)
  }
  return { docs, puts, request }
}

function legacyOf (cfg: { timeline?: unknown, history?: unknown }) {
  return { read: () => ({ timeline: cfg.timeline, history: cfg.history }), drop: vi.fn(() => { delete cfg.timeline; delete cfg.history }) }
}

describe('loot filter history file', () => {
  it('moves the steps and saves out of old settings, then drops them from the settings', async () => {
    const cfg: { timeline?: unknown, history?: unknown } = { timeline: timeline(3), history: [save(5)] }
    const legacy = legacyOf(cfg)
    const host = fakeDocs()
    const h = useFilterHistory(legacy, host.request)
    await h.ready
    expect(h.timeline.value.steps).toHaveLength(3)
    expect(h.saves.value).toHaveLength(1)
    expect(host.docs.get(KEY)).toEqual({ timeline: timeline(3), saves: [save(5)] })
    expect(legacy.drop).toHaveBeenCalled()
    expect(cfg).toEqual({})
  })

  it('keeps the old settings when the file can not be written', async () => {
    const cfg = { timeline: timeline(2), history: [] }
    const legacy = legacyOf(cfg)
    const h = useFilterHistory(legacy, fakeDocs({}, { putFails: true }).request)
    await h.ready
    expect(h.timeline.value.steps).toHaveLength(2)
    expect(legacy.drop).not.toHaveBeenCalled()
  })

  it('reads the file, and drops a copy an older settings file brought back', async () => {
    const cfg = { timeline: timeline(1) }
    const legacy = legacyOf(cfg)
    const host = fakeDocs({ [KEY]: { timeline: timeline(4), saves: [save(1), save(2)] } })
    const h = useFilterHistory(legacy, host.request)
    await h.ready
    expect(h.timeline.value.steps).toHaveLength(4)
    expect(h.saves.value).toHaveLength(2)
    expect(legacy.drop).toHaveBeenCalled()
    expect(host.puts).toEqual([])
  })

  it('never writes over a file it could not read', async () => {
    vi.useFakeTimers()
    try {
      const host = fakeDocs({ [KEY]: { timeline: timeline(4), saves: [] } }, { locked: true })
      const h = useFilterHistory(legacyOf({}), host.request)
      await h.ready
      h.setTimeline(timeline(1))
      await vi.advanceTimersByTimeAsync(HISTORY_SAVE_DELAY_MS * 2)
      expect(host.puts).toEqual([])
      expect(host.docs.get(KEY)).toEqual({ timeline: timeline(4), saves: [] })
    } finally {
      vi.useRealTimers()
    }
  })

  it('starts over from a broken file (main moved it aside), keeping the steps from old settings', async () => {
    const cfg = { timeline: timeline(2) }
    const legacy = legacyOf(cfg)
    // A broken file reads as nothing.
    const host = fakeDocs()
    const h = useFilterHistory(legacy, host.request)
    await h.ready
    expect(h.timeline.value.steps).toHaveLength(2)
    expect(host.puts).toHaveLength(1)
  })

  it('writes once a burst of changes settles', async () => {
    vi.useFakeTimers()
    try {
      const host = fakeDocs()
      const h = useFilterHistory(legacyOf({}), host.request)
      await h.ready
      h.setTimeline(timeline(1))
      h.setTimeline(timeline(2))
      h.setSaves([save(9)])
      expect(host.puts).toEqual([])
      await vi.advanceTimersByTimeAsync(HISTORY_SAVE_DELAY_MS)
      expect(host.puts).toEqual([{ timeline: timeline(2), saves: [save(9)] }])
    } finally {
      vi.useRealTimers()
    }
  })

  it('starts empty on a fresh install', async () => {
    const h = useFilterHistory(legacyOf({}), fakeDocs().request)
    await h.ready
    expect(h.timeline.value).toEqual({ steps: [], at: 0 })
    expect(h.saves.value).toEqual([])
  })
})
