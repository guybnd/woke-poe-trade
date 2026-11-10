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
import { FilterTag, StatFilter } from './interfaces'

// A row has details to show when its mods are known by name, tier or rank,
// or it adds several mods up (a pseudo or a total).
export function hasSourceInfo (filter: StatFilter): boolean {
  if (!filter.sources.length || filter.option != null) return false
  if (filter.tag === FilterTag.Pseudo || filter.sources.length >= 2) return true
  const { info } = filter.sources[0].modifier
  return info.name != null || info.tier != null || info.rank != null
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
</style>
