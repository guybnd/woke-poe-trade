<template>
  <!-- woke: folded, the price is a chip on the name row and costs no height. -->
  <!-- Holds its place while the price "loads", so the chips around it don't move. -->
  <button v-if="inline && trend" type="button" :class="[$style.chip, { invisible: !isValuableBasetype && !slowdown.isReady.value }]"
    title="poe.ninja price. Click to show its 7-day trend" @click="ninjaCardOpen = true">
    <span :class="$style.source">poe.ninja</span>
    <span :class="$style.chipValue">{{ priceText }}</span>
    <img :class="$style.chipCoin" :src="trend.price.currency === 'div' ? '/images/divine.png' : '/images/chaos.png'" :alt="trend.price.currency">
    <i class="fas fa-chevron-down" :class="$style.chev" />
  </button>
  <template v-else-if="inline" />
  <div v-else-if="trend" :class="$style.card">
    <div v-if="!isValuableBasetype && !slowdown.isReady.value" class="flex flex-1 items-center">
      <div><i class="fas fa-dna fa-spin text-gray-600"></i></div>
      <i18n-t keypath="trade_result.getting_price" class="pl-2">
        <span class="text-gray-600">{{ t(':getting_price_from') }}</span>
      </i18n-t>
    </div>
    <template v-else>
      <div :class="$style.main">
        <span :class="$style.source">poe.ninja<template v-if="isValuableBasetype">, {{ t(':base_item') }}</template></span>
        <span :class="$style.value">
          <span>{{ priceText }}</span>
          <img :class="$style.coin" :src="trend.price.currency === 'div' ? '/images/divine.png' : '/images/chaos.png'" :alt="trend.price.currency">
        </span>
      </div>
      <div v-if="trend.change" @click="openNinja" :class="$style['trend-btn']" title="Open on poe.ninja">
        <div class="w-10 h-5">
          <vue-apexcharts
            type="area"
            :options="{
              // Its box has a fixed size, so it never needs a redraw. Hiding the window
              // starts a delayed one, and if a new check removed the chart by then, it
              // has nothing to measure and writes NaN into the svg.
              chart: { sparkline: { enabled: true }, animations: { enabled: false }, redrawOnParentResize: false, redrawOnWindowResize: false },
              stroke: { curve: 'smooth', width: 1.5, colors: ['#7fb2e5'] },
              fill: { colors: ['#7fb2e5'], type: 'solid', opacity: 0.12 },
              tooltip: { enabled: false },
              plotOptions: { area: { fillTo: 'end' } },
              yaxis: {
                show: false,
                min: trend.change.graph.drawMin,
                max: trend.change.graph.drawMax
              }
            }"
            :series="[{
              data: trend.change.graph.points
            }]"
          />
        </div>
        <span class="whitespace-nowrap">
          <i v-if="trend.change.forecast === 'down'" class="fas fa-angle-double-down pr-1 w-down"></i>
          <i v-if="trend.change.forecast === 'up'" class="fas fa-angle-double-up pr-1 w-up"></i>
          <span v-if="trend.change.forecast === 'const'" class="pr-1 w-faint">±</span>
          <span>{{ trend.change.text }}</span>
          <span class="w-dim pl-1">{{ t(':graph_7d') }}</span>
        </span>
      </div>
    </template>
    <button type="button" class="w-icon-btn" title="Fold onto the name row" @click="ninjaCardOpen = false">
      <i class="fas fa-chevron-up text-xs" />
    </button>
  </div>
  <div v-else-if="showFallback" :class="$style.card">
    <div :class="$style.source">poe.ninja has no price for this</div>
    <button type="button" class="w-icon-btn" title="Hide" @click="ninjaCardOpen = false">
      <i class="fas fa-chevron-up text-xs" />
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, defineAsyncComponent, PropType, computed, watch } from 'vue'
import { useI18nNs } from '@/web/i18n'
import { usePoeninja, displayRounding } from '@/web/background/Prices'
import { isValuableBasetype, getDetailsId } from './getDetailsId'
// woke: apexcharts is a quarter of the startup bundle (550 KB) and only draws
// this sparkline, so it loads separately; app/prefetch.ts fetches it once the
// overlay is idle after startup, before the first price check needs it.
const VueApexcharts = defineAsyncComponent(() => import('vue3-apexcharts'))
import { ParsedItem } from '@/parser'
import { artificialSlowdown } from '../trade/artificial-slowdown'
import { ItemFilters } from '../filters/interfaces'
import { useLeagues } from '@/web/background/Leagues'
import { ninjaCardOpen } from '@/web/woke/price-insight/view'

const slowdown = artificialSlowdown(800)

