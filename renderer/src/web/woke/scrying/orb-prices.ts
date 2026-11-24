// Scrying Orb prices from official trade, one map at a time. poe.ninja doesn't
// price them (they aren't on the currency exchange), so the Scrying window
// looks them up only on a click, spaced like Boss runs' lookups.
import { createGlobalState } from '@vueuse/core'
import { ITEM_BY_REF } from '@/assets/data'
import type { TradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { createTradePrices, quoteFromListings, SHOW_MS } from '../shared/trade-quotes'
import type { Stored } from '../shared/trade-quotes'
import { mapLabel } from '../card-drops/card-drops'
import { orbTradeQuery } from './scry'

const STORAGE_KEY = 'woke-scry-orb-prices'
const SAMPLE = 10

// The map area's trade id: "Necropolis Map" -> Necropolis's.
export function areaDisc (map: string): string | null {
  return ITEM_BY_REF('AREA', mapLabel(map))?.[0]?.tradeDisc ?? null
}

async function lookup (league: string, map: string, divine: number) {
  const disc = areaDisc(map)
  if (!disc) return { chaos: null, listings: 0 }
  const { requestResults, requestTradeResultList } = await import('@/web/price-check/trade/pathofexile-trade')
  const search = await requestTradeResultList(orbTradeQuery(disc) as unknown as TradeRequest, league)
  if (!search.result.length) return { chaos: null, listings: 0 }
  const listings = await requestResults(search.id, search.result.slice(0, SAMPLE), { accountName: '' })
  return { chaos: quoteFromListings(listings, divine), listings: search.total }
}

function pruned (data: Stored): Stored {
  const out: Stored = {}
  for (const [league, quotes] of Object.entries(data)) {
    const kept = Object.entries(quotes).filter(([, q]) => Date.now() - q.ts <= SHOW_MS)
    if (kept.length) out[league] = Object.fromEntries(kept)
  }
  return out
}

export const useOrbPrices = createGlobalState(() => createTradePrices({
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
