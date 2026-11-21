<template>
  <div v-if="!error" class="layout-column min-h-0" :class="{ 'w-pc-results-stale': stale }" style="height: auto;">
    <div v-if="item.info.exchangeable" :class="$style.legacyMessage">
      {{ t(':legacy_bulk_xchg_msg') }}
    </div>
    <div v-show="!stale" class="w-pc-toolbar mb-2 flex pl-2">
      <div class="w-pc-matched flex items-baseline text-gray-500 mr-2">
        <span class="mr-1">{{ t(':matched') }}</span>
        <span v-if="!list" class="text-gray-600">...</span>
        <b v-else class="font-normal">{{ list.total }}{{ list.inexact ? '+' : '' }}</b>
      </div>
      <online-filter class="w-pc-online" :class="{ invisible: !list }" :filters="filters" api="trade" />
      <button type="button" class="w-pc-bulk" :class="{ invisible: !list, on: bulk }" :aria-pressed="bulk"
        :title="bulkTitle" @click="toggleBulk">Bulk<span v-if="bulkNote" class="ml-1">{{ bulkNote }}</span></button>
      <div class="w-pc-grow flex-1"></div>
      <!-- woke: the price check's prefix / suffix caps, editing its live filters. -->
      <slot name="toolbar" />
      <button type="button" class="w-icon-btn mr-1" :class="{ invisible: !list }" title="Search again: results are otherwise kept for 5 minutes"
        :disabled="fetching" @click="refresh"><i class="fas fa-sync-alt text-xs" /><span v-if="refreshNote" class="text-xs ml-1">{{ refreshNote }}</span></button>
      <trade-links :class="{ invisible: !list }"
        :get-link="makeTradeLink" :suggest-name="suggestName" />
    </div>
    <teleport v-if="improved && verdictSlot" :to="verdictSlot">
      <price-verdict
        :item="item"
        :insight="verdictInsight"
        :divine="divine"
        :loading="!list || tableLoading"
        :total="list ? list.total : null"
        :log-key="logKey"
        :league="filters.trade.league"
        :blank-search="blankSearch"
        :skips-top-mods="skipsTop"
        :ninja-fits="ninjaFits" />
      <price-drivers v-if="list"
        :key="list.id"
        :item="item"
        :filters="filters"
        :stats="stats"
        :insight="verdictInsight"
        :options="insightOptions"
        :divine="divine"
        :ready="slowdownReady"
        :stale="stale" />
    </teleport>
    <div ref="scrollEl" class="w-pc-scroll layout-column overflow-y-auto overflow-x-hidden">
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
            <th v-if="showItemLevel" :class="$style.tableHeading">
              <div class="px-2">{{ t(':item_level') }}</div>
            </th>
            <th v-if="item.category === 'Gem'" :class="$style.tableHeading">
              <div class="px-2">{{ t(':gem_level') }}</div>
            </th>
            <th v-if="showQuality" :class="$style.tableHeading">
              <div class="px-2">{{ t(':quality') }}</div>
            </th>
            <th v-if="showSockets" :class="$style.tableHeading" title="Sockets. Gold: all six linked. Blue: six sockets, not all linked.">
              <div class="px-2">Sockets</div>
            </th>
            <th v-for="col in shownColumns" :key="col.key" :class="[$style.tableHeading, 'w-pc-stat-head']" :title="col.title">
              <div>{{ col.label }}</div>
            </th>
            <th v-if="hiddenColumns.length" :class="[$style.tableHeading, 'w-pc-stat-head']" :title="hiddenColumns.map(col => col.title).join('\n')">
              <div class="w-pc-stat-more">+{{ hiddenColumns.length }}</div>
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
          <tr v-if="shownColumns.length" class="w-pc-yours" title="Orange: their number is higher than yours. Blue: lower. The further from yours, the stronger the colour.">
            <td class="px-2 w-pc-yours-tag">Yours</td>
            <td />
            <td v-if="item.stackSize" />
            <td v-if="showItemLevel" class="px-2 text-right">{{ item.itemLevel }}</td>
            <td v-if="item.category === 'Gem'" />
            <td v-if="showQuality" />
            <td v-if="showSockets && showColours" class="px-2 w-pc-sockets" :title="`Your sockets: ${item.sockets?.linked ? item.sockets.linked + 'L' : ''}`"><span class="w-pc-sdots"><i v-for="(d, i) of ownSocketDots(item.sockets?.layout)" :key="i" :class="['w-pc-sdot', d.colour, { link: d.link }]" /></span></td>
            <td v-else-if="showSockets" class="px-2 w-pc-sockets" :class="item.sockets?.linked === 6 ? 'l6' : ''">{{ item.sockets?.linked ? `${item.sockets.linked}L` : '' }}</td>
            <td v-for="col in shownColumns" :key="col.key" class="w-pc-stat">{{ col.yours }}</td>
            <td v-if="hiddenColumns.length" />
            <td v-if="showSeller" />
            <td />
          </tr>
          <template v-if="tableLoading">
            <tr v-for="i in skeletonRows" :key="i">
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
              :title="improved && !row.lead.tipItem ? rowTitle(row) : undefined"
              @mouseenter="showRowTip($event, row)"
              @mouseleave="hideTip"
              @contextmenu="row.lead.tipItem && openItemMenu($event, pobMenuRef(row.lead.tipItem))">
              <td class="px-2 whitespace-nowrap">
                <span class="w-pc-price">
                  <span class="w-pc-amount" :class="{ 'line-through': row.lead.priceCurrency === 'exalted' }">{{ row.lead.priceAmount }}</span>
                  <img v-if="coinFor(row.lead.priceCurrency)" class="w-pc-coin" :src="coinFor(row.lead.priceCurrency)" :alt="row.lead.priceCurrency">
                  <span v-else class="w-pc-unit">{{ row.lead.priceCurrency }}</span>
                </span>
              </td>
              <td class="px-2">
                <span class="w-pc-count">
                  <!-- woke: the hideout / stash icon first, so it stays in one place whatever the count. -->
                  <span v-if="!row.lead.hasFee" :class="$style.stashListing" :title="row.lead.hasNote ? 'Stash listing' : 'Stash listing without a price note'">
                    <img :class="$style.stashIcon" src="/images/stash.png">
                    <i v-if="!row.lead.hasNote" class="fas fa-question" />
                  </span>
                  <button v-else-if="row.lead.hideoutToken && !row.lead.isMine" type="button" class="w-pc-travel"
                    :class="{ 'w-pc-travel-on': !!travelState(row.lead.hideoutToken) }"
                    :disabled="travelState(row.lead.hideoutToken)?.kind === 'sending'"
                    title="Travel to the seller's hideout" aria-label="Travel to the seller's hideout"
                    @click.stop="travel(row.lead)"><i class="fas fa-door-open" /></button>
                  <span v-else-if="anyIcon" class="w-pc-travel-gap" aria-hidden="true" />
                  <span v-if="showCountBar" class="w-pc-count-bar" :class="{ invisible: row.count < 2 }"><span :style="{ width: Math.round(row.count / maxCount * 100) + '%' }" /></span>
                  <span v-if="row.count >= (improved ? 2 : 3)" class="w-pc-count-n"><span class="font-sans">×</span>{{ row.count }}</span>
                  <span v-if="improved && row.dropped && FIX_TAG[row.dropped]" class="w-pc-tag">{{ FIX_TAG[row.dropped] }}</span>
                  <span v-if="row.lead.corrupted" class="w-pc-tag">Corrupted</span>
                </span>
              </td>
              <td v-if="item.stackSize" class="px-2 text-right">{{ row.lead.stackSize }}</td>
              <td v-if="showItemLevel" class="px-2 whitespace-nowrap text-right">{{ row.lead.itemLevel }}</td>
              <td v-if="item.category === 'Gem'" class="pl-2 whitespace-nowrap">{{ row.lead.level }}</td>
              <td v-if="showQuality" class="px-2 whitespace-nowrap text-blue-400 text-right">{{ row.lead.quality }}</td>
              <td v-if="showSockets && showColours" class="px-2 whitespace-nowrap w-pc-sockets" :title="socketSummary(row.lead.listedItem?.sockets).text"><span class="w-pc-sdots"><i v-for="(d, i) of socketDots(row.lead.listedItem?.sockets)" :key="i" :class="['w-pc-sdot', d.colour, { link: d.link }]" /></span></td>
              <td v-else-if="showSockets" class="px-2 whitespace-nowrap w-pc-sockets" :class="socketSummary(row.lead.listedItem?.sockets).tone">{{ socketSummary(row.lead.listedItem?.sockets).text }}</td>
              <td v-for="col in shownColumns" :key="col.key" class="w-pc-stat" :class="toneClass(row.lead, col)" :style="toneStyle(row.lead, col)">{{ formatStatValue(statValue(row.lead, col), col) }}<span v-if="statLabel(row.lead, col)" class="w-pc-stat-key">{{ statLabel(row.lead, col) }}</span></td>
              <td v-if="hiddenColumns.length" />
              <td v-if="showSeller" class="px-2 whitespace-nowrap">
                <span v-if="row.lead.isMine" class="w-pc-you">{{ t('You') }}</span>
                <span v-else class="w-pc-age" style="text-align: left;">{{ showSeller === 'ign' ? row.lead.ign : row.lead.accountName }}</span>
              </td>
              <td class="px-2 w-pc-age">
                <span v-if="!showSeller && row.lead.isMine" class="w-pc-you mr-1">{{ t('You') }}</span>
                <span v-if="travelNote(travelState(row.lead.hideoutToken))" class="w-pc-travel-note"
                  :class="{ 'w-pc-travel-warn': travelNote(travelState(row.lead.hideoutToken))!.tone === 'warn' }"
                  :title="travelNote(travelState(row.lead.hideoutToken))!.title">{{ travelNote(travelState(row.lead.hideoutToken))!.text }}</span>
                <span v-else class="w-pc-age-inner">
                  <span :class="[$style.accountStatus, $style[row.status]]"></span>
                  <span>{{ improved && row.ageText ? row.ageText : row.lead.relativeDate }}</span>
                </span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <div v-if="improved || bulk" class="w-pc-foot" :class="{ invisible: !(listSettled && list && (rows.length || bulk)) }"
      title="Prices come from the cheapest listings the trade site returned"><template v-if="list"><span v-if="allStale" class="w-warn">{{ allInstant ? 'All unsold for over a week' : 'All over a week old, so they may be gone' }} · </span><template v-if="bulk">{{ bulkSellers || 'No' }} bulk {{ bulkSellers === 1 ? 'seller' : 'sellers' }} in </template>{{ shownCount }} of {{ list.total }}{{ list.inexact ? '+' : '' }} listings</template><template v-else>&nbsp;</template></div>
  </div>
  <ui-error-box v-else>
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
import { defineAsyncComponent, defineComponent, computed, watch, onUnmounted, PropType, inject, shallowReactive, shallowRef, ShallowRef } from 'vue'
import { useElementSize } from '@vueuse/core'
import { hideTip, showTip } from '@/web/woke/ui/tooltip/tooltip'
import { openItemMenu } from '@/web/woke/ui/tooltip/item-menu'
import { pobMenuRef } from '@/web/woke/pob-builds/item-menu-ref'
import { listingDetail } from '@/web/woke/price-insight/listing-tip-detail'
import { useI18nNs } from '@/web/i18n'
import UiErrorBox from '@/web/ui/UiErrorBox.vue'
import { requestTradeResultList, requestResults, createTradeRequest, clearTradeCache, PricingResult, SearchResult } from './pathofexile-trade'
import { getTradeEndpoint, preventQueueCreation, RATE_LIMIT_RULES } from './common'
import { clearDriverCaches } from '@/web/woke/price-insight/drivers'
import { measuredDrivers } from '@/web/woke/price-insight/check-state'
import { AppConfig } from '@/web/Config'
import { PriceCheckWidget } from '@/web/overlay/interfaces'
import { ItemFilters, FilterOrGroup } from '../filters/interfaces'
import { ParsedItem } from '@/parser'
import { ItemCategory } from '@/parser/meta'
import { socketSummary, socketDots, ownSocketDots } from '@/web/woke/price-insight/listing-tip'
import { artificialSlowdown } from './artificial-slowdown'
import { useRetryCountdown } from './retry-countdown'
import OnlineFilter from './OnlineFilter.vue'
import TradeLinks from './TradeLinks.vue'
import { proposeSearchName } from '@/web/woke/trade-searches/propose-name'
import PriceVerdict from '@/web/woke/price-insight/PriceVerdict.vue'
import { priceView } from '@/web/woke/price-insight/view'
import { useInsight } from '@/web/woke/price-insight/useInsight'
import { buildInsight, FIX_TAG, toChaos } from '@/web/woke/price-insight/insight'
import { groupListings, sortByValue, rowTitle, ListingRow } from '@/web/woke/price-insight/listing-rows'
import { pickStatColumns, listingStatValue, listingStatLabel, formatStatValue, statTone, statColumnsThatFit, StatColumn } from '@/web/woke/price-insight/stat-columns'
import { bulkOnly, bulkSellerCount, BULK_ENOUGH } from '@/web/woke/price-insight/bulk-sellers'
import { useSwap } from '@/web/woke/harvest-swap/useSwap'
import { nowMinute } from '@/web/woke/ui/format'
import { textScale } from '@/web/woke/ui/text-scale'
import '@/web/woke/price-insight/price-table.css'
import { useCheckLog } from '@/web/woke/price-insight/useCheckLog'
import { travelState, travelToHideout, travelNote } from '@/web/woke/hideout-travel/travel'
import { isBlankRareSearch, ninjaFitsSearch, skipsTopMods, socketColoursOn } from '@/web/woke/price-insight/search-scope'

