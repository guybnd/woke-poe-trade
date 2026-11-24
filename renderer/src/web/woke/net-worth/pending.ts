// Pending sales: what you have listed at Faustus and haven't sold yet, how
// long each has sat, what it asks against poe.ninja, and a suggested price
// where poe.ninja's is one to trust (Guy, 2026-11-23).
//
// The listings come from a Faustus read (faustus-read.ts: one trade search on
// your account, only on a click or a run's Start). Sales come in by
// themselves (trade history), so a sold item drops off with no search. An
// item you took down by hand stays until the next read.
// Repricing moves the trade site's listed time, so each item keeps the first
// time a read saw it (firstSeen): "3d" is since you listed it, not since the
// last reprice.
// Pure: no Vue, no IO.
import { saleChaos, versusMarket } from './sales'
import type { Rates, Sale } from './sales'
import type { FaustusRead, Listing } from './faustus'
import { soldOf, DAY_MS, DEFAULT_STALE_DAYS } from './pending-glance'
import type { PendingGlance } from './pending-glance'

export interface PendingDoc {
  league: string
  // When the listings were read.
  readAt: number
  listings: Listing[]
  // Item id → the first time it was listed, as far as the app has seen.
  firstSeen: Record<string, number>
  // The read stopped at 100 listings: there are more.
  more?: boolean
}

export const pendingKey = (league: string) => `${league}-pending`
// First times kept for listings past the newest 100.
const MAX_KEPT = 500

export { DEFAULT_STALE_DAYS, DAY_MS }

export function isPendingDoc (x: unknown): x is PendingDoc {
  if (x == null || typeof x !== 'object') return false
  const o = x as PendingDoc
  return typeof o.league === 'string' && typeof o.readAt === 'number' && Array.isArray(o.listings) && o.firstSeen != null && typeof o.firstSeen === 'object'
}

// A new read over the last: every listing in it, each keeping the earliest
// time it was seen. Listings gone from the read (sold, or taken down) drop.
// A read that is older than the saved one changes nothing.
export function mergeRead (prev: PendingDoc | null, league: string, read: FaustusRead): PendingDoc {
  const old = prev?.league === league ? prev : null
  if (old && read.at < old.readAt) return old
  const firstSeen: Record<string, number> = {}
  // A read cut at 100 listings didn't see the older ones: they keep their
  // first time, so a reprice that brings one back doesn't make it new.
  if (read.more && old) {
    const oldest = read.listings.reduce((m, l) => Math.min(m, l.at), Infinity)
    const kept = Object.entries(old.firstSeen).filter(([, at]) => at < oldest).sort((a, b) => b[1] - a[1]).slice(0, MAX_KEPT)
    for (const [id, at] of kept) firstSeen[id] = at
  }
  for (const l of read.listings) {
    const was = old?.firstSeen[l.id]
    firstSeen[l.id] = was != null && was < l.at ? was : l.at
  }
  return { league, readAt: read.at, listings: read.listings, firstSeen, ...(read.more ? { more: true } : {}) }
}

// Uniques whose worth swings with their rolls or mods: poe.ninja's price for
// the name says little about yours.
const ROLLED_UNIQUES = new Set([
  "Watcher's Eye", 'Glorious Vanity', 'Lethal Pride', 'Brutal Restraint', 'Militant Faith', 'Elegant Hubris',
  'Forbidden Flame', 'Forbidden Flesh', 'Impossible Escape', 'Thread of Hope', 'Megalomaniac', 'Voices',
  'Split Personality', 'Unnatural Instinct', 'Sublime Vision', 'Grand Spectrum', 'Precursor\'s Emblem',
  'Bottled Faith', 'Dying Sun', 'Ventor\'s Gamble', 'Aul\'s Uprising', 'Darkness Enthroned', 'Ashes of the Stars',
  'Nimis', 'The Squire', 'Kalandra\'s Touch', 'Replica Dragonfang\'s Flight', 'Dragonfang\'s Flight',
  'Inspired Learning', 'Small Cluster Jewel', 'Medium Cluster Jewel', 'Large Cluster Jewel'
])

// How far poe.ninja's price can be taken as a suggestion.
// 'sure': same kind of item at one price (currency, cards, fragments, most uniques).
// 'rough': its rolls, its corruption or a thin market move the price.
// null: nothing to go on (rares and other gear: price check it).
export type Confidence = 'sure' | 'rough'

