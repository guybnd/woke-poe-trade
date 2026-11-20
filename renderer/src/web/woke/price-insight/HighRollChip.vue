<template>
  <!-- woke: poe.ninja prices an average copy; this one rolled higher. One search, only on a click. -->
  <button v-if="high" type="button" :class="$style.chip" data-high-roll
    :title="`This copy's lines average ${high.pct}% up their ranges. poe.ninja prices an average copy.\nClick to search trade for rolls like these.`"
    @click="search">High roll {{ high.pct }}%</button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ParsedItem } from '@/parser'
import type { FilterOrGroup } from '@/web/price-check/filters/interfaces'
import { highRoll } from './unique-roll'
import { applyRollToFilter, canPickRoll } from './roll-presets'

const props = defineProps<{ item: ParsedItem, stats: FilterOrGroup[] }>()
const emit = defineEmits<{ (e: 'search'): void }>()

const high = computed(() => highRoll(props.stats, props.item))

function search () {
  const h = high.value
  if (!h) return
  // Each rolling line: ticked, its min and max close around this copy's roll.
  for (const f of h.lines) {
    if (canPickRoll(f)) applyRollToFilter(f, 'current')
  }
  emit('search')
}
</script>

<style module>
.chip {
  display: inline-flex;
  align-items: center;
  margin-left: 0.5rem;
  padding: 0 8px;
  border-radius: var(--w-r-pill);
  line-height: calc(18px * var(--w-text-scale, 1));
  font-size: var(--w-fs-sm);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--w-gold-hi, var(--w-accent));
  background: var(--w-accent-soft);
  border: 1px solid currentColor;
  cursor: pointer;
}
.chip:hover { background: color-mix(in srgb, currentColor 18%, transparent); }
</style>
