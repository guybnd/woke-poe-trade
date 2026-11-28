<template>
  <!-- The Loot tab (Guy's pick A, 2026-11-27): a rail of loot classes on the
       left, the picked class on the right. Every class shares the one switch
       (Jewels: cluster jewels also have their own price switch). -->
  <div :class="$style.outer" data-loot-tab>
  <!-- All loot (Guy's H1): above the page list and the page, so it reads as
       the one every page follows. The priced page puts its card here. -->
  <div :class="$style.allTop" data-loot-all-top />
  <div :class="$style.wrap">
    <nav :class="$style.rail" aria-label="Loot classes" data-no-item-tip="loot class names, not items">
      <button v-for="k in LOOT_CLASSES" :key="k.id" type="button" :class="$style.cls" :aria-pressed="k.id === sel" :data-loot-class="k.id" :data-goto-spot="k.id === 'gold' ? 'loot-gold' : k.id === 'levelling' ? 'loot-levelling' : k.id === 'flasks' ? 'loot-flasks' : undefined" @click="sel = k.id">
        <WIcon :item="k.art" :ns="k.ns" :title="k.name" :fallback="k.fa" />
        <span :class="$style.name">{{ k.name }}</span>
        <span :class="$style.state">{{ (config.presets.currency.on || (k.id === 'jewels' && config.presets.clusterPrices.on)) ? 'On' : 'Off' }}</span>
      </button>
    </nav>
    <CurrencyTab v-if="PRICED.has(sel)" :key="sel" :kind="lootKind" :store="store" :config="config" :focus-item="focusItem" top-to="[data-loot-all-top]" :class="$style.main">
      <template v-if="sel === 'maps'" #extra><MapsTab :config="config" /></template>
      <template v-if="sel === 'jewels'" #after><JewelsTab :store="store" :config="config" @open-rule="r => emit('open-rule', r)" @open-unique="openUnique" /></template>
    </CurrencyTab>
    <RecipesTab v-else-if="sel === 'recipes'" :store="store" :config="config" :class="$style.main" />
    <LevellingTab v-else-if="sel === 'levelling'" :config="config" :store="store" :class="$style.main" />
  </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { WIcon } from '../ui'
import CurrencyTab from './CurrencyTab.vue'
import MapsTab from './MapsTab.vue'
import JewelsTab from './JewelsTab.vue'
import RecipesTab from './RecipesTab.vue'
import LevellingTab from './LevellingTab.vue'
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

// The classes, in the order Guy picked (round 1 and 2 mockups), each with an
// item's art that stands for it (Guy 2026-11-28: "this needs icons"). Gold
// has its own page next to Currency.
type Ns = 'ITEM' | 'UNIQUE' | 'GEM' | 'DIVINATION_CARD'
const LOOT_CLASSES = [
  { id: 'currency', name: 'Currency', art: 'Chaos Orb', ns: 'ITEM', fa: 'fas fa-coins' },
  { id: 'gold', name: 'Gold', art: 'Gold', ns: 'ITEM', fa: 'fas fa-coins' },
  { id: 'fragments', name: 'Fragments', art: 'Fragment of the Phoenix', ns: 'ITEM', fa: 'fas fa-puzzle-piece' },
  { id: 'cards', name: 'Divination cards', art: 'The Doctor', ns: 'DIVINATION_CARD', fa: 'fas fa-clone' },
  { id: 'uniques', name: 'Uniques', art: 'Headhunter', ns: 'UNIQUE', fa: 'fas fa-gem' },
  { id: 'gems', name: 'Gems', art: 'Enlighten Support', ns: 'GEM', fa: 'fas fa-gem' },
  { id: 'maps', name: 'Maps', art: 'Map', ns: 'ITEM', fa: 'fas fa-map' },
  { id: 'jewels', name: 'Jewels', art: 'Large Cluster Jewel', ns: 'ITEM', fa: 'fas fa-circle' },
  { id: 'league', name: 'League items', art: 'Expedition Logbook', ns: 'ITEM', fa: 'fas fa-book' },
  { id: 'flasks', name: 'Flasks and tinctures', art: 'Divine Life Flask', ns: 'ITEM', fa: 'fas fa-flask' },
  { id: 'recipes', name: 'Recipes', art: 'Chromatic Orb', ns: 'ITEM', fa: 'fas fa-flask' },
  { id: 'levelling', name: 'Levelling', art: 'Scroll of Wisdom', ns: 'ITEM', fa: 'fas fa-seedling' }
] as const satisfies ReadonlyArray<{ id: string, name: string, art: string, ns: Ns, fa: string }>
type ClassId = (typeof LOOT_CLASSES)[number]['id']

// Classes prices decide already: one engine and one switch for both.
const PRICED = new Set<ClassId>(['currency', 'gold', 'fragments', 'cards', 'uniques', 'gems', 'maps', 'jewels', 'league', 'flasks'])
const sel = ref<ClassId>('currency')
const focusItem = ref<string | null>(null)
watch(() => props.focus, f => {
  if (!f) return
  const at = lootFocus(f)
  // Special gear lives on the Equipment tab.
  if (!at || at.cls === 'special') return
  sel.value = at.cls
  focusItem.value = at.item
}, { immediate: true })
// A unique jewel opens on the Uniques page, which owns it (Guy's U1).
function openUnique (name: string) {
  sel.value = 'uniques'
  focusItem.value = name
}
// The presets the Loot tab covers carry over the first time it's on.
watch(() => props.config.presets.currency.on, () => migrateLootPresets(props.config.presets), { immediate: true })
// The priced classes' ids are the engine's kinds.
const lootKind = computed(() => sel.value as LootKind)
</script>

<style module>
.outer { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.allTop { flex: none; padding: 6px 6px 0; }
.allTop:empty { display: none; }
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
.name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.state { font-size: var(--w-fs-xs); color: var(--w-dim); }
.main { flex: 1 1 auto; min-width: 0; }
</style>
