// The recorder: a run that ends while its saved timeline is still being read
// keeps the steps from the start-up catch-up.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const files = new Map<string, unknown>()
vi.mock('@/web/woke/shared/host', () => ({
  hostRequest: async (op: string, args: { key: string, value?: unknown }) => {
    await new Promise(resolve => setTimeout(resolve, 5))
    if (op === 'doc-get') return files.get(args.key) ?? null
    if (op === 'doc-put') { files.set(args.key, JSON.parse(JSON.stringify(args.value))); return true }
    return true
  }
}))

const { timelineRecorder } = await import('@/web/woke/campaign/run-timeline-store')
const { newTimeline, recordStep } = await import('@/web/woke/campaign/run-timeline')

beforeEach(() => { files.clear() })

describe('timeline recorder', () => {
  it('saves both runs when one batch ends a run and starts the next', async () => {
    const old = newTimeline(1)
    recordStep(old, { kind: 'area', areaId: '1_1_1' }, 0, 1000)
    files.set('1', old)
    const rec = timelineRecorder()
    rec.record(1, { kind: 'area', areaId: '1_1_town' }, 60_000, 2000)
    rec.flush()
    rec.record(2, { kind: 'area', areaId: '1_1_1' }, 0, 3000)
    await new Promise(resolve => setTimeout(resolve, 50))
    const saved = files.get('1') as typeof old
    expect(saved.zones.map(z => z[0])).toEqual(['1_1_1', '1_1_town'])
    expect(rec.current(2)?.zones.map(z => z[0])).toEqual(['1_1_1'])
  })
})
