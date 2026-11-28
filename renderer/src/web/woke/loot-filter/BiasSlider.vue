<template>
  <!-- A Price bias (Guy 2026-11-28): 20% to 300% of the price, the slider in
       5% steps (applied on release), the box for an exact %. 100% is none. -->
  <span :class="$style.wrap">
    <input type="range" :min="BIAS_MIN" :max="BIAS_MAX" step="5" :value="drag ?? modelValue" :disabled="disabled" :class="$style.range" :aria-label="label"
      data-bias-range
      @input="drag = Number(($event.target as HTMLInputElement).value); emit('drag', drag)"
      @change="commit(Number(($event.target as HTMLInputElement).value))">
    <input type="number" :min="BIAS_MIN" :max="BIAS_MAX" step="1" :value="drag ?? modelValue" :disabled="disabled" :class="$style.num" :aria-label="`${label}, exact %`"
      data-bias-num @change="commit(Number(($event.target as HTMLInputElement).value))">
    <span :class="$style.pc">%</span>
    <button v-if="modelValue !== 100" type="button" class="w-icon-btn" :disabled="disabled" :title="`${label} back to none (100%)`" :aria-label="`${label} back to none`" @click="commit(100)"><i class="fas fa-undo" /></button>
  </span>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BIAS_MAX, BIAS_MIN } from './currency-settings'

const props = defineProps<{ modelValue: number, label: string, disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [v: number], 'drag': [v: number | null] }>()
const drag = ref<number | null>(null)
function commit (v: number) {
  drag.value = null
  emit('drag', null)
  const n = Math.min(BIAS_MAX, Math.max(BIAS_MIN, Math.round(v) || 100))
  if (n !== props.modelValue) emit('update:modelValue', n)
}
</script>

<style module>
.wrap { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.range { flex: 1; min-width: 120px; accent-color: var(--w-accent); }
.num { width: 4.2em; background: var(--w-panel-2); color: var(--w-fg); border: 1px solid var(--w-line); border-radius: var(--w-r-sm); font-size: var(--w-fs-sm); padding: 1px 4px; font-variant-numeric: tabular-nums; }
.pc { color: var(--w-dim); font-size: var(--w-fs-sm); }
</style>
