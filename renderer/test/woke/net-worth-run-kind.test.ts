import { describe, it, expect, vi } from 'vitest'
import { summarize } from '@/web/woke/net-worth/run-summary'
import { emptyRun } from '@/web/woke/net-worth/runs'
import type { CostLine, Run } from '@/web/woke/net-worth/runs'

const H = 3_600_000
const done = (id: string, startAt: number, profit: number, maps: number, kind?: 'craft', costs: CostLine[] = []): Run => ({
  ...emptyRun(id, 'L', 'Run', startAt),
  stoppedAt: startAt + H,
  costs,
  ...(kind ? { kind } : {}),
  final: { profitChaos: profit, maps, perMapChaos: maps ? profit / maps : null, perHourChaos: profit }
})

const runs = vi.hoisted(() => ({ value: { live: null, done: [] as unknown[] } }))
vi.mock('@/web/woke/ui/layer', () => ({ toast: () => {} }))
vi.mock('@/web/woke/shared/host', () => ({ hostRequest: async () => null }))
vi.mock('@/web/Config', () => ({ AppConfig: () => ({ leagueId: 'L' }) }))
vi.mock('@/web/woke/net-worth/faustus-read', () => ({ readFaustus: async () => ({ at: 0, listings: [] }) }))
vi.mock('@/web/woke/net-worth/run-store', () => ({ loadRuns: async () => {}, runsDoc: runs, startRun: async () => {} }))
vi.mock('@/web/woke/net-worth/sales-store', () => ({ loadSales: async () => {}, rates: { value: {} }, sales: { value: [] } }))
const { lastCostsOf } = await import('@/web/woke/net-worth/run-start')

describe('unnamed map runs and crafting sessions (both "Run")', () => {
  it('a map run is compared with the other map runs, not a crafting session', () => {
    const maps1 = done('a', 0, 3000, 30)
    const craft = done('b', 2 * H, -500, 0, 'craft')
    const run = done('c', 4 * H, 2000, 20)
    const s = summarize({ run, done: [run, craft, maps1], maps: [], profitChaos: 2000, perMapChaos: 100, perHourChaos: 2000, costPerMapChaos: null, runs: 20, time: null, rateTime: 'play', fmt: c => `${c}c` })
    expect(s.usual?.craft).toBeUndefined()
    expect(s.usual?.perMapChaos).toBe(100)
  })

  it("a map run's kit comes from the last map run, not a crafting session", () => {
    const scarab: CostLine = { id: 'k1', name: 'Scarab', key: 'Scarab', qty: 1, unitChaos: 5 }
    const orbs: CostLine = { id: 'k2', name: 'Chaos Orb', key: 'Chaos Orb', qty: 40, unitChaos: 1 }
    runs.value.done = [done('b', 2 * H, -500, 0, 'craft', [orbs]), done('a', 0, 3000, 30, undefined, [scarab])]
    expect(lastCostsOf('').map(c => c.name)).toEqual(['Scarab'])
  })
})
