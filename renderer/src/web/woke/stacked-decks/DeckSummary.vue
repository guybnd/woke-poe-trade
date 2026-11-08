<template>
  <div :class="$style.root">
    <div :class="$style.stats" data-deck="stats">
      <span class="w-dim">Opened</span><span class="w-num" data-stat="opened">{{ t.decks.toLocaleString('en-US') }}</span>
      <span class="w-dim">Spent</span><span class="w-num" data-stat="spent">{{ t.spent != null ? money(t.spent) : '—' }}</span>
      <span class="w-dim">Got</span><span class="w-num" data-stat="got">{{ money(t.got) }}</span>
      <span class="w-dim">Result</span>
      <span class="w-num font-semibold" data-stat="result" :class="tone(t.result)">{{ t.result != null ? signed(t.result) : '—' }}</span>
      <template v-if="t.top">
        <span class="w-dim" :title="`The result without one ${t.top.name}`">Without top card</span>
        <span class="w-num" data-stat="without-top" :class="tone(t.withoutTop)">{{ t.withoutTop != null ? signed(t.withoutTop) : '—' }}</span>
      </template>
    </div>
    <div v-if="deckChaos == null" class="text-xs" style="color: var(--w-warn);">No Stacked Deck price yet: Spent and Result wait for poe.ninja.</div>

    <ResultChart v-if="chart.length >= 2" :values="chart" :width="chartWidth" :label="`Running result after ${t.decks} decks`" />

    <div v-if="luck" :class="$style.luck" data-deck="luck">
      <span>
        <span class="w-dim">Expected</span> <span class="w-num">{{ money(luck.expectedPerDeck) }}</span>
        <span class="w-dim"> a deck · got</span> <span class="w-num" :class="luck.gotPerDeck >= luck.expectedPerDeck ? 'w-up' : 'w-down'">{{ money(luck.gotPerDeck) }}</span>
      </span>
      <span v-if="luck.percentile != null" class="w-dim">{{ luckText(luck.percentile) }}</span>
      <WInfo :text="luckInfo" />
    </div>

    <div v-if="t.unpriced" class="text-xs w-faint">{{ t.unpriced }} {{ t.unpriced === 1 ? 'card has' : 'cards have' }} no poe.ninja price and count as 0.</div>

    <div v-if="shown.length" :class="$style.table">
      <div v-for="r in shown" :key="r.name" :class="$style.row" data-deck="card">
        <WIcon :src="art(r.name)" fallback="fas fa-clone" />
        <span class="w-trunc" v-item-tip="{ type: 'DivinationCard', name: r.name }">{{ r.name }}</span>
        <span class="w-num w-dim">×{{ r.qty }}</span>
        <span class="w-num text-right">{{ r.each != null ? money(r.total) : '—' }}</span>
      </div>
      <div v-if="t.rows.length > shown.length" class="text-xs w-faint" :class="$style.more">and {{ t.rows.length - shown.length }} more cards</div>
    </div>
  </div>
</template>

<script setup lang="ts">
// One session's numbers (B1): Opened, Spent, Got, Result and without the top
// card, the running result, luck against the community weights (C3), and
// the cards by total value.
import { computed } from 'vue'
import { WIcon, WInfo, vItemTip } from '../ui'
import { formatChaos } from '../ui/format'
import { ninjaIcon } from '../ui/game-icons'
import ResultChart from './ResultChart.vue'
import { MIN_CALIBRATION_DECKS, luckText, runningResult, totals } from './deck'
import type { PriceOf } from './deck'
import { WEIGHTS_CREDIT } from './weights'
import type { Luck } from './prices'

const props = withDefaults(defineProps<{
  draws: string[]
  price: PriceOf
  deckChaos: number | null
  divine: number | null
  luck?: Luck | null
  // Cards listed (the rest are summed up in one line). 0: all.
  limit?: number
  chartWidth?: number
}>(), { luck: null, limit: 0, chartWidth: 280 })

const t = computed(() => totals(props.draws, props.price, props.deckChaos))
const chart = computed(() => runningResult(props.draws, props.price, props.deckChaos))
const shown = computed(() => props.limit > 0 ? t.value.rows.slice(0, props.limit) : t.value.rows)

const money = (chaos: number) => formatChaos(chaos, props.divine)
const signed = (chaos: number) => `${chaos > 0 ? '+' : ''}${money(chaos)}`
const tone = (v: number | null) => v == null ? '' : v >= 0 ? 'w-up' : 'w-down'
const art = (name: string) => ninjaIcon('DivinationCard', name) ?? undefined

const luckInfo = computed(() => {
  const l = props.luck
  if (!l) return ''
  const how = l.scale !== 1
    ? `Scaled by ${l.scale.toFixed(2)} to match your other ${l.ownDecks.toLocaleString('en-US')} decks, since the raw weights are known to expect too little.`
    : `Raw weights, which are known to expect too little; after ${MIN_CALIBRATION_DECKS} of your own decks they're scaled to match what you get.`
  return `An estimate. Expected: the value of a deck by how often each card drops, at today's poe.ninja prices. ${how}\n\n` +
    `Luck: how this session compares with simulated sessions of the same number of decks.\n\n${WEIGHTS_CREDIT}`
})
</script>

<style module>
.root { display: flex; flex-direction: column; gap: 6px; }
.stats { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 2px 10px; align-items: baseline; }
.luck { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: var(--w-fs-sm); }
.table { display: flex; flex-direction: column; }
.row { display: grid; grid-template-columns: var(--w-icon, 16px) minmax(0, 1fr) auto 4.5rem; gap: 6px; align-items: center; min-height: 22px; }
.more { padding-top: 2px; }
</style>
