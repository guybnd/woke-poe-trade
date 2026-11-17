// One answer to "what is this item worth", for every window: which price row
// an item takes when several match, the unidentified price of rolled uniques,
// and one divine rate to show it with.
//
// Rows come from live poe.ninja (usePoeninja) or the Market module's saved
// snapshot (usePriceIndex): both are poe.ninja's rows, and both go through
// pickRow, so a list row and its tooltip agree.
import { computed } from 'vue'
import type { Ref } from 'vue'
import { usePoeninja } from '@/web/background/Prices'
import { useLeagues } from '@/web/background/Leagues'
import { formatChaos } from '../ui/format'
import { VARIABLE_ITEMS, useTradePrices } from './unid-prices'
import { pickRow, divineRate } from './price-row'

export { pickRow, divineRate }
export type { PriceRowLike } from './price-row'

// A rolled unique (Watcher's Eye, Forbidden Flame...): its price is the
// unidentified one, from a trade quote already on hand. Never searches: a
// search runs only on a click (Search's unid row, Boss runs).
export function useUnidPrice () {
  const trade = useTradePrices()
  const league = useLeagues().selectedId
  return (name: string): { chaos: number, listings: number } | null => {
    if (!VARIABLE_ITEMS.has(name) || !league.value) return null
    return trade.get(league.value, name)
  }
}

// Price text for a window: chaos, or divines from one divine, with the
// divine rate the tooltip uses. `snapshot`: the window's saved prices, for
// their divine when live prices haven't loaded.
export function usePriceText (snapshot?: Ref<{ divine: number | null } | null | undefined>) {
  const ninja = usePoeninja()
  const divine = computed(() => divineRate(ninja.xchgRate.value, snapshot?.value?.divine))
  return {
    divine,
    fmt: (chaos: number) => formatChaos(chaos, divine.value)
  }
}

// An item's live poe.ninja row by name (`ns`: UNIQUE, GEM, DIVINATION_CARD,
// ITEM, CAPTURED_BEAST), picked as every window picks it, and a rolled
// unique's unidentified price when a quote is on hand.
export function usePrice () {
  const ninja = usePoeninja()
  const unidOf = useUnidPrice()
  function priceOf (name: string, opts: { ns: string, variant?: string }) {
    ninja.queuePricesFetch()
    const row = ninja.findPriceByQuery({ ns: opts.ns, name, variant: opts.variant || undefined }) ??
      (opts.variant ? null : pickRow(ninja.findPricesByName(opts.ns, name)))
    if (!row) return null
    return { row, chaos: row.chaos, unid: opts.ns === 'UNIQUE' ? unidOf(name) : null }
  }
  return { priceOf, divine: computed(() => ninja.xchgRate.value ?? null) }
}
