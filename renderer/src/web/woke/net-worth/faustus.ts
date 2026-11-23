// A strategy run's items outside the stash (WOKEPOET-515, part 2): what you
// listed at Faustus during the run and sales the stash hasn't seen yet.
//
// Guy's rule (2026-11-23): profit counts only what the stash sees, so a sale
// counts once its currency is collected into a read tab. "In Faustus" is a
// separate line, and the run's total is profit plus that line:
// - a listing made during the run: its asking price;
// - a sale during the run, not collected yet: its price.
// Nothing to tick (Guy: "too manual"): a read that sees the sale's currency
// come in collects it (collectedOf, a guess by amount; see there), and a sale of an item that was listed
// when the run started is from before: no profit of the run, so once its
// currency is collected it comes off profit.
// Pure: no Vue, no IO.
import { NINJA_CURRENCY, saleChaos } from './sales'
import type { Rates, Sale } from './sales'
import type { StashDiff } from './valuation'

// A merchant tab listing, in the sales' shape (its tooltip, name and price
// work the same). `at` is when it was listed.
export type Listing = Sale

export interface FaustusRead {
  at: number
  listings: Listing[]
  // The search had more listings since the start than one read fetches.
  more?: boolean
}

// Your override on a sale: from before the run or not (left out: the run
// decides, from the listings read at Start).
export interface SaleMark {
  before?: boolean
  // Runs saved before collection was automatic: ticked by hand.
  collected?: boolean
}

// Currency that came into the stash at a read (net, whole units), by trade
// currency id. Each run keeps these (runs.ts addToTally): a sale's currency
// is collected when an arrival after the sale covers it.
export interface Arrival { at: number, c: string, n: number }

// What a run needs of this (runs.ts Run has these fields).
export interface OutsideRun {
  startAt: number
  stoppedAt?: number
  faustus?: FaustusRead
  // Item ids listed at Faustus when the run started: their sales are from before.
  startListings?: string[]
  arrivals?: Arrival[]
  saleMarks?: Record<string, SaleMark>
}

export interface OutsideRow {
  item: Sale
  chaos: number | null
  before: boolean
  // Its currency came into the stash.
  collected: boolean
}

export interface OutsideTotals {
  listed: OutsideRow[]
  sold: OutsideRow[]
  // Asking prices of listings made during the run.
  listedChaos: number
  // Sales of the run not collected yet.
  waitingChaos: number
  // Sales of items from before the run, collected: off profit.
  beforeChaos: number
  // listed + waiting: the "In Faustus" line.
  faustusChaos: number
  // Listings or sales with no price in chaos (a currency poe.ninja lacks).
  unpriced: number
}

// Trade currency ids and the stash item each is.
export const CURRENCY_ITEM: Record<string, string> = { chaos: 'Chaos Orb', divine: 'Divine Orb', ...NINJA_CURRENCY }
const CURRENCY_OF: Record<string, string> = Object.fromEntries(Object.entries(CURRENCY_ITEM).map(([id, name]) => [name, id]))

// One read's currency arrivals (net in, per currency).
export function arrivalsOf (diff: StashDiff): Arrival[] {
  const net: Record<string, number> = {}
  for (const l of diff.added) { const c = CURRENCY_OF[l.key]; if (c) net[c] = (net[c] ?? 0) + l.count }
  for (const l of diff.removed) { const c = CURRENCY_OF[l.key]; if (c) net[c] = (net[c] ?? 0) - l.count }
  return Object.entries(net).filter(([, n]) => n > 0).map(([c, n]) => ({ at: diff.at, c, n }))
}

function inRun (run: OutsideRun, at: number): boolean {
  return at > run.startAt && (run.stoppedAt == null || at <= run.stoppedAt)
}

export function isBefore (run: OutsideRun, s: Sale): boolean {
  return run.saleMarks?.[s.id]?.before ?? (run.startListings?.includes(s.id) ?? false)
}

// Which sales' currency the stash has seen come in: each arrival covers
// whole sales before it in that currency, oldest first, while it has enough
// for the next one (a 5c drop never collects a 10c sale). A loot arrival that
// covers a sale moves it from In Faustus to profit early; the real collection
// later counts as new, so the run comes right again once you collect (and
// stays low only if you never collect during the run).
export function collectedOf (run: OutsideRun, sales: readonly Sale[]): Set<string> {
  const got = new Set<string>()
  // Marked collected by hand (runs saved before collection was automatic).
  for (const [id, m] of Object.entries(run.saleMarks ?? {})) if (m.collected) got.add(id)
  const byTime = [...sales].sort((a, b) => a.at - b.at)
  for (const a of [...(run.arrivals ?? [])].sort((x, y) => x.at - y.at)) {
    let left = a.n
    for (const s of byTime) {
      if (s.at >= a.at) break
      if (s.price.currency !== a.c || got.has(s.id)) continue
      if (s.price.amount > left) break
      got.add(s.id)
      left -= s.price.amount
    }
  }
  return got
}

