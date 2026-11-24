<template>
  <div v-if="!error" class="layout-column min-h-0" style="height: auto;">
    <teleport v-if="improved && verdictSlot" :to="verdictSlot">
      <bulk-verdict :insight="bulkInsight" :unit="selectedCurr === 'xchgChaos' ? 'c' : 'div'" :need="need" :loading="tableLoading" :ninja="ninjaEach" :other="otherMarket" :divine-in-chaos="divineInChaos" />
    </teleport>
    <!-- woke: only for what Faustus's Currency Exchange trades, as in TradeListing (maps aren't). -->
    <div v-if="item.info.exchangeable" :class="$style.legacyMessage">
      {{ t(':legacy_bulk_xchg_msg') }}
    </div>
    <div class="w-pc-toolbar mb-1 flex pl-2 justify-between items-baseline" style="min-height: 1.375rem;">
      <div class="w-pc-matched flex items-center flex-wrap text-gray-500">
        <span v-if="!result" class="text-gray-600">...</span>
        <!-- woke: which currency's offers show, each with how many there are (Guy, 2026-11-24). -->
        <div v-else :class="$style.seg" role="group" aria-label="Offers in">
          <button type="button" :class="{ [$style.segOn]: selectedCurr === 'xchgChaos' }" :aria-pressed="selectedCurr === 'xchgChaos'"
            :title="`Offers asking chaos: ${result.xchgChaos.listed.value?.total ?? 'not searched yet, click to search'}`"
            :disabled="!result.both && !result.xchgChaos.listed.value" @click="pickCurr('xchgChaos')">
            <img src="/images/chaos.png" :class="$style.segIcon" alt="">Chaos <b>{{ result.xchgChaos.listed.value?.total ?? '?' }}</b>
          </button>
          <button type="button" :class="{ [$style.segOn]: selectedCurr === 'xchgStable' }" :aria-pressed="selectedCurr === 'xchgStable'"
            :title="`Offers asking divines: ${result.xchgStable.listed.value?.total ?? 'not searched yet, click to search'}`"
            :disabled="!result.both && !result.xchgStable.listed.value" @click="pickCurr('xchgStable')">
            <img src="/images/divine.png" :class="$style.segIcon" alt="">Divine <b>{{ result.xchgStable.listed.value?.total ?? '?' }}</b>
          </button>
        </div>
        <span v-if="result" class="ml-1"><online-filter :filters="filters" api="bulk" /></span>
        <!-- woke: the price check's own chips (a map's Exchange, WOKEPOET-523), there while it loads too. -->
        <span class="ml-1"><slot name="chips" /></span>
        <label v-if="result" class="ml-2 flex items-center whitespace-nowrap" title="How many you want: the line below adds up what they cost from the cheapest sellers">Buy<input v-model.number="buyCount" type="number" min="1" :class="$style.buyBox" data-bulk-buy aria-label="How many to buy"></label>
      </div>
      <trade-links v-if="result"
        :get-link="makeTradeLink" :suggest-name="() => item.info.name" />
    </div>
    <!-- woke: what Buy N costs from the cheapest up, and whispering them in turn (Guy, 2026-11-24). -->
    <div v-if="!tableLoading && plan.picks.length" :class="$style.total" class="px-2 mb-1" data-bulk-total>
      <span>Buy {{ plan.items }} → <b>{{ amount(plan.cost) }}</b><img :src="unitIcon" :alt="unitName" :class="$style.unitIcon"> total<template v-if="plan.items > 1"> · {{ amount(plan.cost / plan.items) }}<img :src="unitIcon" :alt="unitName" :class="$style.unitIcon"> each</template> · {{ plan.picks.length }} {{ plan.picks.length === 1 ? 'seller' : 'sellers' }}<template v-if="plan.short && moreListed"> · as many as the {{ shownCount }} cheapest offers hold</template><template v-else-if="plan.short"> · only {{ plan.items }} on offer</template></span>
      <span class="flex-1" />
      <span v-if="whisperNote" class="text-gray-400 whitespace-nowrap mr-2" data-bulk-whispered>{{ whisperNote }}</span>
      <span v-else-if="whispers.length && !nextPick" class="text-gray-500 whitespace-nowrap">All {{ whispers.length }} whispered</span>
      <button v-if="nextPick" type="button" :class="[$style.whisperBtn, $style.nextBtn]" data-bulk-next
        :title="`Whisper ${sellerName(nextPick.offer)} for ${nextPick.items}: the next cheapest seller for your amount`"
        @click="whisperNext">Whisper next<template v-if="whispers.length > 1"> ({{ nextIdx + 1 }}/{{ whispers.length }})</template></button>
    </div>
    <div ref="tableBox" data-goto-spot="exchange-ladder" class="w-pc-scroll layout-column overflow-y-auto overflow-x-hidden">
      <table class="w-pc-table w-full" :class="$style.ladder">
        <thead>
          <tr class="text-left">
            <th :class="$style.tableHeading"><div class="px-2">Each</div></th>
            <th :class="$style.tableHeading" class="w-full"><div class="px-2">On offer</div></th>
            <th :class="$style.tableHeading" class="text-right"><div class="px-2">{{ wide ? 'Seller' : 'Sellers' }}</div></th>
            <th :class="$style.tableHeading" class="text-right"><div class="px-2" title="When the newest offer at this price was listed. Green: under an hour. Yellow: over a day. Red: over a week.">Newest</div></th>
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
            <template v-for="step in steps" :key="(step.ninja ? 'ninja:' : '') + step.key">
              <tr v-if="step.ninja" :class="$style.marketRatioRow">
                <td class="px-2 whitespace-nowrap">{{ step.key }}<img :src="unitIcon" :alt="unitName" :class="$style.unitIcon"></td>
                <td colspan="3" class="px-2 text-gray-400">{{ t(':market_ratio') }}</td>
              </tr>
              <template v-else>
                <tr :class="[$style.step, { [$style.filled]: step.filled }]" data-bulk-step :aria-expanded="openSteps.has(step.key)"
                  :title="openSteps.has(step.key) ? undefined : 'Click to see the sellers'" @click="toggleStep(step.key)">
                  <td class="px-2 whitespace-nowrap"><span :class="$style.chev">{{ openSteps.has(step.key) ? '▾' : '▸' }}</span><span data-testid="bulk-each">{{ step.key }}<img :src="unitIcon" :alt="unitName" :title="unitName" :class="$style.unitIcon"></span></td>
                  <td class="px-2"><div :class="$style.depth"><span>{{ step.stock }}</span><i :style="{ width: depthWidth(step.stock) }" /></div></td>
                  <!-- Guy (2026-11-24): the cheapest seller's name where the window has room, else how many. -->
                  <td class="px-2 text-right whitespace-nowrap" :title="wide ? `${step.sellers} ${step.sellers === 1 ? 'seller' : 'sellers'}` : undefined">
                    <template v-if="wide"><span :class="$style.name">{{ step.offers[0].isMine ? t('You') : sellerName(step.offers[0]) }}</span><span v-if="step.sellers > 1" class="text-gray-500"> +{{ step.sellers - 1 }}</span></template>
                    <template v-else>{{ step.sellers }}</template>
                  </td>
                  <td class="px-2 w-pc-age" :class="ageClass(step.newest)">{{ step.newestText }}</td>
                </tr>
                <template v-if="openSteps.has(step.key)">
                  <tr v-for="r in step.offers" :key="r.id" :class="$style.seller">
                    <td colspan="2" class="px-2" :class="$style.sellerCell">
                      <span v-if="r.isMine" class="w-pc-you">{{ t('You') }}</span>
                      <span v-else>{{ sellerName(r) }}</span>
                      <span v-if="r.accountStatus !== 'online'" :class="[$style.status, $style[r.accountStatus]]">{{ r.accountStatus === 'afk' ? 'AFK' : 'offline' }}</span>
                      <span class="text-gray-500"> · {{ r.stock }} in stock<template v-if="r.itemAmount !== 1"> · {{ amount(r.exchangeAmount) }}<img :src="unitIcon" :alt="unitName" :class="$style.unitIcon"> per {{ amount(r.itemAmount) }}</template></span>
                    </td>
                    <td class="px-2 text-right whitespace-nowrap">
                      <!-- Guy (2026-11-24): pick how many from this seller and whisper them, right on the row. -->
                      <template v-if="canWhisper(r)">
                        <input type="number" :class="$style.amountBox" :min="r.itemAmount" :step="r.itemAmount" :max="maxItems(r)"
                          :value="amountFor(r)" data-bulk-amount :aria-label="`How many from ${sellerName(r)}`"
                          :title="`How many from ${sellerName(r)}: up to ${maxItems(r)}`"
                          @click.stop @change="setAmount(r, $event.target as HTMLInputElement)">
                        <span :class="$style.rowCost">{{ amount(lotsFor(r) * r.exchangeAmount) }}<img :src="unitIcon" :alt="unitName" :class="$style.unitIcon"></span>
                        <button type="button" :class="$style.whisperBtn" data-bulk-whisper
                          :title="`Whisper: ${whisperText(r)}`" @click.stop="whisper(r)">Whisper</button>
                      </template>
                    </td>
                    <td class="px-2 w-pc-age" :class="ageClass(ageOf(r))" :title="r.relativeDate">{{ ageOf(r) == null ? r.relativeDate : shortAge(ageOf(r)!) }}</td>
                  </tr>
                </template>
              </template>
            </template>
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
      <slot name="error-actions" />
    </template>
  </ui-error-box>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, watch, ComputedRef, Ref, ShallowRef, shallowRef, shallowReactive, reactive, inject, readonly, onUnmounted } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { useI18nNs } from '@/web/i18n'
