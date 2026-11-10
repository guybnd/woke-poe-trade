<template>
  <!-- woke: "Mod details". The mods behind a row, shown under it while the toggle is on. -->
  <div class="w-pc-sources" :class="$style.sources">
    <div v-for="(source, idx) of sources" :key="idx" :class="$style.source">
      <source-info :source="source" :filter="filter" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import SourceInfo from './SourceInfo.vue'
import { StatFilter } from './interfaces'

// Only a line several mods add up to (a pseudo or a total) has details to show:
// a one-mod line would only repeat itself, and its tier is already beside it.
export function hasSourceInfo (filter: StatFilter): boolean {
  return filter.option == null && filter.sources.length >= 2
}

export default defineComponent({
  components: { SourceInfo },
  props: {
    filter: { type: Object as PropType<StatFilter>, required: true },
    // The row's mods not already listed under an earlier line.
    sources: { type: Array as PropType<StatFilter['sources']>, required: true }
  }
})
</script>

<style lang="postcss" module>
.sources {
  margin: 0 6px 4px 1.75rem;
  padding: 2px 8px;
  border-left: 2px solid theme('colors.gray.700');
  font-size: 0.9em;
}
.source + .source { margin-top: 2px; }
/* Fixed line boxes: the rolls' number font loads late, and its own line height
   would grow each line a pixel and nudge every row below. */
.source :global(div) { line-height: calc(20px * var(--w-text-scale, 1)); }
.source :global(.font-exo2) { line-height: 1; }
</style>
