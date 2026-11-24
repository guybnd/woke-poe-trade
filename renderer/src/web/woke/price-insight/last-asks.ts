// The price check's loaded listings as asks: other sellers' prices in chaos
// each, cheapest first. Net worth's Listed bar (ListedPriceBar.vue) suggests
// a price from them, with no search of its own.
import { shallowRef } from 'vue'

export interface LastAsks {
  // Chaos each, cheapest first; your own listings left out.
  chaos: number[]
  divine: number | null
  // The checked item they're for (the listings can outlive it until the next search).
  for: unknown
  // Your own listings among the loaded ones.
  mine: number
  // The search's count of listings (yours too), and whether all of them loaded.
  total: number | null
  all: boolean
  // Listings loaded so far (none yet: the search's count alone).
  loaded: number
}

export const lastAsks = shallowRef<LastAsks | null>(null)

export interface AskListing { priceAmount: number, priceCurrency: string, stackSize?: number, isMine: boolean }

export function asksOf (list: readonly AskListing[], divine: number | null, item: unknown, total: number | null = null, all = false, loaded = list.length): LastAsks {
  const chaos: number[] = []
  let mine = 0
  for (const r of list) {
    if (r.isMine) mine++
    if (r.isMine || !(r.priceAmount > 0)) continue
    const c = r.priceCurrency === 'chaos' ? r.priceAmount : r.priceCurrency === 'divine' && divine ? r.priceAmount * divine : null
    if (c != null) chaos.push(c / Math.max(1, r.stackSize ?? 1))
  }
  return { chaos: chaos.sort((a, b) => a - b), divine, for: item, mine, total, all, loaded }
}
