// A saved file that's there but can't be read right now (antivirus or a sync
// tool holding it): main's doc-get answers null, doc-get-strict throws. A
// read-change-write must never save over it with nothing; a file that isn't
// there yet (first run) still starts empty.
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { emptyRun } from '@/web/woke/net-worth/runs'

let docs = new Map<string, unknown>()
let locked = false
const puts: string[] = []
vi.mock('@/web/woke/shared/host', () => ({
  hostRequest: async (op: string, args: { key?: string, value?: unknown }) => {
    if (op === 'doc-get') return locked ? null : docs.get(args.key!) ?? null
    if (op === 'doc-get-strict') { if (locked) throw new Error('EBUSY'); return docs.get(args.key!) ?? null }
    if (op === 'doc-put') { puts.push(args.key!); docs.set(args.key!, args.value); return true }
    return null
  }
}))
vi.mock('@/web/woke/ui/layer', () => ({ toast: () => {} }))
vi.mock('@/web/woke/session-story/store', () => ({ readMapDay: async () => [], RECENT_MAPS_KEY: 'recent-maps', NIGHTS_COLLECTION: 'session-story', dayKey: (at: number) => String(Math.floor(at / 86_400_000)) }))
vi.mock('@/web/woke/net-worth/run-time', () => ({ fightsIn: () => 0, runTimeIn: async () => null }))

const past = { ...emptyRun('old', 'L', 'Strand', 1000), stoppedAt: 2000 }

beforeEach(() => {
  docs = new Map<string, unknown>([['L-runs', { live: null, done: [past] }]])
  locked = false
  puts.length = 0
  vi.resetModules()
})

describe('a locked runs file', () => {
  it('starting a run saves nothing over past runs', async () => {
    locked = true
    const { startRun } = await import('@/web/woke/net-worth/run-store')
    await startRun('L', 'Strand', 5000, [], [], 200)
    expect(puts).not.toContain('L-runs')
    expect((docs.get('L-runs') as { done: unknown[] }).done).toHaveLength(1)
  })

  it('no file yet: the first run is saved', async () => {
    docs.clear()
    const { startRun, runsDoc } = await import('@/web/woke/net-worth/run-store')
    await startRun('L', 'Strand', 5000, [], [], 200)
    expect(puts).toContain('L-runs')
    expect(runsDoc.value.live?.name).toBe('Strand')
  })
})

describe('a locked listings file', () => {
  it('a Faustus read saves nothing over it', async () => {
    docs.set('L-pending', { league: 'L', readAt: 1, listings: [{ id: 'x' }], firstSeen: { x: 1 } })
    locked = true
    const { notePendingRead } = await import('@/web/woke/net-worth/pending-store')
    await notePendingRead('L', { at: 10, listings: [] } as never)
    expect(puts).not.toContain('L-pending')
  })
})

describe('a locked gains file', () => {
  it('the strict read throws instead of answering empty', async () => {
    docs.set('L-gains', [{ at: 1 }])
    locked = true
    const { stashGains, stashGainsStrict } = await import('@/web/woke/net-worth/gains')
    expect(await stashGains('L')).toEqual([])
    await expect(stashGainsStrict('L')).rejects.toThrow()
    locked = false
    docs.delete('L-gains')
    expect(await stashGainsStrict('L')).toEqual([])
  })
})
