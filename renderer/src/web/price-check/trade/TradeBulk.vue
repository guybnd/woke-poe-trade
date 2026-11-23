<template>
  <div v-if="!error" class="layout-column min-h-0" style="height: auto;">
    <teleport v-if="improved && verdictSlot" :to="verdictSlot">
      <bulk-verdict :insight="bulkInsight" :unit="selectedCurr === 'xchgChaos' ? 'c' : 'div'" :need="need" :loading="tableLoading" :ninja="ninjaEach" :other="otherMarket" :divine-in-chaos="divineInChaos" />
    </teleport>
    <div :class="$style.legacyMessage">
      {{ t(':legacy_bulk_xchg_msg') }}
    </div>
    <!-- @TODO: fix "Matched" text jumping (min-height: 22px) -->
    <div class="w-pc-toolbar mb-2 flex pl-2 justify-between items-baseline" style="min-height: 1.375rem;">
      <div class="w-pc-matched flex items-center text-gray-500">
        <span class="mr-1">{{ t(':matched') }}</span>
        <span v-if="!result" class="text-gray-600">...</span>
        <div v-else class="flex items-center">
          <button class="btn flex items-center mr-1" :style="{ background: selectedCurr !== 'xchgChaos' ? 'transparent' : undefined }"
            :disabled="!result.both && !result.xchgChaos.listed.value" @click="pickCurr('xchgChaos')">
            <img src="/images/chaos.png" :class="$style.currencyIcon">
            <span>{{ result.xchgChaos.listed.value?.total ?? '?' }}</span>
          </button>
          <button class="btn flex items-center mr-1" :style="{ background: selectedCurr !== 'xchgStable' ? 'transparent' : undefined }"
            :disabled="!result.both && !result.xchgStable.listed.value" @click="pickCurr('xchgStable')">
            <img src="/images/divine.png" :class="$style.currencyIcon">
            <span>{{ result.xchgStable.listed.value?.total ?? '?' }}</span>
          </button>
          <span class="ml-1"><online-filter :filters="filters" api="bulk" /></span>
        </div>
      </div>
      <trade-links v-if="result"
        :get-link="makeTradeLink" :suggest-name="() => item.info.name" />
    </div>
    <div class="w-pc-scroll layout-column overflow-y-auto overflow-x-hidden">
      <table class="w-pc-table table-stripped w-full">
        <thead>
          <tr class="text-left">
            <th :class="$style.tableHeading">
              <div class="px-2">{{ t(':price') }}</div>
            </th>
            <th :class="$style.tableHeading">
              <div class="w-pc-ratio-head pl-1 pr-2 flex text-xs" style="line-height: calc(1.3125rem * var(--w-text-scale, 1));"><span :class="[$style.ratioCell, $style.ratioPay]" class="text-right -ml-px mr-px">pay</span><span>{{ '\u2009' }}/{{ '\u2009' }}</span><span :class="$style.ratioCell">get</span></div>
            </th>
            <th :class="$style.tableHeading">
              <div class="px-1">{{ t(':stock') }}</div>
            </th>
            <th :class="$style.tableHeading">
              <div class="px-1">{{ t(':fulfill') }}</div>
            </th>
            <th v-if="showSeller" class="w-full" :class="$style.tableHeading">
              <div class="px-2">{{ t(':seller') }}</div>
            </th>
            <th :class="[$style.tableHeading, 'text-right', { 'w-full': !showSeller }]">
              <div class="px-2">{{ t(':listed') }}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-if="tableLoading">
            <tr v-for="i in SKELETON_ROWS" :key="i">
              <td colspan="100" class="px-2"><span class="w-pc-skel" :style="{ width: 30 + ((i * 17) % 45) + '%' }" /></td>
            </tr>
          </template>
          <tr v-else-if="selectedFailed">
            <td colspan="100" class="px-2 py-1" data-testid="bulk-side-failed">These offers didn't load. <button class="btn" @click="retrySide">Try again</button></td>
          </tr>
          <template v-else>
            <tr v-for="result in selectedResults" :key="result.id"
              :class="{ [$style.marketRatioRow]: ('marketRatio' in result) }">
              <td class="px-2 whitespace-nowrap" data-testid="bulk-each">{{ Number((result.exchangeAmount / result.itemAmount).toFixed(4)) }}<img :src="unitIcon" :alt="unitName" :title="unitName" :class="$style.unitIcon"></td>
              <td class="pl-1 whitespace-nowrap"><span :class="[$style.ratioCell, $style.ratioPay]" class="text-right">{{ Number(result.exchangeAmount.toFixed(1)) }}<img :src="unitIcon" :alt="unitName" :title="unitName" :class="$style.unitIcon"></span><span>{{ '\u2009' }}/{{ '\u2009' }}</span><span :class="$style.ratioCell">{{ Number(result.itemAmount.toFixed(1)) }}</span></td>
              <template v-if="'marketRatio' in result">
                <td class="pl-1 pr-2 whitespace-nowrap text-center" :colspan="showSeller ? 4 : 3">{{ t(':market_ratio') }}</td>
              </template>
              <template v-else>
                <td class="px-1 text-right">{{ result.stock }}</td>
                <td class="px-1 text-right"><i v-if="result.stock < result.itemAmount" class="fas fa-exclamation-triangle mr-1 text-gray-500"></i>{{ Math.floor(result.stock / result.itemAmount) }}</td>
                <td v-if="showSeller" class="px-2 whitespace-nowrap">
                  <span v-if="result.isMine" class="w-pc-you">{{ t('You') }}</span>
                  <span v-else class="w-pc-age" style="text-align: left;">{{ showSeller === 'ign' ? result.ign : result.accountName }}</span>
                </td>
                <td class="px-2 w-pc-age">
                  <span v-if="!showSeller && result.isMine" class="w-pc-you mr-1">{{ t('You') }}</span>
                  <span class="w-pc-age-inner">
                    <span :class="[$style.accountStatus, $style[result.accountStatus]]"></span>
                    <span>{{ result.relativeDate }}</span>
                  </span>
                </td>
              </template>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
  <ui-error-box class="mb-2" v-else>
    <template #name>{{ t(':error') }}</template>
    <p v-if="rateLimited">The trade site is limiting requests. Searching again too soon makes the wait longer.</p>
    <p v-else-if="error.includes('JSON')">{{ t('app.leagues_failed_help') }}</p>
    <p v-else>Error: {{ error }}</p>
    <template #actions>
      <button class="btn" :disabled="retryIn > 0" @click="execSearch">{{ t('Retry') }}<template v-if="retryIn > 0"> ({{ retryIn }}s)</template></button>
      <button class="btn" @click="openTradeLink">{{ t('Browser') }}</button>
    </template>
  </ui-error-box>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, watch, ComputedRef, Ref, ShallowRef, shallowRef, shallowReactive, inject, readonly } from 'vue'
