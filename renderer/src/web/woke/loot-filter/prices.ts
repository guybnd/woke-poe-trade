// Prices for the loot filter: the latest poe.ninja snapshot of the selected
// league as a PriceLookup, plus which uniques use which base.
import { computed } from 'vue'
import { usePoeninja } from '@/web/background/Prices'
import { useLeagues } from '@/web/background/Leagues'
import { usePriceIndex } from '../market/price-index'
import { priceBreakdown, priceLookup, safetyLookup } from './economy'
import type { PriceLookup, UniqueRule } from './economy'

import { uniquesOnBase } from '../shared/uniques-on-base'

export { uniquesOnBase }

export function useFilterPrices (rule: () => UniqueRule) {
  const index = usePriceIndex()
  const ninja = usePoeninja()
  const currentLeague = useLeagues().selectedId
  const lookup = computed<PriceLookup | null>(() => {
    const snap = index.snapshot.value
    if (!snap?.items.length) return null
    return priceLookup(snap.items, uniquesOnBase, rule())
  })
  // What this snapshot has at all: a type it lacks isn't priced at zero.
  const pricedTypes = computed(() => new Set((index.snapshot.value?.items ?? []).map(i => i.type)))
  // Never follows the "cheapest unique" setting: see safetyLookup.
  const safety = computed<PriceLookup | null>(() => {
    const snap = index.snapshot.value
    if (!snap?.items.length) return null
    return safetyLookup(snap.items, uniquesOnBase)
  })
  const breakdown = computed(() => priceBreakdown(index.snapshot.value?.items ?? [], uniquesOnBase))
  const items = computed(() => index.snapshot.value?.items ?? [])
  const updatedAt = computed(() => index.snapshot.value?.ts ?? null)
  const league = computed(() => index.snapshot.value?.league ?? null)
  const divine = computed(() => index.snapshot.value?.divine ?? null)
  // poe.ninja is only downloaded while something wants prices.
  function wantPrices () {
    try { ninja.queuePricesFetch() } catch {}
  }
  return { lookup, safety, pricedTypes, currentLeague, breakdown, items, updatedAt, league, divine, wantPrices }
}