export default defineComponent({
  components: {
    VueApexcharts
  },
  props: {
    item: {
      type: Object as PropType<ParsedItem>,
      required: true
    },
    filters: {
      type: Object as PropType<ItemFilters>,
      required: true
    },
    /** Folded: a chip on the name row instead of the card. */
    inline: {
      type: Boolean,
      default: false
    }
  },
  setup (props) {
    const { t } = useI18nNs('trade_result')
    const { findPriceByQuery, autoCurrency } = usePoeninja()

    watch(() => props.item, (item) => {
      slowdown.reset(item)
    }, { immediate: true })

    const { selectedId } = useLeagues()

    const trend = computed(() => {
      // woke: poe.ninja only holds the league picked in settings.
      if (props.filters.trade.league !== selectedId.value) return
      const detailsId = getDetailsId(props.item)
      const trend = detailsId && findPriceByQuery(detailsId)
      if (!trend) return

      const price = (props.item.info.refName === 'Divine Orb')
        ? { min: trend.chaos, max: trend.chaos, currency: 'chaos' as const }
        : autoCurrency(trend.chaos)

      return {
        price: price,
        change: deltaFromGraph(trend.graph),
        url: trend.url
      }
    })

    return {
      t,
      trend,
      priceText: computed(() => {
        const price = trend.value?.price
        if (!price) return ''
        const fraction = props.filters.stackSize != null
        return (price.min === price.max)
          ? displayRounding(price.min, fraction)
          : `${displayRounding(price.min, fraction)} ~ ${displayRounding(price.max, fraction)}`
      }),
      openNinja () {
        window.open(trend.value!.url)
      },
      isValuableBasetype: computed(() => {
        return isValuableBasetype(props.item)
      }),
      showFallback: computed(() => {
        const { item } = props
        return (
          !item.info.craftable &&
          item.info.refName !== 'Mercenary Warrant' // need vertical space
        )
      }),
      slowdown,
      ninjaCardOpen
    }
  }
})

function deltaFromGraph (graphPoints: Array<number | null>) {
  const points = graphPoints.filter(p => p != null) as number[]
  if (points.length < 2) return null

  let forecast = 'const'
  if (points.length === 7) {
    if (
      points.filter(p => p > 0).length >= 4 ||
      points.slice(4).every(p => p > 0)
    ) {
      forecast = 'up'
    } else if (
      points.filter(p => p < 0).length >= 4 ||
      points.slice(4).every(p => p < 0)
    ) {
      forecast = 'down'
    }
  }

  const mean = points.reduce((a, b) => a + b) / points.length
  const changeVal = Math.sqrt(points.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / (points.length - 1))

  return {
    graph: {
      points,
      drawMin: Math.min(...points) - (changeVal || 1),
      drawMax: Math.max(...points) + (changeVal || 1)
    },
    forecast,
    text: `${Math.round(changeVal * 2)}\u2009%`
  }
}
</script>

<style lang="postcss" module>
.card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
  margin: 0 -1rem 0.5rem;
  padding: 2px calc(1rem - 4px) 2px 1rem;
  background: var(--w-pc-well, transparent);
  border-top: 1px solid var(--w-line-soft);
  border-bottom: 1px solid var(--w-line);
  font-family: var(--w-body);
  font-variant-numeric: tabular-nums;
}
.main { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.source { font-size: calc(12px * var(--w-text-scale, 1)); color: var(--w-ninja); }
.value { display: inline-flex; align-items: center; gap: 4px; font-size: calc(16px * var(--w-text-scale, 1)); font-weight: 600; color: var(--w-fg); }
.coin { width: calc(16px * var(--w-text-scale, 1)); height: calc(16px * var(--w-text-scale, 1)); object-fit: contain; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  min-height: calc(24px * var(--w-text-scale, 1));
  padding: 0 6px 0 8px;
  border: 1px solid var(--w-line-soft);
  border-radius: var(--w-radius-sm);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  &:hover { border-color: var(--w-line); background: var(--w-panel-3); }
}
.chipValue { font-size: calc(13px * var(--w-text-scale, 1)); font-weight: 600; color: var(--w-fg); }
.chipCoin { width: calc(14px * var(--w-text-scale, 1)); height: calc(14px * var(--w-text-scale, 1)); object-fit: contain; }
.chev { font-size: calc(9px * var(--w-text-scale, 1)); color: var(--w-dim); }
.trend-btn {
  display: flex;
  align-items: center;
  flex: none;
  gap: 6px;
  padding: 1px 6px;
  border: 1px solid var(--w-line-soft);
  border-radius: var(--w-r-sm);
  font-size: var(--w-fs-xs);
  color: var(--w-fg);
  cursor: pointer;

  &:hover { border-color: var(--w-line); background: var(--w-panel-3); }
}
</style>
