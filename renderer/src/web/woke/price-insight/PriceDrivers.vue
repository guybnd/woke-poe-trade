<template>
  <div v-if="candidates.length && verdictExpanded" :class="$style.box">
    <div :class="$style.head">
      <span :class="$style.title">What drives the price</span>
      <span class="flex-1" />
      <span v-if="waiting" class="w-dim text-xs">rate limit, waiting {{ waiting }}s…</span>
      <span v-else-if="busy" class="w-dim text-xs">searching…</span>
    </div>

    <template v-if="!drivers.length && !busyDrivers">
      <div :class="$style.cands">
        <span class="w-dim text-xs">Will test:</span>
        <span v-for="c in candidates" :key="c.statRef" :class="$style.cand" class="w-trunc">{{ c.text }}</span>
      </div>
      <div :class="$style.actions">
        <button type="button" :class="$style.btn" :disabled="busy || stale || baseFair == null || measureWait > 0" @click="measure"
          :title="baseFair == null ? 'Needs a price from the main search first' : measureWait > 0 ? `Would hit the trade site's rate limit. Ready in ${measureWait}s.` : 'Searches again with each mod removed to see how much the price drops'">
          <template v-if="measureWait > 0">Measure (ready in {{ measureWait }}s)</template>
          <template v-else>Measure ({{ candidates.length }} {{ candidates.length === 1 ? 'search' : 'searches' }})</template>
        </button>
        <button v-if="fewListings && !ladder.length" type="button" :class="$style.btn" :disabled="busy || stale || ladderWait > 0" @click="widen"
          :title="ladderWait > 0 ? `Would hit the trade site's rate limit. Ready in ${ladderWait}s.` : 'Too few listings: search again with only the key mods, then with lower rolls (up to 2 searches)'">
          Widen search<template v-if="ladderWait > 0"> ({{ ladderWait }}s)</template>
        </button>
        <span class="w-faint text-xs" title="Searches you can make right now without hitting the trade site's rate limit">{{ budget.left }} searches free</span>
      </div>
    </template>

    <div v-for="d in shownDrivers" :key="d.statRef" :class="$style.driver">
      <span class="w-trunc" :class="{ 'w-dim': d.adds == null || (d.share ?? 0) < 0.1 }">{{ d.text }}</span>
      <span :class="$style.bar"><span :style="{ width: Math.round((d.share ?? 0) * 100) + '%' }" /></span>
      <span v-if="d.adds == null" class="w-faint text-xs" title="Nothing listed without this mod">—</span>
      <span v-else class="text-xs w-num" :title="'Fair price without it: ' + Math.round(d.without ?? 0) + 'c'">
        +<w-price :chaos="d.adds" :divine="divine" />
      </span>
    </div>
    <div v-if="drivers.length && !busyDrivers" class="w-dim text-xs">
      {{ driverSummary }}
    </div>

    <div v-for="s in ladder" :key="s.step" :class="$style.step">
      <span class="w-dim">{{ LADDER_LABEL[s.step] }}</span>
      <span class="flex-1" />
      <span class="w-dim text-xs">{{ s.insight.kept.length }} of {{ s.total }}</span>
      <w-price v-if="s.insight.range" :chaos="s.insight.range.fair" :divine="divine" />
      <span v-else class="w-faint">none</span>
    </div>

    <div v-if="error" class="w-down text-xs">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, onUnmounted } from 'vue'
import { ItemRarity, ParsedItem } from '@/parser'
import type { ItemFilters, FilterOrGroup } from '@/web/price-check/filters/interfaces'
import { WPrice } from '../ui'
import type { Insight, InsightOptions } from './insight'
import { CANCELLED, driverSeed, pickCandidates, measureDrivers, runLadder, LADDER_LABEL, searchBudget, searchKey, cachedDrivers, cacheDrivers, cachedLadder, cacheLadder } from './drivers'
import { verdictExpanded } from './view'
import { measuredDrivers } from './check-state'
import type { DriverResult, LadderResult } from './drivers'

const props = defineProps<{
  item: ParsedItem
  filters: ItemFilters
  stats: FilterOrGroup[]
  insight: Insight
  options: InsightOptions
  divine: number | undefined
  /** True once the main search has finished loading listings. */
  ready: boolean
  /** Filters changed since this search: spend no more searches on the old ones. */
  stale?: boolean
}>()

const candidates = computed(() => props.item.rarity === ItemRarity.Rare
  ? pickCandidates(props.stats, driverSeed.value)
  : [])

const baseFair = computed(() => props.insight.range?.fair ?? null)
const fewListings = computed(() => props.ready && props.insight.kept.length < 5)

