// Prices for the loot filter: the latest poe.ninja snapshot of the selected
// league as a PriceLookup, plus which uniques use which base.
import { computed } from 'vue'
import { ITEMS_ITERATOR } from '@/assets/data'
import type { BaseType } from '@/assets/data'
import { usePoeninja } from '@/web/background/Prices'
import { useLeagues } from '@/web/background/Leagues'
import { usePriceIndex } from '../market/price-index'
import { priceBreakdown, priceLookup, safetyLookup } from './economy'
import type { PriceLookup, UniqueRule } from './economy'

let uniqueBases: Map<string, string[]> | null = null

export function uniquesOnBase (base: string): string[] {
  if (!uniqueBases) {
    uniqueBases = new Map()
    for (const u of ITEMS_ITERATOR('"unique":{"base"') as Generator<BaseType>) {
      if (u.namespace !== 'UNIQUE' || !u.unique) continue
      const list = uniqueBases.get(u.unique.base) ?? []
      list.push(u.refName)
      uniqueBases.set(u.unique.base, list)
    }
  }
  return uniqueBases.get(base) ?? []
}

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
  // poe.ninja is only downloaded while something wants prices.
  function wantPrices () {
    try { ninja.queuePricesFetch() } catch {}
  }
  return { lookup, safety, pricedTypes, currentLeague, breakdown, items, updatedAt, league, wantPrices }
}
