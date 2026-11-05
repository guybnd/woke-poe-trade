<template>
  <div v-if="!error" class="layout-column min-h-0" style="height: auto;">
    <div v-if="item.info.exchangeable" :class="$style.legacyMessage">
      {{ t(':legacy_bulk_xchg_msg') }}
    </div>
    <div class="w-pc-toolbar mb-2 flex pl-2">
      <div class="w-pc-matched flex items-baseline text-gray-500 mr-2">
        <span class="mr-1">{{ t(':matched') }}</span>
        <span v-if="!list" class="text-gray-600">...</span>
        <b v-else class="font-normal">{{ list.total }}{{ list.inexact ? '+' : '' }}</b>
      </div>
      <online-filter v-if="list" class="w-pc-online" :filters="filters" api="trade" />
      <div class="w-pc-grow flex-1"></div>
      <price-view-toggle class="mr-2" />
      <trade-links v-if="list"
        :get-link="makeTradeLink" />
    </div>
    <price-verdict v-if="improved"
      :item="item"
      :insight="insight"
      :divine="divine"
      :loading="!list || !slowdownReady"
      :total="list ? list.total : null"
      :log-key="logKey"
      :league="filters.trade.league" />
    <price-drivers v-if="improved && list"
      :key="list.id"
      :item="item"
      :filters="filters"
      :stats="stats"
      :insight="insight"
      :options="insightOptions"
      :divine="divine"
      :ready="slowdownReady" />
    <div class="w-pc-scroll layout-column overflow-y-auto overflow-x-hidden">
      <table class="w-pc-table table-stripped w-full">
        <thead>
          <tr class="text-left">
            <th :class="$style.tableHeading">
              <div class="px-2">{{ t(':price') }}</div>
            </th>
            <th :class="$style.tableHeading">
              <div class="px-2">&nbsp;</div>
            </th>
            <th v-if="item.stackSize" :class="$style.tableHeading">
              <div class="px-2">{{ t(':stock') }}</div>
            </th>
            <th v-if="filters.itemLevel" :class="$style.tableHeading">
              <div class="px-2">{{ t(':item_level') }}</div>
            </th>
            <th v-if="item.category === 'Gem'" :class="$style.tableHeading">
              <div class="px-2">{{ t(':gem_level') }}</div>
            </th>
            <th v-if="filters.quality || item.category === 'Gem'" :class="$style.tableHeading">
              <div class="px-2">{{ t(':quality') }}</div>
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
          <template v-else>
            <tr v-for="row in rows" :key="row.key"
              :class="{
                'w-pc-ignored': improved && row.dropped,
                'w-pc-in-range': improved && inRange(row),
                'w-pc-aging': improved && (row.band === 'aging' || (allStale && row.band === 'stale')),
                'w-pc-stale': improved && row.band === 'stale' && !row.dropped && !allStale
              }"
              :title="improved ? rowTitle(row) : undefined">
              <td class="px-2 whitespace-nowrap">
                <span class="w-pc-price">
                  <span class="w-pc-amount" :class="{ 'line-through': row.lead.priceCurrency === 'exalted' }">{{ row.lead.priceAmount }}</span>
                  <img v-if="coinFor(row.lead.priceCurrency)" class="w-pc-coin" :src="coinFor(row.lead.priceCurrency)" :alt="row.lead.priceCurrency">
                  <span v-else class="w-pc-unit">{{ row.lead.priceCurrency }}</span>
                </span>
              </td>
              <td class="px-2">
                <span class="w-pc-count">
                  <span v-if="showCountBar" class="w-pc-count-bar" :class="{ invisible: row.count < 2 }"><span :style="{ width: Math.round(row.count / maxCount * 100) + '%' }" /></span>
                  <span v-if="row.count >= (improved ? 2 : 3)" class="w-pc-count-n"><span class="font-sans">×</span>{{ row.count }}</span>
                  <span v-if="!row.lead.hasFee" :class="$style.stashListing" :title="row.lead.hasNote ? 'Stash listing' : 'Stash listing without a price note'">
                    <img :class="$style.stashIcon" src="/images/stash.png">
                    <i v-if="!row.lead.hasNote" class="fas fa-question" />
                  </span>
                  <span v-if="improved && row.dropped && FIX_TAG[row.dropped]" class="w-pc-tag">{{ FIX_TAG[row.dropped] }}</span>
                </span>
              </td>
              <td v-if="item.stackSize" class="px-2 text-right">{{ row.lead.stackSize }}</td>
              <td v-if="filters.itemLevel" class="px-2 whitespace-nowrap text-right">{{ row.lead.itemLevel }}</td>
              <td v-if="item.category === 'Gem'" class="pl-2 whitespace-nowrap">{{ row.lead.level }}</td>
              <td v-if="filters.quality || item.category === 'Gem'" class="px-2 whitespace-nowrap text-blue-400 text-right">{{ row.lead.quality }}</td>
              <td v-if="showSeller" class="px-2 whitespace-nowrap">
                <span v-if="row.lead.isMine" class="w-pc-you">{{ t('You') }}</span>
                <span v-else class="w-pc-age" style="text-align: left;">{{ showSeller === 'ign' ? row.lead.ign : row.lead.accountName }}</span>
              </td>
              <td class="px-2 w-pc-age">
                <span v-if="!showSeller && row.lead.isMine" class="w-pc-you mr-1">{{ t('You') }}</span>
                <span class="w-pc-age-inner">
                  <span :class="[$style.accountStatus, $style[row.status]]"></span>
                  <span>{{ improved && row.ageText ? row.ageText : row.lead.relativeDate }}</span>
                </span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <div v-if="improved && listSettled && list && rows.length" class="w-pc-foot"
      title="Prices come from the cheapest listings the trade site returned"><span v-if="allStale" class="w-warn">All over a week old, so they may be gone · </span>{{ shownCount }} of {{ list.total }}{{ list.inexact ? '+' : '' }} listings</div>
  </div>
  <ui-error-box v-else>
    <template #name>{{ t(':error') }}</template>
    <p v-if="error.includes('JSON')">{{ t('app.leagues_failed_help') }}</p>
    <p v-else>Error: {{ error }}</p>
    <template #actions>
      <button class="btn" @click="execSearch">{{ t('Retry') }}</button>
      <button class="btn" @click="openTradeLink">{{ t('Browser') }}</button>
    </template>
  </ui-error-box>
