<template>
  <div v-if="offers.length" :class="$style.wrap" data-offer-history>
    <button type="button" :class="$style.toggle" :aria-expanded="open" @click="$emit('toggle')">
      <i class="fas" :class="open ? 'fa-chevron-down' : 'fa-chevron-right'" :style="{ width: '10px' }" />
      <span>History</span>
      <span class="w-faint w-num">{{ offers.length }}</span>
    </button>
    <template v-if="open">
      <OfferRow v-for="o in visible" :key="o.id" :offer="o" :now="now" :row-style="rowStyle" :art="artFor(o)" @reopen="$emit('reopen', o)" @remove="$emit('remove', o)" />
      <button v-if="offers.length > limit" type="button" :class="$style.more" @click="limit += PAGE">Show older ({{ offers.length - limit }} more)</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import OfferRow from './OfferRow.vue'
import type { Offer } from './book'
import type { TradeRowStyle } from './widget'

// A long history shouldn't draw hundreds of rows into a hover card.
const PAGE = 100

const props = defineProps<{
  offers: Offer[]
  open: boolean
  now: number
  rowStyle: TradeRowStyle
  artFor: (o: Offer) => string | null
}>()

defineEmits<{
  (e: 'toggle'): void
  (e: 'reopen' | 'remove', o: Offer): void
}>()

const limit = shallowRef(PAGE)
const visible = computed(() => props.offers.slice(0, limit.value))
</script>

<style module>
.wrap { display: flex; flex-direction: column; border-top: 1px solid var(--w-line); }
.toggle { display: flex; align-items: center; gap: 6px; min-height: calc(24px * var(--w-text-scale, 1)); padding: 0 var(--w-pad); background: none; border: 0; color: var(--w-dim); font: inherit; font-size: calc(11.5px * var(--w-text-scale, 1)); cursor: pointer; text-align: left; }
.toggle:hover { color: var(--w-fg); }
.toggle:focus-visible, .more:focus-visible { outline: 2px solid var(--w-accent); outline-offset: -2px; }
.more { min-height: calc(24px * var(--w-text-scale, 1)); padding: 0 var(--w-pad); background: none; border: 0; border-top: 1px solid var(--w-line); color: var(--w-dim); font: inherit; font-size: calc(11.5px * var(--w-text-scale, 1)); cursor: pointer; text-align: left; }
.more:hover { color: var(--w-fg); }
</style>
