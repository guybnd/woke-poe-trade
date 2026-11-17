<template>
  <div v-if="show" :class="$style.strip">
    <div class="flex items-center gap-2">
      <span class="w-group-label">Gear table</span>
      <span class="text-xs w-dim grow">{{ lineText }}</span>
      <button type="button" :class="$style.arrow" :disabled="!up" :title="up ? `Move up to ${LANE_LABEL[up]}` : 'Already at the top'" aria-label="Move the base up a rank" @click="up && moveTo(up)">▲</button>
      <button type="button" :class="$style.arrow" :disabled="!down" :title="down ? `Move down to ${LANE_LABEL[down]}` : 'Already at the bottom'" aria-label="Move the base down a rank" @click="down && moveTo(down)">▼</button>
    </div>
    <div class="flex flex-wrap gap-1">
      <button v-for="l in LADDER" :key="l" type="button" :class="[$style.lane, lane === l && $style.laneOn]" :aria-pressed="lane === l"
        :title="lane === l ? `${base} is here now` : `Move ${base} to ${LANE_LABEL[l]} (every drop tier)`" @click="moveTo(l)">{{ LANE_LABEL[l] }}</button>
    </div>
    <div v-if="exotic" class="text-xs w-faint">NeverSink's Exotic bases rules show it first ({{ exotic }}).</div>
    <div v-if="!g.on" class="text-xs w-faint">A move switches your filter to the Gear table, starting from NeverSink's numbers.</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import type { ItemFacts } from './item-facts'
import { exoticBases, laneOf, readTiered, takeOver } from './gear'
import type { GearRarity, Lane, Rank } from './gear'
import { baseInfo } from './gear-bases'
import { tierLabel } from './names'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
  facts: ItemFacts
}>()

// Best to worst, as ▲/▼ walk it.
const LADDER: Lane[] = ['r1', 'r2', 'r3', 'none', 'never']
const LANE_LABEL: Record<Lane, string> = { r1: 'Rank 1', r2: 'Rank 2', r3: 'Rank 3', none: 'Unranked', never: 'Never' }

const g = computed(() => props.config.presets.gear)
const base = computed(() => props.facts.baseType ?? '')
const source = computed(() => props.store.doc.value ? readTiered(props.store.doc.value) : null)
const isGear = computed(() => {
  const b = base.value
  if (!b || props.facts.rarity === 'Unique') return false
  const src = source.value
  return !!baseInfo(b).slot || !!(src && (['r1', 'r2', 'r3'] as Rank[]).some(r => src.ranks[r].includes(b)))
})
const show = computed(() => isGear.value && !!source.value)
const lane = computed<Lane>(() => laneOf(source.value, g.value, base.value))
const up = computed(() => LADDER[LADDER.indexOf(lane.value) - 1] ?? null)
const down = computed(() => LADDER[LADDER.indexOf(lane.value) + 1] ?? null)
const exotic = computed(() => {
  const doc = props.store.doc.value
  const tiers = doc ? exoticBases(doc).get(base.value) : null
  return tiers?.map(tierLabel).join(', ') ?? ''
})

// What the table says for this rarity and row.
const lineText = computed(() => {
  if (lane.value === 'never') return 'Never shown'
  const row = lane.value === 'none' ? 'any' : lane.value
  const r: GearRarity = props.facts.rarity === 'Magic' ? 'magic' : 'rare'
  const v = g.value.on ? g.value.show[row][r] : null
  const what = `${r === 'magic' ? 'Magic' : 'Rare'} ${LANE_LABEL[lane.value].toLowerCase()} bases`
  if (v == null) return `${what}: NeverSink's numbers`
  if (!v) return `${what}: off`
  if (v === 1) return `${what}: always`
  return `${what} show from drop tier ${v}`
})

function moveTo (to: Lane) {
  const doc = props.store.doc.value
  if (!doc || to === lane.value) return
  const x = g.value
  takeOver(x, doc)
  const b = base.value
  const src = readTiered(doc)
  const orig = src ? laneOf(src, { ...x, moves: {} }, b) : 'none'
  const moves: Record<string, Lane> = Object.fromEntries(Object.entries(x.moves).filter(([k]) => k !== b))
  if (orig !== to) moves[b] = to
  x.moves = moves
}
</script>

<style module>
.strip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: var(--w-r-sm);
  background: var(--w-panel-2);
}
.arrow {
  width: 1.8rem;
  height: 1.6rem;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-border);
  background: transparent;
  color: var(--w-text);
  cursor: pointer;
}
.arrow:disabled { opacity: 0.35; cursor: default; }
.lane {
  height: 1.7rem;
  padding: 0 8px;
  font-size: var(--w-fs-xs, 12px);
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-border);
  background: rgb(0 0 0 / 20%);
  color: var(--w-text-dim);
  cursor: pointer;
}
.lane:hover { color: var(--w-text); }
.laneOn { border-color: #e0b860; background: rgb(224 184 96 / 16%); color: #f3d48a; }
</style>
