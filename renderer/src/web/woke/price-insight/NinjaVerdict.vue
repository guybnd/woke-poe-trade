<template>
  <!-- The verdict for an exchange item before any search: poe.ninja's cached price (ninja-first.ts). -->
  <div v-if="info" :class="$style.card" data-testid="ninja-verdict">
    <div :class="$style.eyebrow">
      <span :class="$style.badge" title="poe.ninja's price from the exchange, cached in the app. No trade search was used.">POE.NINJA</span>
      <span>Cached price<template v-if="age">, updated {{ age }}</template></span>
      <span class="flex-1" />
      <template v-if="weekChange != null">
        <w-spark :values="spark" :width="32" :height="14" />
        <span :class="weekChange >= 0 ? 'w-up' : 'w-down'">{{ weekChange >= 0 ? '▲' : '▼' }}{{ Math.abs(weekChange) }}% 7d</span>
      </template>
    </div>
    <div :class="$style.value">
      <span :class="$style.headline">{{ each }}</span>
      <span :class="$style.each">each<template v-if="stack"> · {{ stack }} for your {{ have }}</template></span>
    </div>
    <div :class="$style.row">
      <button type="button" class="btn w-pc-primary" :class="$style.live" data-testid="ninja-verdict-live" @click="search">
        Check live offers<w-kbd v-if="poeOn" keys="Enter" class="ml-2" />
      </button>
      <span class="w-dim">uses one exchange search</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ParsedItem } from '@/parser'
import type { ItemFilters } from '@/web/price-check/filters/interfaces'
import { usePoeninja, displayRounding } from '@/web/background/Prices'
import { WSpark, WKbd, agoPhrase } from '../ui'
import { exactDetailsId } from '@/web/price-check/trends/getDetailsId'
import { poeOn } from './window-style'

const props = defineProps<{
  item: ParsedItem
  filters: ItemFilters
}>()

const { findPriceByQuery, autoCurrency, updatedAt } = usePoeninja()
const search = inject<() => void>('price-check-search', () => {})

const info = computed(() => {
  const q = exactDetailsId(props.item)
  const row = q ? findPriceByQuery(q) : null
  return row && row.chaos > 0 ? row : null
})

function amount (chaos: number): string {
  // A Divine Orb is priced in chaos, or it would read "1 div".
  const p = props.item.info.refName === 'Divine Orb'
    ? { min: chaos, currency: 'chaos' as const }
    : autoCurrency(chaos)
  return `${displayRounding(p.min)}${p.currency === 'div' ? ' div' : 'c'}`
}

const have = computed(() => props.filters.stackSize?.value ?? 1)
const each = computed(() => info.value ? amount(info.value.chaos) : '')
const stack = computed(() => info.value && have.value > 1 ? amount(info.value.chaos * have.value) : null)
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
