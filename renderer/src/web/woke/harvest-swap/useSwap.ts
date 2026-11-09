// Shared state of the swap markers and the Flip tab for one price check.
// Nothing here searches on its own: every search starts from a click.

import { computed, inject, InjectionKey, provide, reactive, ref, Ref, ComputedRef, watch } from 'vue'
import type { ParsedItem } from '@/parser'
import type { FilterOrGroup, ItemFilters, StatFilter } from '@/web/price-check/filters/interfaces'
import { AppConfig } from '@/web/Config'
import { usePoeninja } from '@/web/background/Prices'
import { useInsight } from '@/web/woke/price-insight/useInsight'
import { detectSwaps, SwapCandidate } from './detect'
import { DEFAULT_HIGHLIGHT_CHAOS } from './families'
import { runSwapSearch, SwapMode, SwapSearchResult } from './search'

export interface SwapRun {
  /** Tells a run's answer from a newer run's for the same mod. */
  id: number
  mode: SwapMode
  state: 'loading' | 'done' | 'error'
  result?: SwapSearchResult
  error?: string
}

export interface SwapController {
  candidates: ComputedRef<SwapCandidate[]>
  candidateFor: (filter: StatFilter) => SwapCandidate | undefined
  runs: Map<StatFilter, SwapRun>
  view: Ref<'results' | 'flip'>
  /** Chaos one swap to `to` costs, or null when poe.ninja has no price for what pays. */
  cost: (cand: SwapCandidate, to: string) => number | null
  /** Under the highlight limit, so worth a look. Unknown costs count as cheap. */
  cheap: (cand: SwapCandidate) => boolean
  run: (cand: SwapCandidate, mode: SwapMode) => Promise<void>
  runAll: () => Promise<void>
}

const KEY: InjectionKey<SwapController> = Symbol('woke-harvest-swap')

export function provideSwap (item: Ref<ParsedItem>, filters: Ref<ItemFilters>, stats: Ref<FilterOrGroup[]>): SwapController {
  const ninja = usePoeninja()
  const league = computed(() => filters.value.trade.league)
  const { options } = useInsight(ref([]), league)
  const config = computed(() => AppConfig().woke?.harvestSwap)

  const candidates = computed(() => detectSwaps(item.value, stats.value, config.value))
  const runs = reactive(new Map<StatFilter, SwapRun>())
  const view = ref<'results' | 'flip'>('results')
  let runId = 0

  // A new item, or the preset switched: old swap prices don't belong to it.
  watch([item, stats], () => {
    runs.clear()
    view.value = 'results'
  })

  function cost (cand: SwapCandidate, to: string): number | null {
    const pay = cand.family.cost(to)
    const found = ninja.findPriceByQuery({ ns: 'ITEM', name: pay.item, variant: undefined })
    return (found && found.chaos > 0) ? found.chaos * pay.amount : null
  }

  function cheap (cand: SwapCandidate): boolean {
    const limit = config.value?.highlightChaos ?? DEFAULT_HIGHLIGHT_CHAOS
    const costs = cand.targets.map(t => cost(cand, t))
    if (costs.some(c => c == null)) return true
    return Math.min(...costs as number[]) <= limit
  }

  async function run (cand: SwapCandidate, mode: SwapMode) {
    view.value = 'flip'
    const prev = runs.get(cand.filter)
    if (prev && prev.mode === mode && prev.state !== 'error') return
    const id = ++runId
    runs.set(cand.filter, { id, mode, state: 'loading' })
    try {
      const result = await runSwapSearch(
        filters.value, stats.value, cand, mode,
        { ...options.value, accountName: AppConfig().accountName },
        item.value.category)
      if (runs.get(cand.filter)?.id === id) runs.set(cand.filter, { id, mode, state: 'done', result })
    } catch (e) {
      if (runs.get(cand.filter)?.id === id) runs.set(cand.filter, { id, mode, state: 'error', error: (e as Error).message })
    }
  }

  async function runAll () {
    view.value = 'flip'
    // One at a time, so the rate limiter sees them in order and a lockout stops the rest.
    for (const cand of candidates.value) {
      await run(cand, 'any')
      if (runs.get(cand.filter)?.state === 'error') break
    }
  }

  const controller: SwapController = {
    candidates,
    candidateFor: (filter) => candidates.value.find(c => c.filter === filter),
    runs,
    view,
    cost,
    cheap,
    run,
    runAll
  }
  provide(KEY, controller)
  return controller
}

export function useSwap (): SwapController | undefined {
  return inject(KEY, undefined)
}
