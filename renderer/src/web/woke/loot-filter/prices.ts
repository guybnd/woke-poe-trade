// Prices for the loot filter: the latest poe.ninja snapshot of the selected
// league as a PriceLookup, plus which uniques use which base.
import { computed, shallowRef } from 'vue'
import { usePoeninja } from '@/web/background/Prices'
import { useLeagues } from '@/web/background/Leagues'
import { usePriceIndex } from '../market/price-index'
import { priceBreakdown, priceLookup, safetyLookup } from './economy'
import type { PriceLookup, UniqueRule } from './economy'

import { uniquesOnBase } from '../shared/uniques-on-base'
import { loadTipDrops } from '../ui/tooltip/item-tip'
import { onSharedDataChange } from '../app/live-data'
import { randomDropsOnBase } from './random-drops'
import type { TipPack } from '../ui/tooltip/tip-content'

export { uniquesOnBase, randomDropsOnBase }

export function useFilterPrices (rule: () => UniqueRule) {
  const index = usePriceIndex()
  const ninja = usePoeninja()
  const currentLeague = useLeagues().selectedId
  // The wiki drop data. The prices wait for it, so the filter isn't written
  // once with every unique and again without; a failed load counts every one.
  const drops = shallowRef<TipPack['drops'] | null>(null)
  const dropsReady = shallowRef(false)
  function loadDrops () {
    loadTipDrops().catch(() => null).then(d => {
      drops.value = d
      dropsReady.value = true
    })
  }
  loadDrops()
  // New data from GitHub, or a load that failed: try again.
  onSharedDataChange(loadDrops)
  const randomOnBase = computed(() => randomDropsOnBase(drops.value))
  const lookup = computed<PriceLookup | null>(() => {
    const snap = index.snapshot.value
    if (!snap?.items.length || !dropsReady.value) return null
    return priceLookup(snap.items, randomOnBase.value, rule())
  })
  // What this snapshot has at all: a type it lacks isn't priced at zero.
  const pricedTypes = computed(() => new Set((index.snapshot.value?.items ?? []).map(i => i.type)))
  // Never follows the "cheapest unique" setting: see safetyLookup.
  const safety = computed<PriceLookup | null>(() => {
    const snap = index.snapshot.value
    if (!snap?.items.length || !dropsReady.value) return null
    return safetyLookup(snap.items, randomOnBase.value)
  })
  // Every unique on the base, for lists that show them all (Alt+F, tooltips).
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