import UiErrorBox from '@/web/ui/UiErrorBox.vue'
import { BulkSearch, execBulkSearch, createTradeRequest, PricingResult, bulkWhisper } from './pathofexile-bulk'
import { MainProcess } from '@/web/background/IPC'
import { getTradeEndpoint } from './common'
import { AppConfig } from '@/web/Config'
import { usePoeninja } from '@/web/background/Prices'
import { useLeagues } from '@/web/background/Leagues'
import { getDetailsId, exactDetailsId } from '../trends/getDetailsId'
import { ItemFilters } from '../filters/interfaces'
import { ParsedItem, ItemCategory } from '@/parser'
import { PriceCheckWidget } from '@/web/overlay/interfaces'
import { artificialSlowdown } from './artificial-slowdown'
import { useRetryCountdown } from './retry-countdown'
import OnlineFilter from './OnlineFilter.vue'
import TradeLinks from './TradeLinks.vue'
import BulkVerdict from '@/web/woke/price-insight/BulkVerdict.vue'
import { buildBulkInsight, pickBulkMarket, bulkSideWaiting } from '@/web/woke/price-insight/bulk-insight'
import { priceView } from '@/web/woke/price-insight/view'
import { chaosOrbRow } from '@/web/woke/price-insight/ninja-first'
import { ageTone, shortAge } from '@/web/woke/price-insight/listing-rows'
import { ladderSteps, fillPlan, buyable } from '@/web/woke/price-insight/bulk-ladder'
import { bulkAmount } from '@/web/woke/price-insight/bulk-insight'
import '@/web/woke/price-insight/price-table.css'

