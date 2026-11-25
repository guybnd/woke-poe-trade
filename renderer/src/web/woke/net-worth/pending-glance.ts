// The small doc the dock icon reads at startup (pending.ts writes it with
// each listings read): each listing's id and the first time it was seen, so
// the icon can count stale listings without loading the window.
// Small on purpose: the Net worth shell loads this at startup.
import { shallowRef } from 'vue'

export const DEFAULT_STALE_DAYS = 3
export const DAY_MS = 86_400_000
// Listings refresh by themselves at most this often (on entering your hideout).
export const AUTO_REFRESH_MS = 30 * 60_000

// `amount`, `currency`: the ask (glances saved before them lack it).
export interface PendingGlance { league: string, readAt: number, items: Array<[id: string, firstAt: number, amount?: number, currency?: string]> }
export const pendingGlanceKey = (league: string) => `${league}-pending-glance`
// The latest glance: the shell loads it, a listings read replaces it.
export const listedGlance = shallowRef<PendingGlance | null>(null)
// The window's sales (sales-store.ts) once it has them, so a Refresh there
// updates the icon's count too.
// The dock card's Show: the Listed tab opens on its Stale chip.
export const listedOpenStale = shallowRef(false)
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

const firstSeenOf = (g: PendingGlance) => Object.fromEntries(g.items.map(([id, at]) => [id, at]))

// How many listings passed the stale line and haven't sold. `out`: the ones
// you left out (line-out-store.ts), as the Listed view leaves them out.
export function staleIds (g: PendingGlance | null, sales: ReadonlyArray<{ id: string, at: number }>, now: number, staleDays = DEFAULT_STALE_DAYS, out: ReadonlySet<string> = new Set()): string[] {
  if (!g) return []
  const sold = soldOf(firstSeenOf(g), sales)
  const staleMs = Math.max(1, staleDays) * DAY_MS
  return g.items.filter(([id, at]) => !sold.has(id) && !out.has(id) && now - at >= staleMs).map(([id]) => id)
}
export function staleCount (g: PendingGlance | null, sales: ReadonlyArray<{ id: string, at: number }>, now: number, staleDays = DEFAULT_STALE_DAYS): number {
  return staleIds(g, sales, now, staleDays).length
}

// What each listing counts for in the total (pending.ts rowWorth), as the
// window last priced them. The dock card goes by the listings glance (new
// listings at their ask, taken-down ones gone, sold ones out by when they
// were first listed), so its total matches the window's with the At Faustus
// box ticked.
export interface ListedWorth { league: string, at: number, items: Array<[id: string, chaos: number]> }
export const listedWorthKey = (league: string) => `${league}-listed-worth`
export const listedWorth = shallowRef<ListedWorth | null>(null)

export function isListedWorth (x: unknown): x is ListedWorth {
  return x != null && typeof x === 'object' && typeof (x as ListedWorth).league === 'string' &&
    typeof (x as ListedWorth).at === 'number' && Array.isArray((x as ListedWorth).items)
}

// The unsold listings' worth: the window's price, else the ask.
// `out`: listings you left out (line-out-store.ts) count for nothing.
export function listedTotal (g: PendingGlance | null, w: ListedWorth | null, sales: ReadonlyArray<{ id: string, at: number }>, divine: number | null, out: ReadonlySet<string> = new Set()): number {
  if (!g) return 0
  const worth = new Map(w && w.league === g.league ? w.items : [])
  const sold = soldOf(firstSeenOf(g), sales)
  let sum = 0
  for (const [id, , amount, currency] of g.items) {
    if (sold.has(id) || out.has(id)) continue
    const known = worth.get(id)
    if (known != null) sum += known
    else if (amount != null && currency === 'chaos') sum += amount
    else if (amount != null && currency === 'divine' && divine) sum += amount * divine
  }
  return sum
}
