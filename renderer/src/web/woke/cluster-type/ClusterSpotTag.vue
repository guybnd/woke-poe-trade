<template>
  <!-- woke: where a cluster notable sits (Guy's pick A, WOKEPOET-367). -->
  <span v-if="spot" class="w-cspot" :class="spot.side ?? ''" data-cluster-spot
    :title="`As Path of Building lays the jewel out: ${spot.points} passives to reach it, the jewel's entry included.`">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StatFilter } from '@/web/price-check/filters/interfaces'

const props = defineProps<{ filter: StatFilter }>()
const spot = computed(() => props.filter.clusterSpot)
const label = computed(() => {
  const s = spot.value!
  return s.side ? `${s.side} · ${s.points} pts` : `${s.points} pts`
})
</script>

<style>
.w-cspot {
  flex: none; align-self: center;
  margin-left: 6px; padding: 0 5px;
  border: 1px solid var(--w-line);
  font-size: calc(11px * var(--w-text-scale, 1));
  line-height: 1.5;
  color: var(--w-dim);
  white-space: nowrap;
  font-family: var(--w-font-ui, inherit);
  text-transform: none;
}
.w-cspot.front { color: var(--w-up, #8fbf6a); border-color: color-mix(in srgb, var(--w-up, #8fbf6a) 40%, transparent); }
.w-cspot.middle { color: var(--w-fg); }
.w-cspot.back { color: #e0a060; border-color: rgba(224, 160, 96, .4); }
</style>