const drivers = shallowRef<DriverResult[]>([])
const ladder = shallowRef<LadderResult[]>([])
const busyDrivers = shallowRef(false)
const busyLadder = shallowRef(false)
const busy = computed(() => busyDrivers.value || busyLadder.value)
const waiting = shallowRef<number | null>(null)
const error = shallowRef<string | null>(null)

// Rate-limit budget, refreshed every second while the panel is open.
const tick = shallowRef(0)
const ticker = setInterval(() => { tick.value++ }, 1000)
let gone = false
const isCancelled = () => gone || Boolean(props.stale)
onUnmounted(() => { clearInterval(ticker); gone = true })
const budget = computed(() => searchBudget(candidates.value.length, tick.value))
const measureWait = computed(() => Math.ceil(budget.value.waitMs / 1000))
const ladderWait = computed(() => Math.ceil(searchBudget(2, tick.value).waitMs / 1000))

const driverKey = computed(() => searchKey(props.filters, props.stats, candidates.value.map(c => c.statRef)))
drivers.value = cachedDrivers(driverKey.value) ?? []
ladder.value = cachedLadder(driverKey.value) ?? []

// Measured drivers also feed the mod worth tags and "By value".
function shareDrivers () {
  if (drivers.value.length) measuredDrivers.value = { item: props.item, list: drivers.value }
}
shareDrivers()

// While measuring, show finished results plus placeholders for the rest.
const shownDrivers = computed<DriverResult[]>(() => {
  if (!busyDrivers.value) return drivers.value
  const done = new Set(drivers.value.map(d => d.statRef))
  return [
    ...drivers.value,
    ...candidates.value.filter(c => !done.has(c.statRef))
      .map(c => ({ statRef: c.statRef, text: c.text, without: null, adds: null, share: null }))
  ]
})

const driverSummary = computed(() => {
  const top = drivers.value[0]
  if (!top || top.adds == null || (top.share ?? 0) < 0.25) {
    return 'No single mod carries the price: it comes from the combination.'
  }
  return `Most of the value comes from ${top.text}.`
})

function showFailure (err: unknown) {
  return (err as Error).message !== CANCELLED
}

async function measure () {
  if (baseFair.value == null) return
  busyDrivers.value = true
  error.value = null
  drivers.value = []
  const key = driverKey.value
  try {
    drivers.value = await measureDrivers(props.filters, props.stats, baseFair.value, candidates.value, props.options,
      (done, wait) => { drivers.value = done; waiting.value = wait }, isCancelled)
    cacheDrivers(key, drivers.value)
    shareDrivers()
  } catch (err) {
    if (showFailure(err)) error.value = (err as Error).message
  } finally {
    // Cancelled keeps its rows until the next search replaces this panel, so nothing moves.
    if (!isCancelled()) busyDrivers.value = false
    waiting.value = null
  }
}

async function widen () {
  busyLadder.value = true
  error.value = null
  const key = driverKey.value
  try {
    ladder.value = await runLadder(props.filters, props.stats, candidates.value, props.options,
      (steps, wait) => { ladder.value = steps; waiting.value = wait }, isCancelled)
    cacheLadder(key, ladder.value)
  } catch (err) {
    if (showFailure(err)) error.value = (err as Error).message
  } finally {
    if (!isCancelled()) busyLadder.value = false
    waiting.value = null
  }
}
</script>

<style module>
.box {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 1rem;
  margin: 0;
  border-bottom: 1px solid var(--w-line);
  background: var(--w-pc-well, var(--w-panel-solid));
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-text);
}
.head { display: flex; align-items: center; gap: 6px; }
.title { font-family: var(--w-head); font-size: var(--w-head-size); letter-spacing: var(--w-head-track); color: var(--w-accent); }
.cands { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.cand {
  max-width: 100%;
  font-size: var(--w-fs-sm);
  padding: 0 6px;
  border-radius: var(--w-r-sm);
  background: var(--w-panel-3);
}
.actions { display: flex; gap: 6px; }
.btn {
  padding: 2px 10px;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line-strong);
  background: var(--w-panel-2);
  font-size: var(--w-fs-md);
}
.btn:hover:not(:disabled) { background: var(--w-accent-soft); }
.btn:disabled { opacity: 0.5; }
.driver { display: grid; grid-template-columns: minmax(0, 1fr) 60px auto; align-items: center; gap: 8px; }
.step { display: flex; align-items: center; gap: 6px; }
.bar { height: 5px; border-radius: var(--w-r-sm); background: var(--w-panel-3); overflow: hidden; }
.bar > span { display: block; height: 100%; background: var(--w-accent); }
</style>