const slowdown = artificialSlowdown(900)
const SKELETON_ROWS = 8
// woke: the last Buy amount typed on a map's exchange, kept for the next map checked.
let lastMapBuy = 1
// Narrower than this, the Seller column shows only how many sellers.
const WIDE_PX = 420

function useBulkApi () {
  type BulkSide = {
    listed: Ref<BulkSearch | null>
    listedLazy: ComputedRef<readonly PricingResult[]>
    /** Loads this side if it isn't yet: only from a click, never by itself. */
    load: () => void
    failed: Ref<boolean>
    /** This side's own search is running. */
    loading: Ref<boolean>
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

      // woke: a search still waiting its turn when another item is checked isn't sent.
      const optimisticSearch = await execBulkSearch(
        item, filters, have, { accountName: AppConfig().accountName, isCurrent: () => _searchId === searchId })
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
    const loading = shallowRef(false)

    // woke: a side the first search held back loads only when the player picks it:
    // the price check never spends a trade search of its own accord.
    function load () {
      if (loading.value || _result.value != null) return
      loading.value = true
      failed.value = false
      // A newer search replaces this one's results, so this has nothing to add.
      const _searchId = searchId
      ;(async function () {
        try {
          const found = (await execBulkSearch(
            item, filters, [have], { accountName: AppConfig().accountName, isCurrent: () => _searchId === searchId }))[0]!
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
          // The side shows it failed and a click retries.
          failed.value = true
          error.value = (err as Error).message
        } finally {
          loading.value = false
        }
      })()
    }

    const listedLazy = computed(() => items.value)

    return { listed: _result, listedLazy, load, failed, loading }
  }

  // woke: an exchange view closed while its search waits its turn sends nothing (WOKEPOET-523).
  function cancel () { searchId += 1 }

  return { error, result, search, cancel }
}