// woke: the drivers load with the first price check, not at startup; results take longer.
const loadDrivers = () => import('@/web/woke/price-insight/PriceDrivers.vue')

const SIX_SOCKETS = new Set<string>([ItemCategory.BodyArmour, ItemCategory.Bow, ItemCategory.Staff, ItemCategory.Warstaff, ItemCategory.TwoHandedAxe, ItemCategory.TwoHandedMace, ItemCategory.TwoHandedSword])

const slowdown = artificialSlowdown(900)

const SKELETON_ROWS = 8
const COINS: Record<string, string> = { chaos: '/images/chaos.png', divine: '/images/divine.png', exalted: '/images/exa.png' }
const API_FETCH_LIMIT = 100
const MIN_NOT_GROUPED = 7
const MIN_GROUPED = 10

// Room the table's other columns take, in px at normal text size.
const WIDTH_BASE = 200 // price, count, listed
const WIDTH_NUMBER_COLUMN = 44
// Six socket dots need more than a number column.
const WIDTH_SOCKET_DOTS = 40
const WIDTH_SELLER = 90
const WIDTH_TAG = 60
const WIDTH_STASH_ICON = 24

// sameStats: a seller's listings only count as one when their stat columns match.
function useTradeApi (sameStats: (a: PricingResult, b: PricingResult) => boolean) {
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
      // woke: a seller's corrupted and clean copies stay apart.
      const existingRes = out.find((added, idx) => Boolean(added.corrupted) === Boolean(result.corrupted) && sameStats(added, result) && (
        (
          added.accountName === result.accountName &&
          added.priceCurrency === result.priceCurrency &&
          added.priceAmount === result.priceAmount
        ) ||
        (
          added.accountName === result.accountName &&
          (out.length - idx) <= 2 // last or prev
        )
      ))
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

  // The search the pages below belong to, and how many of its ids are fetched.
  let fetched = 0
  let pages: Promise<void> = Promise.resolve()
  const morePages = shallowRef(false)

  function fetchPage (_searchId: number, _searchResult: SearchResult, into: PricingResult[]) {
    const ids = _searchResult.result.slice(fetched, fetched + 10)
    fetched += 10
    return requestResults(_searchResult.id, ids, { accountName: AppConfig().accountName })
      .then(
        results => { if (_searchId === searchId) into.push(...results) },
        // A failed page can be asked for again.
        err => { if (_searchId === searchId) fetched -= 10; throw err })
  }

  function canFetchMore (_searchResult: SearchResult) {
    return fetched < _searchResult.result.length && fetched < API_FETCH_LIMIT
  }

  async function search (filters: ItemFilters, stats: FilterOrGroup[]) {
    searchId += 1
    const _searchId = searchId
    fetching.value = true
    morePages.value = false
    let done!: () => void
    pages = new Promise(resolve => { done = resolve })
    try {
      error.value = null
      searchResult.value = null
      const _fetchResults: PricingResult[] = shallowReactive([])
      fetchResults.value = _fetchResults
      fetched = 0

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
        fetched = 20
        // woke: a failed second page leaves the first on screen. Loading further pages
        // would leave a hole in the prices, so stop there.
        const settled = await Promise.allSettled([r1, r2])
        const failed = settled.find((page): page is PromiseRejectedResult => page.status === 'rejected')
        if (failed) {
          if (!_fetchResults.length) throw failed.reason
          if (_searchId === searchId) fetched = API_FETCH_LIMIT
          return
        }
      }

      async function fetchMore (): Promise<void> {
        if (_searchId !== searchId) return
        const totalGrouped = groupedResults.value.length
        const totalNotGrouped = groupedResults.value.reduce((len, res) =>
          res.listedTimes <= 2 ? len + 1 : len, 0)
        if (
          (totalNotGrouped < MIN_NOT_GROUPED || totalGrouped < MIN_GROUPED) &&
          canFetchMore(_searchResult)
        ) {
          await fetchPage(_searchId, _searchResult, _fetchResults)
          return fetchMore()
        }
      }
      // A later page failing leaves what already loaded on screen.
      await fetchMore().catch((err) => {
        if (_searchId === searchId) fetched = API_FETCH_LIMIT
        if (!_fetchResults.length) throw err
      })
    } catch (err) {
      if (_searchId === searchId) error.value = (err as Error).message
    } finally {
      if (_searchId === searchId) {
        fetching.value = false
        morePages.value = searchResult.value != null && canFetchMore(searchResult.value)
      }
      done()
    }
  }

  // woke: on a click only (the Bulk toggle): pulls further pages of the same search,
  // ten listings each, until enough() holds or the search runs out. Searches nothing new.
  // Resolves with a note when the trade site stopped it, else null.
  function loadMore (enough: () => boolean): Promise<string | null> {
    const _searchId = searchId
    const run = pages.then(async (): Promise<string | null> => {
      const _searchResult = searchResult.value
      if (_searchId !== searchId || !_searchResult || error.value) return null
      const into = fetchResults.value
      fetching.value = true
      try {
        for (;;) {
          if (_searchId !== searchId || enough() || !canFetchMore(_searchResult)) break
          preventQueueCreation([{ count: 1, limiters: RATE_LIMIT_RULES.FETCH }])
          await fetchPage(_searchId, _searchResult, into)
        }
        return null
      } catch (err) {
        return (err as Error).message
      } finally {
        if (_searchId === searchId) {
          fetching.value = false
          morePages.value = canFetchMore(_searchResult)
        }
      }
    })
    pages = run.then(() => {})
    return run
  }

  return { error, searchResult, groupedResults, fetchResults, fetching, morePages, search, loadMore }
}

