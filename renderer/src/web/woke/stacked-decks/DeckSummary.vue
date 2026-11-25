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
    <!-- C: count the cheap cards or not, right on the window. -->
    <div v-if="switchable && filter && filter.under > 0" :class="$style.switch" data-deck="cheap-switch">
      <span class="w-dim">Under {{ cutOff }}</span>
      <WSegmented :model-value="filter.count ? 'in' : 'out'" :options="COUNT_OPTIONS" @update:model-value="v => emit('count', v === 'in')" />
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

    <div v-if="notes.unlisted" class="text-xs w-faint" :title="notes.anyPriced ? NO_PRICE : undefined">{{ notes.unlisted }} {{ notes.anyPriced ? (notes.unlisted === 1 ? "card isn't on poe.ninja (too few trades)" : "cards aren't on poe.ninja (too few trades)") : (notes.unlisted === 1 ? 'card has no poe.ninja price' : 'cards have no poe.ninja price') }} and count as 0.</div>
    <div v-if="notes.held" class="text-xs w-faint" data-deck="held-note">{{ notes.held }} {{ notes.held === 1 ? 'card has a poe.ninja price that looks fake' : 'cards have poe.ninja prices that look fake' }} (<i class="fas fa-pause-circle" />): counted at the usual price, or 0. Hover the price for poe.ninja's.</div>

    <div v-if="shown.length || t.cheap.length" :class="$style.table">
      <CardLine v-for="r in shown" :key="r.name" :row="r" :divine="divine" :held="heldOf(r.name)" :title="priceTitle(r.name, r.each)" :editable="editable" data-deck="card"
        @price="emit('price', r.name, $event)" @out="emit('out', r.name, $event)" />
      <div v-if="t.rows.length > shown.length" class="text-xs w-faint" :class="$style.more">and {{ t.rows.length - shown.length }} more cards</div>
      <!-- Cards under the cut-off, folded into one line (A). -->
      <template v-if="t.cheap.length">
        <button type="button" :class="[$style.row, $style.fold]" data-deck="cheap" :aria-expanded="cheapOpen"
          :title="cheapTitle" @click="cheapOpen = !cheapOpen">
          <i class="fas text-xs" :class="cheapOpen ? 'fa-caret-down' : 'fa-caret-right'" />
          <span class="w-trunc">{{ t.cheapQty.toLocaleString('en-US') }} {{ t.cheapQty === 1 ? 'card' : 'cards' }} under {{ cutOff }}{{ filter && !filter.count ? ' · not counted' : '' }}</span>
          <span />
          <span class="w-num text-right">{{ money(t.cheapChaos) }}</span>
          <span />
        </button>
        <template v-if="cheapOpen">
          <CardLine v-for="r in t.cheap" :key="r.name" :row="r" :divine="divine" :held="heldOf(r.name)" :title="priceTitle(r.name, r.each)" :editable="editable" cheap data-deck="cheap-card"
            @price="emit('price', r.name, $event)" @out="emit('out', r.name, $event)" />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
// One session's numbers (B1): Opened, Spent, Got, Result and without the top
// card, the running result, luck against the community weights (C3), and
// the cards by total value.
import { computed } from 'vue'
import { useFold } from '../ui/fold'
import { WInfo, WSegmented } from '../ui'
import { formatChaos } from '../ui/format'
import ResultChart from './ResultChart.vue'
import { MIN_CALIBRATION_DECKS, luckText, runningResult, totals } from './deck'
import type { CardEdits, CardFilter, PriceOf } from './deck'
import CardLine from './CardLine.vue'
import { WEIGHTS_CREDIT, dropChance, isCommonCard } from './weights'
import type { HeldPrice, Luck } from './prices'
import { heldWhy } from '../shared/price-trust'

