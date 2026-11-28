<template>
  <!-- A score card section opened for editing (Guy, 2026-11-28): every row of
       it with ‹ ›, this item's row marked, so tiers are tuned side by side. -->
  <div :class="$style.sec" data-score-section>
    <div v-for="r in rows" :key="r.key" :class="[$style.row, { [$style.mine]: r.mine }]" :title="`${r.label}: ${pointsText(r.pts)} (default ${pointsText(r.dflt)})`" :data-score-section-row="r.key">
      <span class="grow">{{ r.label }}</span>
      <button type="button" :class="$style.btn" :disabled="!stepTo(r.key, -1)" :aria-label="`Lower ${r.label}, every rare`" @click="emit('bump', r.key, -1)">‹</button>
      <span :class="[$style.pts, { [$style.moved]: Math.round(r.pts) !== Math.round(r.dflt) }]">{{ pointsText(r.pts) }}</span>
      <button type="button" :class="$style.btn" :disabled="!stepTo(r.key, 1)" :aria-label="`Raise ${r.label}, every rare`" @click="emit('bump', r.key, 1)">›</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { pointsText } from './weight-samples'

defineProps<{
  rows: Array<{ key: string, label: string, pts: number, dflt: number, mine: boolean }>
  stepTo: (key: string, dir: 1 | -1) => number | null
}>()
const emit = defineEmits<{ (e: 'bump', key: string, dir: 1 | -1): void }>()
</script>

<style module>
.sec { display: flex; flex-direction: column; margin: 1px 0 4px 22px; padding: 3px 6px; border-left: 2px solid #e0b860; background: rgb(0 0 0 / 22%); border-radius: 0 3px 3px 0; }
.row { display: flex; align-items: center; gap: 4px; font-size: var(--w-fs-xs); color: var(--w-dim); line-height: 1.7; }
.mine { color: var(--w-fg); }
.btn { border: 0; background: none; color: #f3d48a; width: 18px; cursor: pointer; padding: 0; font-size: var(--w-fs-sm); }
.btn:hover { color: var(--w-fg); }
.btn:disabled { opacity: .3; cursor: default; }
.pts { min-width: 2.6rem; text-align: center; font-variant-numeric: tabular-nums; }
.moved { color: #f3d48a; }
</style>
