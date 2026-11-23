// The small doc the dock icon reads at startup (pending.ts writes it with
// each listings read): each listing's id and the first time it was seen, so
// the icon can count stale listings without loading the window.
// Small on purpose: the Net worth shell loads this at startup.
import { shallowRef } from 'vue'

export const DEFAULT_STALE_DAYS = 3
export const DAY_MS = 86_400_000
// Listings refresh by themselves at most this often (on entering your hideout).
export const AUTO_REFRESH_MS = 30 * 60_000

export interface PendingGlance { league: string, readAt: number, items: Array<[id: string, firstAt: number]> }
export const pendingGlanceKey = (league: string) => `${league}-pending-glance`
// The latest glance: the shell loads it, a listings read replaces it.
export const listedGlance = shallowRef<PendingGlance | null>(null)
// The window's sales (sales-store.ts) once it has them, so a Refresh there
// updates the icon's count too.
export const keptSales = shallowRef<{ league: string, sales: ReadonlyArray<{ id: string, at: number }> } | null>(null)

export function isPendingGlance (x: unknown): x is PendingGlance {
  return x != null && typeof x === 'object' && typeof (x as PendingGlance).league === 'string' &&
    typeof (x as PendingGlance).readAt === 'number' && Array.isArray((x as PendingGlance).items)
}

// The item ids that sold after they were first listed.
export function soldOf (firstSeen: Record<string, number>, sales: ReadonlyArray<{ id: string, at: number }>): Set<string> {
  const ids = new Set<string>()
  for (const s of sales) {
    const first = firstSeen[s.id]
    // A minute's slack: the trade history's time and the listing's can differ.
    if (first != null && s.at >= first - 60_000) ids.add(s.id)
  }
  return ids
}

// How many listings passed the stale line and haven't sold.
export function staleCount (g: PendingGlance | null, sales: ReadonlyArray<{ id: string, at: number }>, now: number, staleDays = DEFAULT_STALE_DAYS): number {
  if (!g) return 0
  const sold = soldOf(Object.fromEntries(g.items), sales)
  const staleMs = Math.max(1, staleDays) * DAY_MS
  return g.items.filter(([id, at]) => !sold.has(id) && now - at >= staleMs).length
}