interface MarketRatio extends Pick<PricingResult, 'exchangeAmount' | 'itemAmount'> {
  id: 'market-ratio'
  marketRatio: true
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
    const { error, result, search, cancel } = useBulkApi()
    onUnmounted(cancel)
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

    const listedNow = computed<readonly PricingResult[]>(() => {
      if (!slowdown.isReady.value || !result.value) return []
      return result.value[selectedCurr.value].listedLazy.value
    })

    // woke: the verdict's slot sits above the mods, as for item listings.
    const verdictSlot = inject<ShallowRef<HTMLElement | null>>('price-verdict-slot', shallowRef(null))
    const need = computed(() => props.item.stackSize?.value ?? 1)
    // woke: how many you want (Guy, 2026-11-24): the line above the ladder adds up what that costs
    // from the cheapest sellers, and each seller's amount starts at what that buy takes from them.
    // A stack's size leads; a map starts at the last amount typed for a map.
    const isMap = computed(() => props.item.category === ItemCategory.Map)
    const startBuy = () => isMap.value ? lastMapBuy : need.value
    const buyCount = shallowRef(startBuy())
    watch(() => props.item, () => { buyCount.value = startBuy() })
    watch(buyCount, (n) => { if (isMap.value && Number(n) >= 1) lastMapBuy = Math.floor(Number(n)) })
    const want = computed(() => Math.max(1, Math.floor(Number(buyCount.value) || 1)))
    const plan = computed(() => fillPlan(listedNow.value, want.value))