export function outsideTotals (run: OutsideRun, sales: readonly Sale[], rates: Rates): OutsideTotals {
  const sold = sales.filter(s => inRun(run, s.at)).sort((a, b) => b.at - a.at)
  const soldIds = new Set(sold.map(s => s.id))
  // A listing that sold since the read is a sale now: it counts there. One
  // listed at the start was repriced (its listed time moved): not the run's.
  const atStart = new Set(run.startListings ?? [])
  const listed = (run.faustus?.listings ?? []).filter(l => inRun(run, l.at) && !soldIds.has(l.id) && !atStart.has(l.id)).sort((a, b) => b.at - a.at)
  const got = collectedOf(run, sold)
  let listedChaos = 0
  let waitingChaos = 0
  let beforeChaos = 0
  let unpriced = 0
  const row = (item: Sale, isSale: boolean): OutsideRow => {
    const chaos = saleChaos(item, rates)
    if (chaos == null) unpriced++
    const collected = isSale && got.has(item.id)
    return { item, chaos, before: isSale && isBefore(run, item), collected }
  }
  const listedRows = listed.map(l => row(l, false))
  for (const r of listedRows) listedChaos += r.chaos ?? 0
  const soldRows = sold.map(s => row(s, true))
  for (const r of soldRows) {
    const c = r.chaos ?? 0
    if (r.before) { if (r.collected) beforeChaos += c } else if (!r.collected) waitingChaos += c
  }
  return { listed: listedRows, sold: soldRows, listedChaos, waitingChaos, beforeChaos, faustusChaos: listedChaos + waitingChaos, unpriced }
}

// Your override: the sale's item was from before the run, or not.
export function setBefore<R extends OutsideRun> (run: R, id: string, before: boolean): R {
  return { ...run, saleMarks: { ...run.saleMarks, [id]: { ...run.saleMarks?.[id], before } } }
}

// A trade fetch result (pathofexile-trade.ts PricingResult) as a listing.
// null: not a merchant listing, or no price.
export interface FetchedListing {
  id: string
  indexedAt?: string
  hasFee: boolean
  priceAmount: number
  priceCurrency: string
  stackSize?: number
  listedItem?: { id?: string, name?: string, typeLine?: string, baseType?: string, frameType?: number, icon?: string, ilvl?: number, corrupted?: boolean, stackSize?: number }
}

export function toListing (r: FetchedListing): Listing | null {
  if (!r.hasFee || !(r.priceAmount > 0) || r.priceCurrency === 'no price' || !r.indexedAt) return null
  const at = Date.parse(r.indexedAt)
  if (!Number.isFinite(at)) return null
  const it = r.listedItem ?? {}
  const frameType = it.frameType ?? 0
  const stack = r.stackSize ?? it.stackSize ?? 1
  const gear = frameType <= 3 && stack <= 1
  return {
    // The item's id, as a sale has it (the trade history's item_id); the
    // fetch's own id is the listing's.
    id: it.id ?? r.id,
    at,
    name: it.name ?? '',
    typeLine: it.typeLine ?? '',
    baseType: it.baseType ?? it.typeLine ?? '',
    frameType,
    icon: it.icon ?? '',
    stack,
    ...(it.ilvl != null ? { ilvl: it.ilvl } : {}),
    ...(it.corrupted ? { corrupted: true } : {}),
    price: { amount: r.priceAmount, currency: r.priceCurrency },
    // Gear's mods for its tooltip, as a sale keeps them.
    ...(gear && r.listedItem ? { tip: r.listedItem as Record<string, unknown> } : {})
  }
}

// The trade search for your own merchant listings, newest first.
export function listingsQuery (account: string) {
  return {
    query: {
      status: { option: 'securable' as const },
      stats: [{ type: 'and' as const, filters: [] }],
      filters: { trade_filters: { filters: { account: { input: account } } } }
    },
    sort: { indexed: 'desc' }
  }
}

export function isFaustusRead (x: unknown): x is FaustusRead {
  return x != null && typeof x === 'object' && typeof (x as FaustusRead).at === 'number' && Array.isArray((x as FaustusRead).listings)
}
