// Prices for the loot filter: the latest poe.ninja snapshot of the selected
// league as a PriceLookup, plus which uniques use which base.
import { computed, shallowRef, watch } from 'vue'
import { usePoeninja } from '@/web/background/Prices'
import { useLeagues } from '@/web/background/Leagues'
import { usePriceIndex } from '../market/price-index'
import { dropLookup, priceBreakdown, priceLookup, safetyLookup } from './economy'
import type { PriceLookup, UniqueRule } from './economy'

import { uniquesOnBase } from '../shared/uniques-on-base'
import { loadTipDrops, loadTipDropTiers } from '../ui/tooltip/item-tip'
import { onSharedDataChange } from '../app/live-data'
import { randomDropsOnBase } from './random-drops'
import type { TipPack } from '../ui/tooltip/tip-content'
import { divineRate } from '../shared/price-row'
import { loadDay1, withDay1 } from './day1-prices'
import type { Day1Table } from './day1-prices'

export { uniquesOnBase, randomDropsOnBase }

export function useFilterPrices (rule: () => UniqueRule, notAvg: () => string[] = () => []) {
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
  // How often each unique drops (the wiki's drop tiers), for the Loot tab's
  // average-drop prices. Until it loads every unique counts the same.
  const dropTiers = shallowRef<Record<string, number> | null>(null)
  loadTipDropTiers().then(t => { dropTiers.value = t ?? null }).catch(() => {})
  // New data from GitHub, or a load that failed: try again.
  onSharedDataChange(loadDrops)
  const randomOnBase = computed(() => randomDropsOnBase(drops.value))
  // Day-1 prices fill in what the live prices lack (a new league's first
  // hours). Live prices still have to be there: without them NeverSink decides.
  const day1 = shallowRef<Day1Table | null>(null)
  watch(() => index.snapshot.value?.league, league => {
    if (league && !day1.value) loadDay1(league).then(t => { day1.value = t })
  }, { immediate: true })
  const liveItems = computed(() => withDay1(index.snapshot.value?.items ?? [], day1.value))
  const lookup = computed<PriceLookup | null>(() => {
    const snap = index.snapshot.value
    if (!snap?.items.length || !dropsReady.value) return null
    return priceLookup(liveItems.value, randomOnBase.value, rule())
  })
  // One divine rate in every window: live poe.ninja's, else the saved prices'.
  const divine = computed(() => divineRate(ninja.xchgRate.value, index.snapshot.value?.divine))
  // The Loot tab's rules: a unique base is worth its average drop, a T0
  // unique on it is a chase (dropLookup). The Prices tab's
  // "cheapest unique" setting never applies here.
  const lootLookup = computed<PriceLookup | null>(() => {
    if (!index.snapshot.value?.items.length || !dropsReady.value) return null
    return dropLookup(liveItems.value, randomOnBase.value, dropTiers.value, new Set(notAvg()))
  })
  // What this snapshot has at all: a type it lacks isn't priced at zero.
  const pricedTypes = computed(() => new Set((index.snapshot.value?.items ?? []).map(i => i.type)))
  // Never follows the "cheapest unique" setting: see safetyLookup.
  const safety = computed<PriceLookup | null>(() => {
    const snap = index.snapshot.value
    if (!snap?.items.length || !dropsReady.value) return null
    return safetyLookup(liveItems.value, randomOnBase.value)
  })
  // Every unique on the base, for lists that show them all (Alt+F, tooltips).
  const breakdown = computed(() => priceBreakdown(index.snapshot.value?.items ?? [], uniquesOnBase))
  const items = computed(() => index.snapshot.value?.items ?? [])
  const updatedAt = computed(() => index.snapshot.value?.ts ?? null)
  const league = computed(() => index.snapshot.value?.league ?? null)
  // poe.ninja is only downloaded while something wants prices.
  function wantPrices () {
    try { ninja.queuePricesFetch() } catch {}
  }
  return { lookup, lootLookup, safety, pricedTypes, currentLeague, breakdown, items, updatedAt, league, divine, wantPrices }
}
