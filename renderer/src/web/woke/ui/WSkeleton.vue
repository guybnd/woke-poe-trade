<template>
  <div aria-busy="true" aria-label="Loading">
    <div v-for="i in rows" :key="i" class="w-row" :class="$style.row">
      <span :class="$style.bar" :style="{ width: `${widths[(i - 1) % widths.length]}%` }" />
      <span v-if="value" :class="[$style.bar, $style.value]" :style="{ width: `${10 + ((i * 7) % 9)}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Grey rows in the final layout while data loads for the first time (pick L2),
// so nothing jumps when it lands (P12). Refreshes keep the old rows instead and
// set WPanel's `busy`.
withDefaults(defineProps<{ rows?: number, value?: boolean }>(), { rows: 4, value: true })
const widths = [58, 44, 51, 36, 62, 47]
</script>

<style module>
.row { display: flex; }
.row:hover { background: none; }
.bar {
  height: 10px; border-radius: var(--w-r-sm);
  background: linear-gradient(90deg, var(--w-panel-2), var(--w-panel-3), var(--w-panel-2));
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}
.value { margin-left: auto; }
@keyframes shimmer { to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .bar { animation: none; } }
</style>
