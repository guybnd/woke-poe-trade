<template>
  <!-- League items on the Loot tab (Guy's League A, 2026-11-27): a section
       per mechanic, each Off or as NeverSink shows it. -->
  <div :class="$style.wrap" class="w-scroll" data-loot-league>
    <div :class="$style.top">
      <WToggle v-model="c.on">Prices decide endgame loot</WToggle>
      <span :class="$style.beta">Beta</span>
      <WInfo text="Items that start league content. poe.ninja prices almost none of them, so each mechanic is shown the way NeverSink shows it, or Off: hidden in maps (area level 68+). Splinters, embers, omens and tattoos are in Currency. The same switch as the other priced classes." />
    </div>
    <div v-for="s in LEAGUE_SECTIONS" :key="s.id" :class="$style.row" :data-loot-league-section="s.id">
      <span :class="$style.name">{{ s.name }}</span>
      <WSegmented :model-value="c.catMode[s.id] === 'off' ? 'off' : 'on'" :options="MODES" role="group" :aria-label="`${s.name}: Off or shown`" @update:model-value="v => setMode(s.id, v)" />
    </div>
    <p class="text-sm w-dim">{{ note }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WInfo, WSegmented, WToggle } from '../ui'
import { LEAGUE_SECTIONS } from './league-classes'
import type { LootFilterWidget } from './widget'

const props = defineProps<{ config: LootFilterWidget }>()
const c = computed(() => props.config.presets.currency)
const MODES = [{ value: 'off', label: 'Off' }, { value: 'on', label: 'NeverSink' }]
function setMode (id: string, v: string) {
  const next = Object.fromEntries(Object.entries(c.value.catMode).filter(([k]) => k !== id))
  if (v === 'off') next[id] = 'off'
  c.value.catMode = next
}
const note = computed(() => {
  const off = LEAGUE_SECTIONS.filter(s => c.value.catMode[s.id] === 'off').length
  if (!c.value.on) return 'Off: NeverSink decides league items.'
  return off ? `${off} hidden in maps.` : 'All shown, as NeverSink shows them.'
})
</script>

<style module>
.wrap { flex: 1 1 auto; min-width: 0; padding: 10px var(--w-pad); display: flex; flex-direction: column; gap: 6px; }
.top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
.beta { font-size: var(--w-fs-xs); color: var(--w-dim); border: 1px solid var(--w-line); border-radius: var(--w-r-sm); padding: 0 4px; }
.row { display: flex; align-items: center; gap: 10px; padding: 4px 10px; border: 1px solid var(--w-line); border-radius: var(--w-r-sm); background: var(--w-panel-2); }
.name { flex: 1 1 auto; min-width: 0; color: #e2d3ad; font-size: var(--w-fs-sm); }
</style>
