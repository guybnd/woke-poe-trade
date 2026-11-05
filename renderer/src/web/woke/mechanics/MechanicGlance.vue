<template>
  <div>
    <WBanner v-if="!items.length" tone="info">Waiting for poe.ninja prices.</WBanner>
    <template v-if="mech.id === 'betrayal' && goals.length">
      <div class="w-group-label">Goals · {{ goalsDone }} of {{ goals.length }} in place</div>
      <div v-for="g in goalRows.filter(r => !r.done)" :key="g.member" class="w-row" :class="$style.grid">
        <span class="w-trunc"><span class="w-accent">{{ g.member }}</span> → {{ DIVISIONS[g.di] }}</span>
        <span class="w-dim text-xs">{{ g.nowLabel }}</span>
      </div>
    </template>
    <template v-else-if="mech.id === 'betrayal'">
      <div class="w-group-label">{{ starredGlance.length ? 'Starred slots' : 'Most valuable slots' }}</div>
      <div v-for="row in glanceBetrayal" :key="row.key" class="w-row" :class="$style.grid">
        <span class="w-trunc"><span class="w-accent">{{ row.member }}</span> · {{ row.reward }}</span>
        <WPrice :chaos="row.chaos" :divine="divine" class="justify-end" />
      </div>
    </template>
    <ExpeditionGlance v-else-if="mech.id === 'expedition'" :items="items" :divine="divine" :vendor="vendor" />
    <MechanicPrices v-else-if="mech.groups.length" :mech="mech" :items="items" :divine="divine" :top="3" />
    <div v-else class="w-dim text-xs" :class="$style.pad">{{ mech.tips[0] }}</div>
  </div>
</template>

<script setup lang="ts">
// What the dock card holds for one mechanic. Settings draws it too, so the
// guide there shows the real thing.
import { toRef } from 'vue'
import { WBanner, WPrice } from '../ui'
import type { PriceItem } from '../market/types'
import MechanicPrices from './MechanicPrices.vue'
import ExpeditionGlance from './ExpeditionGlance.vue'
import { DIVISIONS } from './betrayal'
import { useBetrayalSlots } from './betrayal-slots'
import type { Mechanic } from './data'
import type { MechanicsWidget } from './widget'

const props = withDefaults(defineProps<{
  mech: Mechanic
  config: MechanicsWidget
  items: PriceItem[]
  divine: number | null
  vendor?: string | null
}>(), { vendor: null })

const { starredGlance, glanceBetrayal, goals, goalRows, goalsDone } = useBetrayalSlots(() => props.config, toRef(props, 'items'))
</script>

<style module>
.grid { grid-template-columns: minmax(0, 1fr) 64px; }
.pad { padding: 4px var(--w-pad) 8px; }
</style>
