<template>
  <div v-if="own" :class="$style.line" data-deck="own-average">
    <span>
      <span class="w-dim">Your decks give</span> <span class="w-num">{{ money(own.perDeck) }}</span>
      <span class="w-dim"> each, </span><span class="w-num">{{ money(own.perDeckTrimmed) }}</span>
      <span class="w-dim"> without your luckiest 1%</span>
      <template v-if="deckChaos != null"><span class="w-dim"> · a deck sells for</span> <span class="w-num">{{ money(deckChaos) }}</span></template>
    </span>
    <WInfo :text="`From all ${own.decks.toLocaleString('en-US')} decks you've opened, at today's poe.ninja prices.${own.decks < MIN_OWN_DECKS ? ` Still a small sample: under ${MIN_OWN_DECKS} decks one card can swing it.` : ''}`" />
  </div>
</template>

<script setup lang="ts">
// D1: what a Stacked Deck gives you, from your own history.
import { computed } from 'vue'
import { WInfo } from '../ui'
import { formatChaos } from '../ui/format'
import { MIN_OWN_DECKS, ownAverage } from './deck'
import type { DeckRecord, PriceOf } from './deck'

const props = defineProps<{
  records: DeckRecord[]
  price: PriceOf
  deckChaos: number | null
  divine: number | null
}>()

const own = computed(() => ownAverage(props.records, props.price))
const money = (chaos: number) => formatChaos(chaos, props.divine)
</script>

<style module>
.line { display: flex; align-items: center; gap: 6px; font-size: var(--w-fs-sm); }
</style>
