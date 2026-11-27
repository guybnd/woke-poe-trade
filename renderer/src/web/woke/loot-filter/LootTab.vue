<template>
  <!-- The Loot tab (Guy's pick A, 2026-11-27): a rail of loot classes on the
       left, the picked class on the right. Currency and Fragments are the classes that
       prices decide; the others stay NeverSink's until they are built. -->
  <div :class="$style.wrap" data-loot-tab>
    <nav :class="$style.rail" aria-label="Loot classes">
      <button v-for="k in LOOT_CLASSES" :key="k.id" type="button" :class="$style.cls" :aria-pressed="k.id === sel" :data-loot-class="k.id" @click="sel = k.id">
        <span :class="$style.sw" :style="{ background: `rgb(${k.rgb.join(',')})` }" aria-hidden="true" />
        <span :class="$style.name">{{ k.name }}</span>
        <span v-if="PRICED.has(k.id)" :class="$style.state">{{ config.presets.currency.on ? 'On' : 'Off' }}</span>
        <span v-else :class="$style.ns">NeverSink</span>
      </button>
    </nav>
    <CurrencyTab v-if="PRICED.has(sel)" :key="sel" :kind="sel === 'fragments' || sel === 'cards' || sel === 'uniques' ? sel : 'currency'" :store="store" :config="config" :class="$style.main" />
    <div v-else :class="$style.later" data-loot-later>
      <b :class="$style.title">{{ cls.name }}</b>
      <p class="text-sm w-dim">NeverSink decides {{ cls.name.toLowerCase() }} for now. Prices will decide them here too, class by class.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CurrencyTab from './CurrencyTab.vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'

defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
}>()

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
  { id: 'league', name: 'League items', rgb: [220, 170, 120] }
] as const
type ClassId = (typeof LOOT_CLASSES)[number]['id']

// Classes prices decide already: one engine and one switch for both.
const PRICED = new Set<ClassId>(['currency', 'fragments', 'cards', 'uniques'])
const sel = ref<ClassId>('currency')
const cls = computed(() => LOOT_CLASSES.find(k => k.id === sel.value)!)
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
.ns { font-size: var(--w-fs-xs); color: var(--w-faint); border: 1px solid var(--w-line); border-radius: var(--w-r-sm); padding: 0 4px; }
.main { flex: 1 1 auto; min-width: 0; }
.later { flex: 1 1 auto; padding: 10px var(--w-pad); display: flex; flex-direction: column; gap: 6px; }
.title { font-family: var(--w-font-display, inherit); font-weight: normal; color: var(--w-accent, #c8a565); }
</style>
