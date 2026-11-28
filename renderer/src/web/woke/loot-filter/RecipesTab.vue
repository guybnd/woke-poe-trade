<template>
  <!-- Vendor recipes on the Loot tab (Guy's pick A, 2026-11-28): one row per
       recipe, Off or the step its items show at in maps. -->
  <div :class="$style.wrap" class="w-scroll" data-loot-recipes>
    <div :class="$style.top">
      <WToggle v-model="c.on">Prices decide endgame loot</WToggle>
      <span :class="$style.beta">Beta</span>
      <WInfo text="Items worth vendoring for currency, in maps (area level 68+). Each shows at the step you pick, above the Loot and Equipment rules, or Off: left to them and NeverSink. R-G-B Off also stops NeverSink's chromatic rules in maps. While levelling the presets (6 sockets, vendor quality) still decide. The same switch as the other priced classes." />
    </div>
    <div v-for="r in rows" :key="r.id" :class="$style.row" :data-loot-recipe="r.id">
      <WIcon :item="r.art" size="sm" />
      <span :class="$style.name">{{ r.name }}</span>
      <span :class="$style.gives" class="w-dim text-xs">→ <span v-item-tip="{ name: r.art }">{{ r.gives }}</span></span>
      <span class="grow" />
      <LabelPreview v-if="r.step" :text="r.name" :actions="[]" :style-override="currencyFullLook(r.step, 'other', c)" visibility="Show" :extras="false" :scale="0.7" data-no-item-tip="a recipe's sample label, not an item" />
      <WSegmented :model-value="String(r.step)" :options="STEPS" role="group" :aria-label="`${r.name}: Off or the step it shows at`" @update:model-value="v => setRecipeStep(c, r.id, Number(v) as CStep)" />
    </div>
    <p class="text-sm w-dim">{{ note }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WIcon, WInfo, WSegmented, WToggle, vItemTip } from '../ui'
import LabelPreview from './LabelPreview.vue'
import { CSTEP_NAMES, RECIPES, currencyFullLook, recipeStep, setRecipeStep } from './currency-weights'
import type { CStep } from './currency-weights'
import type { LootFilterWidget } from './widget'

const props = defineProps<{ config: LootFilterWidget }>()
const c = computed(() => props.config.presets.currency)
const STEPS = [0, 1, 2, 3, 4].map(s => ({ value: String(s), label: s ? CSTEP_NAMES[s] : 'Off' }))
const rows = computed(() => RECIPES.map(r => ({ ...r, step: recipeStep(c.value, r.id) })))
const note = computed(() => {
  if (!c.value.on) return 'Off: presets and NeverSink decide recipe items.'
  const on = rows.value.filter(r => r.step).length
  return `${on} of ${rows.value.length} recipes show in maps.`
})
</script>

<style module>
.wrap { flex: 1 1 auto; min-width: 0; padding: 10px var(--w-pad); display: flex; flex-direction: column; gap: 6px; }
.top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
.beta { font-size: var(--w-fs-xs); color: var(--w-dim); border: 1px solid var(--w-line); border-radius: var(--w-r-sm); padding: 0 4px; }
.row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 4px 10px; border: 1px solid var(--w-line); border-radius: var(--w-r-sm); background: var(--w-panel-2); }
.name { color: #e2d3ad; font-size: var(--w-fs-sm); min-width: 9em; }
.gives { min-width: 10em; }
</style>
