<template>
  <!-- The Loot tab (Guy's pick A, 2026-11-27): a rail of loot classes on the
       left, the picked class on the right. Every class shares the one switch
       (Jewels: cluster jewels also have their own price switch). -->
  <div :class="$style.outer" data-loot-tab>
  <!-- All loot (Guy's H1): above the page list and the page, so it reads as
       the one every page follows. The priced page puts its card here. -->
  <div :class="$style.allTop" data-loot-all-top />
  <div :class="$style.wrap">
    <!-- One list for everything that drops (Guy's layout A, 2026-11-28):
         Your rules first, since they win over everything below. -->
    <nav :class="$style.rail" class="w-scroll" aria-label="Loot classes" data-no-item-tip="loot class names, not items">
      <template v-for="g in GROUPS" :key="g.id">
        <div v-if="g.name" :class="$style.group">{{ g.name }}</div>
        <button v-for="k in g.rows" :key="k.id" type="button" :class="$style.cls" :aria-pressed="k.id === sel" :data-loot-class="k.id" :data-goto-spot="SPOT[k.id]" @click="sel = k.id">
          <WIcon v-if="k.art" :item="k.art" :ns="k.ns" :title="k.name" :fallback="k.fa" />
          <i v-else :class="[k.fa, $style.fa]" aria-hidden="true" />
          <span :class="$style.name">{{ k.name }}</span>
          <span :class="$style.state">{{ stateOf(k.id) }}</span>
        </button>
      </template>
    </nav>
    <OwnRulesPage v-if="sel === 'own'" :store="store" :config="config" :class="$style.main" />
    <CurrencyTab v-else-if="PRICED.has(sel)" :key="sel" :kind="lootKind" :store="store" :config="config" :focus-item="focusItem" top-to="[data-loot-all-top]" :class="$style.main">
      <template v-if="sel === 'maps'" #extra><MapsTab :config="config" /></template>
      <template v-if="sel === 'jewels'" #after><JewelsTab :store="store" :config="config" @open-rule="r => emit('open-rule', r)" @open-unique="openUnique" /></template>
    </CurrencyTab>
    <RecipesTab v-else-if="sel === 'recipes'" :store="store" :config="config" :class="$style.main">
      <PresetsTab :store="store" :config="config" :only="RECIPE_PRESETS" />
    </RecipesTab>
    <LevellingTab v-else-if="sel === 'levelling'" :config="config" :store="store" :class="$style.main">
      <PresetsTab :store="store" :config="config" :only="LEVELLING_PRESETS" />
    </LevellingTab>
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
import PresetsTab from './PresetsTab.vue'
import OwnRulesPage from './OwnRulesPage.vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import type { LootKind } from './currency-weights'
import type { Presets } from './presets'
import { lootFocus } from './loot-focus'
import { migrateLootPresets } from './loot-presets'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
  // Where to open: a rule's tier ("cat:<category>:<item>" from Alt+F, the map
  // floor, a league section, a priced class's own rule), or "own".
  focus?: string | null
}>()
const emit = defineEmits<{
  (e: 'open-rule', r: { type: string, tier: string }): void
}>()

// The classes, in the order Guy picked (round 1 and 2 mockups), each with an
// item's art that stands for it (Guy 2026-11-28: "this needs icons").
type Ns = 'ITEM' | 'UNIQUE' | 'GEM' | 'DIVINATION_CARD'
interface Row { id: string, name: string, art?: string, ns?: Ns, fa: string }
const GROUPS = [
  { id: 'own', name: '', rows: [{ id: 'own', name: 'Your rules', fa: 'fas fa-sliders-h' }] },
  {
    id: 'drops',
    name: 'Currency & drops',
    rows: [
      { id: 'currency', name: 'Currency', art: 'Chaos Orb', ns: 'ITEM', fa: 'fas fa-coins' },
      { id: 'gold', name: 'Gold', art: 'Gold', ns: 'ITEM', fa: 'fas fa-coins' },
      { id: 'fragments', name: 'Fragments', art: 'Fragment of the Phoenix', ns: 'ITEM', fa: 'fas fa-puzzle-piece' },
      { id: 'cards', name: 'Divination cards', art: 'The Doctor', ns: 'DIVINATION_CARD', fa: 'fas fa-clone' },
      { id: 'league', name: 'League items', art: 'Expedition Logbook', ns: 'ITEM', fa: 'fas fa-book' }
    ]
  },
  {
    id: 'named',
    name: 'Uniques, gems, maps',
    rows: [
      { id: 'uniques', name: 'Uniques', art: 'Headhunter', ns: 'UNIQUE', fa: 'fas fa-gem' },
      { id: 'gems', name: 'Gems', art: 'Enlighten Support', ns: 'GEM', fa: 'fas fa-gem' },
      { id: 'maps', name: 'Maps', art: 'Map', ns: 'ITEM', fa: 'fas fa-map' },
      { id: 'jewels', name: 'Jewels', art: 'Large Cluster Jewel', ns: 'ITEM', fa: 'fas fa-circle' }
    ]
  },
  {
    id: 'other',
    name: 'Other',
    rows: [
      { id: 'flasks', name: 'Life and mana flasks', art: 'Divine Life Flask', ns: 'ITEM', fa: 'fas fa-flask' },
      { id: 'recipes', name: 'Recipes', art: 'Chromatic Orb', ns: 'ITEM', fa: 'fas fa-flask' },
      { id: 'levelling', name: 'Levelling & build', art: 'Scroll of Wisdom', ns: 'ITEM', fa: 'fas fa-seedling' }
    ]
  }
] as const satisfies ReadonlyArray<{ id: string, name: string, rows: readonly Row[] }>
type ClassId = (typeof GROUPS)[number]['rows'][number]['id']

// Classes prices decide already: one engine and one switch for both.
const PRICED = new Set<ClassId>(['currency', 'gold', 'fragments', 'cards', 'uniques', 'gems', 'maps', 'jewels', 'league', 'flasks'])
const SPOT: Partial<Record<ClassId, string>> = { gold: 'loot-gold', levelling: 'loot-levelling', flasks: 'loot-flasks' }
// Presets that still mean something, on the page they belong to.
const RECIPE_PRESETS: ReadonlyArray<keyof Presets> = ['chaosRecipe']
const LEVELLING_PRESETS: ReadonlyArray<keyof Presets> = ['msBoots']

function stateOf (id: ClassId): string {
  if (id === 'own') return props.config.rules.length ? String(props.config.rules.length) : ''
  if (id === 'recipes' || id === 'levelling') return ''
  return (props.config.presets.currency.on || (id === 'jewels' && props.config.presets.clusterPrices.on)) ? 'On' : 'Off'
}

const sel = ref<ClassId>('currency')
const focusItem = ref<string | null>(null)
watch(() => props.focus, f => {
  if (!f) return
  if (f === 'own') { sel.value = 'own'; focusItem.value = null; return }
  const at = lootFocus(f)
  // Special gear lives on the Gear tab.
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
  overflow-y: auto;
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
.group { padding: 8px 7px 2px; font-size: var(--w-fs-xs); color: var(--w-faint); text-transform: uppercase; letter-spacing: 0.06em; }
.fa { width: 18px; text-align: center; color: var(--w-dim); flex: none; }
.name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.state { font-size: var(--w-fs-xs); color: var(--w-dim); }
.main { flex: 1 1 auto; min-width: 0; }
</style>
