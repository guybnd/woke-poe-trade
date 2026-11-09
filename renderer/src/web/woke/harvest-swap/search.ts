// One trade search for a swappable mod: the mod as any of the keys it can be,
// with every other ticked filter as it is. The listings that come back are split
// by which key they have, so one search prices every outcome.

import { STAT_BY_REF_V2 } from '@/assets/data'
import type { Stat } from '@/assets/data'
import type { ItemCategory } from '@/parser'
import type { FilterOrGroup, ItemFilters, StatFilter } from '@/web/price-check/filters/interfaces'
import { createTradeRequest, PricingResult, requestResults, requestTradeResultList } from '@/web/price-check/trade/pathofexile-trade'
import type { TradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { buildInsight, InsightOptions } from '@/web/woke/price-insight/insight'
import { listingExplicitStats } from '@/web/woke/price-insight/stat-columns'
import type { SwapCandidate } from './detect'

/** "any" searches every key at once; a key searches that one only. */
export type SwapMode = 'any' | string

// Two fetches of ten: enough to see a few listings of each key.
const FETCH_IDS = 20
// Fewer listings than this for a key and its price says too little.
export const MIN_LISTINGS = 3

function dbStats (ref: string): Stat[] {
  const found = STAT_BY_REF_V2(ref)
  if (!found) return []
  return ('stats' in found) ? found.stats : [found]
}

/** The trade ids of `toRef` that stand where the filter's own ids stand for its ref. */
export function targetTradeIds (filter: StatFilter, toRef: string): string[] {
  const type = filter.tag as string
  const from = dbStats(filter.statRef)
  const to = dbStats(toRef)
  const at = from.findIndex(s => s.trade.ids[type]?.includes(filter.tradeId[0]))
  const pick = (at >= 0 && to[at]?.trade.ids[type]) ? to[at] : to.find(s => s.trade.ids[type])
  return pick?.trade.ids[type] ?? []
}

export function swapKeys (cand: SwapCandidate, mode: SwapMode): string[] {
  return mode === 'any' ? [cand.from, ...cand.targets] : [mode]
}

/** Which ref the candidate's mod has under each key. */
export function keyRefs (cand: SwapCandidate): Record<string, string> {
  const member = cand.family.members.find(m => m[cand.from] === cand.filter.statRef)!
  return member
}

/** The lowest roll the swap search asks for: the bottom of the tier, which a swap is sure to give. */
export function searchedMin (cand: SwapCandidate): number | undefined {
  if (cand.family.anyRoll) return undefined
  const min = cand.tierMin ?? cand.filter.roll?.min
  return typeof min === 'number' ? min : undefined
}

export function buildSwapRequest (filters: ItemFilters, stats: FilterOrGroup[], cand: SwapCandidate, mode: SwapMode): TradeRequest {
  const refs = keyRefs(cand)
  const tradeId = swapKeys(cand, mode).flatMap(k => k === cand.from ? cand.filter.tradeId : targetTradeIds(cand.filter, refs[k]))
  const min = searchedMin(cand)
  const roll = cand.filter.roll && {
    ...cand.filter.roll,
    min: min ?? '' as const,
    max: '' as const
  }
  const swapped: StatFilter = { ...cand.filter, tradeId, roll, disabled: false }
  const next = stats.map(s => s === cand.filter ? swapped : s)
  return createTradeRequest(filters, next)
}

export interface KeyPrice {
  key: string
  listings: number
  /** Fair price in chaos, or null with too few listings or no currency rate. */
  chaos: number | null
}

/** Groups listings by the key their mod has, and prices each group the way the price check does. */
export function priceByKey (
  listings: PricingResult[],
  cand: SwapCandidate,
  keys: string[],
  opts: InsightOptions,
  category: ItemCategory | undefined
): KeyPrice[] {
  const groups = new Map<string, PricingResult[]>(keys.map(k => [k, []]))
  const min = searchedMin(cand)
  for (const listing of listings) {
    const listed = listingExplicitStats(listing.listedItem, category)
    // A key counts when the listing has its plain mod at the searched roll or
    // better. A listing that has the item's element too low, but another one high
    // enough, only matched the search on the other one.
    const fits = keys.filter(k => listed.some(s =>
      s.ref === cand.family.members[0][k] && (min == null || s.value >= min)))
    // Fits several: no telling which one the buyer paid for.
    if (fits.length === 1) groups.get(fits[0])!.push(listing)
  }
  return keys.map(key => {
    const group = groups.get(key)!
    if (group.length < MIN_LISTINGS) return { key, listings: group.length, chaos: null }
    const insight = buildInsight(group.map(l => ({ ...l, listedTimes: 1 })), opts)
    return { key, listings: group.length, chaos: insight.range?.fair ?? null }
  })
}

export interface SwapSearchResult {
  prices: KeyPrice[]
  total: number
  /** The search as sent (requestKey), to spot a result made with older filters. */
  request: string
}

export async function runSwapSearch (
  filters: ItemFilters,
  stats: FilterOrGroup[],
  cand: SwapCandidate,
  mode: SwapMode,
  opts: InsightOptions & { accountName: string },
  category: ItemCategory | undefined
): Promise<SwapSearchResult> {
  const body = buildSwapRequest(filters, stats, cand, mode)
  const search = await requestTradeResultList(body, filters.trade.league)
  const ids = search.result.slice(0, FETCH_IDS)
  const listings: PricingResult[] = []
  for (let i = 0; i < ids.length; i += 10) {
    listings.push(...await requestResults(search.id, ids.slice(i, i + 10), { accountName: opts.accountName }))
  }
  return { prices: priceByKey(listings, cand, swapKeys(cand, mode), opts, category), total: search.total, request: requestKey(body) }
}

/** Tells two swap searches apart, so a result is known to be out of date after a filter change. */
export function requestKey (body: TradeRequest): string {
  return JSON.stringify(body)
}
