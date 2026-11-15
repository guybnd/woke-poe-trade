<template>
  <div :class="[$style.row, $style.head]"><span>Uniques on this base</span><span class="text-right">Price</span></div>
  <button v-for="u in priced" :key="u.id" v-item-tip="groupTip(u.group)" tabindex="-1" :class="[$style.row, $style.btn]" @click="emit('pick', u)">
    <span :class="$style.name"><WIcon :src="ninjaIcon(u.group.type, u.group.name) ?? undefined" size="sm" /><span class="w-trunc w-rarity-unique">{{ u.name }}</span></span>
    <span :class="$style.range"><template v-if="u.group.low !== u.group.high"><WPrice :chaos="u.group.low" :divine="divine" /> to </template><WPrice :chaos="u.group.high" :divine="divine" /></span>
  </button>
  <div v-for="u in unpriced" :key="u.refName" v-item-tip="{ name: u.refName }" :class="$style.row">
    <span :class="$style.name"><WIcon :src="u.icon" size="sm" /><span class="w-trunc w-rarity-unique">{{ u.name }}</span></span>
    <span class="w-dim text-right">{{ noPrice }}</span>
  </div>
</template>

<script setup lang="ts">
// A base's uniques under its detail: priced ones open their prices on click.
import { WIcon, WPrice, ninjaIcon, vItemTip } from '../ui'
import { groupTip } from './search'
import type { PriceGroup } from './search'

export interface PricedUnique { id: string, name: string, group: PriceGroup }
export interface UnpricedUnique { name: string, refName: string, icon?: string }

defineProps<{ priced: PricedUnique[], unpriced: UnpricedUnique[], divine: number | null, noPrice: string }>()
const emit = defineEmits<{ pick: [entry: PricedUnique] }>()
</script>

<style module>
.row { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 6px; align-items: center; width: 100%; min-height: var(--w-row-h); border-bottom: 1px solid var(--w-line-soft); }
.head { margin-top: var(--w-s3); min-height: calc(24px * var(--w-text-scale, 1)); font-size: var(--w-fs-caps); font-weight: var(--w-caps-weight); letter-spacing: 0.05em; text-transform: var(--w-caps-case); color: var(--w-dim); border-bottom: 1px solid var(--w-line); font-family: var(--w-caps-face); }
.btn { text-align: left; }
.btn:hover { background: var(--w-panel-2); }
.name { display: flex; align-items: center; gap: var(--w-s2); min-width: 0; }
.range { flex: none; display: inline-flex; align-items: center; gap: 4px; }
</style>
