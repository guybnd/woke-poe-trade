<template>
  <div style="padding: 4px var(--w-pad) 6px;" class="flex flex-col gap-0.5">
    <div v-for="(t, i) in threads" :key="'t' + i" class="flex justify-between gap-2">
      <span class="flex items-center gap-1 min-w-0"><WIcon :mechanic="t.type.toLowerCase()" fallback="fas fa-circle" /><span class="w-trunc">{{ t.count }}× {{ t.type }} Thread</span></span>
      <span v-if="t.item" class="w-num w-dim">{{ fmt(t.item.chaos * t.count) }}</span>
    </div>
    <div v-for="(p, i) in lines" :key="'c' + i" class="flex justify-between gap-2">
      <span v-item-tip="p.item ?? { name: p.name }" class="flex items-center gap-1 min-w-0"><WIcon :src="p.item ? ninjaIcon(p.item.type, p.item.name) ?? undefined : undefined" fallback="fas fa-coins" /><span class="w-trunc">{{ p.qty > 1 ? p.qty + '× ' : '' }}{{ p.name }}</span></span>
      <span v-if="p.item" class="w-num w-dim">{{ fmt(p.item.chaos * p.qty) }}</span>
    </div>
    <div v-if="cost != null" class="flex justify-between w-num"><span class="w-dim">Per map</span>
      <span class="w-accent">{{ fmt(cost) }}</span></div>
    <div v-if="strategy.device.trim()" class="w-dim text-xs whitespace-pre-wrap">{{ strategy.device.trim() }}</div>
    <div v-for="r in regexes" :key="r.text" class="flex items-center gap-1 text-xs">
      <span class="w-dim w-trunc" style="max-width: 6rem;">{{ r.name }}</span>
      <code class="w-trunc" style="font-family: var(--w-num);">{{ r.text }}</code>
      <button class="w-icon-btn" title="Copy" @click="copy(r.text)"><i :class="copied === r.text ? 'fas fa-check' : 'far fa-copy'" /></button>
    </div>
  </div>
</template>

<script setup lang="ts">
// The hideout card: what the picked strategy puts in each map, priced, and its regexes.
import { computed } from 'vue'
import { WIcon, useCopy, vItemTip } from '../ui'
import { ninjaIcon } from '../ui/game-icons'
import { formatChaos } from '../ui/format'
import { usePriceIndex } from '../market/price-index'
import { parseCostLines, priceLines, priceThreads } from './loadout'
import type { AtlasStrategy } from './strategies'

const props = defineProps<{ strategy: AtlasStrategy, regexes: Array<{ name: string, text: string }> }>()

const { copied, copy } = useCopy()
const prices = usePriceIndex()
function fmt (chaos: number) { return formatChaos(chaos, prices.snapshot.value?.divine ?? null) }
const items = computed(() => prices.snapshot.value?.items ?? null)
const lines = computed(() => {
  const l = parseCostLines(props.strategy.scarabs)
  return items.value ? priceLines(l, items.value) : l.map(x => ({ ...x, item: null }))
})
const threads = computed(() => items.value ? priceThreads(props.strategy.threads, items.value) : props.strategy.threads.map(t => ({ ...t, item: null })))
const cost = computed(() => {
  const parts = [...lines.value.filter(p => p.item).map(p => p.item!.chaos * p.qty), ...threads.value.filter(t => t.item).map(t => t.item!.chaos * t.count)]
  return parts.length ? parts.reduce((a, b) => a + b, 0) : null
})
</script>
