<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <WPanel :title="config.wmTitle || 'Wickerman'" icon="fas fa-bone" width="38rem" max-height="70vh" resizable>
      <div :class="$style.bar">
        <WSegmented v-model="config.slot" :options="SLOTS" />
        <span class="ml-auto w-dim w-num text-xs">{{ rows.length }}</span>
      </div>
      <div :class="$style.bar">
        <WField v-model="query" icon="fas fa-search" placeholder="Search a Viscera, boss, map or effect" class="grow" />
      </div>
      <WEmpty v-if="!table" icon="fas fa-bone">Reading the Viscera list.</WEmpty>
      <WEmpty v-else-if="!rows.length" icon="fas fa-bone">No Viscera match.</WEmpty>
      <div v-else :class="$style.list">
        <template v-for="v in rows" :key="v.name">
          <button type="button" :class="[$style.row, open === v.name && $style.on, hereNames.has(v.name) && $style.here]"
            :title="hereNames.has(v.name) ? 'Dropped in this zone' : undefined" data-woke-wickerman-row
            @click="open = open === v.name ? null : v.name">
            <span class="min-w-0 w-trunc">{{ v.name }}</span>
            <span class="w-dim whitespace-nowrap">{{ v.slot }}</span>
            <span class="min-w-0 w-dim w-trunc text-xs">{{ sources(v) }}</span>
          </button>
          <div v-if="open === v.name" :class="$style.detail">
            <div v-for="(t, i) in v.tiers" :key="t.label" :class="$style.tier">
              <span :class="$style.label">{{ t.label }}</span>
              <span :class="$style.text">{{ t.text }}</span>
              <WPrice v-if="price(v, i) != null" class="ml-auto whitespace-nowrap" :chaos="price(v, i)" :divine="divine" />
            </div>
            <div v-if="v.act" :class="$style.tier">
              <span :class="$style.label">Act {{ v.act.n }}</span>
              <span :class="v.act.unsure && $style.unsure">{{ actLine(v) }}</span>
            </div>
            <div v-for="m in v.maps" :key="m.boss + m.map" :class="$style.tier">
              <span :class="$style.label">{{ m.kind === 'Map boss' ? 'Map' : m.kind }}</span>
              <span :class="m.unsure && $style.unsure">{{ m.boss }}, {{ m.map }}</span>
            </div>
          </div>
        </template>
      </div>
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import { widgetWickermanSpec } from '../widget-specs'

export default { widget: widgetWickermanSpec }
</script>

<script setup lang="ts">
// 3.30 Wickerman module: every Viscera by slot, with search. Remove with the league.
import { computed, inject, shallowRef } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WEmpty, WField, WPanel, WPrice, WSegmented } from '../ui'
import { popupAnchor } from '../ui/window-anchor'
import { actLine, searchViscera } from './viscera'
import type { Viscera } from './viscera'
import { useVisceraHere, useVisceraPrices, useVisceraTable } from './here'
import type { WickermanWidget } from './widget'

const props = defineProps<{ config: WickermanWidget }>()
const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Wickerman'
  props.config.anchor = popupAnchor()
  props.config.slot = 'all'
  wm.show(props.config.wmId)
}
props.config.slot ??= 'all'

const SLOTS = [
  { value: 'all', label: 'All' },
  { value: 'Head', label: 'Head' },
  { value: 'Torso', label: 'Torso' },
  { value: 'Upper Limb', label: 'Upper' },
  { value: 'Lower Limb', label: 'Lower' }
]

const table = useVisceraTable()
const { here } = useVisceraHere()
const { price, divine } = useVisceraPrices()
const hereNames = computed(() => new Set(here.value.map(h => h.v.name)))
const query = shallowRef('')
const open = shallowRef<string | null>(null)

const rows = computed(() => {
  const t = table.value
  if (!t) return []
  const list = query.value.trim().length >= 3
    ? searchViscera(t, query.value, t.viscera.length).map(h => h.v)
    : t.viscera
  const slot = props.config.slot
  const shown = slot === 'all' ? list : list.filter(v => v.slot === slot)
  // What drops in this zone first.
  return [...shown].sort((a, b) => Number(hereNames.value.has(b.name)) - Number(hereNames.value.has(a.name)))
})

function sources (v: Viscera): string {
  return [v.act?.boss, ...v.maps.map(m => `${m.boss}, ${m.map}`)].filter(Boolean).join(' · ')
}
</script>

<style module>
.bar { display: flex; align-items: center; gap: 8px; padding: 6px var(--w-pad); }
.list { display: flex; flex-direction: column; overflow-y: auto; min-height: 0; }
.row {
  display: grid;
  grid-template-columns: minmax(0, 13rem) 6rem minmax(0, 1fr);
  gap: 10px;
  align-items: baseline;
  padding: 4px var(--w-pad);
  text-align: left;
  border-bottom: 1px solid var(--w-line-soft);
}
.row:hover, .on { background: var(--w-accent-soft); }
.here { box-shadow: inset 2px 0 0 var(--w-accent); }
.detail { display: flex; flex-direction: column; gap: 1px; padding: 4px var(--w-pad) 6px calc(var(--w-pad) + 10px); font-size: var(--w-fs-sm); border-bottom: 1px solid var(--w-line); }
.tier { display: flex; align-items: baseline; gap: 8px; }
.label { flex: none; min-width: 4.5em; color: var(--w-gold); font-family: var(--w-caps-face); }
.text { min-width: 0; white-space: pre-line; color: var(--w-r-magic); }
.unsure { text-decoration: underline dotted; text-underline-offset: 2px; }
</style>