import { useI18nNs } from '@/web/i18n'
import UiErrorBox from '@/web/ui/UiErrorBox.vue'
import { BulkSearch, execBulkSearch, createTradeRequest, PricingResult } from './pathofexile-bulk'
import { getTradeEndpoint } from './common'
import { AppConfig } from '@/web/Config'
import { usePoeninja } from '@/web/background/Prices'
import { useLeagues } from '@/web/background/Leagues'
import { getDetailsId, exactDetailsId } from '../trends/getDetailsId'
import { ItemFilters } from '../filters/interfaces'
import { ParsedItem } from '@/parser'
import { PriceCheckWidget } from '@/web/overlay/interfaces'
import { artificialSlowdown } from './artificial-slowdown'
import { useRetryCountdown } from './retry-countdown'
import OnlineFilter from './OnlineFilter.vue'
import TradeLinks from './TradeLinks.vue'
import BulkVerdict from '@/web/woke/price-insight/BulkVerdict.vue'
import { buildBulkInsight, pickBulkMarket } from '@/web/woke/price-insight/bulk-insight'
import { priceView } from '@/web/woke/price-insight/view'
import { chaosOrbRow } from '@/web/woke/price-insight/ninja-first'
import '@/web/woke/price-insight/price-table.css'

const slowdown = artificialSlowdown(900)
const SKELETON_ROWS = 8