const props = withDefaults(defineProps<{
  draws: string[]
  price: PriceOf
  deckChaos: number | null
  divine: number | null
  luck?: Luck | null
  // Cards listed (the rest are summed up in one line). 0: all.
  limit?: number
  chartWidth?: number
  // Cheap cards fold into one line (and maybe leave the totals). null: all listed.
  filter?: CardFilter | null
  // Shows the counted / not counted switch (emits `count`).
  switchable?: boolean
  // poe.ninja's price for a card when a fake-price check set it aside.
  held?: ((name: string) => HeldPrice | null) | null
  // Your prices and left-out cards; editable lets you change them.
  edits?: CardEdits | null
  editable?: boolean
}>(), { luck: null, limit: 0, chartWidth: 280, filter: null, switchable: false, held: null, edits: null, editable: false })
const emit = defineEmits<{
  (e: 'count', v: boolean): void
  // Your price for one card, in chaos; null: poe.ninja's again.
  (e: 'price', name: string, chaos: number | null): void
  (e: 'out', name: string, on: boolean): void
}>()
const COUNT_OPTIONS = [{ value: 'in', label: 'Hidden, counted' }, { value: 'out', label: 'Not counted' }]

const t = computed(() => totals(props.draws, props.price, props.deckChaos, props.filter, name => isCommonCard(name) && !heldOf(name), props.edits))
const NO_PRICE = 'poe.ninja leaves out cards that trade too rarely to price. Common ones fold with the cheap cards. Counted as 0.'
const heldOf = (name: string) => props.held?.(name) ?? null
// Cards without a price, apart from those a fake-price check set aside, and those.
const notes = computed(() => {
  let unlisted = 0
  let held = 0
  let anyPriced = false
  for (const r of [...t.value.rows, ...t.value.cheap]) {
    // Left out, or your price: these notes don't apply.
    if (r.out) continue
    if (heldOf(r.name) && !r.mine) held += r.qty
    else if (r.each == null) unlisted += r.qty
    else anyPriced = true
  }
  return { unlisted, held, anyPriced }
})
function priceTitle (name: string, each: number | null): string | undefined {
  const h = heldOf(name)
  if (h) {
    const why = heldWhy(h)
    if (h.kind === 'drop-rate') return `poe.ninja: ${money(h.ninja)} each, ${why}: it drops in about 1 in ${Math.round(1 / (dropChance(name) || 1))} decks. That's a few fake listings, so it counts as 0.`
    return `poe.ninja: ${money(h.ninja)} each, ${why}. Prices like that have been a few fake listings, so ${h.chaos != null ? `it counts at its usual ${money(h.chaos)}` : 'it counts as 0'} until the price holds.`
  }
  return each == null ? NO_PRICE : undefined
}
const chart = computed(() => runningResult(props.draws, props.price, props.deckChaos, undefined, props.filter, props.edits))
const cheapOpen = useFold('decks.cheap')
const cutOff = computed(() => formatChaos(props.filter?.under ?? 0, null, 'chaos'))
const cheapTitle = computed(() => props.filter?.count === false
  ? 'Left out of Got, Result and the chart. Change it in the Stacked decks settings.'
  : 'Still counted in Got and Result. Change it in the Stacked decks settings.')
const shown = computed(() => props.limit > 0 ? t.value.rows.slice(0, props.limit) : t.value.rows)

const money = (chaos: number) => formatChaos(chaos, props.divine)
const signed = (chaos: number) => `${chaos > 0 ? '+' : ''}${money(chaos)}`
const tone = (v: number | null) => v == null ? '' : v >= 0 ? 'w-up' : 'w-down'

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
.row { display: grid; grid-template-columns: var(--w-icon, 16px) minmax(0, 1fr) auto 4.5rem 2.6em; gap: 6px; align-items: center; min-height: 22px; }
.more { padding-top: 2px; }
.fold {
  width: 100%;
  margin-top: 2px;
  padding: 0;
  border: 0;
  border-top: 1px dashed var(--w-line);
  background: none;
  color: var(--w-dim);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.fold:hover { color: var(--w-fg); background: var(--w-line-soft); }
.fold > i { justify-self: center; }
.switch { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: var(--w-fs-sm); }
</style>
