<template>
  <!-- The Equipment tab (Guy's pick R, 2026-11-27): a rail like Loot's.
       Rare gear is Rare weights' score; flasks score on the same line. -->
  <div :class="$style.wrap" data-equip-tab>
    <nav :class="$style.rail" aria-label="Equipment classes">
      <button v-for="k in CLASSES" :key="k.id" type="button" :class="$style.cls" :aria-pressed="k.id === sel" :data-equip-class="k.id" :data-goto-spot="k.id === 'special' ? 'loot-special' : k.id === 'tinctures' ? 'equip-tinctures' : undefined" @click="sel = k.id">
        <span :class="$style.sw" :style="{ background: k.rgb }" aria-hidden="true" />
        <span :class="$style.name">{{ k.name }}</span>
        <span :class="$style.state">{{ k.id === 'ranks' ? movedText : (k.id === 'special' ? config.presets.currency.on : config.presets.weights.on) ? 'On' : 'Off' }}</span>
      </button>
    </nav>
    <WeightsTab v-if="sel === 'rares'" :store="store" :config="config" :class="$style.main" @open-ranks="sel = 'ranks'" />
    <GearTab v-else-if="sel === 'ranks'" :store="store" :config="config" view="ranks" :class="$style.main" data-equip-ranks @open-rule="r => emit('open-rule', r)" />
    <CurrencyTab v-else-if="sel === 'special'" kind="special" :store="store" :config="config" :focus-item="focusItem" :class="$style.main" data-equip-special />
    <FlasksTab v-else :key="sel" :config="config" :set="sel" :class="$style.main" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import WeightsTab from './WeightsTab.vue'
import GearTab from './GearTab.vue'
import FlasksTab from './FlasksTab.vue'
import CurrencyTab from './CurrencyTab.vue'
import { lootFocus } from './loot-focus'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'

const props = defineProps<{ store: LootFilterStore, config: LootFilterWidget, focus?: string | null }>()
const emit = defineEmits<{ 'open-rule': [r: { type: string, tier: string | null, base?: string }] }>()
// Base ranks (Guy's pick, 2026-11-28): one place to rank a base, here while
// Equipment shows; the Base ranks top tab otherwise.
const CLASSES = [
  { id: 'rares', name: 'Rare gear', rgb: '#ffff77' },
  { id: 'ranks', name: 'Base ranks', rgb: '#c8b48c' },
  { id: 'flasks', name: 'Flasks', rgb: '#8888ff' },
  { id: 'tinctures', name: 'Tinctures', rgb: '#96dc8c' },
  // Special gear (Guy's pick B, 2026-11-28): veiled, temple and league mods,
  // fractured, influenced... Its rules follow the Loot switch.
  { id: 'special', name: 'Special gear', rgb: '#6ee1a0' }
] as const
type ClassId = (typeof CLASSES)[number]['id']
// A flask rule (Alt+F on a flask) opens on Flasks; "ranks" on Base ranks; a
// Special gear row ("cat:sgveil:<row>") on Special gear, scrolled to the row.
const special = (f: string | null | undefined) => { const at = lootFocus(f); return at?.cls === 'special' ? at : null }
const pick = (f: string | null | undefined): ClassId => f === 'ranks' ? 'ranks' : f?.startsWith('flasktinc') ? 'tinctures' : f?.startsWith('flask') ? 'flasks' : special(f) ? 'special' : 'rares'
const sel = ref<ClassId>(pick(props.focus))
const focusItem = ref<string | null>(special(props.focus)?.item ?? null)
watch(() => props.focus, f => { if (f) { sel.value = pick(f); focusItem.value = special(f)?.item ?? null } })
const movedText = computed(() => { const n = Object.keys(props.config.presets.gear.moves).length; return n ? `${n} moved` : '' })
</script>

<style module>
.wrap { display: flex; flex: 1 1 auto; min-height: 0; }
.rail { flex: 0 0 11rem; display: flex; flex-direction: column; gap: 2px; padding: 6px; border-right: 1px solid var(--w-line); }
.cls { display: flex; align-items: center; gap: 7px; padding: 4px 7px; border: 1px solid transparent; border-radius: var(--w-r-sm); background: none; color: var(--w-text); font-size: var(--w-fs-sm); text-align: left; cursor: pointer; }
.cls:hover { background: var(--w-panel-2); }
.cls[aria-pressed='true'] { border-color: var(--w-accent); background: var(--w-panel-2); }
.cls:focus-visible { outline: 2px solid var(--w-accent); outline-offset: 1px; }
.sw { width: 9px; height: 9px; border-radius: 2px; flex: none; }
.name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.state { font-size: var(--w-fs-xs); color: var(--w-dim); }
.main { flex: 1 1 auto; min-width: 0; }
</style>
