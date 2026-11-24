// The live run's glance (dock number, Ctrl+Space): before the Runs view has
// been opened, its outside line (sales not collected yet) is worked out from
// the sales file, so it matches what the Runs view shows.
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { emptyRun } from '@/web/woke/net-worth/runs'
import type { Sale } from '@/web/woke/net-worth/sales'
import type { RunGlance } from '@/web/woke/net-worth/runs'

const T0 = Date.now() - 3_600_000
const run = emptyRun('r1', 'L', 'Strand', T0)
const sold: Sale = { id: 's1', at: T0 + 60_000, name: 'The Doctor', typeLine: 'The Doctor', baseType: 'The Doctor', frameType: 6, icon: '', stack: 1, price: { amount: 300, currency: 'chaos' } }
const docs = new Map<string, unknown>([['L-runs', { live: run, done: [] }]])

vi.mock('@/web/woke/shared/host', () => ({
  hostRequest: async (op: string, args: { key?: string, value?: unknown, league?: string }) => {
    if (op === 'doc-get') return docs.get(args.key!) ?? null
    if (op === 'doc-put') { docs.set(args.key!, args.value); return true }
    if (op === 'trade-history') return { league: args.league, readAt: 1, sales: [sold], error: null }
    return null
  }
}))
vi.mock('@/web/woke/ui/layer', () => ({ toast: () => {} }))
vi.mock('@/web/woke/session-story/store', () => ({ readMapDay: async () => [], dayKey: (at: number) => String(Math.floor(at / 86_400_000)) }))
vi.mock('@/web/woke/net-worth/run-time', () => ({ fightsIn: () => 0, runTimeIn: async () => null }))
vi.mock('@/web/woke/net-worth/prices', () => ({ ninjaPriceOf: () => () => null }))
vi.mock('@/web/background/Prices', () => ({
  usePoeninja: () => ({ updatedAt: ref(1), xchgRate: ref(200), findPriceByQuery: () => null })
}))
vi.mock('@/web/background/IPC', () => ({ MainProcess: { onEvent: () => {} } }))

const { recordRunRead, runGlance } = await import('@/web/woke/net-worth/run-store')

describe('run glance', () => {
  it('counts sales not collected yet before the Runs view has opened', async () => {
    const points = [{ at: T0, chaos: 1000, divine: 200, byCategory: { currency: 1000, fragments: 0, cards: 0, gear: 0, other: 0 }, netChaos: null, top: [] }]
    await recordRunRead('L', null, points, 200)
    const g = docs.get('L-run-glance') as RunGlance
    expect(g.faustusChaos).toBe(300)
    expect(runGlance.value?.faustusChaos).toBe(300)
  })
})
