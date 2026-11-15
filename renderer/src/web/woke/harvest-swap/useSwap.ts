// Shared state of the swap markers and the Flip tab for one price check.
// Nothing here searches on its own: every search starts from a click.

import { computed, inject, InjectionKey, provide, reactive, ref, Ref, ComputedRef, shallowRef, watch } from 'vue'
import type { ParsedItem } from '@/parser'
import type { FilterOrGroup, ItemFilters, StatFilter } from '@/web/price-check/filters/interfaces'
import type { PricingResult } from '@/web/price-check/trade/pathofexile-trade'
import { KEY_LABEL } from './families'
import { AppConfig } from '@/web/Config'
import { usePoeninja } from '@/web/background/Prices'
import { useInsight } from '@/web/woke/price-insight/useInsight'
// Detection loads with the first price check, not at startup.
import type { SwapCandidate } from './detect'
// The search code loads on the first swap search, not with the price check.
import type { SwapMode, SwapSearchResult } from './search'

export interface SwapRun {
  /** Tells a run's answer from a newer run's for the same mod. */
  id: number
  mode: SwapMode
  state: 'loading' | 'done' | 'error'
  result?: SwapSearchResult
  error?: string
  /** A key being searched on its own, to fill in one with too few listings. */
  refining?: string
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
  /** Searches one key on its own and puts its price into the mod's result. */
  refine: (cand: SwapCandidate, key: string) => Promise<void>
  runAll: () => Promise<void>
  /** The mod's result was made with filters that have changed since. */
  stale: (cand: SwapCandidate) => boolean
  /** What the row searches as: a key, 'any', or null for the item's own. */
  pickOf: (cand: SwapCandidate) => SwapMode | null
  /** Searches the row as `mode` in the price check itself (1 search); 'this' puts it back. */
  pick: (cand: SwapCandidate, mode: SwapMode | 'this') => Promise<void>
  /** The price check's listings and the rows they were searched with. */
  resultsChanged: (listings: readonly PricingResult[], searched: readonly FilterOrGroup[]) => void
}

const KEY: InjectionKey<SwapController> = Symbol('woke-harvest-swap')

