<template>
  <!-- Flasks on the Equipment tab (Guy's F1, 2026-11-27): base rank ×
       quality × item level. Their own line (Guy's flasks A, 2026-11-28), so
       Good and Low can show; columns say what they mean. -->
  <div :class="$style.wrap" class="w-scroll" data-equip-flasks>
    <div :class="$style.top">
      <WToggle v-model="w.on">Score endgame rares and flasks</WToggle>
      <span :class="$style.beta">Beta</span>
      <WInfo text="In maps (area level 68+), white and magic utility flasks get a score and a step.
- The score is the base rank, raised by quality (20% and 26%) and item level 85+, where the top mods roll.
- It counts against the **flask line**, not the rare gear line: under it, the flask hides.
- Life and mana flasks, tinctures and levelling stay NeverSink's.

The same switch as Rare gear." />
    </div>
    <div :class="$style.lineBar" data-flask-line>
      <span :class="$style.lab">Flask line</span>
      <input type="range" min="0" :max="LINES.length - 1" step="1" :value="dragIdx ?? lineIdx" :class="$style.range" aria-label="Flask line: the score a flask needs to show"
        @input="dragIdx = Number(($event.target as HTMLInputElement).value)"
        @change="w.flaskLine = LINES[Number(($event.target as HTMLInputElement).value)]; dragIdx = null">
      <b :class="$style.val">{{ LINES[dragIdx ?? lineIdx] }}</b>
      <span class="w-dim text-xs">Top {{ w.mult.r1 }}, Good {{ w.mult.r2 }}, Low {{ w.mult.r3 }}, times quality and item level. Normal at ×2 the line, Big ×4, Beam ×8.</span>
    </div>
    <p class="w-dim text-xs" :class="$style.what">White or magic utility flasks, in maps (area level 68+).</p>
    <div :class="$style.head" aria-hidden="true">
      <span :class="$style.name" />
      <span :class="$style.rank">Rank</span>
      <span v-for="b in BANDS" :key="b.label" :class="$style.cell">{{ b.label }}</span>
    </div>
    <div v-for="r in rows" :key="r.name" :class="$style.row" :data-equip-flask="r.name">
      <span v-item-tip="{ name: r.name }" :class="$style.name">{{ r.name }}</span>
      <span :class="$style.rank"><StateChip :model-value="r.rank" :options="RANKS" :title="`${r.name} rank`" @update:model-value="v => setRank(r.name, v)" /></span>
      <span v-for="(s, i) in r.steps" :key="i" :class="$style.cell"><span :class="$style.pill" :style="{ background: STEP_CSS[s], color: s >= 1 ? '#140f08' : '#efe4cc' }">{{ STEP_NAMES[s] }}</span></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { WInfo, WToggle, vItemTip } from '../ui'
import StateChip from './StateChip.vue'
import { FLASK_BASES, flaskRank, flaskStep } from './flask-weights'
import { STEP_NAMES } from './weights'
import type { RankKey } from './weight-settings'
import type { LootFilterWidget } from './widget'

const props = defineProps<{ config: LootFilterWidget }>()
const w = computed(() => props.config.presets.weights)
// Guy's R1 (2026-11-28): a rank chip, coloured like the steps it leads to.
const RANK_LOOK = [
  { value: 'r1', label: 'Top', dot: '#5a9cff' },
  { value: 'r2', label: 'Good', dot: '#29d2a0' },
  { value: 'r3', label: 'Low', dot: '#d8d877' },
  { value: 'rj', label: "Don't care", dot: 'var(--w-faint)', hollow: true }
] as const
const RANKS = computed(() => RANK_LOOK.map(r => ({ ...r, desc: `Base score ×${w.value.mult[r.value as RankKey]}.` })))
const BANDS = [{ label: 'Under 20%', q: 0, i: 0 }, { label: 'ilvl 85+', q: 0, i: 85 }, { label: '20%+', q: 20, i: 0 }, { label: '20%+ · ilvl 85+', q: 20, i: 85 }, { label: '26%+ · ilvl 85+', q: 26, i: 85 }]
// The flask line's notches (a score; Top is 8, Good 4 before quality and item level).
const LINES = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64]
const lineIdx = computed(() => {
  const v = w.value.flaskLine
  return LINES.reduce((best, x, i) => Math.abs(x - v) < Math.abs(LINES[best] - v) ? i : best, 0)
})
const dragIdx = ref<number | null>(null)
// The same step colours as Rare gear's (Beam blue, as in game).
const STEP_CSS = ['#3a3a3a', '#8a8a8a', '#d8d877', '#29d2a0', '#5a9cff']
const rows = computed(() => FLASK_BASES.map(name => ({
  name,
  rank: flaskRank(w.value, name),
  steps: BANDS.map(b => flaskStep(w.value, name, b.q, b.i))
})))
function setRank (name: string, v: string) {
  w.value.ranks = { ...w.value.ranks, [name]: v as RankKey }
}
</script>

<style module>
.wrap { flex: 1 1 auto; min-width: 0; padding: 10px var(--w-pad); display: flex; flex-direction: column; gap: 4px; }
.top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.beta { font-size: var(--w-fs-xs); color: var(--w-dim); border: 1px solid var(--w-line); border-radius: var(--w-r-sm); padding: 0 4px; }
.head, .row { display: grid; grid-template-columns: minmax(8rem, 1fr) auto repeat(5, 6.5rem); align-items: center; gap: 8px; }
.head { font-size: var(--w-fs-xs); color: var(--w-dim); }
.lineBar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.lab { font-size: var(--w-fs-sm); color: #e2d3ad; }
.range { width: 12rem; accent-color: var(--w-accent); }
.val { min-width: 2ch; font-variant-numeric: tabular-nums; }
.what { margin: 0 0 2px; }
.row { padding: 2px 6px; border-bottom: 1px solid var(--w-line); }
.name { min-width: 0; color: #8888ff; font-size: var(--w-fs-sm); }
.rank { justify-self: start; }
.cell { text-align: center; }
.pill { display: inline-block; padding: 0 6px; border-radius: 2px; font-size: var(--w-fs-xs); }
</style>
