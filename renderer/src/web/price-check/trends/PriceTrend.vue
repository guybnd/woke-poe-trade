<template>
  <!-- woke: only for items poe.ninja prices exactly and has a 7-day line for. Rares (where it
       prices just the base) and maps show nothing. -->
  <template v-if="!exact || !trend?.change" />
  <!-- Folded: a chip on the name row, costing no height. It holds its place while the
       price "loads", so the chips around it don't move. -->
  <button v-else-if="inline" type="button" :class="[$style.chip, { invisible: !slowdown.isReady.value }]"
    title="poe.ninja price and its 7-day change. Click for the chart." @click="ninjaCardOpen = true">
    <w-spark :values="sparkValues" :width="32" :height="14" />
    <span :class="$style.chipValue">{{ priceText }}</span>
    <img :class="$style.chipCoin" :src="trend.price.currency === 'div' ? '/images/divine.png' : '/images/chaos.png'" :alt="trend.price.currency">
    <span v-if="weekChange != null" :class="weekChange >= 0 ? 'w-up' : 'w-down'">{{ weekChange >= 0 ? '▲' : '▼' }}{{ Math.abs(weekChange) }}%</span>
    <i class="fas fa-chevron-down" :class="$style.chev" />
  </button>
  <div v-else :class="$style.card">
    <div v-if="!slowdown.isReady.value" class="flex flex-1 items-center">
      <div><i class="fas fa-dna fa-spin text-gray-600"></i></div>
      <i18n-t keypath="trade_result.getting_price" class="pl-2">
        <span class="text-gray-600">{{ t(':getting_price_from') }}</span>
      </i18n-t>
    </div>
    <template v-else>
      <div :class="$style.head">
        <span :class="$style.value">
          <span>{{ priceText }}</span>
          <img :class="$style.coin" :src="trend.price.currency === 'div' ? '/images/divine.png' : '/images/chaos.png'" :alt="trend.price.currency">
        </span>
        <span v-if="weekChange != null" :class="weekChange >= 0 ? 'w-up' : 'w-down'">{{ weekChange >= 0 ? '▲' : '▼' }}{{ Math.abs(weekChange) }}%</span>
        <span class="w-dim">{{ t(':graph_7d') }}</span>
        <span class="flex-1" />
        <a :class="$style.ninjaLink" :href="trend.url" target="_blank">Open on poe.ninja ↗</a>
        <button type="button" class="w-icon-btn" title="Fold onto the name row" @click="ninjaCardOpen = false">
          <i class="fas fa-chevron-up text-xs" />
        </button>
      </div>
      <div :class="$style.chart">
        <vue-apexcharts
          type="area"
          height="100%"
          :options="{
            // Hiding the window starts a delayed redraw, and if a new check removed the
            // chart by then, it has nothing to measure and writes NaN into the svg.
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
    </template>
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
import { WSpark } from '@/web/woke/ui'
import { ItemCategory } from '@/parser'

const slowdown = artificialSlowdown(800)

export default defineComponent({
  components: {
    VueApexcharts,
    WSpark
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
        graph: trend.graph,
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
      // poe.ninja prices this exact item, not just its base (rares) or a map tier.
      exact: computed(() => !isValuableBasetype(props.item) && props.item.category !== ItemCategory.Map),
      sparkValues: computed(() => (trend.value?.graph ?? []).filter((p): p is number => p != null)),
      // poe.ninja's line is the % change since the first day, so its last point is the week's change.
      weekChange: computed(() => {
        const points = (trend.value?.graph ?? []).filter((p): p is number => p != null)
        return points.length ? Math.round(points[points.length - 1]) : null
      }),
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
  flex-direction: column;
  gap: 2px;
  margin: 0 -1rem 0.5rem;
  padding: 2px calc(1rem - 4px) 6px 1rem;
  background: var(--w-pc-well, transparent);
  border-top: 1px solid var(--w-line-soft);
  border-bottom: 1px solid var(--w-line);
  font-family: var(--w-body);
  font-size: calc(12px * var(--w-text-scale, 1));
  font-variant-numeric: tabular-nums;
}
.head { display: flex; align-items: center; gap: 8px; min-height: 28px; white-space: nowrap; }
.value { display: inline-flex; align-items: center; gap: 4px; font-size: calc(16px * var(--w-text-scale, 1)); font-weight: 600; color: var(--w-fg); }
.coin { width: calc(16px * var(--w-text-scale, 1)); height: calc(16px * var(--w-text-scale, 1)); object-fit: contain; }
.chart { height: 48px; }
.ninjaLink { color: var(--w-ninja); }
.ninjaLink:hover { text-decoration: underline; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  min-height: calc(24px * var(--w-text-scale, 1));
  padding: 0 6px;
  border: 1px solid var(--w-line-soft);
  border-radius: var(--w-radius-sm);
  font-size: calc(12px * var(--w-text-scale, 1));
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  &:hover { border-color: var(--w-line); background: var(--w-panel-3); }
}
.chipValue { font-size: calc(13px * var(--w-text-scale, 1)); font-weight: 600; color: var(--w-fg); }
.chipCoin { width: calc(14px * var(--w-text-scale, 1)); height: calc(14px * var(--w-text-scale, 1)); object-fit: contain; }
.chev { font-size: calc(9px * var(--w-text-scale, 1)); color: var(--w-dim); }
</style>
