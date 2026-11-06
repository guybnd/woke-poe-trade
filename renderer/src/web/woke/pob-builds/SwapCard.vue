<template>
  <section :class="$style.card">
    <div :class="$style.verdict" :style="{ color: VERDICT_COLOUR[swap.result.verdict] }">{{ swap.result.summary }}</div>
    <div v-if="swap.result.rows.length" :class="[$style.row, $style.head]"><span /><span>Yours</span><span>This</span><span /></div>
    <template v-for="(r, i) in swap.result.rows.slice(0, 12)" :key="i">
      <div :class="$style.row">
        <span class="w-trunc" :title="r.label">{{ r.label }}</span>
        <span class="w-num">{{ r.yours }}</span>
        <span class="w-num">{{ r.theirs }}</span>
        <span class="w-num" :style="{ color: TONE_COLOUR[r.tone] }">{{ r.delta }}</span>
      </div>
      <div v-if="r.note" :class="$style.note">{{ r.note }}</div>
    </template>
    <div :class="$style.foot">Numbers on the two items, not a full recalculation.</div>
  </section>
</template>

<script setup lang="ts">
import type { SwapResult } from './swap-check'

defineProps<{ swap: { result: SwapResult } }>()

const VERDICT_COLOUR = { better: 'var(--w-up)', worse: 'var(--w-down)', mixed: 'var(--w-warn)', same: 'var(--w-fg)' }
const TONE_COLOUR = { up: 'var(--w-up)', down: 'var(--w-down)', dim: 'var(--w-dim)' }
</script>

<style module>
.card {
  padding: 6px 10px 8px;
  text-align: left;
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
  color: var(--w-fg);
}
.verdict {
  padding-bottom: 6px;
  font-weight: 500;
}
.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 3.6rem 3.6rem 3.4rem;
  gap: 6px;
  padding: 2px 0;
  border-bottom: 1px solid var(--w-line-soft);
}
.head {
  color: var(--w-dim);
  font-size: var(--w-fs-xs);
}
.note {
  padding: 1px 0 3px;
  color: var(--w-dim);
  font-size: var(--w-fs-xs);
}
.foot {
  padding-top: 6px;
  color: var(--w-faint);
  font-size: var(--w-fs-xs);
}
</style>
