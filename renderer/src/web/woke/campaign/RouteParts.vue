<template>
  <span><template v-for="(p, i) in parts" :key="i"><span :class="$style[p.kind]">{{ p.text }}</span></template><template v-if="crafts?.length">
    <span :class="$style.chip" :title="craftTitle(crafts)">{{ craftChip(crafts) }}</span></template></span>
</template>

<script setup lang="ts">
import type { Part } from './route-parse'
import { craftChip, craftTitle } from './recipes'

// crafts: recipes picked up in the step's zone, shown as a chip at the end.
defineProps<{ parts: Part[], crafts?: readonly string[] }>()
</script>

<style module>
.text {}
.area { color: var(--w-accent); }
.town { color: var(--w-info); }
.kill { color: var(--w-down); }
.quest { color: var(--w-up); }
.item { color: var(--w-warn); }
.waypoint { color: var(--w-info); }
.portal { color: var(--w-info); }
.logout { color: var(--w-dim); font-style: italic; }
.trial { color: var(--w-r-gem); }
.craft { color: var(--w-r-currency); }
.chip {
  margin-left: 4px;
  padding: 0 4px;
  border-radius: 4px;
  font-size: 0.9em;
  white-space: nowrap;
  cursor: help;
  color: var(--w-r-currency);
  border: 1px solid color-mix(in srgb, var(--w-r-currency) 45%, transparent);
  background: color-mix(in srgb, var(--w-r-currency) 12%, transparent);
}
.dir { font-family: var(--w-num); color: var(--w-fg); }
.generic { color: var(--w-fg); font-weight: 500; }
</style>