    // The ladder: one row per price, poe.ninja's price slotted in where it falls.
    type Step = ReturnType<typeof ladderSteps<PricingResult>>[number] & { filled: boolean, newest: number | null, newestText: string, ninja?: false }
    type NinjaStep = { key: string, unit: number, ninja: true }
    const steps = computed<Array<Step | NinjaStep>>(() => {
      const used = new Set(plan.value.picks.map(p => p.offer))
      const now = Date.now()
      const out: Array<Step | NinjaStep> = ladderSteps(listedNow.value).map(step => {
        const ages = step.offers.map(o => o.indexedAt ? now - Date.parse(o.indexedAt) : NaN).filter(n => !Number.isNaN(n))
        const newest = ages.length ? Math.max(0, Math.min(...ages)) : null
        return { ...step, filled: step.offers.some(o => used.has(o)), newest, newestText: newest == null ? '' : shortAge(newest) }
      })
      const ratio = marketRatio.value[selectedCurr.value]
      if (ratio) {
        const unit = ratio.exchangeAmount / ratio.itemAmount
        const at = out.findIndex(s => s.unit >= unit)
        out.splice(at === -1 ? out.length : at, 0, { key: bulkAmount(unit), unit, ninja: true })
      }
      return out
    })
    // The Seller column names the cheapest seller where the window has room for it.
    const tableBox = shallowRef<HTMLElement | null>(null)
    const boxWidth = shallowRef(0)
    useResizeObserver(tableBox, (entries) => { boxWidth.value = entries[0].contentRect.width })
    const wide = computed(() => boxWidth.value >= WIDE_PX)
    const maxStock = computed(() => Math.max(1, ...steps.value.map(s => s.ninja ? 0 : s.stock)))
    // Square root, so a step of 1 still shows beside one of 1400.
    const depthWidth = (stock: number) => `${Math.max(2, Math.round(Math.sqrt(stock / maxStock.value) * 100))}%`

    // The cheapest price starts open, so the sellers and their Whisper are in sight.
    const openSteps = shallowRef(new Set<string>())
    watch(() => [listedNow.value, selectedCurr.value] as const, () => {
      const first = steps.value.find(s => !s.ninja)
      openSteps.value = new Set(first ? [first.key] : [])
    }, { immediate: true })
    function toggleStep (key: string) {
      const next = new Set(openSteps.value)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      openSteps.value = next
    }

    // Each seller's amount: what the buy takes from them, or one lot; typed amounts stay until the results change.
    const typed = reactive(new Map<string, number>())
    watch(() => [listedNow.value, want.value], () => { typed.clear() })
    const maxItems = (r: PricingResult) => Math.floor(r.stock / r.itemAmount) * r.itemAmount
    const amountFor = (r: PricingResult) => typed.get(r.id) ?? plan.value.picks.find(p => p.offer === r)?.items ?? r.itemAmount
    // Snapped to the seller's lot size and their stock, and shown as snapped: the box says what Whisper asks for.
    function setAmount (r: PricingResult, input: HTMLInputElement) {
      const n = input.valueAsNumber
      if (Number.isFinite(n) && n >= 1) {
        typed.set(r.id, Math.min(maxItems(r), Math.ceil(n / r.itemAmount) * r.itemAmount))
      }
      input.value = String(amountFor(r))
    }
    // Lots: the seller's own lot size, enough for the amount, never more than their stock.
    const lotsFor = (r: PricingResult) =>
      Math.max(1, Math.min(Math.ceil(amountFor(r) / r.itemAmount), Math.floor(r.stock / r.itemAmount)))
    const whisperText = (r: PricingResult) => bulkWhisper(r, lotsFor(r)) ?? ''
    // Not yours, and a seller with at least one lot in stock.
    const canWhisper = (r: PricingResult) => buyable(r) && !!r.whisper
    const sellerName = (r: PricingResult) => widget.value.showSeller === 'account' ? r.accountName : r.ign
    const whisperNote = shallowRef('')
    const showNote = (note: string) => {
      whisperNote.value = note
      setTimeout(() => { if (whisperNote.value === note) whisperNote.value = '' }, 3000)
    }
    let lastWhisper = ''
    function send (r: PricingResult, text: string) {
      lastWhisper = text
      MainProcess.sendEvent({ name: 'CLIENT->MAIN::user-action', payload: { action: 'paste-in-chat', text, immediate: true } })
      showNote(`Whispered ${r.ign}`)
    }
    function whisper (r: PricingResult) {
      const text = whisperText(r)
      if (text) send(r, text)
    }
    // Whisper next: down the buy's sellers, cheapest first, each for what the buy takes from them.
    // Each for the amount on their row, which starts at what the buy takes; it stops after the last.
    const whispers = computed(() => plan.value.picks.filter(p => canWhisper(p.offer)))
    const nextIdx = shallowRef(0)
    watch(plan, () => { nextIdx.value = 0 })
    const nextPick = computed(() => whispers.value[nextIdx.value] ?? null)
    function whisperNext () {
      const pick = nextPick.value
      if (!pick) return
      whisper(pick.offer)
      nextIdx.value += 1
    }
    // The game didn't have focus, so the whisper never went out.
    const chatDropped = MainProcess.onEvent('MAIN->CLIENT::woke-event', ({ topic, data }) => {
      if (topic !== 'chat-dropped' || !lastWhisper || (data as { text?: string }).text !== lastWhisper) return
      lastWhisper = ''
      showNote("Not sent: the game wasn't in front. Click again")
    })
    onUnmounted(() => { chatDropped.abort() })
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
    // woke: the first search is all there is to compare: a side it held back loads only on a click,
    // so the cheaper side is told only when both came back; otherwise the loaded side leads.
    const bulkInsight = computed(() => {
      if (!slowdown.isReady.value || !result.value) return null
      const listed = result.value[selectedCurr.value].listedLazy.value
      return buildBulkInsight(listed, need.value)
    })
    const otherMarket = computed(() => {
      if (!bulkInsight.value) return null
      const curr = selectedCurr.value === 'xchgChaos' ? 'xchgStable' : 'xchgChaos'
      const unit = curr === 'xchgChaos' ? 'c' : 'div'
      const side = result.value?.[curr]
      if (side?.failed.value) return { unit, failed: true }
      // The first search held this side back: it costs a search, so it waits for a click.
      if (result.value?.both && side && side.listed.value == null && !side.loading.value) return { unit, unsearched: true }
      const insight = insights[curr].value
      return insight ? { unit, fair: insight.fair, sellers: insight.sellers } : null
    })

