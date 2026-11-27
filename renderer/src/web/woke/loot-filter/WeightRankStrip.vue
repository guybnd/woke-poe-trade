<template>
  <div v-if="got" :class="$style.strip">
    <div class="flex items-center gap-2">
      <span class="w-group-label">Rare weights</span>
      <span class="text-xs w-dim grow">{{ lineText }}</span>
      <button type="button" :class="$style.arrow" :disabled="!up" :title="up ? `Up to ${WEIGHT_LABEL[up]}` : 'Already at the top'" aria-label="Raise the base's rank" @click="up && setRank(up)">▲</button>
      <button type="button" :class="$style.arrow" :disabled="!down" :title="down ? `Down to ${WEIGHT_LABEL[down]}` : 'Already at the bottom'" aria-label="Lower the base's rank" @click="down && setRank(down)">▼</button>
    </div>
    <div class="flex flex-wrap gap-1">
      <button v-for="r in RANK_KEYS" :key="r" type="button" :class="[$style.lane, got.row.rank === r && $style.laneOn]" :aria-pressed="got.row.rank === r"
        :title="got.row.rank === r ? `${got.row.name} is here now` : `${got.row.name}: ${WEIGHT_LABEL[r]} (×${w.mult[r]})`" @click="setRank(r)">{{ WEIGHT_LABEL[r] }}</button>
    </div>
    <div v-if="got.row.was" class="text-xs w-faint">Your rank. The filter says {{ WEIGHT_LABEL[got.row.was] }}. <button type="button" :class="$style.link" @click="setRank(got.row.was)">Back to it</button></div>
  </div>
</template>

<script setup lang="ts">
// Alt+F: the base's rank in Rare weights, and where this drop's score lands.
import { computed } from 'vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import type { ItemFacts } from './item-facts'
import { RANK_KEYS, STEP_NAMES, WEIGHT_LABEL, filterBases, stepFor, weightOf } from './weights'
import type { RankKey } from './weights'
import { pastedRare, points, pointsText } from './weight-samples'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
  facts: ItemFacts
}>()

const w = computed(() => props.config.presets.weights)
const got = computed(() => {
  if (!w.value.on || (props.facts.rarity === 'Rare' && props.facts.identified) || (props.facts.itemLevel ?? 0) < 68) return null
  const bases = props.store.weightBases.value.length ? props.store.weightBases.value : (props.store.doc.value ? filterBases(props.store.doc.value, w.value.ranks) : [])
  return pastedRare(props.facts, bases)
})
const up = computed(() => got.value ? RANK_KEYS[RANK_KEYS.indexOf(got.value.row.rank) - 1] ?? null : null)
const down = computed(() => got.value ? RANK_KEYS[RANK_KEYS.indexOf(got.value.row.rank) + 1] ?? null : null)
const lineText = computed(() => {
  if (!got.value) return ''
  const step = stepFor(got.value.it, w.value)
  return `${WEIGHT_LABEL[got.value.row.rank]} · score ${pointsText(points(weightOf(got.value.it, w.value.mult)))}, line ${pointsText(points(w.value.need))}: ${STEP_NAMES[step]}`
})

function setRank (to: RankKey) {
  const row = got.value?.row
  if (!row) return
  const orig = row.was ?? row.rank
  const rest = Object.fromEntries(Object.entries(w.value.ranks).filter(([n]) => n !== row.name))
  w.value.ranks = to === orig ? rest : { ...rest, [row.name]: to }
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
.link { background: none; border: 0; padding: 0; color: var(--w-accent); cursor: pointer; font: inherit; text-decoration: underline; }
</style>
