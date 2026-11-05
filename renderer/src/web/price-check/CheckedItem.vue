<template>
  <div v-if="show" class="p-4 layout-column min-h-0">
    <!-- woke: TradeListing puts the improved verdict here, the first thing in the window. -->
    <div ref="verdictSlot" class="w-pc-verdict-slot" />
    <filter-name
      ref="nameComponent"
      :filters="itemFilters"
      :item="item">
      <template #meta>
        <woke-dust-chip v-if="item.dustEquivalent" :amount="item.dustEquivalent" />
      </template>
      <woke-build-fit-chip :item="item" />
      <woke-filter-verdict-chip :item="item" />
    </filter-name>
    <woke-map-strip :item="item" class="mb-2" />
    <!-- woke: the improved verdict below shows poeprices and poe.ninja once listings load. -->
    <template v-if="!wokeVerdictShown">
      <price-prediction v-if="showPredictedPrice" class="mb-4"
        :item="item" />
      <price-trend v-else
        :item="item"
        :filters="itemFilters" />
    </template>
    <filters-block
      ref="filtersComponent"
      :filters="itemFilters"
      :stats="itemStats"
      :item="item"
      :presets="presets"
      @preset="selectPreset"
      @submit="doSearch = true">
      <template #rolls>
        <woke-roll-presets :stats="itemStats" :item="item" :league="itemFilters.trade.league" @apply="searchAfterPreset" />
      </template>
    </filters-block>
    <trade-listing
      v-if="tradeAPI === 'trade' && doSearch"
      ref="tradeService"
      :filters="itemFilters"
      :stats="itemStats"
      :item="item"
      @reset="resetTradeResults" />
    <trade-bulk
      v-if="tradeAPI === 'bulk' && doSearch"
      ref="tradeService"
      :filters="itemFilters"
      :item="item"
      @reset="resetTradeResults" />
    <div v-if="!doSearch" class="flex justify-between items-center">
      <div class="flex w-40" @mouseenter="handleSearchMouseenter">
        <button class="btn w-pc-primary" @click="doSearch = true" style="min-width: 5rem;">{{ t('Search') }}</button>
      </div>
      <trade-links v-if="tradeAPI === 'trade'"
        :get-link="makeTradeLink" />
    </div>
    <p v-if="showComplexityHint" :class="$style.complexityHint">
      <i class="fas fa-info-circle" />
      {{ t('item.complexity_hint') }}
    </p>
    <stack-value :filters="itemFilters" :item="item"/>
    <div v-if="showSupportLinks" class="mt-auto border border-dashed p-2">
      <div class="mb-1">{{ t('Support development on') }} <a href="https://patreon.com/awakened_poe_trade" class="inline-flex align-middle animate__animated animate__fadeInRight" target="_blank"><img class="inline h-5" src="/images/Patreon.svg"></a></div>
      <i18n-t keypath="app.thanks_3rd_party" tag="div">
        <a href="https://poeprices.info" target="_blank" class="bg-gray-900 px-1 rounded">poeprices.info</a>
        <a href="https://poe.ninja/support" target="_blank" class="bg-gray-900 px-1 rounded">poe.ninja</a>
      </i18n-t>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, watch, ref, nextTick, computed, provide, shallowRef, ComponentPublicInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { ItemRarity, ItemCategory, ParsedItem } from '@/parser'
import TradeListing from './trade/TradeListing.vue'
import TradeBulk from './trade/TradeBulk.vue'
import TradeLinks from './trade/TradeLinks.vue'
import { apiToSatisfySearch, getTradeEndpoint } from './trade/common'
import PriceTrend from './trends/PriceTrend.vue'
import FiltersBlock from './filters/FiltersBlock.vue'
import { createPresets } from './filters/create-presets'
import PricePrediction from './price-prediction/PricePrediction.vue'
import StackValue from './expected-value/StackValue.vue'
import WokeDustChip from '@/web/woke/price-insight/DustChip.vue'
import WokeRollPresets from '@/web/woke/price-insight/RollPresets.vue'
import WokeBuildFitChip from '@/web/woke/pob-builds/BuildFitChip.vue'
import WokeFilterVerdictChip from '@/web/woke/loot-filter/FilterVerdictChip.vue'
import FilterName from './filters/FilterName.vue'
import WokeMapStrip from '@/web/woke/map-mods/MapModStrip.vue'
import { CATEGORY_TO_TRADE_ID, createTradeRequest } from './trade/pathofexile-trade'
import { AppConfig } from '@/web/Config'
import { FilterPreset } from './filters/interfaces'
import { PriceCheckWidget } from '../overlay/interfaces'
import { useLeagues } from '@/web/background/Leagues'
import { priceView } from '@/web/woke/price-insight/view'

