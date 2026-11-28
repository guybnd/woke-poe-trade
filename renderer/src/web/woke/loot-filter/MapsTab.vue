<template>
  <!-- Normal maps on the Loot tab (Guy's Maps A, 2026-11-27): one slider.
       Special maps (endgame, guardian, Originator, content mods, corrupted,
       blighted) have their own folds below it (2026-11-28). -->
  <div :class="$style.wrap" data-loot-maps>
    <div :class="$style.bar" data-loot-map-from>
      <span :class="$style.lab">Show normal maps from</span>
      <WInfo text="Normal maps show by tier, not price: most are worth under a chaos.
- Maps under the tier you pick hide. Past tier 16, only special maps show.
- **Endgame**, **Guardian and Citadel** and **Blighted** maps are priced by poe.ninja.
- **Originator**, **Content mods** and **Corrupted** have no price: they start from a guess (**est.**), and you set the step or price.
- A guess under the line never hides a map: NeverSink shows it as before.

Unique and Valdo maps stay with Uniques and NeverSink." />
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
import { WInfo } from '../ui'
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
.wrap { display: flex; flex-direction: column; gap: 6px; }
.bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 6px 10px; border: 1px solid var(--w-line); border-radius: var(--w-r-sm); background: var(--w-panel-2); }
.lab { color: #e2d3ad; font-size: var(--w-fs-sm); }
.range { width: min(22rem, 100%); accent-color: var(--w-accent, #c8a565); }
.val { font-size: var(--w-fs-sm); color: var(--w-accent, #c8a565); min-width: 5em; }
.tiers { display: flex; gap: 3px; flex-wrap: wrap; }
.tier { width: 26px; text-align: center; padding: 2px 0; border: 1px solid #c8c8c8; background: #141414; color: #ebebeb; font-size: var(--w-fs-xs); }
.off { opacity: 0.35; text-decoration: line-through; }
</style>
