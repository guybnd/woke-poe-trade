<template>
  <div v-if="rows.length" :class="$style.section">
    <div class="w-group-label flex items-center gap-2" :class="$style.label">
      <span class="grow">Can drop as</span>
      <span class="w-faint" :class="$style.src">{{ store.prices.updatedAt.value ? `poe.ninja · ${agoPhrase(store.prices.updatedAt.value)}` : 'no poe.ninja prices yet' }}</span>
    </div>
    <div :class="$style.list">
      <div v-for="u in shown" :key="u.name" :class="[$style.row, { [$style.own]: u.own }]">
        <span :class="$style.name" class="w-trunc" :title="u.name">{{ u.name }}</span>
        <span v-if="u.setsTier" :class="$style.tag" title="The price lookup puts this base's tier at this unique's price">sets tier</span>
        <span class="grow" />
        <WPrice :chaos="u.chaos" :divine="store.prices.divine.value" :class="{ 'w-faint': u.thin }" :title="u.thin ? 'Few listings: poe.ninja often had no price for it this week' : undefined" />
        <div v-if="u.foulborn" :class="$style.foulborn">
          Foulborn {{ range(u.foulborn) }}{{ u.foulborn.thin ? ', few listings' : '' }}
        </div>
      </div>
      <button v-if="rows.length > LIMIT" type="button" class="w-focusable" :class="$style.more" @click="all = !all">
        {{ all ? 'Fewer' : `${rows.length - LIMIT} more` }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { WPrice, agoPhrase } from '../ui'
import { ECONOMY_GROUPS } from './economy'
import { dropUniques, setterName } from './drop-uniques'
import { uniquesOnBase } from './prices'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import type { ItemFacts } from './item-facts'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
  facts: ItemFacts
}>()

const LIMIT = 6
const all = ref(false)
const group = ECONOMY_GROUPS.find(g => g.unique)!

const rows = computed(() => {
  const base = props.facts.baseType
  if (props.facts.rarity !== 'Unique' || !base || !uniquesOnBase(base).length) return []
  const prices = props.store.prices
  // Only price tiers move a base by its uniques' prices; NeverSink's own tier
  // has no stated reason, so nothing is tagged then.
  const setter = props.config.priceTiers.on ? setterName(prices.lookup.value?.(group, base)?.note) : null
  const own = props.facts.identified && props.facts.name !== base ? props.facts.name : null
  return dropUniques(prices.breakdown.value(group, base), prices.items.value, group.ninja, base, setter, own)
})
const shown = computed(() => all.value ? rows.value : rows.value.slice(0, LIMIT))

function range (f: { min: number, max: number }): string {
  const c = (n: number) => n >= 10 ? Math.round(n).toString() : String(Math.round(n * 10) / 10)
  return f.min === f.max ? `${c(f.max)}c` : `${c(f.min)}–${c(f.max)}c`
}
</script>

<style module>
.section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.label {
  padding: 0;
}
.src {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}
.list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--w-line-soft);
  border-radius: var(--w-r-sm);
}
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 6px;
  padding: 2px 8px;
  border-top: 1px solid var(--w-line-soft);
}
.row:first-child {
  border-top: 0;
}
.own {
  background: var(--w-accent-soft);
}
.name {
  min-width: 0;
  color: var(--w-r-unique);
}
.tag {
  flex-shrink: 0;
  font-size: var(--w-fs-xs);
  color: var(--w-accent);
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-sm);
  padding: 0 4px;
  line-height: 1.3;
}
.foulborn {
  flex-basis: 100%;
  font-size: var(--w-fs-xs);
  color: var(--w-faint);
}
.more {
  padding: 2px 8px;
  border-top: 1px solid var(--w-line-soft);
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  text-align: left;
}
.more:hover {
  color: var(--w-fg);
}
</style>