</template>

<script lang="ts">
import { defineComponent, computed, watch, PropType, inject, shallowReactive, shallowRef } from 'vue'
import { useI18nNs } from '@/web/i18n'
import UiErrorBox from '@/web/ui/UiErrorBox.vue'
import { requestTradeResultList, requestResults, createTradeRequest, PricingResult, SearchResult } from './pathofexile-trade'
import { getTradeEndpoint } from './common'
import { AppConfig } from '@/web/Config'
import { PriceCheckWidget } from '@/web/overlay/interfaces'
import { ItemFilters, FilterOrGroup } from '../filters/interfaces'
import { ParsedItem } from '@/parser'
import { artificialSlowdown } from './artificial-slowdown'
import OnlineFilter from './OnlineFilter.vue'
import TradeLinks from './TradeLinks.vue'
import PriceVerdict from '@/web/woke/price-insight/PriceVerdict.vue'
import PriceDrivers from '@/web/woke/price-insight/PriceDrivers.vue'
import PriceViewToggle from '@/web/woke/price-insight/PriceViewToggle.vue'
import { priceView } from '@/web/woke/price-insight/view'
import { useInsight } from '@/web/woke/price-insight/useInsight'
import { FIX_TAG } from '@/web/woke/price-insight/insight'
import { groupListings, rowTitle, ListingRow } from '@/web/woke/price-insight/listing-rows'
import { nowMinute } from '@/web/woke/ui/format'
import '@/web/woke/price-insight/price-table.css'
import { useCheckLog } from '@/web/woke/price-insight/useCheckLog'

const slowdown = artificialSlowdown(900)

