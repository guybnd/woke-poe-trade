<template>
  <div class="flex flex-col gap-2" data-deck="history">
    <WBanner v-if="store.error.value">Couldn't read your deck sessions: {{ store.error.value }}
      <template #actions><WButton size="sm" @click="store.load(true)">Retry</WButton></template>
    </WBanner>
    <WSkeleton v-else-if="!store.loaded.value" :rows="4" />
    <template v-else-if="!open">
      <WEmpty v-if="!list.length" :art="{ item: STACKED_DECK }">Stacked Deck sessions show here once one ends.</WEmpty>
      <template v-else>
        <div :class="$style.totals">
          <span class="w-dim">{{ list.length }} {{ list.length === 1 ? 'session' : 'sessions' }} · {{ allDecks.toLocaleString('en-US') }} decks</span>
          <span class="w-num font-semibold" :class="tone(allResult)">{{ allResult != null ? signed(allResult) : '—' }}</span>
        </div>
        <div>
          <div class="w-row w-row--head px-0" :class="$style.grid">
            <span>When</span><span class="text-right">Decks</span><span>Best card</span><span class="text-right">{{ unit === 'div' ? 'div' : 'c' }}</span>
          </div>
          <button v-for="row in rows" :key="row.r.id" type="button" class="w-row px-0 w-full text-left w-focusable" :class="$style.grid"
            @click="openId = row.r.id" @keydown.delete.prevent="remove(row.r)">
            <span class="w-trunc w-dim">{{ formatSessionDate(row.r.startedAt) }}</span>
            <span class="text-right w-num">{{ row.r.decks.toLocaleString('en-US') }}</span>
            <span class="w-trunc">{{ row.t.top?.name ?? '—' }}</span>
            <span class="text-right w-num" :class="tone(row.t.result)">{{ row.t.result != null ? signed(row.t.result, row.r) : '—' }}</span>
          </button>
        </div>
        <OwnAverageLine :records="store.records.value" :price="price" :deck-chaos="deckChaos" :divine="divine" />
      </template>
    </template>
    <template v-else>
      <div class="flex justify-between gap-2 items-baseline">
        <span class="min-w-0 w-trunc">
          <button class="w-icon-btn" title="Back" @click="openId = null"><i class="fas fa-chevron-left" /></button>
          <span class="font-medium">{{ formatSessionDate(open.startedAt) }}</span>
          <span class="w-dim"> · {{ formatDuration(open.endedAt - open.startedAt) }}</span>
        </span>
        <WButton size="sm" variant="ghost" icon="fas fa-trash" title="You can undo" @click="remove(open)">Delete</WButton>
      </div>
      <DeckSummary :draws="open.draws" :price="recordPrice(open)" :deck-chaos="open.deckChaos" :divine="open.divine" :luck="openLuck" />
      <div class="text-xs w-faint">At the prices when the session ended.</div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Session analytics' Stacked decks tab: every saved deck session.
import { computed, shallowRef } from 'vue'
import { WBanner, WButton, WEmpty, WSkeleton, toast } from '../ui'
import { formatChaos, formatDuration } from '../ui/format'
import { formatSessionDate, inRange } from '../analytics/stats'
import type { AnalyticsRange, AnalyticsUnit } from '../analytics/types'
import DeckSummary from './DeckSummary.vue'
import OwnAverageLine from './OwnAverageLine.vue'
import { STACKED_DECK, recordPrice, totals } from './deck'
import type { DeckRecord } from './deck'
import { luckFor, useDeckPrices } from './prices'
import { useDeckStore } from './store'

const props = defineProps<{
  range: AnalyticsRange
  unit: AnalyticsUnit
  league: string
  now: number
}>()

const store = useDeckStore()
store.load(true)
const { price, deckChaos, divine, fetch } = useDeckPrices()
fetch()

const list = computed(() => store.records.value.filter(r =>
  (props.range === 'all' || r.league === props.league) && inRange(r.endedAt, props.range, props.now)))
const rows = computed(() => list.value.map(r => ({ r, t: totals(r.draws, recordPrice(r), r.deckChaos) })))
const allDecks = computed(() => list.value.reduce((n, r) => n + r.decks, 0))
// Each session in divines at its own rate.
const allResult = computed(() => {
  let sum = 0
  for (const { r, t } of rows.value) {
    if (t.result == null) return null
    sum += props.unit === 'div' ? t.result / (r.divine ?? divine.value ?? NaN) : t.result
  }
  return Number.isFinite(sum) ? sum : null
})

function signed (v: number, r?: DeckRecord) {
  // allResult is already in the unit; a row is in chaos.
  const n = r && props.unit === 'div' ? v / (r.divine ?? divine.value ?? NaN) : v
  if (!Number.isFinite(n)) return '—'
  const text = props.unit === 'div' ? formatChaos(n, 1, 'div') : formatChaos(n, null, 'chaos')
  return `${n > 0 ? '+' : ''}${text}`
}
const tone = (v: number | null) => v == null ? '' : v >= 0 ? 'w-up' : 'w-down'

const openId = shallowRef<string | null>(null)
const open = computed(() => store.records.value.find(r => r.id === openId.value) ?? null)
const openLuck = computed(() => {
  const r = open.value
  if (!r) return null
  const px = recordPrice(r)
  return luckFor(r.draws, totals(r.draws, px, null).got, r.id, px, store.records.value)
})

function remove (r: DeckRecord) {
  openId.value = null
  store.remove(r.id).catch((err: Error) => { toast(`Couldn't delete it: ${err.message}`) })
  toast('Deck session deleted', {
    undo: () => { store.save(r).catch(() => {}) }
  })
}
</script>

<style module>
.grid { grid-template-columns: 8.5rem 3.5rem minmax(0, 1fr) 4.5rem; }
.totals { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
</style>
