<template>
  <div v-if="!error" class="layout-column min-h-0" :class="{ 'w-pc-results-stale': dim }" style="height: auto;">
    <!-- woke: in the Search row, while the results are filtered here (Guy's pick C). -->
    <teleport v-if="statusSlot && stale && list && narrow" :to="statusSlot">
      <span class="w-pc-status w-pc-status-local"
        :title="`Filtered from the ${loadedCount} listings already loaded, without a new search. They're still the cheapest that fit; the search found ${list.total}.`">
        <!-- The full line where the row has room, "14/20" where it doesn't, nothing where even that won't fit
             (the table's foot says it too). The title has it all. -->
        <span class="w-pc-status-full"><span class="w-pc-status-note">Matched</span> <b>{{ fitCount }} of {{ loadedCount }} here</b></span>
        <b class="w-pc-status-short">{{ fitCount }}/{{ loadedCount }}</b>
      </span>
    </teleport>
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
      <!-- woke: which currency the listings ask for: both coins (All), Chaos, Divine. Filters what's loaded,
           never searches. Coins only, as the bar has little room; the coin box keeps one width. -->
      <button v-if="currencyChoice" type="button" class="w-pc-bulk w-pc-currency" data-currency-chip
        :class="{ invisible: !list, on: currency !== 'all' }" :data-step="currency"
        :title="currencyTitle" :aria-label="`Listing currency: ${currency === 'all' ? 'All' : currency === 'divine' ? 'Divine' : 'Chaos'}`"
        :aria-pressed="currency !== 'all'" @click="stepCurrency">
        <span class="w-pc-currency-coins">
          <img v-for="coin of ['chaos', 'divine']" :key="coin" :src="coinFor(coin)" alt=""
            :class="{ shown: currency === 'all' || currency === coin }">
        </span>
<span v-if="currencyNote" class="ml-1">{{ currencyNote }}</span>
      </button>
      <!-- woke: the search found more than the 100 it handed back: search again from the
           top price loaded, adding those listings (Guy's pick 2B, WOKEPOET-523). -->
      <button v-if="canPricier || pricierNote" type="button" class="w-pc-bulk ml-1" data-pricier :disabled="fetching || !canPricier"
        :title="pricierTitle" @click="pricier">Pricier<span v-if="pricierNote" class="ml-1">{{ pricierNote }}</span></button>
      <!-- woke: the price check's own chips beside Bulk (a map's Exchange, WOKEPOET-523). -->
      <slot name="chips" />
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
        :log-key="narrow ? null : logKey"
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
            <th :class="[$style.tableHeading, 'text-right']">
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
              <div>{{ col.label }}<span v-if="localRange(col)" class="w-pc-local-chip" :title="`Filtered here: ${localRange(col)}`">{{ localRange(col) }}</span></div>
            </th>
            <th v-if="hiddenColumns.length" :class="[$style.tableHeading, 'w-pc-stat-head']" :title="hiddenColumns.map(col => col.title).join('\n')">
              <div class="w-pc-stat-more">+{{ hiddenColumns.length }}<span v-for="col in hiddenColumns.filter(c => localRange(c))" :key="col.key" class="w-pc-local-chip" :title="`${col.title}: filtered here, ${localRange(col)}`">{{ col.label }} {{ localRange(col) }}</span></div>
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
                'w-pc-stale': improved && row.band === 'stale' && !row.dropped && !allStale
              }"
              :title="improved && !row.lead.tipItem ? rowTitle(row) : undefined"
              :data-item-tip="row.lead.tipItem ? '' : undefined"
              @mouseenter="showRowTip($event, row)"
              @mouseleave="hideTip"
              @contextmenu="row.lead.tipItem && openItemMenu($event, pobMenuRef(row.lead.tipItem))">
              <td class="px-2 whitespace-nowrap text-right">
                <span class="w-pc-price">
                  <span class="w-pc-amount" :class="{ 'line-through': row.lead.priceCurrency === 'exalted' }">{{ row.lead.priceAmount }}</span>
                  <img v-if="coinFor(row.lead.priceCurrency)" class="w-pc-coin" :src="coinFor(row.lead.priceCurrency)" :alt="row.lead.priceCurrency">
                  <span v-else class="w-pc-unit">{{ row.lead.priceCurrency }}</span>
                </span>
              </td>
              <td class="px-2">
                <span class="w-pc-count">
                  <!-- woke: the hideout / stash icon first, so it stays in one place whatever the count. -->
                  <!-- woke: with any door in the list, the door and the count sit in a zone as wide as
                       the slid-out "Travel", so it covers only them, never the tags after. -->
                  <span class="w-pc-travel-zone" :class="{ 'w-pc-travel-zone-wide': anyTravel }">
                  <span v-if="!row.lead.hasFee" :class="$style.stashListing" :title="row.lead.hasNote ? 'Stash listing' : 'Stash listing without a price note'">
                    <img :class="$style.stashIcon" src="/images/stash.png">
                    <i v-if="!row.lead.hasNote" class="fas fa-question" />
                  </span>
                  <button v-else-if="row.lead.hideoutToken && !row.lead.isMine" type="button" class="w-pc-travel"
                    :class="{ 'w-pc-travel-on': !!travelState(row.lead.hideoutToken) }"
                    :disabled="travelState(row.lead.hideoutToken)?.kind === 'sending'"
                    title="Travel to the seller's hideout" aria-label="Travel to the seller's hideout"
                    @click.stop="travel(row.lead)"><span class="w-pc-travel-face"><i class="fas fa-door-open" /><span class="w-pc-travel-label">Travel</span></span></button>
                  <span v-else-if="anyIcon" class="w-pc-travel-gap" aria-hidden="true" />
                  <span v-if="showCountBar" class="w-pc-count-bar" :class="{ invisible: row.count < 2 }"><span :style="{ width: Math.round(row.count / maxCount * 100) + '%' }" /></span>
                  <!-- woke: the count keeps its slot on every row, so the tags after it line up. -->
                  <span v-if="countSlot" class="w-pc-count-n"><template v-if="row.count >= countFrom"><span class="font-sans">×</span>{{ row.count }}</template></span>
                  </span>
                  <span v-if="improved && row.dropped && FIX_TAG[row.dropped]" class="w-pc-tag">{{ FIX_TAG[row.dropped] }}</span>
                  <span v-if="row.lead.corrupted" class="w-pc-tag" :class="{ 'w-pc-tag-fit': anyTwice }" :data-fit="anyTwice ? 'Twice Corrupted' : undefined">{{ row.lead.twiceCorrupted ? 'Twice Corrupted' : 'Corrupted' }}</span>
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
              <td class="px-2 w-pc-age" :class="row.tone && `w-pc-age-${row.tone}`">
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
            <!-- woke: the currency chip left nothing to show. -->
            <tr v-if="currency !== 'all' && !bulk && !narrow && !currencyCount && loadedCount && listSettled && list" class="w-pc-local-hint" data-currency-empty>
              <td colspan="100" class="px-2">No listings priced in {{ currency === 'divine' ? 'divines' : 'chaos' }} among the {{ loadedCount }} loaded.</td>
            </tr>
            <!-- woke: few rows fit: suggest a search, unless the search's every listing is already here. -->
            <tr v-if="shortList" class="w-pc-local-hint">
              <td colspan="100" class="px-2">
                <span>{{ fitCount ? `Only ${fitCount}` : 'None' }} of the {{ loadedCount }} {{ allLoaded ? 'listings the search found' : 'loaded' }} fit{{ allLoaded ? ': searching again finds no more' : '' }}.</span>
                <span v-if="!allLoaded" class="w-pc-local-go">Search for these filters ↑</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <div v-if="improved || bulk || currency !== 'all'" class="w-pc-foot" :class="{ invisible: !(listSettled && list && (rows.length || bulk || currency !== 'all')) }"
      title="Prices come from the cheapest listings the trade site returned"><template v-if="list && narrow"><template v-if="currency !== 'all'">{{ currencyCount || 'None' }} in {{ currency === 'divine' ? 'divines' : 'chaos' }} · </template>{{ fitCount }} of {{ loadedCount }} loaded listings fit · the search found {{ list.total }}{{ list.inexact ? '+' : '' }}</template><template v-else-if="list"><span v-if="allStale" class="w-warn">{{ allInstant ? 'All unsold for over a week' : 'All over a week old, so they may be gone' }} · </span><template v-if="currency !== 'all'">{{ currencyCount || 'None' }} in {{ currency === 'divine' ? 'divines' : 'chaos' }} · </template><template v-if="bulk">{{ bulkSellers || 'No' }} bulk {{ bulkSellers === 1 ? 'seller' : 'sellers' }} in </template>{{ shownCount }} of {{ list.total }}{{ list.inexact ? '+' : '' }} listings<template v-if="bulkMore"> · <button type="button" class="w-pc-foot-more" data-bulk-more :disabled="bulkLoading" title="Loads the next listings of this search (no new search), until 10 bulk sellers show" @click="loadBulk">{{ bulkLoading ? 'Loading…' : 'Load more' }}</button></template></template><template v-else>&nbsp;</template></div>
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
import { asksOf, lastAsks } from '@/web/woke/price-insight/last-asks'
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
import type { ResultsState } from '@/web/woke/price-insight/local-filter'
import { pickStatColumns, listingStatValue, listingStatLabel, formatStatValue, statTone, statColumnsThatFit, StatColumn } from '@/web/woke/price-insight/stat-columns'
import { bulkOnly, bulkSellerCount, BULK_ENOUGH } from '@/web/woke/price-insight/bulk-sellers'
import { bulkRemembered, rememberBulk } from '@/web/woke/price-insight/bulk-pref'
import { CURRENCY_ENOUGH, CHAOS_HUNT_LIMIT, chaosMayHide, hasCurrencyChoice, nextCurrencyView, inCurrency, currencyTitle, type CurrencyView } from '@/web/woke/price-insight/price-currency'
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
// woke: fewer rows than this after filtering here gets Load more or a Search hint.
const SHORT_LIST = 5
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
// "Twice Corrupted" is longer than the other tags.
const WIDTH_TAG_TWICE = 40
// Clean, corrupted and twice-corrupted copies sell differently: they never share a row.
const corruptKind = (r: PricingResult) => r.corrupted ? (r.twiceCorrupted ? 2 : 1) : 0
const WIDTH_STASH_ICON = 24
// Room the hovered door's "Travel" needs past the door (24, above): all of it
// with no count beside it, less where the count already takes some.
const WIDTH_TRAVEL_LABEL = 44
const WIDTH_TRAVEL_LABEL_BY_COUNT = 12

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
      const existingRes = out.find((added, idx) => corruptKind(added) === corruptKind(result) && sameStats(added, result) && (
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
  // woke: after Pricier, the pages come from its search instead (WOKEPOET-523).
  let source: SearchResult | null = null
  // The trade site found more than the ids it handed back (it hands back 100 at most).
  const sourceCapped = shallowRef(false)
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
      source = null
      sourceCapped.value = false
      const _fetchResults: PricingResult[] = shallowReactive([])
      fetchResults.value = _fetchResults
      fetched = 0

      const request = createTradeRequest(filters, stats)
      const _searchResult = await requestTradeResultList(request, filters.trade.league)
      if (_searchId !== searchId) {
        return
      }
      searchResult.value = _searchResult
      source = _searchResult
      sourceCapped.value = _searchResult.total > _searchResult.result.length
      collapseMerchant = filters.trade.collapseMerchant
      const searchedCurrency = filters.trade.currency

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
      // woke: no chaos listing yet: cheaper ones may sort behind the divines (price-currency.ts).
      // Only while the fetch limit has room; a refused or failed page just ends the hunt.
      for (;;) {
        if (_searchId !== searchId || fetched >= CHAOS_HUNT_LIMIT || !canFetchMore(_searchResult) ||
          !chaosMayHide(_fetchResults, searchedCurrency)) break
        try {
          preventQueueCreation([{ count: 1, limiters: RATE_LIMIT_RULES.FETCH }])
          await fetchPage(_searchId, _searchResult, _fetchResults)
        } catch { break }
      }
    } catch (err) {
      if (_searchId === searchId) error.value = (err as Error).message
    } finally {
      if (_searchId === searchId) {
        fetching.value = false
        morePages.value = source != null && canFetchMore(source)
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
      const _searchResult = source
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

  // woke: on a click only (Pricier, WOKEPOET-523): the same search again from `min` up,
  // its listings added after the ones loaded. One trade search. Resolves with a note
  // when the trade site stopped it, 'none' when it found nothing not shown already.
  function loadPricier (filters: ItemFilters, stats: FilterOrGroup[], min: number): Promise<string | null> {
    const _searchId = searchId
    const run = pages.then(async (): Promise<string | null> => {
      if (_searchId !== searchId || !searchResult.value || error.value) return null
      const into = fetchResults.value
      fetching.value = true
      try {
        const request = createTradeRequest(filters, stats)
        const price = (request.query.filters.trade_filters ??= { filters: {} }).filters
        // The price currency the search asked for stays: only the floor is new.
        price.price = { ...price.price, min } as typeof price.price
        const found = await requestTradeResultList(request, filters.trade.league)
        if (_searchId !== searchId) return null
        const shown = new Set(into.map(r => r.id))
        const src: SearchResult = { ...found, result: found.result.filter(id => !shown.has(id)) }
        source = src
        sourceCapped.value = found.total > found.result.length
        fetched = 0
        if (!src.result.length) return 'none'
        // Two pages, as a search starts with; Bulk and the currency chip load more.
        // A newer search owns the pager from then on: this stops.
        for (let page = 0; page < 2; page++) {
          if (_searchId !== searchId || !canFetchMore(src)) break
          preventQueueCreation([{ count: 1, limiters: RATE_LIMIT_RULES.FETCH }])
          await fetchPage(_searchId, src, into)
        }
        return null
      } catch (err) {
        return (err as Error).message
      } finally {
        if (_searchId === searchId) {
          fetching.value = false
          morePages.value = source != null && canFetchMore(source)
        }
      }
    })
    pages = run.then(() => {})
    return run
  }

  return { error, searchResult, groupedResults, fetchResults, fetching, morePages, sourceCapped, search, loadMore, loadPricier }
}

export default defineComponent({
  components: { OnlineFilter, TradeLinks, UiErrorBox, PriceVerdict, PriceDrivers: defineAsyncComponent(loadDrivers) },
  emits: ['reset', 'glow'],
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
    // Filters changed since this search: the Search row takes the toolbar's place.
    stale: {
      type: Boolean,
      default: false
    },
    // woke: the change needs a new search: the results stay, dimmed, so nothing moves.
    dim: {
      type: Boolean,
      default: false
    },
    // woke: only tighter ranges: the loaded listings are filtered here (local-filter.ts).
    narrow: {
      type: Object as PropType<Extract<ResultsState, { kind: 'narrowed' }> | null>,
      default: null
    }
  },
  setup (props, ctx) {
    const widget = computed(() => AppConfig<PriceCheckWidget>('price-check')!)

    loadDrivers().catch(() => {})
    watch(() => props.item, (item) => {
      slowdown.reset(item)
    }, { immediate: true })

    // A newly ticked stat that filters here gets its column too.
    const allColumns = computed(() => pickStatColumns(props.narrow?.stats ?? props.stats))
    const statValue = (listing: PricingResult, col: StatColumn) =>
      listingStatValue(listing.listedItem, col, props.item.category)

    const { error, searchResult, groupedResults, fetchResults, fetching, morePages, sourceCapped, search, loadMore, loadPricier } = useTradeApi((a, b) =>
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
    // woke: tighter ranges hide what no longer fits; the verdict reads what's left.
    const fits = (listing: PricingResult) => !props.narrow || props.narrow.fits(listing.listedItem, props.item.category)
    const fitResults = computed(() => props.narrow ? groupedResults.value.filter(fits) : groupedResults.value)
    const loadedCount = computed(() => fetchResults.value.filter(r => r != null).length)
    const fitCount = computed(() => props.narrow ? fetchResults.value.filter(r => r != null && fits(r)).length : loadedCount.value)
    const statusSlot = inject<ShallowRef<HTMLElement | null>>('price-search-status-slot', shallowRef(null))

    const { insight, divine, options: insightOptions } = useInsight(fitResults, computed(() => props.filters.trade.league))
    // woke: Net worth's Listed bar suggests a price from these (no search of its own).
    // Tagged with the item the search was for: a new item can keep these
    // listings shown until its own search, and late pages still arrive.
    let searchedItem: unknown = props.item
    watch(searchResult, () => { searchedItem = props.item }, { flush: 'sync' })
    watch([fitResults, divine, searchResult, loadedCount], ([list, d, found, loaded]) => {
      // Narrowed: only the loaded listings that fit count, all of them seen.
      const total = props.narrow ? null : found?.total ?? null
      lastAsks.value = asksOf(list, d ?? null, searchedItem, total, found != null && (props.narrow != null || loaded >= found.total), loaded)
    }, { immediate: true })
    onUnmounted(() => { lastAsks.value = null })

    // woke: listings found without a rare's mods say nothing about its price.
    const blankSearch = computed(() => isBlankRareSearch(props.item, props.filters, props.stats))
    const verdictInsight = computed(() => blankSearch.value ? buildInsight([], insightOptions.value) : insight.value)

    // A verdict from listings filtered here isn't the search's: it isn't logged under it.
    const logKey = useCheckLog(props, searchResult, verdictInsight, slowdown.isReady, computed(() => props.narrow != null))

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
    // A row with a door: hovering anywhere on it slides the door out to read
    // "Travel", over the count beside it. The cell keeps room for that, so it
    // never spills into the next column.
    const anyTravel = computed(() => groupedResults.value.some(r => r.hasFee && r.hideoutToken && !r.isMine))
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
      if (listings.some(r => r.corrupted && r.twiceCorrupted)) width += WIDTH_TAG_TWICE
      if (anyIcon.value) width += WIDTH_STASH_ICON
      if (anyTravel.value) width += countSlot.value ? WIDTH_TRAVEL_LABEL_BY_COUNT : WIDTH_TRAVEL_LABEL
      return width
    })
    const columnCap = computed(() =>
      statColumnsThatFit(tableWidth.value, otherColumnsWidth.value, textScale.value / 100, allColumns.value.length))
    const shownColumns = computed(() => allColumns.value.slice(0, columnCap.value))
    const hiddenColumns = computed(() => allColumns.value.slice(columnCap.value))

    // woke: improved merges a price into one row; classic stays one row per listing.
    // The trade site orders by its own currency ratios; re-sort what's fetched by
    // poe.ninja's rates so chaos and divine prices interleave by real value.
    // woke: Bulk keeps sellers with two or more copies at a price. Remembered for the
    // next checks until turned off (WOKEPOET-539). A remembered Bulk only filters what
    // a search loaded: more pages load on a click (the toggle, or Load more in the foot).
    const bulk = shallowRef(bulkRemembered.value)
    const bulkNote = shallowRef('')
    const bulkLoading = shallowRef(false)
    const currency = shallowRef<CurrencyView>('all')
    const currencyNote = shallowRef('')
    watch(searchResult, () => {
      bulk.value = bulkRemembered.value
      bulkNote.value = ''
      bulkLoading.value = false
      // The currency chip starts on All too, so a new search shows every listing it found.
      currency.value = 'all'
      currencyNote.value = ''
    })
    // A seller's copies only add up when they'd share a row: same stats, both corrupted or clean.
    const sameKind = (r: PricingResult) => [corruptKind(r), ...allColumns.value.map(col => formatStatValue(statValue(r, col), col))].join('|')
    // woke: the currency chip shows only listings priced in chaos, or in divines. The verdict
    // still reads every listing: what the item is worth doesn't change with the currency asked.
    const currencyChoice = computed(() => hasCurrencyChoice(props.filters.trade.currency))
    const currencyView = computed<CurrencyView>(() => currencyChoice.value ? currency.value : 'all')
    const currencyResults = computed(() => currencyView.value === 'all'
      ? fitResults.value
      : fitResults.value.filter(r => inCurrency(r, currencyView.value)))
    // Listings, not rows: how many the trade site returned in that currency.
    const currencyCount = computed(() => fetchResults.value.filter(r => r != null && fits(r) && inCurrency(r, currencyView.value)).length)
    async function stepCurrency () {
      currency.value = nextCurrencyView(currency.value)
      currencyNote.value = ''
      if (currency.value === 'all') return
      // Too few in that currency: load more pages of the same search, as Bulk does.
      const want = currency.value
      const forSearch = searchResult.value
      const note = await loadMore(() => currency.value !== want || enoughShown())
      if (note && currency.value === want && searchResult.value === forSearch) {
        currencyNote.value = note
        setTimeout(() => { if (currencyNote.value === note) currencyNote.value = '' }, 3000)
      }
    }
    // Loading more pages stops once the table, with Bulk and the currency both applied, has enough.
    function enoughShown () {
      return bulk.value
        ? bulkSellerCount(currencyResults.value, sameKind) >= BULK_ENOUGH
        : currencyResults.value.length >= CURRENCY_ENOUGH
    }
    const tableListings = computed(() => bulk.value
      ? bulkOnly(currencyResults.value, sameKind)
      : currencyResults.value)
    async function toggleBulk () {
      bulk.value = !bulk.value
      rememberBulk(bulk.value)
      bulkNote.value = ''
      if (!bulk.value) return
      await loadBulk()
    }
    async function loadBulk () {
      const forSearch = searchResult.value
      bulkLoading.value = true
      try {
        const note = await loadMore(() => !bulk.value || enoughShown())
        if (note && bulk.value && searchResult.value === forSearch) {
          bulkNote.value = note
          setTimeout(() => { if (bulkNote.value === note) bulkNote.value = '' }, 3000)
        }
      } finally {
        if (searchResult.value === forSearch) bulkLoading.value = false
      }
    }

    // woke: Pricier (WOKEPOET-523). The floor is the dearest listing loaded, as its own
    // amount, never converted: the trade site reads a "chaos or divine" min at its own
    // divine rate, which lags poe.ninja's (price-currency.ts), so a converted floor
    // could skip listings. Chaos searches use the dearest chaos listing, divine-only
    // searches the dearest divine one. Overlap is fine: ids already loaded are dropped.
    const PRICIER_CURRENCIES = new Set(['', 'chaos', 'chaos_divine', 'divine'])
    const pricierNote = shallowRef('')
    // A floor that brought back only listings already shown: the next click starts above it.
    const pricierPast = shallowRef<number | null>(null)
    watch(searchResult, () => { pricierNote.value = ''; pricierPast.value = null })
    const pricierFloor = computed(() => {
      const inDivine = props.filters.trade.currency === 'divine'
      const unit = inDivine ? 'divine' : 'chaos'
      let top = 0
      for (const r of fetchResults.value) {
        if (r && r.priceCurrency === unit && r.priceAmount > top) top = r.priceAmount
      }
      if (!top) return null
      const floor = inDivine ? Math.floor(top * 100) / 100 : Math.floor(top)
      const step = inDivine ? 0.01 : 1
      const past = pricierPast.value
      return past != null && floor <= past ? Math.round((past + step) * 100) / 100 : floor
    })
    // Shown while the search found more than it handed back; listings it handed back but
    // not loaded yet sit above the floor, so the new search finds them again.
    const canPricier = computed(() => !!searchResult.value && sourceCapped.value &&
      !props.stale && pricierFloor.value != null && PRICIER_CURRENCIES.has(props.filters.trade.currency ?? ''))
    const priceText = (n: number) => props.filters.trade.currency === 'divine' ? `${n} div` : `${n}c`
    async function pricier () {
      const min = pricierFloor.value
      if (min == null) return
      pricierNote.value = ''
      const forSearch = searchResult.value
      const note = await loadPricier(props.filters, props.stats, min)
      if (searchResult.value !== forSearch) return
      if (note === 'none') {
        pricierPast.value = min
        pricierNote.value = `none new from ${priceText(min)}`
      } else if (note) {
        pricierNote.value = note
      }
      if (note) setTimeout(() => { if (pricierNote.value) pricierNote.value = '' }, 4000)
    }

    const rows = computed(() => sortByValue(groupListings(tableListings.value, {
      now: nowMinute.value,
      merge: improved.value,
      dropped: insight.value.dropped,
      detail: (r) => {
        // Corrupted and clean copies sell differently, so they keep their own rows.
        const parts: unknown[] = [corruptKind(r)]
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
    // Counts show from 2 copies (3 on the plain table); when any row has one, every row keeps the slot.
    const countFrom = computed(() => improved.value ? 2 : 3)
    const countSlot = computed(() => rows.value.some(r => r.count >= countFrom.value))
    const anyTwice = computed(() => rows.value.some(r => r.lead.corrupted && r.lead.twiceCorrupted))

    function inRange (row: ListingRow<PricingResult & { listedTimes: number }>) {
      const range = insight.value.range
      const chaos = insight.value.prices.get(row.lead.id)
      return Boolean(range && chaos != null && !row.dropped && chaos >= range.low && chaos <= range.high)
    }

    const tableLoading = computed(() => !slowdown.isReady.value || (fetching.value && !rows.value.length))
    const listSettled = computed(() => !tableLoading.value && !fetching.value)

    // woke: a filtered list this short suggests a search (Search glows).
    const shortList = computed(() => props.narrow != null && !!searchResult.value && !tableLoading.value && fitCount.value < SHORT_LIST)
    // Every listing the search found is loaded: the filter here is exact, a search finds nothing more.
    const allLoaded = computed(() => !!searchResult.value && loadedCount.value >= searchResult.value.total)
    const glow = computed(() => props.dim || (shortList.value && !allLoaded.value))
    watch(glow, (on) => { ctx.emit('glow', on) }, { immediate: true })
    onUnmounted(() => { ctx.emit('glow', false) })
    // The tighter range on a column, for its header.
    function localRange (col: StatColumn): string | null {
      const check = props.narrow?.checks.find(c => c.column.key.slice(c.column.key.indexOf('|')) === col.key.slice(col.key.indexOf('|')))
      if (!check) return null
      const fmt = (n: number) => formatStatValue(n, col)
      if (check.min != null && check.max != null) return `${fmt(check.min)}–${fmt(check.max)}`
      if (check.min != null) return `≥${fmt(check.min)}`
      if (check.max != null) return `≤${fmt(check.max)}`
      return 'has'
    }

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
    // Rows filtered here leave their room, so the window doesn't shrink and grow while you type.
    // The verdict above the mods too: its text changes with what fits, and the mods mustn't move.
    let heldForNarrow = false
    function holdTableHeight (hold: boolean) {
      // Only undo our own hold: a new search holds the verdict's height itself.
      if (hold === heldForNarrow) return
      heldForNarrow = hold
      for (const el of [scrollEl.value, verdictSlot.value]) {
        if (el) el.style.minHeight = hold ? `${el.offsetHeight}px` : ''
      }
    }
    watch(() => props.narrow != null, (on) => { holdTableHeight(on) }, { flush: 'pre' })
    watch(searchResult, () => { if (!props.narrow) holdTableHeight(false) })
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
      countFrom,
      countSlot,
      anyTwice,
      allStale,
      allInstant: computed(() => rows.value.every(r => r.lead.hasFee)),
      // The stat columns need the bar's room.
      anyIcon,
      anyTravel,
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
      loadBulk,
      bulkLoading,
      // A remembered Bulk with too few sellers loaded: more pages wait for a click.
      bulkMore: computed(() => bulk.value && morePages.value && bulkSellerCount(currencyResults.value, sameKind) < BULK_ENOUGH),
      bulkSellers: computed(() => bulkSellerCount(currencyResults.value, sameKind)),
      canPricier,
      pricier,
      pricierNote,
      pricierTitle: computed(() => pricierFloor.value == null ? ''
        : `The trade site hands back the cheapest 100 at most, and this search found more. Search again from ${priceText(pricierFloor.value)} up and add those listings (one trade search).`),
      currency: currencyView,
      currencyChoice,
      currencyNote,
      currencyCount,
      stepCurrency,
      currencyTitle: computed(() => currencyTitle(currencyView.value, props.filters.trade.currency)),
      shortList,
      allLoaded,
      localRange,
      loadedCount,
      fitCount,
      statusSlot,
      bulkTitle: computed(() => bulk.value
        ? 'Showing sellers with 2 or more copies at one price. Stays on for your next checks. Click to show all.'
        : morePages.value
          ? `Only sellers with 2 or more copies at one price. Loads more listings if fewer than ${BULK_ENOUGH} sellers show (up to ${API_FETCH_LIMIT}).`
          : 'Only sellers with 2 or more copies at one price.'),
      tableLoading,
      listSettled,
      slowdownReady: slowdown.isReady,
      execSearch: () => {
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
  /* woke: above the rows' slid-out travel door and the sticky Yours row. */
  z-index: 2;
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
