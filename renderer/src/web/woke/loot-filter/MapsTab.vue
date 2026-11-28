<template>
  <!-- Maps on the Loot tab (Guy's Maps A, 2026-11-27): one slider for normal
       maps; special maps stay NeverSink's. -->
  <div :class="$style.wrap" class="w-scroll" data-loot-maps>
    <div :class="$style.top">
      <WToggle v-model="c.on">Prices decide endgame loot</WToggle>
      <span :class="$style.beta">Beta</span>
      <WInfo text="Normal maps are almost all worth under a chaos, so they show by tier instead of price: maps under the tier you pick hide. Special maps still show the way NeverSink shows them: unique, blighted, blight-ravaged, Valdo, Originator, influenced, 8-mod and corrupted-implicit maps. The same switch as the other priced classes." />
    </div>
    <div :class="$style.bar" data-loot-map-from>
      <span :class="$style.lab">Show maps from</span>
      <input type="range" min="1" max="17" step="1" :value="drag ?? c.mapFrom" :class="$style.range" aria-label="Show maps from tier"
        @input="drag = Number(($event.target as HTMLInputElement).value)"
        @change="c.mapFrom = Number(($event.target as HTMLInputElement).value); drag = null">
      <b :class="$style.val">{{ (drag ?? c.mapFrom) <= 1 ? 'every tier' : (drag ?? c.mapFrom) > 16 ? 'none (special maps only)' : `tier ${drag ?? c.mapFrom}` }}</b>
    </div>
    <div :class="$style.tiers" aria-hidden="true">
      <span v-for="t in 16" :key="t" :class="[$style.tier, { [$style.off]: t < (drag ?? c.mapFrom) }]">{{ t }}</span>
    </div>
    <p class="text-sm w-dim">{{ note }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { WInfo, WToggle } from '../ui'
import type { LootFilterWidget } from './widget'

const props = defineProps<{ config: LootFilterWidget }>()
const c = computed(() => props.config.presets.currency)
const drag = ref<number | null>(null)
const note = computed(() => {
  const from = drag.value ?? c.value.mapFrom
  if (!c.value.on) return 'Off: NeverSink decides maps.'
  if (from <= 1) return 'Every map shows, as NeverSink shows it.'
  // Past 16 (Guy 2026-11-28): every normal map hides.
  if (from > 16) return 'Every normal map hides. Special maps still show.'
  return `Normal maps under tier ${from} hide. Special maps still show.`
})
</script>

<style module>
.wrap { flex: 1 1 auto; min-width: 0; padding: 10px var(--w-pad); display: flex; flex-direction: column; gap: 10px; }
.top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.beta { font-size: var(--w-fs-xs); color: var(--w-dim); border: 1px solid var(--w-line); border-radius: var(--w-r-sm); padding: 0 5px; }
.bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 6px 10px; border: 1px solid var(--w-line); border-radius: var(--w-r-sm); background: var(--w-panel-2); }
.lab { color: #e2d3ad; font-size: var(--w-fs-sm); }
.range { width: min(22rem, 100%); accent-color: var(--w-accent, #c8a565); }
.val { font-size: var(--w-fs-sm); color: var(--w-accent, #c8a565); min-width: 5em; }
.tiers { display: flex; gap: 3px; flex-wrap: wrap; }
.tier { width: 26px; text-align: center; padding: 2px 0; border: 1px solid #c8c8c8; background: #141414; color: #ebebeb; font-size: var(--w-fs-xs); }
.off { opacity: 0.35; text-decoration: line-through; }
</style>