function useBulkApi () {
  type BulkSide = {
    listed: Ref<BulkSearch | null>
    listedLazy: ComputedRef<readonly PricingResult[]>
    /** Loads this side if it isn't yet. Quiet: a failure only marks it failed. */
    load: (quiet?: boolean) => void
    failed: Ref<boolean>
  }
  type BulkSearchExtended = Record<'xchgChaos' | 'xchgStable', BulkSide> & {
    /** The first search asked for both currencies (not a Chaos or Divine Orb). */
    both: boolean
  }

  let searchId = 0
  const error = shallowRef<string | null>(null)
  const result = shallowRef<BulkSearchExtended | null>(null)

  async function search (item: ParsedItem, filters: ItemFilters) {
    searchId += 1
    const _searchId = searchId
    try {
      error.value = null
      result.value = null

      // override, because at league start many players set wrong price, and this breaks optimistic search
      const have = (item.info.refName === 'Chaos Orb')
        ? ['divine']
        : (item.info.refName === 'Divine Orb')
            ? ['chaos']
            : ['divine', 'chaos']

      const optimisticSearch = await execBulkSearch(
        item, filters, have, { accountName: AppConfig().accountName })
      if (_searchId === searchId) {
        result.value = {
          xchgStable: getResultsByHave(item, filters, optimisticSearch, 'divine'),
          xchgChaos: getResultsByHave(item, filters, optimisticSearch, 'chaos'),
          both: have.length > 1
        }
      }
    } catch (err) {
      // woke: a search that's been replaced has nothing to say.
      if (_searchId === searchId) error.value = (err as Error).message
    }
  }

  function getResultsByHave (
    item: ParsedItem,
    filters: ItemFilters,
    preloaded: Array<BulkSearch | null>,
    have: 'divine' | 'chaos'
  ) {
    const _result = shallowRef(
      preloaded.some(res => res?.haveTag === have)
        ? shallowReactive(preloaded.find(res => res?.haveTag === have)!)
        : null)
    const items = shallowRef<PricingResult[]>(_result.value?.listed ?? [])
    const failed = shallowRef(false)
    let inFlight = false

    // woke: loads start from a pick or the price comparison, never from inside a computed.
    function load (quiet = false) {
      if (inFlight || _result.value != null) return
      inFlight = true
      failed.value = false
      // A newer search replaces this one's results, so this has nothing to add.
      const _searchId = searchId
      ;(async function () {
        try {
          const found = (await execBulkSearch(
            item, filters, [have], { accountName: AppConfig().accountName, wait: quiet }))[0]!
          if (_searchId !== searchId) return
          _result.value = shallowReactive(found)
          items.value = _result.value.listed
          const otherHave = (have === 'divine')
            ? result.value!.xchgChaos.listed.value
            : result.value!.xchgStable.listed.value
          // The first search's count for the other side was a guess: it's
          // everything that search found less this side.
          if (otherHave && result.value!.both) otherHave.total = Math.max(0, otherHave.queryTotal - found.total)
        } catch (err) {
          if (_searchId !== searchId) return
          // Loaded only to compare prices: the side shows it failed and a click retries.
          failed.value = true
          if (!quiet) error.value = (err as Error).message
        } finally {
          inFlight = false
        }
      })()
    }

    const listedLazy = computed(() => items.value)

    return { listed: _result, listedLazy, load, failed }
  }

  return { error, result, search }
}

interface MarketRatio extends Pick<PricingResult, 'exchangeAmount' | 'itemAmount'> {
  id: 'market-ratio'
  marketRatio: true
}

function mergeWithMarketRatio (results: readonly PricingResult[], marketRatio: MarketRatio): Array<PricingResult | MarketRatio> {
  if (!results.length) return [marketRatio]

  const out: Array<PricingResult | MarketRatio> = [...results]
  let insertIdx = results.findIndex(result =>
    (result.exchangeAmount / result.itemAmount) >= (marketRatio.exchangeAmount / marketRatio.itemAmount))
  if (insertIdx === -1) {
    insertIdx = results.length
  }
  out.splice(insertIdx, 0, marketRatio)
  return out
}

function useMarketRatioFinder () {
  type MarketRatioMap = Record<'xchgChaos' | 'xchgStable', MarketRatio | undefined>

  const { selected: defaultLeague } = useLeagues()
  const { findPriceByQuery, xchgRate } = usePoeninja()
  const marketRatio = shallowRef<MarketRatioMap>({ xchgChaos: undefined, xchgStable: undefined })

  function find (item: ParsedItem, filters: ItemFilters): void {
    marketRatio.value = { xchgChaos: undefined, xchgStable: undefined }

    if (filters.trade.league !== defaultLeague.value?.id) return

    const detailsId = getDetailsId(item)
    const priceEntry = detailsId && findPriceByQuery(detailsId)
    if (!priceEntry) return

    let xchgChaos: MarketRatio | undefined
    if (priceEntry.chaos < ((xchgRate.value || 9999) * 1.06)) {
      let price: number
      let items: number
      if (priceEntry.chaos > 4) {
        price = priceEntry.chaos
        items = 1
      } else {
        price = (priceEntry.chaos > 1) ? 20 : 10
        items = price / priceEntry.chaos
      }
      xchgChaos = { id: 'market-ratio', marketRatio: true, exchangeAmount: price, itemAmount: items }
    }

    let xchgStable: MarketRatio | undefined
    if (xchgRate.value !== undefined) {
      let price: number
      let items: number
      if (priceEntry.chaos > (xchgRate.value * 0.94)) {
        price = priceEntry.chaos / xchgRate.value
        items = 1
      } else {
        price = (priceEntry.chaos > (xchgRate.value * 0.2)) ? 2 : 1
        items = price * (xchgRate.value / priceEntry.chaos)
      }
      xchgStable = { id: 'market-ratio', marketRatio: true, exchangeAmount: price, itemAmount: items }
    }

    marketRatio.value = { xchgChaos, xchgStable }
  }

  return { marketRatio: readonly(marketRatio), find }
}

