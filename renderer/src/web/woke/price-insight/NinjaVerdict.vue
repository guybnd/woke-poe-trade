<template>
  <!-- The verdict for an exchange item before any search: poe.ninja's cached price (ninja-first.ts). -->
  <div v-if="info" :class="$style.card" data-testid="ninja-verdict">
    <div :class="$style.eyebrow">
      <span :class="$style.badge" :title="poeOn ? 'This is used to provide instant pricing without any delay. For live data, press:' : 'This is used to provide instant pricing without any delay. For live data, click Check live offers.'" :data-tip-keys="poeOn ? 'Enter' : null">POE.NINJA</span>
      <span>Cached price<template v-if="age">, updated {{ age }}</template></span>
      <span class="flex-1" />
      <template v-if="weekChange != null">
        <w-spark :values="spark" :width="32" :height="14" />
        <span :class="weekChange >= 0 ? 'w-up' : 'w-down'">{{ weekChange >= 0 ? '▲' : '▼' }}{{ Math.abs(weekChange) }}% 7d</span>
      </template>
    </div>
    <div :class="$style.value">
      <span :class="$style.headline"><w-price-text :text="price?.main" /></span>
      <span :class="$style.each"><template v-if="price?.each">each</template><template v-if="stack">{{ price?.each ? ' · ' : '' }}<w-price-text :text="stack" /> for your {{ have }}</template><template v-if="price?.sub"> · <w-price-text :text="price.sub" /></template></span>
    </div>
    <div :class="$style.row">
      <button type="button" class="btn w-pc-primary" :class="$style.live" data-testid="ninja-verdict-live" @click="search">
        Check live offers<w-kbd v-if="poeOn" keys="Enter" class="ml-2" />
      </button>
      <span class="w-dim">uses one {{ api === 'bulk' ? 'exchange' : 'trade' }} search</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ParsedItem } from '@/parser'
import type { ItemFilters } from '@/web/price-check/filters/interfaces'
import { usePoeninja } from '@/web/background/Prices'
import { ninjaPrice, ninjaTotal } from './ninja-first'
import { WSpark, WKbd, WPriceText, agoPhrase } from '../ui'
import { exactDetailsId } from '@/web/price-check/trends/getDetailsId'
import { poeOn } from './window-style'

const props = defineProps<{
  item: ParsedItem
  filters: ItemFilters
  api?: 'trade' | 'bulk'
}>()

const { findPriceByQuery, xchgRate, updatedAt } = usePoeninja()
const search = inject<() => void>('price-check-search', () => {})

const info = computed(() => {
  const q = exactDetailsId(props.item)
  const row = q ? findPriceByQuery(q) : null
  return row && row.chaos > 0 ? row : null
})

const isDivine = computed(() => props.item.info.refName === 'Divine Orb')
const have = computed(() => props.filters.stackSize?.value ?? 1)
const price = computed(() => info.value ? ninjaPrice(info.value.chaos, xchgRate.value, isDivine.value) : null)
const stack = computed(() => info.value && have.value > 1 ? ninjaTotal(info.value.chaos * have.value, isDivine.value ? undefined : xchgRate.value) : null)
const age = computed(() => agoPhrase(updatedAt.value))
const spark = computed(() => (info.value?.graph ?? []).filter((p): p is number => p != null))
// poe.ninja's line is the % change since the first day, so its last point is the week's change.
const weekChange = computed(() => spark.value.length ? Math.round(spark.value[spark.value.length - 1]) : null)
</script>

<style module>
.card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 1rem;
  border-top: 1px solid var(--w-line-soft);
  border-bottom: 1px solid var(--w-line);
  background: var(--w-pc-well, var(--w-panel-solid));
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
  font-variant-numeric: tabular-nums;
}
.eyebrow { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; min-width: 0; color: var(--w-dim); font-size: var(--w-fs-sm); line-height: calc(16px * var(--w-text-scale, 1)); }
.badge {
  flex: none;
  font-size: var(--w-fs-xs);
  font-weight: 600;
  letter-spacing: .05em;
  line-height: calc(14px * var(--w-text-scale, 1));
  padding: 0 5px;
  border-radius: var(--w-r-sm);
  border: 1px solid currentColor;
  color: #7fb2e5;
}
.value { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; min-width: 0; }
.headline { font-family: var(--w-num); font-size: calc(28px * var(--w-text-scale, 1)); line-height: calc(32px * var(--w-text-scale, 1)); font-weight: 600; color: var(--w-accent); white-space: nowrap; }
.each { color: var(--w-dim); font-size: var(--w-fs-sm); }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; font-size: var(--w-fs-sm); }
.live { display: inline-flex; align-items: center; }
</style>
