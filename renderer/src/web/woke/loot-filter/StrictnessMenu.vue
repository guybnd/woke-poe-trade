<template>
  <span :class="$style.wrap" data-goto-spot="loot-strictness" data-loot-strictness>
    <WSelect v-if="levels" :model-value="String(ns.level)" :options="levelOptions" :class="$style.sel" aria-label="Strictness" @update:model-value="v => pick(Number(v))" />
    <span v-else class="w-faint text-xs" title="Strictness comes from the filter file you picked">{{ fileLevel }}</span>
    <button v-if="levels" type="button" :class="[$style.maps, { [$style.on]: auto.on }]" :aria-expanded="open" data-loot-strict-maps
      :title="auto.on ? 'Strictness follows your maps: click for the ladder' : 'Strictness stays put: click to follow your maps'" @click="open = !open">
      <i class="fas fa-sync-alt" /> Maps<span v-if="auto.on && auto.paused" :class="$style.paused">paused</span>
    </button>
  </span>
  <div v-if="open && levels" :class="$style.fold" data-loot-strict-ladder>
    <div class="flex items-center gap-2">
      <WToggle v-model="auto.on">Follow my last {{ RECENT_MAPS }} maps</WToggle>
      <WInfo :text="'Strictness changes by the area level of your last maps.\n- It switches only in town or your hideout, never mid-map, with Undo.\n- Press Reload now to use the new strictness.'" />
      <span class="flex-1" />
      <template v-if="auto.on && auto.paused">
        <span class="text-xs" style="color: var(--w-warn);">Paused after a manual change</span>
        <WButton size="sm" @click="store.resumeLadder()">Resume</WButton>
      </template>
    </div>
    <div :class="$style.ladder">
      <div v-for="(step, i) in sortedLadder" :key="i" :class="$style.step">
        <span class="w-dim text-xs">{{ stepLabel(auto.ladder, i) }}<span class="w-faint"> · area {{ step.from }}+</span></span>
        <WSelect :model-value="String(step.level)" :options="levelOptions" @update:model-value="v => step.level = Number(v)" />
      </div>
    </div>
    <div v-if="config.stricterHotkey || config.looserHotkey" class="flex items-center gap-2 text-xs w-dim">
      <span>Step in game:</span>
      <template v-if="config.looserHotkey"><WKbd :keys="config.looserHotkey" /><span>looser</span></template>
      <template v-if="config.stricterHotkey"><WKbd :keys="config.stricterHotkey" /><span>stricter</span></template>
    </div>
  </div>
</template>

<script setup lang="ts">
// Strictness on the Loot tab's Main ruler (NeverSink retirement M3, Guy's
// pick B, 2026-11-28): a menu in the ruler's header, and a Maps chip that
// folds out the follow-my-maps ladder.
import { computed, ref } from 'vue'
import { WButton, WInfo, WKbd, WSelect, WToggle, toast } from '../ui'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import { levelsOn } from './widget'
import { LEVEL_NAMES, RECENT_MAPS, stepLabel } from './strictness'
import { levelOf } from './currency-weights'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
}>()

const open = ref(false)
const ns = computed(() => props.config.neversink)
const levels = computed(() => levelsOn(props.config))
const auto = computed(() => props.config.strictAuto)
const sortedLadder = computed(() => [...auto.value.ladder].sort((a, b) => a.from - b.from))
const levelOptions = LEVEL_NAMES.map((name, i) => ({ value: String(i), label: name }))
const fileLevel = computed(() => LEVEL_NAMES[levelOf(props.store.doc.value?.strictness ?? null)])

async function pick (i: number) {
  if (i === ns.value.level) return
  const wasPaused = auto.value.paused
  if (auto.value.on) auto.value.paused = true
  const undo = await props.store.setLevel(i)
  if (undo) toast(`Loot filter: ${LEVEL_NAMES[i]}`, { undo: () => { auto.value.paused = wasPaused; undo() } })
}
</script>

<style module>
.wrap { display: inline-flex; align-items: center; gap: 6px; }
.sel { min-width: 8.5rem; }
.maps {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 1px 7px;
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  background: var(--w-panel-2);
  color: var(--w-dim);
  font-size: var(--w-fs-xs);
  cursor: pointer;
}
.maps:hover { color: var(--w-fg); border-color: var(--w-line-strong); }
.on { color: var(--w-fg); border-color: var(--w-accent); }
.paused { color: var(--w-warn); }
.fold {
  flex-basis: 100%;
  display: flex; flex-direction: column; gap: 6px;
  padding: 6px 8px;
  background: var(--w-panel-2);
  border-radius: var(--w-r-sm);
}
.ladder { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.step { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
</style>