const SKELETON_ROWS = 8
const COINS: Record<string, string> = { chaos: '/images/chaos.png', divine: '/images/divine.png', exalted: '/images/exa.png' }
const API_FETCH_LIMIT = 100
const MIN_NOT_GROUPED = 7
const MIN_GROUPED = 10

function useTradeApi () {
  let searchId = 0
  let collapseMerchant = false
  const error = shallowRef<string | null>(null)
  const fetching = shallowRef(false)
  const searchResult = shallowRef<SearchResult | null>(null)
  const fetchResults = shallowRef<PricingResult[]>([])

  const groupedResults = computed(() => {
    const out: Array<PricingResult & { listedTimes: number }> = []
    for (const result of fetchResults.value) {
      if (result == null) break
      if (out.length === 0 || (result.hasFee && !collapseMerchant)) {
        out.push({ listedTimes: 1, ...result })
        continue
      }
      const existingRes = out.find((added, idx) =>
        (
          added.accountName === result.accountName &&
          added.priceCurrency === result.priceCurrency &&
          added.priceAmount === result.priceAmount
        ) ||
        (
          added.accountName === result.accountName &&
          (out.length - idx) <= 2 // last or prev
        )
      )
      if (existingRes) {
        if (existingRes.stackSize) {
          existingRes.stackSize += result.stackSize!
        } else {
          existingRes.listedTimes += 1
        }
      } else {
        out.push({ listedTimes: 1, ...result })
      }
    }
    return out
  })

  async function search (filters: ItemFilters, stats: FilterOrGroup[]) {
    searchId += 1
    const _searchId = searchId
    fetching.value = true
    try {
      error.value = null
      searchResult.value = null
      const _fetchResults: PricingResult[] = shallowReactive([])
      fetchResults.value = _fetchResults

      const request = createTradeRequest(filters, stats)
      const _searchResult = await requestTradeResultList(request, filters.trade.league)
      if (_searchId !== searchId) {
        return
      }
      searchResult.value = _searchResult
      collapseMerchant = filters.trade.collapseMerchant

      // first two req are parallel, then sequential on demand
      {
        const r1 = (_searchResult.result.length > 0)
          ? requestResults(_searchResult.id, _searchResult.result.slice(0, 10), { accountName: AppConfig().accountName })
              .then(results => { _fetchResults.push(...results) })
          : Promise.resolve()
        const r2 = (_searchResult.result.length > 10)
          ? requestResults(_searchResult.id, _searchResult.result.slice(10, 20), { accountName: AppConfig().accountName })
              .then(results => r1
                .then(() => { _fetchResults.push(...results) }))
          : Promise.resolve()
        await Promise.all([r1, r2])
      }

      let fetched = 20
      async function fetchMore (): Promise<void> {
        if (_searchId !== searchId) return
        const totalGrouped = groupedResults.value.length
        const totalNotGrouped = groupedResults.value.reduce((len, res) =>
          res.listedTimes <= 2 ? len + 1 : len, 0)
        if (
          (totalNotGrouped < MIN_NOT_GROUPED || totalGrouped < MIN_GROUPED) &&
          fetched < _searchResult.result.length &&
          fetched < API_FETCH_LIMIT
        ) {
          await requestResults(_searchResult.id, _searchResult.result.slice(fetched, fetched + 10), { accountName: AppConfig().accountName })
            .then(results => { _fetchResults.push(...results) })
          fetched += 10
          return fetchMore()
        }
      }
      // A later page failing leaves what already loaded on screen.
      await fetchMore().catch((err) => { if (!_fetchResults.length) throw err })
    } catch (err) {
      if (_searchId === searchId) error.value = (err as Error).message
    } finally {
      if (_searchId === searchId) fetching.value = false
    }
  }

  return { error, searchResult, groupedResults, fetchResults, fetching, search }
}

