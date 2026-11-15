<template>
  <div v-for="v in here" :key="v.name" :class="$style.box" data-woke-viscera-campaign>
    <div :class="$style.head">
      <span :class="$style.label">Viscera</span>
      <span class="min-w-0 w-trunc">{{ v.name }}</span>
      <span class="w-dim whitespace-nowrap">· {{ v.slot }}</span>
      <span class="ml-auto w-dim whitespace-nowrap" :class="v.act!.unsure && $style.unsure"
        :title="v.act!.unsure ? 'Not confirmed' : undefined">{{ v.act!.boss }}</span>
    </div>
    <div v-for="t in v.tiers" :key="t.label" :class="$style.tier">
      <span :class="$style.tierLabel">{{ t.label }}</span>
      <span :class="$style.text">{{ t.text }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watchEffect } from 'vue'
import { AppConfig } from '@/web/Config'
import { isModuleOn } from '../modules'
import { onSharedDataChange } from '../app/live-data'
import { loadViscera, visceraInZone } from './viscera'
import type { VisceraTable } from './viscera'

// The zone you stand in and its act (from the area id: zone names repeat in acts 6-10).
const props = defineProps<{ zone: string, act: number | null }>()

const table = shallowRef<VisceraTable | null>(null)
const on = computed(() => isModuleOn(AppConfig(), 'wickerman'))
// A data update brings a new table: read it again.
onBeforeUnmount(onSharedDataChange(() => { table.value = null }))

watchEffect(() => {
  if (on.value && !table.value) loadViscera().then(t => { table.value = t }).catch(() => {})
})

const here = computed(() => {
  if (!on.value || !table.value) return []
  return visceraInZone(table.value, props.zone, props.act)
})
</script>

<style module>
.box {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-top: 4px;
  border-top: 1px solid var(--w-line);
  font-size: var(--w-fs-sm);
}
.head { display: flex; align-items: baseline; gap: 6px; }
.label, .tierLabel { flex: none; color: var(--w-gold); font-family: var(--w-caps-face); }
.tierLabel { min-width: 3.5em; }
.tier { display: flex; align-items: baseline; gap: 8px; }
.text { min-width: 0; white-space: pre-line; color: var(--w-r-magic); }
.unsure { text-decoration: underline dotted; text-underline-offset: 2px; }
</style>
