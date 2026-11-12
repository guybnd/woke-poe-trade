// Latest collected prices for the selected league, for modules that need to
// value items (farming profit, etc.). Requires the market collector.
import { computed, shallowRef, watch } from 'vue'
import { createGlobalState } from '@vueuse/core'
import { useLeagues } from '@/web/background/Leagues'
import { AppConfig } from '@/web/Config'
import { isModuleOn } from '../modules'
import { useCollectorState, useMarketCollector } from './collector'
import { latestSnapshots } from './db'
import { itemKey } from './types'
import type { PriceItem, Snapshot } from './types'

const usePriceIndexState = createGlobalState(() => {
  const collector = useCollectorState()
  const leagues = useLeagues()
  const snapshot = shallowRef<Snapshot | null>(null)

  let seq = 0
  watch([leagues.selectedId, collector.revision], async ([league]) => {
    const mine = ++seq
    if (!league) { snapshot.value = null; return }
    let snap: Snapshot | null = null
    try {
      snap = (await latestSnapshots(league, 1))[0] ?? null
    } catch {}
    // A league switch while reading: keep only the newest answer.
    if (mine === seq) snapshot.value = snap
  }, { immediate: true })

  const byKey = computed(() => new Map((snapshot.value?.items ?? []).map(i => [itemKey(i), i])))

  function price (item: { type: string, name: string, variant: string }): number | null {
    return byKey.value.get(itemKey(item))?.chaos ?? null
  }

  // `only` limits the results to some items, such as the currency-type
  // items a map can cost.
  function search (query: string, limit = 8, only?: (item: PriceItem) => boolean): PriceItem[] {
    const q = query.trim().toLowerCase()
    if (q.length < 2 || !snapshot.value) return []
    const starts: PriceItem[] = []
    const contains: PriceItem[] = []
    for (const item of snapshot.value.items) {
      if (only && !only(item)) continue
      const name = item.name.toLowerCase()
      if (name.startsWith(q)) starts.push(item)
      else if (name.includes(q)) contains.push(item)
      if (starts.length >= limit) break
    }
    return [...starts, ...contains].slice(0, limit)
  }

  return { snapshot, price, search }
})

// The search boxes touch nothing until one is first opened, so an unused box
// costs nothing at startup. From then on prices keep being saved, unless the
// Market module is off: then there are no prices to show at all.
const searchStarted = shallowRef(false)
let heldForSearch = false
export function holdPricesForSearch (): void {
  searchStarted.value = true
  if (heldForSearch || !isModuleOn(AppConfig(), 'market')) return
  heldForSearch = true
  useMarketCollector()
}
export function useSearchSnapshot () {
  return computed(() => searchStarted.value && isModuleOn(AppConfig(), 'market')
    ? usePriceIndexState().snapshot.value
    : null)
}

// Holds the collector (saving only, no polling) while the caller is mounted.
export function usePriceIndex () {
  useMarketCollector()
  return usePriceIndexState()
}
