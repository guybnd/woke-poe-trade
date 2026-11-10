<template>
  <div>
    <div v-if="pick" class="w-verdict" :class="$style.verdict">
      Best: <b v-item-tip="pick.best.item">{{ pick.best.item.name }}</b>
      <span class="w-dim">(<WPrice :chaos="pick.best.chaos" :divine="divine" />{{ pick.best.unit > 1 ? ` per ${pick.best.unit}` : '' }})</span>
      <template v-if="pick.next">, then <span v-item-tip="pick.next.item">{{ pick.next.item.name }}</span></template>
    </div>
    <template v-for="g in shownGroups" :key="g.label">
      <div class="w-group-label">{{ g.label }}</div>
      <WSkeleton v-if="!items.length" :rows="Math.min(top ?? 4, 4)" />
      <div v-else-if="!g.rows.length" class="w-faint text-xs" style="padding: 2px var(--w-pad) 6px;">poe.ninja has no prices for these.</div>
      <div v-for="(row, i) in g.rows" :key="row.item.name" class="w-row" :class="$style.priceGrid">
        <span v-item-tip="row.item" class="w-trunc flex items-center gap-1">
          <WIcon :src="ninjaIcon(row.item.type, row.item.name) ?? undefined" fallback="fas fa-coins" />{{ row.item.name }}<span v-if="row.tag" class="w-faint ml-1 text-xs">{{ row.tag }}</span>
          <span v-if="i === 0 && !g.unranked" class="w-up ml-1" :class="$style.best">best</span>
        </span>
        <span :class="$style.bar"><i :style="{ width: barWidth(row.chaos, g.max) }" /></span>
        <WPrice :chaos="row.chaos" :divine="divine" class="justify-end" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WPrice, WIcon, WSkeleton, vItemTip } from '../ui'
import { ninjaIcon } from '../ui/game-icons'
import { priceGroup, verdict } from './data'
import type { Mechanic } from './data'
import type { PriceItem } from '../market/types'

const props = withDefaults(defineProps<{
  mech: Mechanic
  items: PriceItem[]
  divine: number | null
  // Glance mode: only the first group, this many rows.
  top?: number
}>(), { top: undefined })

const groups = computed(() => props.mech.groups.map(g => {
  const rows = priceGroup(g, props.items)
  return { label: g.unit ? `${g.label} (per ${g.unit})` : g.label, rows, max: rows[0]?.chaos ?? 0, unranked: g.unranked }
}))
const shownGroups = computed(() => props.top == null
  ? groups.value
  : groups.value.slice(0, 1).map(g => ({ ...g, rows: g.rows.slice(0, props.top) })))
const pick = computed(() => verdict(props.mech, props.items))

function barWidth (chaos: number, max: number) {
  return max > 0 ? `${Math.max(3, chaos / max * 100)}%` : '0%'
}
</script>

<style module>
.verdict {
  margin: 8px var(--w-pad) 4px;
  padding: 6px 10px;
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-sm);
  background: var(--w-accent-soft);
}
.verdict b { color: var(--w-accent); font-weight: 600; }
.priceGrid { grid-template-columns: minmax(0, 1fr) 72px 68px; }
.best { font-size: var(--w-fs-xs); letter-spacing: 0.06em; text-transform: uppercase; }
.bar { height: 5px; border-radius: var(--w-r-sm); background: var(--w-panel-3); overflow: hidden; }
.bar > i { display: block; height: 100%; background: var(--w-accent); opacity: 0.75; }
</style>
