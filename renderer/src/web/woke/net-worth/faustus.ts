// A strategy run's items outside the stash (WOKEPOET-515, part 2): what you
// listed at Faustus during the run and sales the stash hasn't seen yet.
//
// Guy's rule (2026-11-23): profit counts only what the stash sees, so a sale
// counts once its currency is collected into a read tab. "In Faustus" is a
// separate line, and the run's total is profit plus that line:
// - a listing made during the run: its asking price;
// - a sale during the run, not collected yet: its price.
// A sale of an item from before the run is no profit of the run: once its
// currency is collected, the stash counted it, so it comes off profit.
// Pure: no Vue, no IO.
import { saleChaos } from './sales'
import type { Rates, Sale } from './sales'

// A merchant tab listing, in the sales' shape (its tooltip, name and price
// work the same). `at` is when it was listed.
export type Listing = Sale

export interface FaustusRead {
  at: number
  listings: Listing[]
  // The search had more listings since the start than one read fetches.
  more?: boolean
}

// Your marks on a sale during the run.
export interface SaleMark {
  // The item was from before the run.
  before?: boolean
  // Its currency is in your stash now.
  collected?: boolean
}

// What a run needs of this (runs.ts Run has these fields).
export interface OutsideRun {
  startAt: number
  stoppedAt?: number
  faustus?: FaustusRead
  saleMarks?: Record<string, SaleMark>
}

export interface OutsideRow { item: Sale, chaos: number | null, mark: SaleMark }

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

function inRun (run: OutsideRun, at: number): boolean {
  return at > run.startAt && (run.stoppedAt == null || at <= run.stoppedAt)
}

export function outsideTotals (run: OutsideRun, sales: readonly Sale[], rates: Rates): OutsideTotals {
  const marks = run.saleMarks ?? {}
  const sold = sales.filter(s => inRun(run, s.at)).sort((a, b) => b.at - a.at)
  const soldIds = new Set(sold.map(s => s.id))
  // A listing that sold since the read is a sale now: it counts there.
  const listed = (run.faustus?.listings ?? []).filter(l => inRun(run, l.at) && !soldIds.has(l.id)).sort((a, b) => b.at - a.at)
  let listedChaos = 0
  let waitingChaos = 0
  let beforeChaos = 0
  let unpriced = 0
  const row = (item: Sale): OutsideRow => {
    const chaos = saleChaos(item, rates)
    if (chaos == null) unpriced++
    return { item, chaos, mark: marks[item.id] ?? {} }
  }
  const listedRows = listed.map(row)
  for (const r of listedRows) listedChaos += r.chaos ?? 0
  const soldRows = sold.map(row)
  for (const r of soldRows) {
    const c = r.chaos ?? 0
    if (r.mark.before) { if (r.mark.collected) beforeChaos += c } else if (!r.mark.collected) waitingChaos += c
  }
  return { listed: listedRows, sold: soldRows, listedChaos, waitingChaos, beforeChaos, faustusChaos: listedChaos + waitingChaos, unpriced }
}

export function setMark<R extends OutsideRun> (run: R, id: string, patch: SaleMark): R {
  const next: SaleMark = { ...run.saleMarks?.[id], ...patch }
  if (!next.before) delete next.before
  if (!next.collected) delete next.collected
  const marks = Object.fromEntries(Object.entries(run.saleMarks ?? {}).filter(([k]) => k !== id))
  if (next.before || next.collected) marks[id] = next
  return { ...run, saleMarks: marks }
}

// Every sale of the run marked collected.
export function collectAll<R extends OutsideRun> (run: R, sales: readonly Sale[]): R {
  let r = run
  for (const s of sales) if (inRun(run, s.at) && !run.saleMarks?.[s.id]?.collected) r = setMark(r, s.id, { collected: true })
  return r
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
  listedItem?: { name?: string, typeLine?: string, baseType?: string, frameType?: number, icon?: string, ilvl?: number, corrupted?: boolean, stackSize?: number }
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
    id: r.id,
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