export default defineComponent({
  components: { OnlineFilter, TradeLinks, UiErrorBox, BulkVerdict },
  emits: ['reset'],
  props: {
    filters: {
      type: Object as PropType<ItemFilters>,
      required: true
    },
    item: {
      type: Object as PropType<ParsedItem>,
      required: true
    }
  },
  setup (props, ctx) {
    const widget = computed(() => AppConfig<PriceCheckWidget>('price-check')!)
    const { error, result, search } = useBulkApi()
    const { retryIn, rateLimited } = useRetryCountdown(error)
    const { marketRatio, find: findMarketRatio } = useMarketRatioFinder()

    const showBrowser = inject<(url: string) => void>('builtin-browser')!

    const selectedCurr = shallowRef<'xchgChaos' | 'xchgStable'>('xchgChaos')
    // woke: once you pick a currency, the price comparison leaves it alone.
    let userPicked = false
    function pickCurr (curr: 'xchgChaos' | 'xchgStable') {
      userPicked = true
      selectedCurr.value = curr
      result.value?.[curr].load()
    }

    watch(() => props.item, (item) => {
      slowdown.reset(item)
    }, { immediate: true })

    const selectedResults = computed(() => {
      if (!slowdown.isReady.value || !result.value) return []

      const listed = result.value[selectedCurr.value].listedLazy.value
      const ratio = marketRatio.value[selectedCurr.value]
      return (ratio !== undefined)
        ? mergeWithMarketRatio(listed.slice(0, 19), ratio)
        : listed
    })

    // woke: the verdict's slot sits above the mods, as for item listings.
    const verdictSlot = inject<ShallowRef<HTMLElement | null>>('price-verdict-slot', shallowRef(null))
    const need = computed(() => props.item.stackSize?.value ?? 1)
    // woke: poe.ninja's price in the offers' currency, for the verdict to compare (WOKEPOET-479).
    const poeninja = usePoeninja()
    const { selected: selectedLeague } = useLeagues()
    const ninjaEach = computed(() => {
      if (props.filters.trade.league !== selectedLeague.value?.id) return null
      const q = exactDetailsId(props.item)
      const chaos = (chaosOrbRow(props.item, poeninja.xchgRate.value) ?? (q ? poeninja.findPriceByQuery(q) : null))?.chaos
      if (!chaos) return null
      if (selectedCurr.value === 'xchgChaos') return chaos
      const rate = poeninja.xchgRate.value
      return rate ? chaos / rate : null
    })
    // woke: both currencies' offers, to lead with the cheaper (WOKEPOET-487).
    const sideInsight = (curr: 'xchgChaos' | 'xchgStable') => computed(() => {
      const listed = result.value?.[curr].listed.value?.listed
      return listed ? buildBulkInsight(listed, need.value) : null
    })
    const insights = { xchgChaos: sideInsight('xchgChaos'), xchgStable: sideInsight('xchgStable') }
    // Both sides are in (or one failed), so the cheaper can be told.
    const marketsSettled = computed(() => {
      const r = result.value
      if (!r) return false
      if (!r.both) return true
      return (['xchgChaos', 'xchgStable'] as const).every(c => r[c].listed.value != null || r[c].failed.value)
    })
    const bulkInsight = computed(() => {
      if (!slowdown.isReady.value || !result.value || !marketsSettled.value) return null
      const listed = result.value[selectedCurr.value].listedLazy.value
      return buildBulkInsight(listed, need.value)
    })
    const otherMarket = computed(() => {
      if (!bulkInsight.value) return null
      const curr = selectedCurr.value === 'xchgChaos' ? 'xchgStable' : 'xchgChaos'
      const unit = curr === 'xchgChaos' ? 'c' : 'div'
      if (result.value?.[curr].failed.value) return { unit, failed: true }
      const insight = insights[curr].value
      return insight ? { unit, fair: insight.fair, sellers: insight.sellers } : null
    })

    // woke: real rows only once loaded, with placeholder rows until then.
    const tableLoading = computed(() => {
      const shown = selectedResults.value
      if (!slowdown.isReady.value || !result.value || !marketsSettled.value) return true
      const side = result.value[selectedCurr.value]
      return shown.length === 0 || 'marketRatio' in shown[0]
        ? side.listed.value == null && !side.failed.value
        : false
    })

    watch(result, (r) => {
      userPicked = false
      // The first search held the chaos side back: load it to compare prices.
      if (r?.both) {
        r.xchgChaos.load(true)
        r.xchgStable.load(true)
      }
    })
    watch(() => marketsSettled.value && result.value
      ? pickBulkMarket(
          { insight: insights.xchgChaos.value, total: result.value.xchgChaos.listed.value?.total ?? null },
          { insight: insights.xchgStable.value, total: result.value.xchgStable.listed.value?.total ?? null },
          poeninja.xchgRate.value)
      : null,
    (market) => {
      if (market && !userPicked) selectedCurr.value = market
    }, { immediate: true })

    function makeTradeLink (_have?: string[]) {
      const have = _have ?? ((selectedCurr.value === 'xchgStable') ? ['divine'] : ['chaos'])
      const httpPostBody = createTradeRequest(props.filters, props.item, have)
      const httpGetQuery = { exchange: httpPostBody.query }
      return `https://${getTradeEndpoint()}/trade/exchange/${props.filters.trade.league}?q=${JSON.stringify(httpGetQuery)}`
    }

    const { t } = useI18nNs('trade_result')

    return {
      t,
      improved: computed(() => priceView.value === 'improved'),
      verdictSlot,
      need,
      ninjaEach,
      bulkInsight,
      otherMarket,
      // woke: every price says its currency (WOKEPOET-487).
      unitIcon: computed(() => selectedCurr.value === 'xchgChaos' ? '/images/chaos.png' : '/images/divine.png'),
      unitName: computed(() => selectedCurr.value === 'xchgChaos' ? 'chaos' : 'divine'),
      divineInChaos: computed(() => poeninja.xchgRate.value ?? null),
      pickCurr,
      selectedFailed: computed(() => result.value?.[selectedCurr.value].failed.value === true && !result.value[selectedCurr.value].listed.value),
      retrySide: () => result.value?.[selectedCurr.value].load(),
      error,
      retryIn,
      rateLimited,
      result,
      selectedResults,
      tableLoading,
      SKELETON_ROWS,
      selectedCurr,
      execSearch: () => {
        search(props.item, props.filters)
        findMarketRatio(props.item, props.filters)
      },
      showSeller: computed(() => widget.value.showSeller),
      makeTradeLink,
      openTradeLink () {
        showBrowser(makeTradeLink(['mirror']))
        ctx.emit('reset')
      }
    }
  }
})
</script>

