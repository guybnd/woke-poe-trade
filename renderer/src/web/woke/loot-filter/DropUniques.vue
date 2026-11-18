<template>
  <UniquesOnBase v-if="list.length" :rows="list" title="Can drop as" :divine="store.prices.divine.value" no-price="—" :limit="LIMIT" :reset-key="facts.baseType">
    <template #aside>
      <span class="w-faint" :class="$style.src">{{ store.prices.updatedAt.value ? `poe.ninja · ${agoPhrase(store.prices.updatedAt.value)}` : 'no poe.ninja prices yet' }}</span>
    </template>
  </UniquesOnBase>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ITEM_BY_REF } from '@/assets/data'
import { agoPhrase } from '../ui'
import UniquesOnBase from '../shared/UniquesOnBase.vue'
import type { UniqueOnBaseRow } from '../shared/UniquesOnBase.vue'
import { ECONOMY_GROUPS } from './economy'
import { dropUniques, ownUnique, setterName } from './drop-uniques'
import { uniquesOnBase } from './prices'
import { loadTipDrops } from '../ui/tooltip/item-tip'
import { dropOf, dropSource, randomDropsFirst } from '../ui/tooltip/tip-content'
import type { TipPack } from '../ui/tooltip/tip-content'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import type { ItemFacts } from './item-facts'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
  facts: ItemFacts
}>()

const LIMIT = 6
const group = ECONOMY_GROUPS.find(g => g.unique)!

// Where the uniques that aren't random drops come from (the tooltip's wiki file).
const drops = shallowRef<TipPack['drops'] | null>(null)
loadTipDrops().then(d => { drops.value = d }).catch(() => {})

const rows = computed(() => {
  const base = props.facts.baseType
  if (props.facts.rarity !== 'Unique' || !base || !uniquesOnBase(base).length) return []
  const prices = props.store.prices
  // Only a price move says which unique set the tier; NeverSink's own tier,
  // or one the price tiers left alone (thin, volatile, locked), has no stated reason.
  const league = prices.currentLeague.value
  const move = props.config.priceTiers.on
    ? props.config.priceTiers.moves.find(m => m.type === group.type && m.base === base && (!m.league || !league || m.league === league))
    : undefined
  const setter = setterName(move?.note)
  const own = props.facts.identified ? ownUnique(props.facts.name, base) : null
  return dropUniques(prices.breakdown.value(group, base), prices.items.value, group.ninja, base, setter, own)
})
const list = computed<UniqueOnBaseRow[]>(() => randomDropsFirst(rows.value.map(u => ({
  key: u.name,
  name: u.name,
  refName: u.name,
  price: u.chaos == null ? null : { low: u.chaos, high: u.chaos, thin: u.thin },
  setsTier: u.setsTier,
  own: u.own,
  foulborn: u.foulborn,
  // A click price checks it, on this base.
  check: true,
  info: ITEM_BY_REF('UNIQUE', u.name)?.find(i => i.unique?.base === props.facts.baseType),
  restricted: dropSource(dropOf(drops.value ?? undefined, u.name))
})), u => !!u.restricted))

</script>

<style module>
.src {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}
</style>
