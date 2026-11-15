// Uniques whose value depends on what they roll, which drop unidentified:
// jewels (keystone, notable, ascendancy...) and a few others. poe.ninja has one
// low row for most of them, so their price comes from unidentified listings on
// official trade. Shared by Boss runs, Search and the item tooltip.
//
// Kept apart from the boss tables so the tooltip can read quotes without
// loading them.
import { createGlobalState } from '@vueuse/core'
import { ITEM_BY_REF } from '@/assets/data'
import type { TradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { createTradePrices, quoteFromListings, SHOW_MS } from './trade-quotes'
import type { Stored } from './trade-quotes'

// Name -> base type, which the trade search needs.
const UNID_BASES: Record<string, string> = {
  'Impossible Escape': 'Viridian Jewel',
  'Thread of Hope': 'Crimson Jewel',
  "Watcher's Eye": 'Prismatic Jewel',
  'Forbidden Flesh': 'Cobalt Jewel',
  'Forbidden Flame': 'Crimson Jewel',
  'Sublime Vision': 'Prismatic Jewel',
  'The Light of Meaning': 'Prismatic Jewel',
  'Rational Doctrine': 'Cobalt Jewel',
  'Melding of the Flesh': 'Cobalt Jewel',
  'Dissolution of the Flesh': 'Crimson Jewel',
  // Not jewels, but the roll picks the variant poe.ninja prices.
  "Atziri's Splendour": 'Sacrificial Garb',
  "Doryani's Invitation": 'Heavy Belt',
  // Element: Chaos is worth far more than the other four.
  'Impresence': 'Onyx Amulet',
  'Beauty': 'Vaal Aspect'
}

// Bases for other trade lookups of named uniques the item data may not know.
const OTHER_BASES: Record<string, string> = {
  'The Broken Elegy': 'Foul Staff'
}

export const VARIABLE_ITEMS: ReadonlySet<string> = new Set(Object.keys(UNID_BASES))

// Instant buyout is the live market now: plain 'online' finds next to nothing
// and 'any' is full of offline bait.
export function tradeQuery (name: string, unidentified: boolean) {
  const uniqueBase = UNID_BASES[name] ?? OTHER_BASES[name] ?? ITEM_BY_REF('UNIQUE', name)?.[0]?.unique?.base
  return {
    query: {
      status: { option: 'securable' as const },
      // Divination cards, keys and other named bases have only a type.
      ...(uniqueBase ? { name, type: uniqueBase } : { type: name }),
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
