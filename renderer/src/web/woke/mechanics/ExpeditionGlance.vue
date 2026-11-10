<template>
  <div>
    <div v-if="here" v-item-tip="here.item" :class="$style.here">
      <div :class="$style.hereLabel">{{ here.tag }} is here</div>
      <div :class="$style.hereRow">
        <span class="w-trunc flex items-center gap-1">
          <WIcon :src="ninjaIcon(here.item.type, here.item.name) ?? undefined" fallback="fas fa-coins" />{{ here.item.name }}
        </span>
        <span class="flex items-center gap-2" :class="$style.herePrice">
          <WPrice :chaos="here.chaos" :divine="divine" />
          <WDelta v-if="weekChange(here) != null" :value="weekChange(here)" title="Change over the last 7 days" :class="$style.delta" />
        </span>
      </div>
    </div>
    <div class="w-group-label">{{ here ? 'Others, each · week' : 'Refresh currency, each · week' }}</div>
    <WSkeleton v-if="!items.length" :rows="4" />
    <div v-else-if="!rows.length" class="w-faint text-xs" :class="$style.none">poe.ninja has no prices for these.</div>
    <div v-for="row in others" :key="row.item.name" v-item-tip="row.item" class="w-row" :class="$style.grid">
      <span class="w-trunc flex items-center gap-1">
        <WIcon :src="ninjaIcon(row.item.type, row.item.name) ?? undefined" fallback="fas fa-coins" />
        <span class="w-trunc">{{ row.item.name }}</span>
        <span class="w-dim text-xs">{{ row.tag }}</span>
      </span>
      <WPrice :chaos="row.chaos" :divine="divine" class="justify-end" />
      <WDelta v-if="weekChange(row) != null" :value="weekChange(row)" title="Change over the last 7 days" :class="$style.delta" class="text-right" />
      <span v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
// The Expedition dock card: what each vendor's refresh currency is worth,
// with the vendor in this encounter on top. No "best": prices are per unit
// and the four don't drop in the same amounts.
import { computed } from 'vue'
import { WDelta, WIcon, WPrice, WSkeleton, vItemTip } from '../ui'
import { ninjaIcon } from '../ui/game-icons'
import { expeditionRows, weekChange } from './data'
import type { PriceItem } from '../market/types'

const props = defineProps<{
  items: PriceItem[]
  divine: number | null
  vendor: string | null
}>()

const rows = computed(() => expeditionRows(props.items))
const here = computed(() => rows.value.find(r => r.tag === props.vendor) ?? null)
const others = computed(() => rows.value.filter(r => r !== here.value))
</script>

<style module>
.here {
  margin: 8px 8px 4px;
  padding: 8px 10px;
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-sm);
  background: var(--w-accent-soft);
}
.hereLabel {
  font-size: var(--w-fs-caps);
  letter-spacing: 0.08em;
  text-transform: var(--w-caps-case);
  color: var(--w-accent);
  font-family: var(--w-caps-face);
}
.hereRow { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 3px; }
.herePrice { flex: none; font-size: var(--w-fs-lg); font-weight: 600; }
.delta { font-size: var(--w-fs-sm); font-weight: 400; }
.grid { grid-template-columns: minmax(0, 1fr) 48px 52px; }
.none { padding: 2px var(--w-pad) 6px; }
</style>