export function provideSwap (item: Ref<ParsedItem>, filters: Ref<ItemFilters>, stats: Ref<FilterOrGroup[]>, enabled: Ref<boolean>, startSearch: () => void): SwapController {
  const ninja = usePoeninja()
  const league = computed(() => filters.value.trade.league)
  const { options } = useInsight(ref([]), league)
  const config = computed(() => AppConfig().woke?.harvestSwap)

  // Only where the trade site prices the item: bulk-priced items can't show the Flip tab.
  const detectCode = shallowRef<typeof import('./detect') | null>(null)
  import('./detect').then(code => { detectCode.value = code }).catch(() => { /* no markers: the price check works as before */ })
  const candidates = computed(() => (enabled.value && detectCode.value)
    ? detectCode.value.detectSwaps(item.value, stats.value, config.value)
    : [])
  const runs = reactive(new Map<StatFilter, SwapRun>())
  const view = ref<'results' | 'flip'>('results')
  let runId = 0

  // A new item, or the preset switched: old swap prices don't belong to it.
  watch([item, stats], () => {
    runs.clear()
    view.value = 'results'
  })

  function cost (cand: SwapCandidate, to: string): number | null {
    return detectCode.value!.swapChaos(cand.family.cost(to), name => {
      const found = ninja.findPriceByQuery({ ns: 'ITEM', name, variant: undefined })
      return found ? found.chaos : null
    })
  }

  function cheap (cand: SwapCandidate): boolean {
    const limit = config.value?.highlightChaos ?? detectCode.value!.DEFAULT_HIGHLIGHT_CHAOS
    const costs = cand.targets.map(t => cost(cand, t))
    if (costs.some(c => c == null)) return true
    return Math.min(...costs as number[]) <= limit
  }

  const searchCode = shallowRef<typeof import('./search') | null>(null)
  async function loadSearch () {
    if (!searchCode.value) searchCode.value = await import('./search')
    return searchCode.value
  }

  function currentKey (cand: SwapCandidate, mode: SwapMode): string | null {
    const code = searchCode.value
    return code && code.requestKey(code.buildSwapRequest(filters.value, stats.value, cand, mode))
  }

  function stale (cand: SwapCandidate): boolean {
    const r = runs.get(cand.filter)
    if (r?.state !== 'done') return false
    // Priced from the price check's listings: its own Search button says when they're old.
    if (r.result!.fromResults) return false
    const key = currentKey(cand, r.mode)
    return key != null && r.result!.request !== key
  }

  async function run (cand: SwapCandidate, mode: SwapMode) {
    view.value = 'flip'
    const prev = runs.get(cand.filter)
    if (prev && prev.mode === mode && prev.state === 'loading') return
    if (prev && prev.mode === mode && prev.state === 'done' && !stale(cand)) return
    const id = ++runId
    runs.set(cand.filter, { id, mode, state: 'loading' })
    try {
      const { runSwapSearch } = await loadSearch()
      const result = await runSwapSearch(
        filters.value, stats.value, cand, mode,
        { ...options.value, accountName: AppConfig().accountName },
        item.value.category)
      if (runs.get(cand.filter)?.id === id) runs.set(cand.filter, { id, mode, state: 'done', result })
    } catch (e) {
      if (runs.get(cand.filter)?.id === id) runs.set(cand.filter, { id, mode, state: 'error', error: (e as Error).message })
    }
  }

  async function refine (cand: SwapCandidate, key: string) {
    const prev = runs.get(cand.filter)
    if (prev?.state !== 'done' || prev.refining) return
    const { id } = prev
    runs.set(cand.filter, { ...prev, refining: key })
    const keep = (patch: Partial<SwapRun>) => {
      const now = runs.get(cand.filter)
      if (now?.id === id) runs.set(cand.filter, { ...now, refining: undefined, ...patch })
    }
    try {
      const { runSwapSearch } = await loadSearch()
      const one = await runSwapSearch(
        filters.value, stats.value, cand, key,
        { ...options.value, accountName: AppConfig().accountName },
        item.value.category)
      const now = runs.get(cand.filter)
      if (now?.id !== id || !now.result) return
      const price = one.prices.find(p => p.key === key)
      keep({ result: { ...now.result, prices: now.result.prices.map(p => (p.key === key && price) ? price : p) } })
    } catch (e) {
      keep({ error: (e as Error).message })
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

  function pickOf (cand: SwapCandidate): SwapMode | null {
    return cand.filter.swapPick?.mode ?? null
  }

  async function pick (cand: SwapCandidate, mode: SwapMode | 'this') {
    const f = cand.filter
    view.value = 'results'
    if (mode === 'this') {
      const was = f.swapPick
      if (!was) return
      f.tradeId = was.tradeId
      if (was.roll && f.roll) { f.roll.min = was.roll.min; f.roll.max = was.roll.max }
      delete f.swapPick
      runs.delete(f)
      startSearch()
      return
    }
    if (f.swapPick?.mode === mode) return
    const { pickTradeIds, keyRefs, swapKeys } = await loadSearch()
    const own = f.swapPick?.tradeId ?? f.tradeId
    const ownRoll = f.swapPick ? f.swapPick.roll : (f.roll ? { min: f.roll.min, max: f.roll.max } : undefined)
    const refs = keyRefs(cand)
    // Put the row's own roll back first: a pick from another pick starts from the item.
    if (ownRoll && f.roll) { f.roll.min = ownRoll.min; f.roll.max = ownRoll.max }
    // Tiers differ between elements for added damage: any roll, like the Flip search.
    if (cand.family.anyRoll && f.roll) { f.roll.min = ''; f.roll.max = '' }
    f.swapPick = {
      mode,
      keys: swapKeys(cand, mode).map(k => ({ label: KEY_LABEL[k], ref: refs[k] })),
      tradeId: own,
      roll: ownRoll
    }
    f.tradeId = pickTradeIds(cand, mode, own)
    f.disabled = false
    runs.delete(f)
    startSearch()
  }

  function resultsChanged (listings: readonly PricingResult[], searched: readonly FilterOrGroup[]) {
    const code = searchCode.value
    if (!code || !listings.length) return
    for (const cand of candidates.value) {
      const mode = pickOf(cand)
      if (mode == null) continue
      // Only listings searched with this same pick price it.
      const row = searched.find((s): s is StatFilter => !('group' in s && s.group) && (s as StatFilter).statRef === cand.filter.statRef) as StatFilter | undefined
      if (row?.swapPick?.mode !== mode) continue
      const min = typeof row.roll?.min === 'number' ? row.roll.min : null
      const keys = code.swapKeys(cand, mode)
      const prices = code.priceByKey([...listings], cand, keys, { ...options.value }, item.value.category, min)
      const prev = runs.get(cand.filter)
      runs.set(cand.filter, {
        id: prev?.state === 'done' && prev.result?.fromResults ? prev.id : ++runId,
        mode,
        state: 'done',
        result: { prices, total: listings.length, request: '', fromResults: true }
      })
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
    refine,
    runAll,
    stale,
    pickOf,
    pick,
    resultsChanged
  }
  provide(KEY, controller)
  return controller
}

export function useSwap (): SwapController | undefined {
  return inject(KEY, undefined)
}
