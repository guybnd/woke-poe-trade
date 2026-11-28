<template>
  <!-- Vendor recipes on the Loot tab (Guy's pick A, 2026-11-28): one row per
       recipe, Off or the step its items show at in maps. By price (the
       default) follows what the vendor gives; a step picked by hand wins. -->
  <div :class="$style.wrap" class="w-scroll" data-loot-recipes>
    <div :class="$style.top">
      <WToggle v-model="c.on">Prices decide endgame loot</WToggle>
      <span :class="$style.beta">Beta</span>
      <WInfo :text="INFO" />
    </div>
    <div v-for="(r, i) in rows" :key="r.id" :class="$style.row" :data-loot-recipe="r.id" :data-goto-spot="i === 0 ? 'recipes-by-price' : undefined">
      <WIcon :item="r.art" size="sm" />
      <span :class="$style.name">{{ r.name }}</span>
      <span :class="$style.gives" class="w-dim text-xs">→ <span v-item-tip="{ name: r.art }">{{ r.gives }}</span><span v-if="r.worth != null" data-recipe-worth> · {{ chaosText(r.worth) }}</span></span>
      <span class="grow" />
      <LabelPreview v-if="r.step" :text="r.name" :actions="[]" :style-override="currencyFullLook(r.step, 'other', c)" visibility="Show" :extras="false" :scale="0.7" data-no-item-tip="a recipe's sample label, not an item" />
      <WChip clickable :active="r.picked == null" :aria-pressed="r.picked == null" :class="$style.auto" :title="r.worth == null ? 'By price: waiting for prices' : 'By price: the step its reward\'s price reaches. Pick a step to set it by hand.'" data-recipe-auto @click="setRecipeStep(c, r.id, null)">By price</WChip>
      <WSegmented :model-value="String(r.step)" :options="STEPS" role="group" :aria-label="`${r.name}: Off or the step it shows at`" @update:model-value="v => setRecipeStep(c, r.id, Number(v) as CStep)" />
    </div>
    <p class="text-sm w-dim">{{ note }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WChip, WIcon, WInfo, WSegmented, WToggle, vItemTip } from '../ui'
import LabelPreview from './LabelPreview.vue'
import { CSTEP_NAMES, RECIPES, currencyFullLook, recipePicked, recipeStep, recipeWorth, scaled, setRecipeStep } from './currency-weights'
import type { CStep } from './currency-weights'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'

const props = defineProps<{ store: LootFilterStore, config: LootFilterWidget }>()
const c = computed(() => props.config.presets.currency)
const INFO = `Items worth vendoring for currency, shown in maps (area level 68+).
- By price: the step the reward's price reaches, like that currency's own.
- Pick a step to set it by hand. Off leaves the item to NeverSink.
- R-G-B Off also stops NeverSink's chromatic rules in maps.
- Equipment and NeverSink's valuable rules come first, so a recipe never makes a better item quieter.
- While levelling, the presets (6 sockets, vendor quality) still decide.`
const STEPS = [0, 1, 2, 3, 4].map(s => ({ value: String(s), label: s ? CSTEP_NAMES[s] : 'Off' }))
const lookup = computed(() => props.store.prices.lootLookup.value)
const eff = computed(() => scaled(c.value, props.store.doc.value?.strictness ?? null))
const rows = computed(() => RECIPES.map(r => ({ ...r, picked: recipePicked(c.value, r.id), worth: recipeWorth(lookup.value, r.id, c.value.items), step: recipeStep(eff.value, r.id, lookup.value) })))
function chaosText (v: number): string {
  if (v >= 10) return `${Math.round(v)}c`
  if (v >= 1) return `${Number(v.toFixed(1))}c`
  return `${Number(v.toPrecision(2))}c`
}
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
.auto { font-size: var(--w-fs-xs); }
</style>
