// How many of an item the last stash read holds, for the tooltip's "You have
// 34" (Guy's pick I9 in the tooltip audit, 2026-11-25). From Net worth's
// cached read: no request to the game's site. Nothing without a read.
import { AppConfig } from '@/web/Config'
import { hostRequest } from '../../shared/host'

interface CachedTabs { tabs: Array<{ items: Array<{ name: string, typeLine: string, baseType?: string, frame: number, stack: number }> }> }

const FRESH_MS = 30_000
let cache: { league: string, at: number, counts: Promise<Map<string, number>> } | null = null

// A unique by its name; normal, magic and rare items by their base, so a
// "Superior Strand Map" or a magic one counts as a Strand Map ("Blighted
// Strand Map" stays its own); the rest by type line ("Orb of Annulment").
export function countHeld (read: CachedTabs | null): Map<string, number> {
  const counts = new Map<string, number>()
  for (const tab of read?.tabs ?? []) {
    for (const item of tab.items) {
      const blight = /^(Blighted|Blight-ravaged) /.exec(item.typeLine)?.[0] ?? ''
      const key = (item.frame === 3 || item.frame === 9 || item.frame === 10) && item.name
        ? item.name
        : item.frame <= 2 && item.baseType ? blight + item.baseType : item.typeLine
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
      counts: (hostRequest('stash-cache', { league }) as Promise<CachedTabs | null>).then(countHeld)
    }
    // A failed read is tried again on the next hover.
    const mine = cache
    mine.counts.catch(() => { if (cache === mine) cache = null })
  }
  return (await cache.counts).get(name) || null
}
