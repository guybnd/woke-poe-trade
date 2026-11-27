<template>
  <div v-if="got" :class="$style.strip">
    <div :class="$style.head">
      <span :class="$style.title">Rare weights</span>
      <span :class="$style.sum">Score <b>{{ score }}</b> · line {{ pointsText(points(w.need)) }} → <b>{{ stepName }}</b></span>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-xs w-dim grow">Base rank: lower it to care less about {{ got.row.name }}</span>
      <button type="button" :class="$style.arrow" :disabled="!up" :title="up ? `Up to ${WEIGHT_LABEL[up]}` : 'Already at the top'" aria-label="Raise the base's rank" @click="up && setRank(up)">▲</button>
      <button type="button" :class="$style.arrow" :disabled="!down" :title="down ? `Down to ${WEIGHT_LABEL[down]}` : 'Already at the bottom'" aria-label="Lower the base's rank" @click="down && setRank(down)">▼</button>
    </div>
    <div class="flex flex-wrap gap-1">
      <button v-for="r in RANK_KEYS" :key="r" type="button" :class="[$style.lane, got.row.rank === r && $style.laneOn]" :aria-pressed="got.row.rank === r"
        :title="got.row.rank === r ? `${got.row.name} is here now` : `${got.row.name}: ${WEIGHT_LABEL[r]} (${pointsText(points(w.mult[r]))})`" @click="setRank(r)">{{ WEIGHT_LABEL[r] }}</button>
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
import { RANK_KEYS, STEP_NAMES, WEIGHT_LABEL, stepFor, weightOf } from './weights'
import type { RankKey } from './weights'
import { points, pointsText } from './weight-samples'
import { rankStep, setWeightRank, weightRow } from './weight-rank'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
  facts: ItemFacts
}>()

const w = computed(() => props.config.presets.weights)
const got = computed(() => weightRow(props.store, props.config, props.facts))
const up = computed(() => got.value ? rankStep(got.value.row.rank, -1) : null)
const down = computed(() => got.value ? rankStep(got.value.row.rank, 1) : null)
const score = computed(() => got.value ? pointsText(points(weightOf(got.value.it, w.value.mult))) : '')
const stepName = computed(() => got.value ? STEP_NAMES[stepFor(got.value.it, w.value)] : '')
function setRank (to: RankKey) { if (got.value) setWeightRank(props.config, got.value.row, to) }
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
.head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.title { font-size: var(--w-fs-sm, 13px); color: var(--w-accent); font-weight: 600; }
.sum { font-size: var(--w-fs-sm, 13px); color: var(--w-dim); }
.sum b { color: var(--w-text); }
.link { background: none; border: 0; padding: 0; color: var(--w-accent); cursor: pointer; font: inherit; text-decoration: underline; }
</style>
