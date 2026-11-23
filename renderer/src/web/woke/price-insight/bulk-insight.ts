// A verdict for bulk goods on the exchange: what sellers with enough stock ask
// per item. Pure functions, no Vue or IO.

import type { Confidence } from './insight'

export interface BulkListing {
  exchangeAmount: number
  itemAmount: number
  stock: number
  accountName: string
  isMine: boolean
}

export interface BulkInsight {
  /** Price per item, in the listings' own currency. */
  low: number
  fair: number
  high: number
  /** Where the market really starts, past offers far under the rest. */
  floor: number
  confidence: Confidence
  /** Offers left out because the seller holds fewer than the amount asked about. */
  lowStock: number
  /** Too few sellers hold that amount, so smaller offers count after all. */
  fewWithStock: boolean
  sellers: number
}

const WINDOW = 6
const MIN_WITH_STOCK = 3
const FAR_UNDER = 0.5
const MAX_BELOW_FLOOR = 2

function median (values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export function buildBulkInsight (listings: readonly BulkListing[], need: number): BulkInsight | null {
  // An offer whose stock can't fill one trade isn't really for sale.
  const real = listings.filter(l => !l.isMine && l.itemAmount > 0 && l.exchangeAmount > 0 && l.stock >= l.itemAmount)
  const withStock = real.filter(l => l.stock >= need)
  const fewWithStock = new Set(withStock.map(l => l.accountName)).size < MIN_WITH_STOCK
  const used = fewWithStock ? real : withStock
  if (!used.length) return null

  // Each seller's best offer: more rows from one seller add no opinion.
  const best = new Map<string, number>()
  for (const l of used) {
    const unit = l.exchangeAmount / l.itemAmount
    const known = best.get(l.accountName)
    if (known == null || unit < known) best.set(l.accountName, unit)
  }
  const units = Array.from(best.values()).sort((a, b) => a - b)

  let floorIdx = 0
  const maxBelow = Math.min(MAX_BELOW_FLOOR, Math.floor(units.length / 3))
  while (floorIdx < maxBelow) {
    if (units[floorIdx] >= median(units.slice(floorIdx + 1, floorIdx + 1 + WINDOW)) * FAR_UNDER) break
    floorIdx++
  }

  const window = units.slice(floorIdx, floorIdx + WINDOW)
  const low = units[0]
  const floor = window[0]
  const high = window[window.length - 1]
  const spread = high / floor

  let confidence: Confidence
  if (units.length >= 5 && spread <= 1.5) confidence = 'high'
  else if (units.length >= 3 && spread <= 3) confidence = 'medium'
  else confidence = 'low'

  return {
    low,
    fair: median(window),
    high,
    floor,
    confidence,
    lowStock: fewWithStock ? 0 : real.length - withStock.length,
    fewWithStock,
    sellers: units.length
  }
}

/** A readable per-item amount: bulk prices are often well under one. */
export function bulkAmount (value: number): string {
  if (value >= 100) return String(Math.round(value))
  if (value >= 10) return String(Number(value.toFixed(1)))
  return String(Number(value.toPrecision(2)))
}

export type BulkMarket = 'xchgChaos' | 'xchgStable'

export interface BulkMarketSide {
  insight: BulkInsight | null
  /** Offers the trade site counts, or null when this side isn't loaded. */
  total: number | null
}

/** Fewer sellers than this is too thin to beat a busier market on price alone. */
const MIN_MARKET_SELLERS = 3
/** Past this price gap, the cheaper side wins however thin. */
const MAX_THIN_GAP = 3

/**
 * Which currency's offers to lead with: the cheaper one, compared in chaos.
 * Sellers on the divine side often ask "1 div" for items worth a few chaos, so
 * the side with more offers isn't the price (WOKEPOET-487). A side with only a
 * seller or two loses to a busier one when the prices are within 3×. Without a divine rate, or without offers
 * on either side, the side with more offers wins, as before.
 */
export function pickBulkMarket (chaos: BulkMarketSide, stable: BulkMarketSide, divineInChaos: number | null | undefined): BulkMarket {
  const byCount = (): BulkMarket => {
    if (stable.total == null) return 'xchgChaos'
    if (chaos.total == null) return 'xchgStable'
    return stable.total > chaos.total ? 'xchgStable' : 'xchgChaos'
  }
  const c = chaos.insight
  const s = stable.insight
  if (c && !s) return 'xchgChaos'
  if (s && !c) return 'xchgStable'
  if (!c || !s || !divineInChaos) return byCount()
  const sChaos = s.fair * divineInChaos
  const cheaper: BulkMarket = sChaos < c.fair ? 'xchgStable' : 'xchgChaos'
  // A thin side only loses when the prices are close: a few sellers far
  // under the rest still are the price.
  const gap = Math.max(sChaos, c.fair) / Math.min(sChaos, c.fair)
  const cThin = c.sellers < MIN_MARKET_SELLERS
  const sThin = s.sellers < MIN_MARKET_SELLERS
  if (cThin !== sThin && gap < MAX_THIN_GAP) return cThin ? 'xchgStable' : 'xchgChaos'
  return cheaper
}

export interface BulkSideState {
  /** The side's offers are in, from the first search or its own. */
  loaded: boolean
  failed: boolean
  /** The side's own search is running (it only starts from a click). */
  loading: boolean
}

/**
 * Whether the offers table and verdict wait for this side, showing placeholders.
 * Only while its search runs: a side the first search held back loads on a click,
 * never by itself, so waiting for it otherwise would wait forever.
 */
export function bulkSideWaiting (side: BulkSideState): boolean {
  return !side.loaded && !side.failed && side.loading
}
