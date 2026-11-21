<template>
  <div :class="[$style.entry, $style[entry.verdict]]" :title="tip" data-testid="map-scan-entry">
    <span :class="$style.tag">{{ VERDICT_LABEL[entry.verdict] }}</span>
    <span class="flex-1 w-trunc">{{ entry.label }}</span>
    <span v-if="showRerolls && entry.rerolls" class="w-faint text-xs">×{{ entry.rerolls + 1 }}</span>
    <span class="w-num w-accent">{{ entry.juice }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VERDICT_LABEL } from './scan-session'
import type { ScanEntry } from './scan-session'

const props = defineProps<{ entry: ScanEntry, showRerolls?: boolean }>()

const RATING_WORD = { deadly: 'Avoid', warn: 'Careful', good: 'Want' } as const

// Hover: what decided the verdict, in full.
const tip = computed(() => {
  const e = props.entry
  const head = e.verdict === 'unsure'
    ? `Looks safe, but ${e.unsure} line${e.unsure > 1 ? 's' : ''} couldn't be read clearly`
    : `${VERDICT_LABEL[e.verdict]} · juice ${e.juice}`
  const mods = e.flagged.map(m => `${RATING_WORD[m.rating as keyof typeof RATING_WORD] ?? m.rating}: ${m.matcher}`)
  const extra = e.rerolls ? [`Read ${e.rerolls + 1} times (rerolled in place)`] : []
  return [head, ...(mods.length ? mods : ['No rated mods']), ...extra].join('\n')
})
</script>

<style module>
.entry { display: flex; align-items: center; gap: 8px; padding: 3px var(--w-pad); font-size: var(--w-fs-md); }
.tag {
  flex: none;
  min-width: 38px;
  text-align: center;
  font-size: var(--w-fs-xs);
  font-weight: 600;
  border-radius: var(--w-r-sm);
  color: var(--w-accent-fg);
  padding: 0 4px;
}
.run .tag { background: var(--w-up); }
.unsure .tag, .careful .tag { background: var(--w-warn); }
.skip .tag { background: var(--w-down); }
</style>
