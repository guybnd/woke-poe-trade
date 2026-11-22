import { computed, Ref, watch, onUnmounted } from 'vue'
import { ItemRarity, ParsedItem } from '@/parser'
import type { ItemFilters, FilterOrGroup } from '@/web/price-check/filters/interfaces'
import { createTradeRequest, SearchResult } from '@/web/price-check/trade/pathofexile-trade'
import type { Insight } from './insight'
import { hashKey, logPriceCheck } from './price-log'

// Listings keep arriving for a moment after a search; log once they settle.
const SETTLE_MS = 2500

export function searchLogKey (league: string, filters: ItemFilters, stats: FilterOrGroup[]): string {
  return hashKey(league + '\u0000' + JSON.stringify(createTradeRequest(filters, stats)))
}

function itemLabel (item: ParsedItem): string {
  const base = item.info.name
  return item.rarity === ItemRarity.Rare ? `Rare ${base}` : base
}

/**
 * Saves each finished search's verdict to the price log and returns the
 * search's log key (null until the search has results).
 */
export function useCheckLog (
  props: { filters: ItemFilters, stats: FilterOrGroup[], item: ParsedItem },
  list: Ref<SearchResult | null>,
  insight: Ref<Insight>,
  ready: Ref<boolean>,
  // A verdict filtered here isn't the search's; a log already on its way still goes.
  paused?: Ref<boolean>
) {
  const key = computed(() => list.value ? searchLogKey(props.filters.trade.league, props.filters, props.stats) : null)

  let timer: ReturnType<typeof setTimeout> | undefined
  watch([key, insight, ready], () => {
    if (paused?.value) return
    clearTimeout(timer)
    const k = key.value
    const r = insight.value.range
    if (!k || !r || !ready.value) return
    // A verdict that left out divine listings isn't worth comparing against later.
    if (insight.value.signals.some(s => s.kind === 'norate')) return
    const league = props.filters.trade.league
    const label = itemLabel(props.item)
    const n = insight.value.kept.length
    timer = setTimeout(() => {
      logPriceCheck({ key: k, league, label, ts: Date.now(), fair: r.fair, low: r.low, high: r.high, n })
    }, SETTLE_MS)
  })
  onUnmounted(() => { clearTimeout(timer) })

  return key
}
