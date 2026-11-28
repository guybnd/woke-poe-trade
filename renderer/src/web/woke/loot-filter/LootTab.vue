<template>
  <!-- The Loot tab (Guy's pick A, 2026-11-27): a rail of loot classes on the
       left, the picked class on the right. Every class shares the one switch
       (Jewels: the cluster price switch). -->
  <div :class="$style.wrap" data-loot-tab>
    <nav :class="$style.rail" aria-label="Loot classes">
      <button v-for="k in LOOT_CLASSES" :key="k.id" type="button" :class="$style.cls" :aria-pressed="k.id === sel" :data-loot-class="k.id" @click="sel = k.id">
        <span :class="$style.sw" :style="{ background: `rgb(${k.rgb.join(',')})` }" aria-hidden="true" />
        <span :class="$style.name">{{ k.name }}</span>
        <span :class="$style.state">{{ (k.id === 'jewels' ? config.presets.clusterPrices.on : config.presets.currency.on) ? 'On' : 'Off' }}</span>
      </button>
    </nav>
    <CurrencyTab v-if="PRICED.has(sel)" :key="sel" :kind="lootKind" :store="store" :config="config" :focus-item="focusItem" :class="$style.main">
      <template v-if="sel === 'maps'" #extra><MapsTab :config="config" /></template>
    </CurrencyTab>
    <LeagueTab v-else-if="sel === 'league'" :config="config" :class="$style.main" />
    <RecipesTab v-else-if="sel === 'recipes'" :config="config" :class="$style.main" />
    <JewelsTab v-else :store="store" :config="config" :class="$style.main" @open-rule="r => emit('open-rule', r)" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CurrencyTab from './CurrencyTab.vue'
import MapsTab from './MapsTab.vue'
import JewelsTab from './JewelsTab.vue'
import LeagueTab from './LeagueTab.vue'
import RecipesTab from './RecipesTab.vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import type { LootKind } from './currency-weights'
import { lootFocus } from './loot-focus'
import { migrateLootPresets } from './loot-presets'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
  // The tier of a rule to open on: "cat:<category>:<item>" (Alt+F), the map
  // floor, a league section, or a priced class's own rule.
  focus?: string | null
}>()
const emit = defineEmits<{ (e: 'open-rule', r: { type: string, tier: string }): void }>()

// The classes, in the order Guy picked (round 1 and 2 mockups). Colours are
// each class's family colour.
const LOOT_CLASSES = [
  { id: 'currency', name: 'Currency', rgb: [255, 190, 0] },
  { id: 'fragments', name: 'Fragments', rgb: [180, 120, 240] },
  { id: 'cards', name: 'Divination cards', rgb: [14, 186, 255] },
  { id: 'uniques', name: 'Uniques', rgb: [175, 96, 37] },
  { id: 'gems', name: 'Gems', rgb: [27, 200, 190] },
  { id: 'maps', name: 'Maps', rgb: [235, 235, 235] },
  { id: 'jewels', name: 'Jewels', rgb: [90, 200, 110] },
  { id: 'league', name: 'League items', rgb: [220, 170, 120] },
  { id: 'recipes', name: 'Recipes', rgb: [200, 200, 200] }
] as const
type ClassId = (typeof LOOT_CLASSES)[number]['id']

// Classes prices decide already: one engine and one switch for both.
const PRICED = new Set<ClassId>(['currency', 'fragments', 'cards', 'uniques', 'gems', 'maps'])
const sel = ref<ClassId>('currency')
const focusItem = ref<string | null>(null)
watch(() => props.focus, f => {
  if (!f) return
  const at = lootFocus(f)
  if (!at) return
  sel.value = at.cls
  focusItem.value = at.item
}, { immediate: true })
// The presets the Loot tab covers carry over the first time it's on.
watch(() => props.config.presets.currency.on, () => migrateLootPresets(props.config.presets), { immediate: true })
// The priced classes' ids are the engine's kinds.
const lootKind = computed(() => sel.value as LootKind)
</script>

<style module>
.wrap { display: flex; flex: 1 1 auto; min-height: 0; }
.rail {
  flex: 0 0 11rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  border-right: 1px solid var(--w-line);
}
.cls {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 7px;
  border: 1px solid transparent;
  border-radius: var(--w-r-sm);
  background: none;
  color: var(--w-text);
  font-size: var(--w-fs-sm);
  text-align: left;
  cursor: pointer;
}
.cls:hover { background: var(--w-panel-2); }
.cls[aria-pressed='true'] { border-color: var(--w-accent); background: var(--w-panel-2); }
.cls:focus-visible { outline: 2px solid var(--w-accent); outline-offset: 1px; }
.sw { width: 9px; height: 9px; border-radius: 2px; flex: none; }
.name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.state { font-size: var(--w-fs-xs); color: var(--w-dim); }
.main { flex: 1 1 auto; min-width: 0; }
</style>