<style lang="postcss" module>
.tableHeading {
  @apply sticky top-0;
  @apply bg-gray-800;
  @apply p-0 m-0;
  white-space: nowrap;

  & > div {
    @apply border-b border-gray-700;
  }
}

.accountStatus {
  display: inline-block;
  flex: none;
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 100%;

  /* &.online {} */
  &.offline { @apply bg-red-600; }
  &.afk { @apply bg-orange-500; }
}

.ratioCell {
  display: inline-block;
  width: calc(2rem * (1 + (var(--w-text-scale, 1) - 1) / 2)); /* half the text growth: the table must fit the window */
}

/* The paid side carries its currency icon. */
.ratioPay {
  width: calc(3rem * (1 + (var(--w-text-scale, 1) - 1) / 2));
}

.unitIcon {
  display: inline-block;
  width: 1.125em;
  height: 1.125em;
  margin-left: 0.125em;
  vertical-align: -0.2em;
}

.currencyIcon {
  width: 1.75rem;
  height: 1.75rem;
  margin: -0.4375rem;
  margin-right: 0.125rem;
  filter: grayscale(1);
}

.legacyMessage {
  @apply mb-2;
  font-family: var(--w-body);
  font-size: calc(12px * var(--w-text-scale, 1));
  color: var(--w-dim);
}

.marketRatioRow {
  background: var(--w-pc-raise, theme('colors.gray.700')) !important;
  outline: 1px solid theme('colors.gray.600');
  outline-offset: -1px;
}
</style>
