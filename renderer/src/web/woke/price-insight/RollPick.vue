<template>
  <div :class="[$style.pick, 'w-rollpick']">
    <button v-for="o in OPTIONS" :key="o.value" type="button"
      :class="{ [$style.on]: active === o.value }" :title="o.title" :aria-label="o.title" :aria-pressed="active === o.value"
      @click="choose(o.value)"><span :class="{ 'w-sym': o.value === 'current' }">{{ o.label }}</span></button>
  </div>
</template>

<script setup lang="ts">
// Low / Approx / High for one mod, under its min and max boxes. A pick runs the
// search, like the presets for all mods.
import { computed, inject } from 'vue'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { applyRollToFilter, activeRollOf, RollPreset } from './roll-presets'

const props = defineProps<{ filter: StatFilter }>()

const OPTIONS: Array<{ value: RollPreset, label: string, title: string }> = [
  { value: 'low', label: 'Low', title: 'Any roll of this range' },
  { value: 'current', label: '≈', title: 'A tight window around this roll' },
  { value: 'high', label: 'High', title: 'The best quarter of this range' }
]

const search = inject<() => void>('price-check-search', () => {})

const active = computed(() => activeRollOf(props.filter))

function choose (preset: RollPreset) {
  applyRollToFilter(props.filter, preset)
  search()
}
</script>

<style module>
.pick { display: flex; width: calc(2 * 3rem + 1px); border: 1px solid var(--w-line); border-radius: var(--w-r-sm); overflow: hidden; flex: none; font-family: var(--w-body); }
.pick button { flex: 1 1 0; font-size: var(--w-fs-xs); line-height: calc(16px * var(--w-text-scale, 1)); color: var(--w-dim); text-align: center; }
.pick button + button { border-left: 1px solid var(--w-line-soft); }
.pick button:hover { color: var(--w-fg); }
.pick button.on { background: var(--w-accent-soft); color: var(--w-accent); }
</style>
