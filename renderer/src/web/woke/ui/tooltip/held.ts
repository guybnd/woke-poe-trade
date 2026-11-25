// How many of an item the last stash read holds, for the tooltip's "You have
// 34" (Guy's pick I9 in the tooltip audit, 2026-11-25). From Net worth's
// cached read: no request to the game's site. Nothing without a read.
import { AppConfig } from '@/web/Config'
import { hostRequest } from '../../shared/host'

interface CachedTabs { tabs: Array<{ items: Array<{ name: string, typeLine: string, frame: number, stack: number }> }> }

const FRESH_MS = 60_000
let cache: { league: string, at: number, counts: Promise<Map<string, number>> } | null = null

// A unique by its name, anything else by its type line ("Orb of Annulment").
export function countHeld (read: CachedTabs | null): Map<string, number> {
  const counts = new Map<string, number>()
  for (const tab of read?.tabs ?? []) {
    for (const item of tab.items) {
      const key = (item.frame === 3 || item.frame === 9 || item.frame === 10) && item.name ? item.name : item.typeLine
      counts.set(key, (counts.get(key) ?? 0) + (item.stack || 1))
    }
  }
  return counts
}

/** The count held, or null with none or no read. */
export async function heldCount (name: string): Promise<number | null> {
  const league = AppConfig().leagueId
  if (!league) return null
  const now = Date.now()
  if (!cache || cache.league !== league || now - cache.at > FRESH_MS) {
    cache = {
      league,
      at: now,
      counts: (hostRequest('stash-cache', { league }) as Promise<CachedTabs | null>).then(countHeld).catch(() => new Map())
    }
  }
  return (await cache.counts).get(name) || null
}