    // woke: real rows only once loaded, with placeholder rows until then.
    // Placeholder rows only while the shown side's own search runs, never for a side nobody asked to load.
    const tableLoading = computed(() => {
      if (!slowdown.isReady.value || !result.value) return true
      const side = result.value[selectedCurr.value]
      return bulkSideWaiting({ loaded: side.listed.value != null, failed: side.failed.value, loading: side.loading.value })
    })

    watch(result, () => {
      userPicked = false
    })
    watch(() => result.value
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
      // woke: a listing's age, for its colour and the short time beside it.
      ageOf: (r: PricingResult) => {
        const at = r.indexedAt ? Date.parse(r.indexedAt) : NaN
        return Number.isNaN(at) ? null : Math.max(0, Date.now() - at)
      },
      shortAge,
      verdictSlot,
      need,
      buyCount,
      whisperNote,
      whisperText,
      canWhisper,
      whisper,
      whisperNext,
      nextPick,
      nextIdx,
      whispers,
      // The exchange loads its cheapest offers only: more are listed than the plan could see.
      moreListed: computed(() => (result.value?.[selectedCurr.value].listed.value?.total ?? 0) > listedNow.value.length),
      shownCount: computed(() => listedNow.value.length),
      plan,
      steps,
      depthWidth,
      openSteps,
      tableBox,
      wide,
      toggleStep,
      maxItems,
      amountFor,
      setAmount,
      lotsFor,
      sellerName,
      amount: (v: number) => bulkAmount(v),
      ageClass: (ms: number | null) => { const tone = ageTone(ms); return tone ? `w-pc-age-${tone}` : undefined },
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

/* Chaos | Divine: which currency's offers show. */
.seg {
  display: inline-flex;
  border: 1px solid var(--w-line, theme('colors.gray.700'));
  border-radius: var(--w-r-sm, 3px);
  overflow: hidden;

  & button {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 0 7px;
    color: var(--w-dim, theme('colors.gray.500'));
    background: transparent;
    font-size: var(--w-fs-sm, 12px);
  }
  & button:hover:not(:disabled) { color: var(--w-fg, theme('colors.gray.200')); }
  & button:disabled { opacity: .5; }
  & button b { font-weight: 600; font-variant-numeric: tabular-nums; }
}
.segOn {
  background: var(--w-chip-ground, rgba(255, 255, 255, .06)) !important;
  color: var(--w-gold-hi, var(--w-fg, theme('colors.gray.100'))) !important;
}
.segIcon { width: 1.125rem; height: 1.125rem; margin: -2px 0; }

.total {
  display: flex;
  font-family: var(--w-body);
  font-size: var(--w-fs-sm, 12px);
  align-items: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
  color: var(--w-fg, theme('colors.gray.300'));

  & b { color: var(--w-gold-hi, var(--w-accent, theme('colors.yellow.300'))); font-weight: 600; }
}
.nextBtn { padding: 0 8px; white-space: nowrap; }

.ladder { font-variant-numeric: tabular-nums; }
.step { cursor: pointer; }
.step:hover td { background: var(--w-chip-ground, rgba(255, 255, 255, .06)); }
/* Prices your Buy amount takes. */
.filled td { background: var(--w-accent-soft, rgba(200, 163, 90, .12)); }
.filled td:first-child { box-shadow: inset 2px 0 0 var(--w-accent, theme('colors.yellow.500')); }
.chev { display: inline-block; width: 0.75em; color: var(--w-dim, theme('colors.gray.500')); font-size: 0.8em; }

.depth {
  display: flex;
  align-items: center;
  gap: 6px;

  & span { min-width: 2.5em; text-align: right; }
  & i { display: block; height: 5px; max-width: 8rem; flex: none; border-radius: 1px; background: var(--w-line-strong, theme('colors.gray.600')); }
}

.name { display: inline-block; max-width: 9rem; overflow: hidden; text-overflow: ellipsis; vertical-align: bottom; }

.seller td { font-size: var(--w-fs-sm, 12px); background: var(--w-panel-2, rgba(0, 0, 0, .2)); }
.sellerCell { padding-left: 1.5em !important; white-space: nowrap; }
.status {
  margin-left: 4px;
  font-size: var(--w-fs-xs, 11px);
  &.afk { color: theme('colors.orange.400'); }
  &.offline { color: theme('colors.red.400'); }
}
.amountBox {
  width: 3.5em; padding: 0 3px; text-align: right; font-variant-numeric: tabular-nums;
  border: 1px solid var(--w-line-strong, #555); border-radius: 3px; background: transparent; color: inherit;
}
.rowCost { display: inline-block; min-width: 3em; text-align: right; margin: 0 4px; color: var(--w-dim, theme('colors.gray.400')); }
.whisperBtn {
  padding: 0 6px;
  border: 1px solid var(--w-line-strong, #555);
  border-radius: 3px;
  color: var(--w-gold-hi, var(--w-accent, theme('colors.yellow.300')));
  background: transparent;
  font-size: var(--w-fs-xs, 11px);
}
.whisperBtn:hover { border-color: var(--w-gold, theme('colors.yellow.500')); }

.unitIcon {
  display: inline-block;
  width: 1.125em;
  height: 1.125em;
  margin-left: 0.125em;
  vertical-align: -0.2em;
}

.legacyMessage {
  @apply mb-2;
  font-family: var(--w-body);
  font-size: calc(12px * var(--w-text-scale, 1));
  color: var(--w-dim);
}

.buyBox {
  width: 3.5em; margin-left: 4px; padding: 0 3px; text-align: right;
  border: 1px solid var(--w-line-strong, #555); border-radius: 3px; background: transparent; color: inherit;
}
.marketRatioRow {
  background: var(--w-pc-raise, theme('colors.gray.700')) !important;
  outline: 1px solid theme('colors.gray.600');
  outline-offset: -1px;
}
</style>
