<template>
  <span v-if="v" :class="[$style.chip, $style[v.verdict]]" :title="v.title" data-deck="verdict">
    <i class="fas fa-layer-group" :class="$style.icon" /> {{ v.label }} · {{ v.perDeck }}/deck
  </span>
</template>

<script setup lang="ts">
// C1: on a Stacked Deck price check, open them or sell them? From your own
// decks (D1) once there are enough, else from the community weights (D2).
import { computed, watch } from 'vue'
import type { ParsedItem } from '@/parser'
import { AppConfig } from '@/web/Config'
import { isModuleOn } from '../modules'
import { formatChaos } from '../ui/format'
import { MIN_OWN_DECKS, STACKED_DECK, expectedValue, openOrSell, ownAverage } from './deck'
import { useDeckPrices } from './prices'
import { WEIGHTS, WEIGHTS_CREDIT } from './weights'
import { useDeckStore } from './store'

const props = defineProps<{ item: ParsedItem }>()

const isDeck = computed(() => props.item.info.refName === STACKED_DECK && isModuleOn(AppConfig(), 'stacked-decks'))
const store = useDeckStore()
const { price, deckChaos, divine } = useDeckPrices()
watch(isDeck, (on) => { if (on) store.load() }, { immediate: true })

const LABEL = { open: 'Open them', luck: 'Open for luck', sell: 'Sell them' } as const

const v = computed(() => {
  if (!isDeck.value || deckChaos.value == null) return null
  const deck = deckChaos.value
  const money = (c: number) => formatChaos(c, divine.value)
  const own = ownAverage(store.records.value, price.value)
  if (own && own.decks >= MIN_OWN_DECKS) {
    const verdict = openOrSell(own, deck)
    return {
      verdict,
      label: LABEL[verdict],
      perDeck: money(own.perDeck),
      title: `Your ${own.decks.toLocaleString('en-US')} decks give ${money(own.perDeck)} each at today's prices, ` +
        `${money(own.perDeckTrimmed)} without your luckiest 1%. A deck sells for ${money(deck)}.` +
        (verdict === 'luck' ? ' Opening only pays with a lucky hit.' : '')
    }
  }
  const e = expectedValue(WEIGHTS, price.value)
  if (!e) return null
  // Without your own history there's no luck-free number: one or the other.
  const verdict = e.perDeck > deck ? 'open' : 'sell'
  return {
    verdict,
    label: LABEL[verdict],
    perDeck: `~${money(e.perDeck)}`,
    title: `An estimate: a deck is worth about ${money(e.perDeck)} by how often each card drops, at today's poe.ninja prices; it sells for ${money(deck)}. ` +
      `The weights are known to expect a little too little. After ${MIN_OWN_DECKS} decks of your own this uses what you got instead.\n${WEIGHTS_CREDIT}`
  }
})
</script>

<style module>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 0.5rem;
  padding: 0 8px;
  border-radius: var(--w-r-pill);
  line-height: calc(18px * var(--w-text-scale, 1));
  font-size: var(--w-fs-sm);
  white-space: nowrap;
  border: 1px solid var(--w-line-strong);
  font-variant-numeric: tabular-nums;
}
.open { color: var(--w-up); background: color-mix(in srgb, var(--w-up) 12%, transparent); }
.luck { color: var(--w-warn); }
.sell { color: var(--w-dim); }
.icon { font-size: var(--w-fs-xs); }
</style>