export default defineComponent({
  components: { OnlineFilter, TradeLinks, UiErrorBox, PriceVerdict, PriceDrivers, PriceViewToggle },
  emits: ['reset'],
  props: {
    filters: {
      type: Object as PropType<ItemFilters>,
      required: true
    },
    stats: {
      type: Array as PropType<FilterOrGroup[]>,
      required: true
    },
    item: {
      type: Object as PropType<ParsedItem>,
      required: true
    }
  },
  setup (props, ctx) {
    const widget = computed(() => AppConfig<PriceCheckWidget>('price-check')!)

    watch(() => props.item, (item) => {
      slowdown.reset(item)
    }, { immediate: true })

    const { error, searchResult, groupedResults, fetchResults, fetching, search } = useTradeApi()

    // woke: improved view reads the same listings, nothing extra is requested
    const { insight, divine, options: insightOptions } = useInsight(groupedResults)

    const logKey = useCheckLog(props, searchResult, insight, slowdown.isReady)

    const showBrowser = inject<(url: string) => void>('builtin-browser')!

    function makeTradeLink () {
      return (searchResult.value)
        ? `https://${getTradeEndpoint()}/trade/search/${props.filters.trade.league}/${searchResult.value.id}`
        : `https://${getTradeEndpoint()}/trade/search/${props.filters.trade.league}?q=${JSON.stringify(createTradeRequest(props.filters, props.stats))}`
    }

    const { t } = useI18nNs('trade_result')

    const improved = computed(() => priceView.value === 'improved')

    // woke: improved merges a price into one row; classic stays one row per listing.
    const rows = computed(() => groupListings(groupedResults.value, {
      now: nowMinute.value,
      merge: improved.value,
      dropped: insight.value.dropped,
      detail: (r) => {
        const parts: unknown[] = []
        if (props.item.stackSize) parts.push(r.stackSize)
        if (props.filters.itemLevel) parts.push(r.itemLevel)
        if (props.item.category === 'Gem') parts.push(r.level)
        if (props.filters.quality || props.item.category === 'Gem') parts.push(r.quality)
        if (widget.value.showSeller) parts.push(widget.value.showSeller === 'ign' ? r.ign : r.accountName)
        return parts.join('|')
      }
    }))

    // Fading only helps when something stays bright: a dead market gets a note instead.
    const allStale = computed(() => rows.value.length > 0 && rows.value.every(r => r.band === 'stale'))

    const maxCount = computed(() => Math.max(1, ...rows.value.map(r => r.count)))

    function inRange (row: ListingRow<PricingResult & { listedTimes: number }>) {
      const range = insight.value.range
      const chaos = insight.value.prices.get(row.lead.id)
      return Boolean(range && chaos != null && !row.dropped && chaos >= range.low && chaos <= range.high)
    }

    const tableLoading = computed(() => !slowdown.isReady.value || (fetching.value && !rows.value.length))

    return {
      t,
      list: searchResult,
      improved,
      insight,
      insightOptions,
      divine,
      logKey,
      rows,
      rowTitle,
      FIX_TAG,
      SKELETON_ROWS,
      coinFor: (currency: string) => COINS[currency],
      inRange,
      maxCount,
      allStale,
      showCountBar: computed(() => improved.value && maxCount.value > 1),
      shownCount: computed(() => fetchResults.value.filter(r => r != null).length),
      tableLoading,
      listSettled: computed(() => !tableLoading.value && !fetching.value),
      slowdownReady: slowdown.isReady,
      execSearch: () => { search(props.filters, props.stats) },
      error,
      showSeller: computed(() => widget.value.showSeller),
      makeTradeLink,
      openTradeLink () {
        showBrowser(makeTradeLink())
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

.stashListing {
  position: relative;
  display: inline-block;

  & > i {
    position: absolute;
    line-height: inherit;
    left: 0;
    right: 0;
    text-align: center;
    text-shadow: 1px 1px 1px black;
  }
}

.stashIcon {
  filter: grayscale(1) opacity(0.5);
  display: inline-block;
  max-width: none;
  height: 1.25rem;
  vertical-align: bottom;
}

.legacyMessage {
  @apply rounded p-2 mb-3;
  @apply border border-gray-600;
  background: var(--w-pc-raise, theme('colors.gray.700'));
  text-wrap-style: balance;
  text-align: center;
}
</style>
