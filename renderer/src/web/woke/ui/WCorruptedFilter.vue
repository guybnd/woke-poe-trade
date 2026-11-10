<template>
  <button type="button" :class="['w-skin-chip', $style.btn, $style[modelValue], { on: modelValue === 'only', 'w-chip--corrupt': modelValue === 'only' }]" :title="TITLES[modelValue]"
    :aria-label="TITLES[modelValue]" @click="emit('update:modelValue', NEXT[modelValue])">
    <WIcon item="Vaal Orb" size="sm" title="" />
    <span v-if="modelValue === 'only'" :class="$style.label">Only</span>
    <span v-else-if="modelValue === 'hide'" :class="$style.label">Hidden</span>
  </button>
</template>

<script setup lang="ts">
// The Vaal orb button: every click moves on to the next of all, only corrupted,
// and no corrupted.
import type { CorruptedFilter } from '../market/types'
import WIcon from './WIcon.vue'

withDefaults(defineProps<{ modelValue?: CorruptedFilter }>(), { modelValue: 'any' })
const emit = defineEmits<{ (e: 'update:modelValue', v: CorruptedFilter): void }>()

const NEXT: Record<CorruptedFilter, CorruptedFilter> = { any: 'only', only: 'hide', hide: 'any' }
const TITLES: Record<CorruptedFilter, string> = {
  any: 'Corrupted gems are shown. Click to show only them.',
  only: 'Only corrupted gems. Click to hide them.',
  hide: 'Corrupted gems are hidden. Click to show everything.'
}
</script>

<style module>
/* The plain look; the game look reskins .w-skin-chip (ui/controls.css). */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: calc(26px * var(--w-text-scale, 1));
  min-width: 28px;
  justify-content: center;
  padding: 0 6px;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line);
  color: var(--w-dim);
  font-size: var(--w-fs-sm);
  white-space: nowrap;
}
.btn:hover { background: var(--w-panel-3); color: var(--w-fg); }
.only { border-color: var(--w-corrupt); color: var(--w-corrupt); background: color-mix(in srgb, var(--w-corrupt) 14%, transparent); }
.hide img { opacity: 0.45; filter: grayscale(1); }
.label { line-height: 1; }
</style>
