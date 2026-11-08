<template>
  <svg v-if="values.length >= 2" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" :class="$style.chart"
    role="img" :aria-label="label">
    <line x1="0" :x2="width" :y1="zeroY" :y2="zeroY" stroke="var(--w-line-strong)" stroke-dasharray="3 3" />
    <polyline :points="points" fill="none" :stroke="last >= 0 ? 'var(--w-up)' : 'var(--w-down)'" stroke-width="1.5" stroke-linejoin="round" />
  </svg>
</template>

<script setup lang="ts">
// The running result after each deck: a dashed line at break-even.
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  values: number[]
  width?: number
  height?: number
  label?: string
}>(), { width: 280, height: 44, label: 'Running result' })

const PAD = 3
const range = computed(() => {
  const min = Math.min(0, ...props.values)
  const max = Math.max(0, ...props.values)
  return { min, span: (max - min) || 1 }
})
const y = (v: number) => props.height - PAD - (v - range.value.min) / range.value.span * (props.height - PAD * 2)
const zeroY = computed(() => y(0))
const points = computed(() => {
  const n = props.values.length
  return props.values.map((v, i) => `${(i * props.width / (n - 1)).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
})
const last = computed(() => props.values[props.values.length - 1] ?? 0)
</script>

<style module>
.chart { display: block; max-width: 100%; }
</style>
