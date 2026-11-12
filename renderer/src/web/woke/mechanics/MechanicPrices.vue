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
      <div v-else-if="g.thinOnly" class="w-faint text-xs" style="padding: 2px var(--w-pad) 6px;">Only thin-market prices here, and Skip thin hides them.</div>
      <div v-else-if="!g.rows.length" class="w-faint text-xs" style="padding: 2px var(--w-pad) 6px;">poe.ninja has no prices for these.</div>
      <div v-for="(row, i) in g.rows" :key="row.item.name" class="w-row" :class="$style.priceGrid">
        <span v-item-tip="row.item" class="w-trunc flex items-center gap-1">
          <WIcon :src="ninjaIcon(row.item.type, row.item.name) ?? undefined" fallback="fas fa-coins" /><i v-if="isThin(row.item)" class="fas fa-exclamation-circle w-faint" :title="thinTitle(row.item)" />{{ row.item.name }}<span v-if="row.tag" class="w-faint ml-1 text-xs">{{ row.tag }}</span>
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
import { isThin, thinTitle } from '../market/types'
import type { PriceItem } from '../market/types'

const props = withDefaults(defineProps<{
  mech: Mechanic
  items: PriceItem[]
  divine: number | null
  // Glance mode: only the first group, this many rows.
  top?: number
  // Thin-market prices leave the lists and can't be Best.
  skipThin?: boolean
}>(), { top: undefined, skipThin: false })

// Thin is judged on the row priceGroup picked for a name (plain before 5L/6L),
// so a thin plain row drops the name rather than promoting a linked one.
const groups = computed(() => props.mech.groups.map(g => {
  const rows = priceGroup(g, props.items, props.skipThin ? isThin : undefined)
  const thinOnly = props.skipThin && !rows.length && priceGroup(g, props.items).length > 0
  return { label: g.unit ? `${g.label} (per ${g.unit})` : g.label, rows, max: rows[0]?.chaos ?? 0, unranked: g.unranked, thinOnly }
}))
const shownGroups = computed(() => props.top == null
  ? groups.value
  : groups.value.slice(0, 1).map(g => ({ ...g, rows: g.rows.slice(0, props.top) })))
// Best: the top of the first group that has rows, as verdict() does.
const pick = computed(() => {
  if (!props.skipThin) return verdict(props.mech, props.items)
  const g = groups.value.find(x => x.rows.length || x.thinOnly)
  return g && g.rows.length && !g.unranked ? { best: g.rows[0], next: g.rows[1] } : null
})

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
.best { font-size: var(--w-fs-caps); letter-spacing: 0.06em; text-transform: var(--w-caps-case); font-family: var(--w-caps-face); }
.bar { height: 5px; border-radius: var(--w-r-sm); background: var(--w-panel-3); overflow: hidden; }
.bar > i { display: block; height: 100%; background: var(--w-accent); opacity: 0.75; }
</style>
