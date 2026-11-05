<template>
  <span v-if="w" :class="[$style.tag, $style[band]]" :title="title">{{ text }}</span>
  <span v-else-if="priceView === 'improved' && item.rarity === ItemRarity.Rare" :class="$style.room" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ItemRarity, ParsedItem } from '@/parser'
import { modWorth } from './check-state'
import { priceView } from './view'
import { worthBand, WORTH_SOURCE_LABEL } from './mod-worth'

// Small "~24c" tag on a mod row: how much of the price this mod carries.
const props = defineProps<{ statRef: string, item: ParsedItem }>()

const w = computed(() => {
  const m = modWorth.value
  return m && m.item === props.item ? m.map.get(props.statRef) ?? null : null
})
const band = computed(() => w.value ? worthBand(w.value) : 'adds')

const text = computed(() => {
  const v = w.value!
  if (band.value === 'nothing') return '~0'
  if (v.chaos != null) return `~${v.chaos >= 10 ? Math.round(v.chaos) : v.chaos.toFixed(1)}c`
  return `${Math.round(v.share * 100)}%`
})

const title = computed(() => {
  const v = w.value!
  const what = band.value === 'carry'
    ? 'Carries the price: By value keeps its min close to this roll'
    : band.value === 'nothing'
      ? 'Adds nothing: By value unticks it'
      : 'Adds some value: By value sets its min to the bottom of its tier'
  return `About ${Math.round(v.share * 100)}% of the price, ${WORTH_SOURCE_LABEL[v.source]}.\n${what}.`
})
</script>

<style module>
.tag {
  align-self: center;
  font-family: var(--w-num);
  font-size: var(--w-fs-xs);
  line-height: calc(16px * var(--w-text-scale, 1));
  padding: 0 5px;
  border-radius: var(--w-r-sm);
  white-space: nowrap;
  /* One width from "8%" to "~24c", and before the worth arrives. */
  min-width: calc(40px * var(--w-text-scale, 1));
  text-align: center;
}
.room { flex: none; width: calc(40px * var(--w-text-scale, 1)); }
.carry { background: var(--w-accent-soft); color: var(--w-accent); }
.adds { background: var(--w-panel-3); color: var(--w-fg); }
.nothing { color: var(--w-faint); }
</style>