let _showSupportLinksCounter = 0

export default defineComponent({
  name: 'CheckedItem',
  components: {
    WokeMapStrip,
    WokeDustChip,
    WokeRollPresets,
    WokeBuildFitChip,
    WokeFilterVerdictChip,
    PricePrediction,
    TradeListing,
    TradeBulk,
    TradeLinks,
    PriceTrend,
    FiltersBlock,
    FilterName,
    StackValue
  },
  props: {
    item: {
      type: Object as PropType<ParsedItem>,
      required: true
    },
    advancedCheck: {
      type: Boolean,
      required: true
    }
  },
  setup (props) {
    const widget = computed(() => AppConfig<PriceCheckWidget>('price-check')!)
    const leagues = useLeagues()

    const verdictSlot = shallowRef<HTMLElement | null>(null)
    provide('price-verdict-slot', verdictSlot)
    provide('price-check-search', () => { nextTick(() => { doSearch.value = true }) })

    const presets = ref<{ active: string, presets: FilterPreset[] }>(null!)
    const itemFilters = computed(() => presets.value.presets.find(preset => preset.id === presets.value.active)!.filters)
    const itemStats = computed(() => presets.value.presets.find(preset => preset.id === presets.value.active)!.stats)
    const doSearch = ref(false)
    const tradeAPI = ref<'trade' | 'bulk'>('bulk')

    // TradeListing.vue OR TradeBulk.vue
    const tradeService = ref<{ execSearch(): void } | null>(null)
    // FiltersBlock.vue
    const filtersComponent = ref<ComponentPublicInstance>(null!)
    // FilterName.vue, which holds the tiles and chips
    const nameComponent = ref<ComponentPublicInstance>(null!)

    watch(() => props.item, (item, prevItem) => {
      const prevCurrency = (presets.value != null) ? itemFilters.value.trade.currency : null

      presets.value = createPresets(item, {
        league: leagues.selectedId.value!,
        merchantOnly: widget.value.merchantOnly,
        collapseListings: widget.value.collapseListings,
        activateStockFilter: widget.value.activateStockFilter,
        searchStatRange: widget.value.searchStatRange,
        useEn: AppConfig().useIntlSite,
        currency: (prevItem &&
          item.info.namespace === prevItem.info.namespace &&
          item.info.refName === prevItem.info.refName
        ) ? prevCurrency : widget.value.defaultCurrency
      })

      if ((!props.advancedCheck && !widget.value.smartInitialSearch) ||
          (props.advancedCheck && !widget.value.lockedInitialSearch)) {
        doSearch.value = false
      } else {
        doSearch.value = Boolean(
          (item.rarity === ItemRarity.Unique) ||
          (presets.value.active === 'filters.preset_bulk') ||
          (item.mapCompletionReward) ||
          (item.category === ItemCategory.HeistContract) ||
          (item.category === ItemCategory.HeistBlueprint) ||
          (item.category === ItemCategory.SanctumRelic) ||
          (item.category === ItemCategory.Charm) ||
          (item.category === ItemCategory.Idol) ||
          (!CATEGORY_TO_TRADE_ID.has(item.category!) &&
            item.info.refName !== 'Mercenary Warrant') ||
          (item.isUnidentified) ||
          (item.isVeiled)
        )
      }

      tradeAPI.value = apiToSatisfySearch(props.item, itemStats.value, itemFilters.value)
    }, { immediate: true })

    watch(() => [props.item, doSearch.value], () => {
      if (doSearch.value === false) return

      tradeAPI.value = apiToSatisfySearch(props.item, itemStats.value, itemFilters.value)

      // NOTE: child `trade-xxx` component renders/receives props on nextTick
      nextTick(() => {
        if (tradeService.value) {
          tradeService.value.execSearch()
        }
      })
    }, { deep: false, immediate: true })

    watch(() => [props.item, doSearch.value, itemStats.value, itemFilters.value], (curr, prev) => {
      const cItem = curr[0]; const pItem = prev[0]
      const cIntaracted = curr[1]; const pIntaracted = prev[1]

      if (cItem === pItem && cIntaracted === true && pIntaracted === true) {
        // force user to press Search button on change
        doSearch.value = false
      }
    }, { deep: true })

    watch(() => [props.item, JSON.stringify(itemFilters.value.trade)], (curr, prev) => {
      const cItem = curr[0]; const pItem = prev[0]
      const cTrade = curr[1]; const pTrade = prev[1]

      if (cItem === pItem && cTrade !== pTrade) {
        nextTick(() => {
          doSearch.value = true
        })
      }
    }, { deep: false })

    const showPredictedPrice = computed(() => {
      if (!widget.value.requestPricePrediction ||
          AppConfig().language !== 'en' ||
          !leagues.selected.value!.isPopular) return false

      if (presets.value.active === 'filters.preset_base_item') return false

      return props.item.rarity === ItemRarity.Rare &&
        props.item.category !== ItemCategory.Map &&
        props.item.category !== ItemCategory.CapturedBeast &&
        props.item.category !== ItemCategory.HeistContract &&
        props.item.category !== ItemCategory.HeistBlueprint &&
        props.item.category !== ItemCategory.Chart &&
        props.item.category !== ItemCategory.Invitation &&
        props.item.info.refName !== 'Expedition Logbook' &&
        !props.item.isUnidentified
    })

    const show = computed(() => {
      return !(props.item.rarity === ItemRarity.Unique &&
        props.item.isUnidentified &&
        props.item.info.unique == null)
    })

    function handleSearchMouseenter (e: MouseEvent) {
      const from = e.relatedTarget as HTMLElement
      if ((filtersComponent.value.$el as HTMLElement).contains(from) ||
          (nameComponent.value.$el as HTMLElement).contains(from)) {
        doSearch.value = true

        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
      }
    }

    const showSupportLinks = ref(false)
    watch(() => [props.item, doSearch.value], ([cItem, cInteracted], [pItem]) => {
      if (_showSupportLinksCounter >= 13 && (!cInteracted || tradeAPI.value === 'bulk')) {
        showSupportLinks.value = true
        _showSupportLinksCounter = 0
      } else {
        showSupportLinks.value = false
        if (cItem !== pItem) {
          _showSupportLinksCounter += 1
        }
      }
    })

    const { t } = useI18n()

    const wokeVerdictShown = computed(() => priceView.value === 'improved' && tradeAPI.value === 'trade' && doSearch.value)

    return {
      verdictSlot,
      wokeVerdictShown,
      t,
      itemFilters,
      itemStats,
      doSearch,
      tradeAPI,
      tradeService,
      filtersComponent,
      nameComponent,
      showPredictedPrice,
      show,
      handleSearchMouseenter,
      showSupportLinks,
      showComplexityHint: computed(() => !widget.value.builtinBrowser && !doSearch.value &&
        props.item.info.refName === 'Mercenary Warrant'),
      presets: computed(() => presets.value.presets.map(preset =>
        ({ id: preset.id, active: (preset.id === presets.value.active) }))),
      selectPreset (id: string) {
        presets.value.active = id
      },
      makeTradeLink () {
        return `https://${getTradeEndpoint()}/trade/search/${itemFilters.value.trade.league}?q=${JSON.stringify(createTradeRequest(itemFilters.value, itemStats.value))}`
      },
      resetTradeResults () {
        doSearch.value = false
      },
      searchAfterPreset () {
        // stat edits reset doSearch first (watcher above), then search with the new ranges
        nextTick(() => { doSearch.value = true })
      }
    }
  }
})
</script>

<style lang="postcss" module>
.complexityHint {
  display: flex;
  align-items: baseline;
  gap: theme('spacing.2');
  margin-top: theme('spacing.4');
  padding: theme('spacing.2') theme('spacing.4') theme('spacing.2') theme('spacing.3');
  border-radius: theme('borderRadius.DEFAULT');
  background: theme('colors.gray.900');
  text-wrap-style: pretty;

  & > i {
    color: theme('colors.gray.600');
  }
}
</style>
