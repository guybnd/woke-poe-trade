// A strategy's results from Net worth's run board (past runs grouped by name).
import type { RunBoard } from '../net-worth/runs'
import type { RateTime } from '../shared/rate-time'

export interface StrategyEarning { runs: number, maps: number, perHour: number | null, perMap: number | null }

export function earningsFrom (b: RunBoard | null, time: RateTime): Map<string, StrategyEarning> {
  const out = new Map<string, StrategyEarning>()
  for (const r of b?.rows ?? []) {
    out.set(r.name, { runs: r.count, maps: r.maps + r.fights, perHour: r.perHour[time] ?? null, perMap: r.perMapChaos })
  }
  return out
}
