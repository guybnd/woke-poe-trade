<template>
  <div :class="[$style.card, insight ? $style[insight.confidence] : undefined]">
    <template v-if="insight">
      <div :class="$style.eyebrow">
        <span :class="$style.badge" :title="CONFIDENCE_HINT[insight.confidence]">{{ CONFIDENCE_LABEL[insight.confidence] }}</span>
        <span>Asking around<template v-if="need > 1 && !insight.fewWithStock">, with stock for your {{ need }}</template></span>
        <span class="flex-1" />
        <span :class="$style.count">{{ insight.sellers }} {{ insight.sellers === 1 ? 'seller' : 'sellers' }}</span>
      </div>
      <div :class="$style.value">
        <span :class="$style.headline">{{ amount(insight.fair) }}</span>
        <span :class="$style.each">each<template v-if="need > 1 && !insight.fewWithStock"> · {{ amount(insight.fair * need) }} for {{ need }}</template><template v-if="insight.fewWithStock && need > 1"> · small stacks counted</template><WInfo v-if="insight.fewWithStock && need > 1" class="ml-1" :text="`Few of the cheapest offers have stock for ${need}, so smaller ones are counted too.`" /></span>
      </div>
      <div v-if="insight.floor > insight.low" :class="$style.note">An offer at {{ amount(insight.low) }} sits far under the rest, so it may be worth buying</div>
      <div v-if="insight.lowStock" :class="$style.note">{{ insight.lowStock }} {{ insight.lowStock === 1 ? 'offer' : 'offers' }} with under {{ need }} in stock left out</div>
      <div :class="$style.prices">
        <span><span class="w-dim">Sell fast</span> {{ amount(fast) }} each</span>
        <span v-if="amount(insight.fair) !== amount(fast)"><span class="w-dim">Patient</span> {{ amount(insight.fair) }} each</span>
      </div>
    </template>
    <div v-else :class="$style.eyebrow">
      <span :class="$style.badge">{{ loading ? '…' : 'NO DATA' }}</span>
      <span>{{ loading ? 'Reading offers…' : 'No offers that can be filled' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import WInfo from '../ui/WInfo.vue'
import { computed } from 'vue'
import type { Confidence } from './insight'
import { bulkAmount, BulkInsight } from './bulk-insight'

const props = defineProps<{
  insight: BulkInsight | null
  /** The currency of the offers: 'c' or 'div'. */
  unit: string
  need: number
  loading: boolean
}>()

const CONFIDENCE_LABEL: Record<Confidence, string> = { high: 'SOLID', medium: 'OK', low: 'THIN', none: 'NO DATA' }
const CONFIDENCE_HINT: Record<Confidence, string> = {
  high: 'Several sellers ask about the same',
  medium: 'A few sellers, a bit spread out',
  low: 'Few or widely spread sellers: treat the price as a rough guess',
  none: 'No usable offers'
}

function amount (value: number) {
  return `${bulkAmount(value)}${props.unit === 'c' ? 'c' : ' div'}`
}

// Just under the floor. Under 10 a cut of 3% isn't a price anyone types.
const fast = computed(() => {
  const floor = props.insight?.floor ?? 0
  return floor >= 10 ? floor * 0.97 : floor
})
</script>

<style module>
.card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0 -1rem 8px;
  padding: 10px 1rem;
  border-top: 1px solid var(--w-line-soft);
  border-bottom: 1px solid var(--w-line);
  background: var(--w-pc-well, var(--w-panel-solid));
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-text);
  font-variant-numeric: tabular-nums;
}
.eyebrow { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; min-width: 0; color: var(--w-dim); font-size: calc(12px * var(--w-text-scale, 1)); line-height: calc(16px * var(--w-text-scale, 1)); }
.count { color: var(--w-dim); font-size: var(--w-fs-xs); white-space: nowrap; }
.badge {
  flex: none;
  font-size: var(--w-fs-xs);
  font-weight: 600;
  letter-spacing: .05em;
  line-height: calc(14px * var(--w-text-scale, 1));
  padding: 0 5px;
  border-radius: 3px;
  border: 1px solid var(--w-line);
  color: var(--w-dim);
}
.high .badge { color: var(--w-up); border-color: currentColor; }
.medium .badge { color: var(--w-accent); border-color: currentColor; }
.low .badge { color: var(--w-warn); border-color: currentColor; }
.value { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.headline { font-family: var(--w-num); font-size: calc(28px * var(--w-text-scale, 1)); line-height: calc(32px * var(--w-text-scale, 1)); font-weight: 600; color: var(--w-accent); white-space: nowrap; }
.each { color: var(--w-dim); font-size: calc(12px * var(--w-text-scale, 1)); }
.note { color: var(--w-dim); font-size: calc(12px * var(--w-text-scale, 1)); line-height: calc(17px * var(--w-text-scale, 1)); }
.prices { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: calc(12px * var(--w-text-scale, 1)); }
</style>
