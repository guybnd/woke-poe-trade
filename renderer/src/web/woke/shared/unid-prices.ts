// Uniques whose value depends on what they roll, which drop unidentified:
// jewels (keystone, notable, ascendancy...), random-variant gear and the like.
// poe.ninja's one price for them misleads, so their price comes from
// unidentified listings on official trade, looked up on a click and saved.
// Shared by every window that prices them.
//
// Kept apart from the boss tables so the tooltip can read quotes without
// loading them.
import { createGlobalState } from '@vueuse/core'
import { ITEM_BY_REF } from '@/assets/data'
import type { TradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { createTradePrices, quoteFromListings, SHOW_MS } from './trade-quotes'
import { VARIABLE_UNIQUE_NAMES, VARIABLE_UNIQUE_BASES } from './variable-uniques'
import type { Stored } from './trade-quotes'

// Trade needs a base type with the name: Path of Building's, for the
// uniques on one base (variable-uniques.ts).
const UNID_BASES: Readonly<Record<string, string>> = VARIABLE_UNIQUE_BASES

// Bases for other trade lookups of named uniques the item data may not know.
const OTHER_BASES: Record<string, string> = {
  'The Broken Elegy': 'Foul Staff'
}

// Every unique whose roll sets its price: Path of Building's list
// (variable-uniques.ts, generated), for Boss runs, Search, the price check,
// the item tooltip and Net worth alike.
export const VARIABLE_ITEMS: ReadonlySet<string> = new Set(VARIABLE_UNIQUE_NAMES)

// A unique's one base. Some uniques (Grand Spectrum, Precursor's Emblem) come
// on several bases: searching the first would hide the others, so none.
export function uniqueBaseOf (name: string): string | undefined {
  const bases = new Set((ITEM_BY_REF('UNIQUE', name) ?? []).map(u => u.unique?.base))
  if (bases.size !== 1) return undefined
  return [...bases][0]
}

// Instant buyout is the live market now: plain 'online' finds next to nothing
// and 'any' is full of offline bait.
export function tradeQuery (name: string, unidentified: boolean) {
  const uniqueBase = UNID_BASES[name] ?? OTHER_BASES[name] ?? uniqueBaseOf(name)
  // A unique on several bases goes by its name alone.
  const named = VARIABLE_ITEMS.has(name) || ITEM_BY_REF('UNIQUE', name) != null || name in OTHER_BASES
  return {
    query: {
      status: { option: 'securable' as const },
      // Divination cards, keys and other named bases have only a type.
      ...(uniqueBase ? { name, type: uniqueBase } : named ? { name } : { type: name }),
      stats: [],
      filters: unidentified
        ? { misc_filters: { filters: { identified: { option: 'false' as const } } } }
        : {}
    },
    sort: { price: 'asc' as const }
  }
}

// Official trade search for unidentified copies of a unique, cheapest first.
export function unidentifiedTradeUrl (league: string, name: string): string {
  return `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(tradeQuery(name, true)))}`
}

// Official trade search for identified copies, cheapest first: the other side
// of the price check's unid or identify read (WOKEPOET-542).
export function identifiedTradeUrl (league: string, name: string): string {
  const q = tradeQuery(name, false)
  const body = { ...q, query: { ...q.query, filters: { misc_filters: { filters: { identified: { option: 'true' as const } } } } } }
  return `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(body))}`
}

const STORAGE_KEY = 'woke-boss-trade-prices'
const SAMPLE = 10
// An unidentified price replaces poe.ninja's, so it needs a few real listings.
const MIN_UNIDENTIFIED = 3

async function lookup (league: string, name: string, divine: number) {
  const { requestResults, requestTradeResultList } = await import('@/web/price-check/trade/pathofexile-trade')
  const unidentified = VARIABLE_ITEMS.has(name)
  const body = tradeQuery(name, unidentified) as unknown as TradeRequest
  const search = await requestTradeResultList(body, league)
  if (!search.result.length) return { chaos: null, listings: 0 }
  const listings = await requestResults(search.id, search.result.slice(0, SAMPLE), { accountName: '' })
  return { chaos: quoteFromListings(listings, divine, unidentified ? MIN_UNIDENTIFIED : 1), listings: search.total }
}

function pruned (data: Stored): Stored {
  const out: Stored = {}
  for (const [league, quotes] of Object.entries(data)) {
    const kept = Object.entries(quotes).filter(([, q]) => Date.now() - q.ts <= SHOW_MS)
    if (kept.length) out[league] = Object.fromEntries(kept)
  }
  return out
}

export const useTradePrices = createGlobalState(() => createTradePrices({
  lookup,
  read () {
    try {
      return pruned(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Stored)
    } catch {
      return {}
    }
  },
  write (data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {}
  }
}))
