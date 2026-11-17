<template>
  <UniquesOnBase :rows="rows" title="Uniques on this base" :divine="divine" :no-price="noPrice" @pick="pick" />
</template>

<script setup lang="ts">
// A base's uniques under its detail (the shared list): priced ones open
// their prices on click.
import { computed } from 'vue'
import UniquesOnBase from '../shared/UniquesOnBase.vue'
import type { UniqueOnBaseRow } from '../shared/UniquesOnBase.vue'
import { groupTip } from './search'
import type { PriceGroup } from './search'

export interface PricedUnique { id: string, name: string, group: PriceGroup }
export interface UnpricedUnique { name: string, refName: string, icon?: string }

const props = defineProps<{ priced: PricedUnique[], unpriced: UnpricedUnique[], divine: number | null, noPrice: string }>()
const emit = defineEmits<{ pick: [entry: PricedUnique] }>()

const rows = computed<UniqueOnBaseRow[]>(() => [
  ...props.priced.map(u => ({
    key: u.id,
    name: u.name,
    refName: u.group.name,
    tip: groupTip(u.group),
    price: { low: u.group.low, high: u.group.high, bulk: u.group.high < 1 },
    pick: true
  })),
  ...props.unpriced.map(u => ({ key: u.refName, name: u.name, refName: u.refName, art: u.icon, price: null }))
])

function pick (row: UniqueOnBaseRow) {
  const u = props.priced.find(p => p.id === row.key)
  if (u) emit('pick', u)
}
</script>