export interface NinjaPrice { chaos: number, thin?: boolean }

export interface PendingRow {
  item: Listing
  firstAt: number
  ageMs: number
  stale: boolean
  // Its asking price in chaos (null: a currency without a price).
  chaos: number | null
  // poe.ninja's price for the whole stack, chaos.
  ninja: number | null
  // Asking against poe.ninja: 0.18 is 18% over.
  vs: number | null
  confidence: Confidence | null
}

export interface PendingTotals {
  count: number
  // Asking prices, chaos.
  askChaos: number
  // What it's likely worth: poe.ninja's price where it has one, else the ask.
  worthChaos: number
  stale: number
  staleChaos: number
  // Listings in a currency without a price.
  unpriced: number
}

const isUnique = (l: Listing) => l.frameType === 3 || l.frameType === 9
export function confidenceOf (l: Listing, price: NinjaPrice | null): Confidence | null {
  if (!price || !(price.chaos > 0)) return null
  if (isUnique(l) && (ROLLED_UNIQUES.has(l.name) || ROLLED_UNIQUES.has(l.typeLine) || l.corrupted)) return 'rough'
  if (price.thin) return 'rough'
  return 'sure'
}

// The item ids that sold after they were listed.
export function soldIds (doc: PendingDoc, sales: readonly Sale[]): Set<string> {
  return soldOf(doc.firstSeen, sales)
}

export function pendingRows (doc: PendingDoc | null, sales: readonly Sale[], rates: Rates, ninjaOf: (l: Listing) => NinjaPrice | null, now: number, staleDays = DEFAULT_STALE_DAYS): PendingRow[] {
  if (!doc) return []
  const sold = soldIds(doc, sales)
  const staleMs = Math.max(1, staleDays) * DAY_MS
  const rows: PendingRow[] = []
  for (const item of doc.listings) {
    if (sold.has(item.id)) continue
    const firstAt = doc.firstSeen[item.id] ?? item.at
    const ageMs = Math.max(0, now - firstAt)
    const chaos = saleChaos(item, rates)
    const p = ninjaOf(item)
    const each = p && p.chaos > 0 ? p.chaos : null
    const vs = versusMarket(chaos, each, item.stack)
    // Way off poe.ninja (versusMarket gives up): most likely another version.
    const confidence = each == null ? null : vs == null && chaos != null ? 'rough' : confidenceOf(item, p)
    rows.push({ item, firstAt, ageMs, stale: ageMs >= staleMs, chaos, ninja: each != null ? each * Math.max(1, item.stack) : null, vs, confidence })
  }
  return rows
}

// What a listing counts for: a 'sure' poe.ninja price (never over the ask),
// otherwise the ask.
export function rowWorth (r: PendingRow): number {
  const ask = r.chaos ?? 0
  return r.confidence === 'sure' && r.ninja != null ? Math.min(r.ninja, ask || r.ninja) : ask
}

export function pendingTotals (rows: readonly PendingRow[]): PendingTotals {
  const t: PendingTotals = { count: rows.length, askChaos: 0, worthChaos: 0, stale: 0, staleChaos: 0, unpriced: 0 }
  for (const r of rows) {
    if (r.chaos == null) t.unpriced++
    const ask = r.chaos ?? 0
    t.askChaos += ask
    t.worthChaos += rowWorth(r)
    if (r.stale) { t.stale++; t.staleChaos += ask }
  }
  return t
}

// Stale first (oldest first), then the rest newest first.
export function sortPending (rows: readonly PendingRow[]): PendingRow[] {
  return [...rows].sort((a, b) => a.stale !== b.stale ? (a.stale ? -1 : 1) : a.stale ? a.firstAt - b.firstAt : b.firstAt - a.firstAt)
}

export function ageText (ms: number): string {
  const h = ms / 3_600_000
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))}m`
  if (h < 48) return `${Math.floor(h)}h`
  return `${Math.floor(h / 24)}d`
}

// The glance the dock icon reads (pending-glance.ts).
export function glanceOfPending (doc: PendingDoc): PendingGlance {
  return { league: doc.league, readAt: doc.readAt, items: doc.listings.map(l => [l.id, doc.firstSeen[l.id] ?? l.at, l.price.amount, l.price.currency]) }
}