export default defineComponent({
  components: { OnlineFilter, TradeLinks, UiErrorBox, PriceVerdict, PriceDrivers: defineAsyncComponent(loadDrivers) },
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
    },
    // Filters changed since this search: the results stay, dimmed, so nothing moves.
    stale: {
      type: Boolean,
      default: false
    }
  },
  setup (props, ctx) {
    const widget = computed(() => AppConfig<PriceCheckWidget>('price-check')!)

    loadDrivers().catch(() => {})
    watch(() => props.item, (item) => {
      slowdown.reset(item)
    }, { immediate: true })

    const allColumns = computed(() => pickStatColumns(props.stats))
    const statValue = (listing: PricingResult, col: StatColumn) =>
      listingStatValue(listing.listedItem, col, props.item.category)

    const { error, searchResult, groupedResults, fetchResults, fetching, morePages, search, loadMore } = useTradeApi((a, b) =>
      allColumns.value.every(col => formatStatValue(statValue(a, col), col) === formatStatValue(statValue(b, col), col)))
    const { retryIn, rateLimited } = useRetryCountdown(error)
    const refreshNote = shallowRef('')
    // A tooltip must not outlive the listings it came from.
    onUnmounted(hideTip)
    watch(searchResult, () => { hideTip() })

    // woke: a swap pick's search prices the Flip tab from these same listings.
    const swap = useSwap()
    if (swap) watch(groupedResults, (list) => { swap.resultsChanged(list, props.stats) })

    // woke: improved view reads the same listings, nothing extra is requested
    const { insight, divine, options: insightOptions } = useInsight(groupedResults, computed(() => props.filters.trade.league))

    // woke: listings found without a rare's mods say nothing about its price.
    const blankSearch = computed(() => isBlankRareSearch(props.item, props.filters, props.stats))
    const verdictInsight = computed(() => blankSearch.value ? buildInsight([], insightOptions.value) : insight.value)

    const logKey = useCheckLog(props, searchResult, verdictInsight, slowdown.isReady)

    const showBrowser = inject<(url: string) => void>('builtin-browser')!
    const verdictSlot = inject<ShallowRef<HTMLElement | null>>('price-verdict-slot', shallowRef(null))

    function makeTradeLink () {
      return (searchResult.value)
        ? `https://${getTradeEndpoint()}/trade/search/${props.filters.trade.league}/${searchResult.value.id}`
        : `https://${getTradeEndpoint()}/trade/search/${props.filters.trade.league}?q=${JSON.stringify(createTradeRequest(props.filters, props.stats))}`
    }

    const { t } = useI18nNs('trade_result')

    const improved = computed(() => priceView.value === 'improved')

    const showItemLevel = computed(() => Boolean(props.filters.itemLevel && !props.filters.itemLevel.disabled))
    // Quality gets a column on gems, and on other items once the search asks for it:
    // most gear now has a Quality box, and an unused one mustn't take a stat column's room.
    const showQuality = computed(() => props.item.category === 'Gem' || Boolean(
      props.filters.quality && !props.filters.quality.disabled))
    // woke: items that can have six sockets list them in their own column (Guy's pick "6L / 6S column").
    const showSockets = computed(() => props.item.category != null && SIX_SOCKETS.has(props.item.category))
    // woke: where colours are searchable, the column shows each listing's colours instead.
    const showColours = computed(() => props.filters.socketColours != null)
    const scrollEl = shallowRef<HTMLElement | null>(null)
    const { width: tableWidth } = useElementSize(scrollEl)

    // A row without a stash or hideout icon keeps its room, so the counts line up.
    const anyIcon = computed(() => groupedResults.value.some(r => !r.hasFee || (r.hideoutToken && !r.isMine)))
    // A tag or stash icon in the count column leaves less room, so check every listing.
    const otherColumnsWidth = computed(() => {
      const listings = groupedResults.value
      let width = WIDTH_BASE
      if (props.item.stackSize) width += WIDTH_NUMBER_COLUMN
      if (showItemLevel.value) width += WIDTH_NUMBER_COLUMN
      if (props.item.category === 'Gem') width += WIDTH_NUMBER_COLUMN
      if (showQuality.value) width += WIDTH_NUMBER_COLUMN
      if (showSockets.value) width += WIDTH_NUMBER_COLUMN
      if (showSockets.value && showColours.value) width += WIDTH_SOCKET_DOTS
      if (widget.value.showSeller) width += WIDTH_SELLER
      if (listings.some(r => r.corrupted || insight.value.dropped.has(r.id))) width += WIDTH_TAG
      if (anyIcon.value) width += WIDTH_STASH_ICON
      return width
    })
    const columnCap = computed(() =>
      statColumnsThatFit(tableWidth.value, otherColumnsWidth.value, textScale.value / 100, allColumns.value.length))
    const shownColumns = computed(() => allColumns.value.slice(0, columnCap.value))
    const hiddenColumns = computed(() => allColumns.value.slice(columnCap.value))

    // woke: improved merges a price into one row; classic stays one row per listing.
    // The trade site orders by its own currency ratios; re-sort what's fetched by
    // poe.ninja's rates so chaos and divine prices interleave by real value.
    // woke: Bulk keeps sellers with two or more copies at a price. Off for each new search.
    const bulk = shallowRef(false)
    const bulkNote = shallowRef('')
    // Search bulk asks for it with the search itself; any other search starts with it off.
    let bulkNext = false
    watch(searchResult, (result) => {
      bulk.value = false
      bulkNote.value = ''
      if (!result || !bulkNext) return
      bulkNext = false
      toggleBulk()
    })
    // A seller's copies only add up when they'd share a row: same stats, both corrupted or clean.
    const sameKind = (r: PricingResult) => [Boolean(r.corrupted), ...allColumns.value.map(col => formatStatValue(statValue(r, col), col))].join('|')
    const tableListings = computed(() => bulk.value ? bulkOnly(groupedResults.value, sameKind) : groupedResults.value)
    async function toggleBulk () {
      bulk.value = !bulk.value
      bulkNote.value = ''
      if (!bulk.value) return
      const forSearch = searchResult.value
      const note = await loadMore(() => !bulk.value || bulkSellerCount(groupedResults.value, sameKind) >= BULK_ENOUGH)
      if (note && bulk.value && searchResult.value === forSearch) {
        bulkNote.value = note
        setTimeout(() => { if (bulkNote.value === note) bulkNote.value = '' }, 3000)
      }
    }

    const rows = computed(() => sortByValue(groupListings(tableListings.value, {
      now: nowMinute.value,
      merge: improved.value,
      dropped: insight.value.dropped,
      detail: (r) => {
        // Corrupted and clean copies sell differently, so they keep their own rows.
        const parts: unknown[] = [Boolean(r.corrupted)]
        if (props.item.stackSize) parts.push(r.stackSize)
        if (showItemLevel.value) parts.push(r.itemLevel)
        if (props.item.category === 'Gem') parts.push(r.level)
        if (showQuality.value) parts.push(r.quality)
        if (widget.value.showSeller) parts.push(widget.value.showSeller === 'ign' ? r.ign : r.accountName)
        // Different numbers can't share a row: the row only shows one of them.
        for (const col of shownColumns.value) parts.push(formatStatValue(statValue(r, col), col))
        return parts.join('|')
      }
    }), insightOptions.value.divine ? (row) => toChaos(row.lead.priceAmount, row.lead.priceCurrency, insightOptions.value) : null))

    // Fading only helps when something stays bright: a dead market gets a note instead.
    const allStale = computed(() => rows.value.length > 0 && rows.value.every(r => r.band === 'stale'))

    const maxCount = computed(() => Math.max(1, ...rows.value.map(r => r.count)))

    function inRange (row: ListingRow<PricingResult & { listedTimes: number }>) {
      const range = insight.value.range
      const chaos = insight.value.prices.get(row.lead.id)
      return Boolean(range && chaos != null && !row.dropped && chaos >= range.low && chaos <= range.high)
    }

    const tableLoading = computed(() => !slowdown.isReady.value || (fetching.value && !rows.value.length))
    const listSettled = computed(() => !tableLoading.value && !fetching.value)

    // A new search's loading rows take up what the last results did.
    const skeletonRows = shallowRef(SKELETON_ROWS)
    watch(listSettled, (settled) => { if (settled) skeletonRows.value = Math.max(rows.value.length, 1) })
    watch(() => props.item, () => { skeletonRows.value = SKELETON_ROWS })

    // A new search empties the verdict for a moment. Holding its height keeps the
    // filters under it from jumping up and back down.
    function holdVerdictHeight () {
      const slot = verdictSlot.value
      if (slot) slot.style.minHeight = `${slot.offsetHeight}px`
    }
    function releaseVerdictHeight () {
      if (verdictSlot.value) verdictSlot.value.style.minHeight = ''
    }
    watch(listSettled, (settled) => { if (settled) releaseVerdictHeight() })
    // An error has nothing to keep on screen, and its Retry would use the old filters.
    watch([() => props.stale, error], ([stale, err]) => { if (stale && err) ctx.emit('reset') })
    watch(error, (err) => { if (err) releaseVerdictHeight() })
    onUnmounted(releaseVerdictHeight)

    return {
      t,
      showSockets,
      showColours,
      socketSummary,
      socketDots,
      ownSocketDots,
      list: searchResult,
      improved,
      blankSearch,
      verdictInsight,
      skipsTop: computed(() => skipsTopMods(props.item, props.stats)),
      ninjaFits: computed(() => ninjaFitsSearch(props.item, props.stats, props.filters.corrupted?.search, socketColoursOn(props.filters))),
      verdictSlot,
      insight,
      insightOptions,
      divine,
      logKey,
      rows,
      rowTitle,
      showRowTip (e: MouseEvent, row: ListingRow<PricingResult & { listedTimes: number }>) {
        if (row.lead.tipItem) showTip(e, { kind: 'item', item: row.lead.tipItem, listing: row.lead.listedItem && listingDetail(row.lead.listedItem) })
      },
      hideTip,
      travelState,
      travelNote,
      travel: (listing: PricingResult) => { if (listing.hideoutToken) travelToHideout(listing.hideoutToken).catch(() => {}) },
      openItemMenu,
      pobMenuRef,
      FIX_TAG,
      skeletonRows,
      coinFor: (currency: string) => COINS[currency],
      inRange,
      maxCount,
      allStale,
      allInstant: computed(() => rows.value.every(r => r.lead.hasFee)),
      // The stat columns need the bar's room.
      anyIcon,
      showCountBar: computed(() => improved.value && maxCount.value > 1 && !shownColumns.value.length),
      showItemLevel,
      showQuality,
      scrollEl,
      shownColumns,
      hiddenColumns,
      statValue,
      formatStatValue,
      statLabel: (listing: PricingResult, col: StatColumn) => listingStatLabel(listing.listedItem, col, props.item.category),
      toneClass (listing: PricingResult, col: StatColumn) {
        const tone = statTone(statValue(listing, col), col)
        return tone ? `w-pc-stat-${tone.dir}` : undefined
      },
      toneStyle (listing: PricingResult, col: StatColumn) {
        const tone = statTone(statValue(listing, col), col)
        return tone ? { '--w-pc-stat-k': tone.strength } : undefined
      },
      shownCount: computed(() => fetchResults.value.filter(r => r != null).length),
      bulk,
      bulkNote,
      toggleBulk,
      bulkSellers: computed(() => bulkSellerCount(groupedResults.value, sameKind)),
      bulkTitle: computed(() => bulk.value
        ? 'Showing sellers with 2 or more copies at one price. Click to show all.'
        : morePages.value
          ? `Only sellers with 2 or more copies at one price. Loads more listings if fewer than ${BULK_ENOUGH} sellers show (up to ${API_FETCH_LIMIT}).`
          : 'Only sellers with 2 or more copies at one price.'),
      tableLoading,
      listSettled,
      slowdownReady: slowdown.isReady,
      // bulk: Search bulk was clicked. (Retry passes its click event, which isn't true.)
      execSearch: (bulk?: unknown) => {
        bulkNext = bulk === true
        holdVerdictHeight()
        search(props.filters, props.stats)
      },
      refresh: () => {
        // Check first: results on screen shouldn't turn into a rate limit error.
        try {
          preventQueueCreation([
            { count: 1, limiters: RATE_LIMIT_RULES.SEARCH },
            { count: 1, limiters: RATE_LIMIT_RULES.FETCH }
          ])
        } catch (err) {
          refreshNote.value = (err as Error).message
          setTimeout(() => { refreshNote.value = '' }, 3000)
          return
        }
        refreshNote.value = ''
        clearTradeCache()
        clearDriverCaches()
        measuredDrivers.value = null
        bulkNext = bulk.value
        holdVerdictHeight()
        search(props.filters, props.stats)
      },
      refreshNote,
      fetching,
      error,
      retryIn,
      rateLimited,
      showSeller: computed(() => widget.value.showSeller),
      makeTradeLink,
      suggestName: () => proposeSearchName(props.item, props.stats),
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
  width: 1.25rem;
  height: 1.25rem;
  object-fit: contain;
  vertical-align: bottom;
}

.legacyMessage {
  @apply mb-2;
  font-family: var(--w-body);
  font-size: calc(12px * var(--w-text-scale, 1));
  color: var(--w-dim);
}
</style>
