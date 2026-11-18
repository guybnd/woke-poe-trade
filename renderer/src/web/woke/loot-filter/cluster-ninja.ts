// poe.ninja's cluster jewel prices (one request, ~800 lines), for the loot
// filter's cluster price rules. The app's price download has no cluster
// jewels, so this asks for them when the editor needs prices, at most hourly.
import { shallowRef } from 'vue'
import { Host } from '@/web/background/IPC'
import { readClusterLines } from './cluster-prices'
import type { ClusterPrice, NinjaClusterLine } from './cluster-prices'

export interface ClusterPrices {
  league: string
  ts: number
  prices: ClusterPrice[]
}

export const clusterPrices = shallowRef<ClusterPrices | null>(null)
export const clusterPricesError = shallowRef<string | null>(null)

// poe.ninja updates hourly.
const FRESH_MS = 60 * 60 * 1000
let loading: { league: string, token: object, done: Promise<void> } | null = null
let failed: { league: string, at: number } | null = null

export function loadClusterPrices (league: string | null | undefined): Promise<void> {
  if (!league) return Promise.resolve()
  const have = clusterPrices.value
  if (have && have.league === league && Date.now() - have.ts < FRESH_MS) return Promise.resolve()
  // A failed try waits a few minutes before the next, for that league.
  if (failed?.league === league && Date.now() - failed.at < 5 * 60 * 1000) return Promise.resolve()
  if (loading?.league === league) return loading.done
  const token = {}
  const done = (async () => {
    try {
      const res = await Host.proxy(`poe.ninja/poe1/api/economy/stash/current/item/overview?league=${encodeURIComponent(league)}&type=ClusterJewel`)
      if (!res.ok) throw new Error(`poe.ninja answered ${res.status}`)
      const body = await res.json() as { lines?: NinjaClusterLine[] }
      // Another league picked meanwhile: its own request answers it.
      if (loading?.token !== token) return
      clusterPrices.value = { league, ts: Date.now(), prices: readClusterLines(Array.isArray(body.lines) ? body.lines : []) }
      clusterPricesError.value = null
    } catch (err) {
      if (loading?.token !== token) return
      failed = { league, at: Date.now() }
      clusterPricesError.value = err instanceof Error ? err.message : String(err)
    } finally {
      if (loading?.token === token) loading = null
    }
  })()
  loading = { league, token, done }
  return done
}

// This league's prices, or null.
export function clusterPricesFor (league: string | null | undefined): ClusterPrice[] | null {
  const c = clusterPrices.value
  return c && league && c.league === league ? c.prices : null
}
