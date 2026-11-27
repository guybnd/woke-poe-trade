<template>
  <!-- Jewels on the Loot tab (Guy's Jewels A, 2026-11-27): cluster jewels
       priced by enchant, passive count and item level, from poe.ninja. The
       same rules as the Cluster page on Rules (ClusterPriceBand). Abyss and
       other jewels stay NeverSink's (Rare weights scores gear only). -->
  <div :class="$style.wrap" class="w-scroll" data-loot-jewels>
    <p class="text-sm w-dim">Cluster jewels by enchant, passive count and item level, from poe.ninja. Abyss and other jewels still show the way NeverSink shows them.</p>
    <ClusterPriceBand v-if="store.doc.value" :doc="store.doc.value" :settings="config.presets.clusterPrices" :prices="clusterPricesFor(store.prices.currentLeague.value)"
      :updated-at="clusterPrices?.ts ?? null" :error="clusterPricesError" @open-rule="emit('open-rule', { type: CLUSTER_PRICE_TYPE, tier: $event })" />
  </div>
</template>

<script setup lang="ts">
import ClusterPriceBand from './ClusterPriceBand.vue'
import { clusterPrices, clusterPricesError, clusterPricesFor } from './cluster-ninja'
import { CLUSTER_PRICE_TYPE } from './cluster-prices'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'

defineProps<{ store: LootFilterStore, config: LootFilterWidget }>()
const emit = defineEmits<{ (e: 'open-rule', r: { type: string, tier: string }): void }>()
</script>

<style module>
.wrap { flex: 1 1 auto; min-width: 0; padding: 10px var(--w-pad); display: flex; flex-direction: column; gap: 8px; }
</style>
