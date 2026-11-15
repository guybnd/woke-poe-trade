<template>
  <span :class="[$style.price, bulkN != null ? $style.bulk : undefined]" class="w-num">
    <template v-if="chaos == null"><span class="w-faint">—</span></template>
    <template v-else-if="bulkN != null">
      1<img src="/images/divine.png" :class="$style.coin" alt="div"><span :class="$style.per">/</span>{{ bulkText }}
    </template>
    <template v-else>
      {{ text }}<img :src="useDivine ? '/images/divine.png' : '/images/chaos.png'" :class="$style.coin" :alt="useDivine ? 'div' : 'c'">
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { bulkPerDivine, formatAmount } from './format'

// Shows a chaos value, switching to divines when it is worth at least one.
// Pass unit to force one, e.g. so "then" and "now" in a row use the same unit.
// Pass bulk on a one-item price: under 1c it reads "1 div / 12,000" (how many
// a divine buys). The item tooltip still gives the chaos price. Leave it off
// for totals and profits, where "1 div / N" would read as nonsense, and for
// a range unless both ends are under 1c.
const props = withDefaults(defineProps<{
  chaos: number | null | undefined
  divine?: number | null
  unit?: 'auto' | 'chaos' | 'div'
  bulk?: boolean
}>(), { divine: null, unit: 'auto', bulk: false })

const useDivine = computed(() => {
  if (!props.divine || props.chaos == null || props.unit === 'chaos') return false
  return props.unit === 'div' || Math.abs(props.chaos) >= props.divine
})
const text = computed(() => {
  if (props.chaos == null) return ''
  return formatAmount(useDivine.value ? props.chaos / props.divine! : props.chaos)
})
const bulkN = computed(() => props.bulk && props.unit === 'auto' ? bulkPerDivine(props.chaos, props.divine) : null)
const bulkText = computed(() => bulkN.value?.toLocaleString('en-US') ?? '')
</script>

<style module>
.price { display: inline-flex; align-items: center; justify-content: flex-end; gap: 3px; }
.coin { width: 16px; height: 16px; object-fit: contain; flex: none; }
.bulk { gap: 2px; }
.per { opacity: 0.6; }
</style>
