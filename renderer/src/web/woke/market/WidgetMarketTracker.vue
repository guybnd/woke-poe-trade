<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- Town and hideout, while a watched item is past one of your alerts. -->
    <DockItem :menu="dockMenu" :wake="unseenAlerts" id="market" title="Market" :show="dockShow" :badge="unseenAlerts || null"
      tone="down" :wm-id="config.wmId" card-width="20rem" @open-change="onCard">
      <template #card>
        <div style="padding: 4px var(--w-pad) 6px;" class="flex flex-col gap-0.5">
          <div v-for="w in alerted" :key="key(w)" class="flex justify-between gap-2">
            <span v-item-tip="w" class="w-trunc">{{ w.name }}<span v-if="w.variant" class="w-dim"> {{ w.variant }}</span></span>
            <span class="w-num whitespace-nowrap" :class="w.alertState === 'above' ? 'w-up' : 'w-down'">
              <WPrice :chaos="priceNow(w)" :divine="latest?.divine" /> {{ w.alertState === 'above' ? '≥' : '≤' }} {{ w.alertState === 'above' ? w.above : w.below }}c
            </span>
          </div>
          <div v-if="latest?.divine" class="w-faint text-xs mt-1">Divine {{ Math.round(latest.divine) }}c · poe.ninja</div>
        </div>
      </template>
    </DockItem>
    <WPanel ref="panel" :title="config.wmTitle || 'Market'" icon="divine" :updated="latest?.ts ?? null" :fresh-min="40" :stale-min="180" width="30rem">
      <template v-if="collector.lastError.value" #banner>
        <WBanner>Could not save the latest prices ({{ collector.lastError.value }}). This shows the last saved prices and tries again at the next refresh.</WBanner>
      </template>
      <template #tabs>
        <WTabs v-model="config.view" :options="[
          { value: 'movers', label: 'Movers' },
          { value: 'watchlist', label: 'Watchlist', count: config.watchlist.length }
        ]" />
      </template>

      <template #toolbar>
        <div :class="$style.searchRow"><WField v-model="query" icon="fas fa-search" placeholder="Search every price" class="w-full" /></div>
        <template v-if="config.view === 'movers' || searching">
          <WSegmented v-model="config.period" :options="[
            { value: '6h', label: '6h' }, { value: '24h', label: '24h' }, { value: '7d', label: '7d' }
          ]" />
          <WSelect v-if="!searching" v-model="config.typeFilter" :options="typeOptions" style="max-width: 11rem;" />
          <WSegmented v-model="unit" title="Measure moves in chaos or in divines" :options="[
            { value: 'chaos', label: 'c' }, { value: 'div', label: 'div' }
          ]" />
          <WCorruptedFilter v-model="corrupted" />
        </template>
      </template>

      <template v-if="(searching && latest) || !latest || (config.view === 'movers' && !searching && divMove != null)" #meta>
        <template v-if="searching && latest">
          <span>{{ searchCount }} {{ searchCount === 1 ? 'price' : 'prices' }} for "{{ query.trim() }}"<template v-if="searchGroups.length >= PRICE_GROUP_LIMIT">, first {{ PRICE_GROUP_LIMIT }} items only</template></span>
          <WInfo text="Category and the Settings filters don't apply to a search." />
        </template>
        <span v-else-if="!latest && league">Waiting for poe.ninja prices.</span>
        <span v-else-if="!latest">Select a league in Settings.</span>
        <template v-if="config.view === 'movers' && !searching && divMove != null">
          <span :title="unit === 'chaos' ? 'Moves below include this divine swing. Switch to div to remove it.' : 'Moves below are measured in divines.'">
            divine {{ divMove >= 0 ? '+' : '' }}{{ (divMove * 100).toFixed(1) }}% over {{ config.period }}</span>
        </template>
      </template>

      <template v-if="searching">
        <WSkeleton v-if="!latest && league" :rows="8" />
        <WEmpty v-else-if="!searchGroups.length" icon="fas fa-search">Nothing on poe.ninja matches "{{ query.trim() }}"<template v-if="corrupted !== 'any'"> with the corrupted filter on</template>. Rares, bases, flasks and cluster jewels have no saved price.</WEmpty>
        <template v-else>
          <div class="w-row w-row--head" :class="$style.grid"><span /><span>Item</span><span>Then</span><span class="text-right">Now</span><span class="text-right">%</span></div>
          <template v-for="g in searchGroups" :key="groupKey(g)">
            <div v-if="g.variants.length > 1" v-item-tip="groupTip(g)" class="w-row" :class="$style.grid">
              <span />
              <span class="w-trunc inline-flex items-center gap-1.5" :class="rarityClass(g.type)">
                <WIcon :src="ninjaIcon(g.type, g.name) ?? undefined" />{{ g.name }}</span>
            </div>
            <div v-for="v in g.variants" :key="key(v)" v-item-tip="v" class="w-row" :class="$style.grid" tabindex="0"
              @contextmenu="rowMenu($event, v)" @keydown.w.prevent="toggleWatch(v)" @keydown.c.ctrl.prevent="copyName(v)">
              <button @click="toggleWatch(v)" :title="isWatched(v) ? 'Remove from watchlist' : 'Add to watchlist'"
                class="w-icon-btn" :class="{ 'w-icon-btn--on': isWatched(v) }">
                <i :class="isWatched(v) ? 'fas fa-star' : 'far fa-star'" />
              </button>
              <span v-if="g.variants.length > 1" class="w-trunc" :title="v.variant"><i v-if="isThin(v)" class="fas fa-exclamation-circle w-faint mr-1" :title="thinTitle(v)" />{{ v.variant }}</span>
              <span v-else class="w-trunc inline-flex items-center gap-1.5" :class="rarityClass(v.type)" :title="v.type">
                <WIcon :src="ninjaIcon(v.type, v.name) ?? undefined" /><i v-if="isThin(v)" class="fas fa-exclamation-circle w-faint mr-1" :title="thinTitle(v)" />{{ v.name }}<span v-if="v.variant" class="w-dim ml-1">{{ v.variant }}</span></span>
              <WPrice :chaos="searchThen(v)" :divine="latest?.divine" :unit="unitFor({ name: v.name, now: v.chaos })" class="w-dim" />
              <WPrice :chaos="v.chaos" :divine="latest?.divine" :unit="unitFor({ name: v.name, now: v.chaos })" />
              <WDelta :value="searchChange(v)" class="text-right" />
            </div>
          </template>
        </template>
      </template>

      <template v-else-if="config.view === 'movers'">
        <WSkeleton v-if="!latest && league" :rows="8" />
        <WEmpty v-else-if="moversNote" :art="{ currency: 'divine' }">{{ moversNote }}</WEmpty>
        <template v-else>
          <div class="w-row w-row--head" :class="$style.grid"><span /><span>Item</span><span>Then</span><span class="text-right">Now</span><span class="text-right">%</span></div>
          <div v-for="m in movers" :key="key(m)" v-item-tip="m" class="w-row" :class="$style.grid" tabindex="0"
            @contextmenu="rowMenu($event, m)" @keydown.w.prevent="toggleWatch(m)" @keydown.c.ctrl.prevent="copyName(m)">
            <button @click="toggleWatch(m)" :title="isWatched(m) ? 'Remove from watchlist' : 'Add to watchlist'"
              class="w-icon-btn" :class="{ 'w-icon-btn--on': isWatched(m) }">
              <i :class="isWatched(m) ? 'fas fa-star' : 'far fa-star'" />
            </button>
            <span class="w-trunc inline-flex items-center gap-1.5" :class="rarityClass(m.type)">
              <WIcon :src="ninjaIcon(m.type, m.name) ?? undefined" /><i v-if="isThin(m)" class="fas fa-exclamation-circle w-faint mr-1" :title="thinTitle(m)" />{{ m.name }}<span v-if="m.variant" class="w-dim ml-1">{{ m.variant }}</span></span>
            <WPrice :chaos="m.then" :divine="latest?.divine" :unit="unitFor(m)" class="w-dim" />
            <WPrice :chaos="m.now" :divine="latest?.divine" :unit="unitFor(m)" />
            <WDelta :value="m.change" class="text-right" />
          </div>
        </template>
      </template>

      <template v-else>
        <WEmpty v-if="!config.watchlist.length" icon="far fa-star">Star items in Movers, press <WKbd keys="W" /> on a row, or search above to watch them.</WEmpty>
        <div v-for="w in watchRows" :key="key(w.item)" v-item-tip="w.item" class="w-row" :class="$style.grid" tabindex="0"
          @contextmenu="rowMenu($event, w.item)" @keydown.delete.prevent="toggleWatch(w.item)" @keydown.c.ctrl.prevent="copyName(w.item)">
          <button @click="toggleWatch(w.item)" title="Remove from watchlist (Del)" class="w-icon-btn w-icon-btn--on">
            <i class="fas fa-star" />
          </button>
          <span class="w-trunc inline-flex items-center gap-1.5" :class="rarityClass(w.item.type)">
            <WIcon :src="ninjaIcon(w.item.type, w.item.name) ?? undefined" /><i v-if="w.thin" class="fas fa-exclamation-circle w-faint mr-1" :title="thinTitle({ gaps: w.gaps })" />{{ w.item.name }}<span v-if="w.item.variant" class="w-dim ml-1">{{ w.item.variant }}</span>
            <button class="w-icon-btn ml-1" :class="{ 'w-icon-btn--on': hasAlert(w.item) }" :title="alertTitle(w.item)"
              @click="alertKey = alertKey === key(w.item) ? null : key(w.item)"><i class="fas fa-bell text-xs" /></button>
          </span>
          <WSpark :values="w.history" />
          <WPrice :chaos="w.now" :divine="latest?.divine" />
          <WDelta :value="w.change" title="Change since yesterday" class="text-right" />
          <div v-if="alertKey === key(w.item)" class="flex flex-wrap gap-2 items-center py-1" style="grid-column: 2 / -1;">
            <span class="w-dim text-xs">Alert when</span>
            <WField :model-value="w.item.above ?? 0" type="number" suffix="c or more" style="width: 8rem;"
              @update:model-value="setAlert(w.item, 'above', $event)" />
            <WField :model-value="w.item.below ?? 0" type="number" suffix="c or less" style="width: 8rem;"
              @update:model-value="setAlert(w.item, 'below', $event)" />
            <span class="w-faint text-xs">0 = off</span>
          </div>
        </div>
      </template>

    </WPanel>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { MARKET_TRACKER_TYPE } from './widget'
import type { MarketTrackerWidget } from './widget'

export default {
  widget: {
    type: MARKET_TRACKER_TYPE,
    instances: 'multi',
    trNameKey: 'Market'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { inject, computed, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { useLeagues } from '@/web/background/Leagues'
import { useMarketCollector } from './collector'
import { dailyHistory, dailyRowsForDate, latestSnapshots, snapshotAtOrBefore } from './db'
import { computeMovers, trendBaseline } from './analysis'
import { PRICE_GROUP_LIMIT, groupKey, groupTip, rarityClass, searchPrices } from '../search/search'
import WCorruptedFilter from '../ui/WCorruptedFilter.vue'
import { WInfo, WPanel, WTabs, WSegmented, WSelect, WField, WPrice, WDelta, WSpark, WEmpty, WIcon, WKbd, WSkeleton, WBanner, ninjaIcon, openMenu, toast, vItemTip } from '../ui'
import { copyText } from '../ui/copy'
import type { Mover } from './analysis'
import { isThin, itemKey, thinTitle, utcDate } from './types'
import type { CorruptedFilter, PriceItem, Snapshot } from './types'
import { PERIOD_MS, checkAlert, marketSearchRequest } from './widget'
import type { WatchedItem } from './widget'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { useZone } from '../shared/zone'

const props = defineProps<{
  config: MarketTrackerWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Market'
  props.config.anchor = popupAnchor()
  props.config.view = 'movers'
  props.config.period = '24h'
  props.config.minChaos = 5
  props.config.typeFilter = ''
  props.config.watchlist = []
  wm.show(props.config.wmId)
}

const collector = useMarketCollector({ poll: true })
const leagues = useLeagues()
const league = computed(() => leagues.selectedId.value)

const latest = shallowRef<Snapshot | null>(null)
const movers = shallowRef<Mover[]>([])
const moversNote = shallowRef('')
const watchRows = shallowRef<Array<{ item: WatchedItem, now: number | null, change: number | null, history: number[], thin: boolean, gaps?: number }>>([])
const divMove = shallowRef<number | null>(null)
const alertKey = shallowRef<string | null>(null)

const unit = computed({
  get: () => props.config.unit ?? 'chaos',
  set: (v: string) => { props.config.unit = v === 'div' ? 'div' : 'chaos' }
})
const corrupted = computed({
  get: () => props.config.corrupted ?? 'any',
  set: (v: CorruptedFilter) => { props.config.corrupted = v }
})

// ---- search: every saved price, whatever the filters ----
const query = shallowRef('')
const searching = computed(() => query.value.trim().length >= 2)
const searchGroups = computed(() => searching.value
  ? searchPrices(latest.value?.items ?? [], query.value, { corrupted: corrupted.value })
  : [])
const searchCount = computed(() => searchGroups.value.reduce((n, g) => n + g.variants.length, 0))
// Prices a period ago, kept from the last Movers load.
const thenPrices = shallowRef(new Map<string, number>())
const divThenPrice = shallowRef<number | null>(null)
function searchThen (item: PriceItem) {
  return thenPrices.value.get(itemKey(item)) ?? null
}
function searchChange (item: PriceItem) {
  const prev = searchThen(item)
  if (!prev) return null
  const divNow = latest.value?.divine
  const ratio = unit.value === 'div' && divNow && divThenPrice.value ? divThenPrice.value / divNow : 1
  return (item.chaos / prev) * ratio - 1
}
watch(marketSearchRequest, (text) => {
  if (text == null) return
  query.value = text
  // You asked for this item: an old filter mustn't hide it.
  props.config.corrupted = 'any'
  marketSearchRequest.value = null
}, { immediate: true })

const types = computed(() => Array.from(new Set(latest.value?.items.map(i => i.type) ?? [])).sort())
const typeOptions = computed(() => [{ value: '', label: 'All categories' }, ...types.value.map(t => ({ value: t, label: t }))])

// Same unit for both prices in a row; the Divine Orb itself stays in chaos.
function unitFor (m: { name: string, now: number }) {
  const div = latest.value?.divine
  return div && m.name !== 'Divine Orb' && m.now >= div ? 'div' : 'chaos'
}

let latestSeq = 0
async function loadLatest () {
  const seq = ++latestSeq
  if (!league.value) { latest.value = null; return }
  let snap: Snapshot | null = null
  try {
    snap = (await latestSnapshots(league.value, 1))[0] ?? null
  } catch {}
  if (seq === latestSeq) latest.value = snap
}

// Each load gets a number; an older load finishing late is dropped.
let moversSeq = 0
let watchSeq = 0

async function loadMovers () {
  const seq = ++moversSeq
  const snap = latest.value
  if (!snap) { movers.value = []; moversNote.value = ''; thenPrices.value = new Map(); divThenPrice.value = null; return }
  const from = snap.ts - PERIOD_MS[props.config.period]
  let then: PriceItem[] = []
  let divThen: number | null = null
  if (props.config.period === '7d') {
    const rows = await dailyRowsForDate(snap.league, utcDate(from))
    then = rows
    divThen = rows.find(r => r.divine)?.divine ?? null
  } else {
    const prev = await snapshotAtOrBefore(snap.league, from)
    // With the app closed for a while the nearest snapshot can be days older
    // than the period; that isn't a 6h/24h move.
    const fresh = prev && from - prev.ts <= PERIOD_MS[props.config.period] / 4
    then = fresh ? prev.items : []
    divThen = fresh ? prev.divine : null
  }
  if (seq !== moversSeq) return
  if (!then.length && props.config.period !== '6h') {
    const trend = trendBaseline(snap.items, props.config.period)
    then = trend.then
    divThen = trend.divThen
  }
  divMove.value = (snap.divine && divThen) ? snap.divine / divThen - 1 : null
  thenPrices.value = new Map(then.map(i => [itemKey(i), i.chaos]))
  divThenPrice.value = divThen
  if (!then.length) {
    movers.value = []
    moversNote.value = `Not enough history yet for ${props.config.period}. Keep the app running and check back later.`
    return
  }
  moversNote.value = ''
  movers.value = computeMovers(snap.items, then, {
    minChaos: props.config.minChaos || 0,
    type: props.config.typeFilter || undefined,
    limit: 50,
    unit: unit.value as 'chaos' | 'div',
    divNow: snap.divine,
    divThen,
    hideThin: !props.config.showThin,
    corrupted: corrupted.value
  })
  if (!movers.value.length) moversNote.value = 'No items match these filters.'
}

async function loadWatchlist () {
  const snap = latest.value
  if (!snap || !props.config.watchlist.length) { watchSeq++; watchRows.value = []; return }
  const current = new Map(snap.items.map(i => [itemKey(i), i]))
  const yesterday = utcDate(snap.ts - PERIOD_MS['24h'])
  const seq = ++watchSeq
  const rows = await Promise.all(props.config.watchlist.map(async item => {
    const history = (await dailyHistory(snap.league, item)).slice(-14)
    const live = current.get(itemKey(item))
    const nowPrice = live?.chaos ?? null
    const prev = history.find(r => r.date === yesterday)?.chaos
    return {
      item,
      now: nowPrice,
      change: (nowPrice != null && prev) ? nowPrice / prev - 1 : null,
      history: history.map(r => r.chaos),
      thin: live ? isThin(live) : false,
      gaps: live?.gaps
    }
  }))
  if (seq === watchSeq) watchRows.value = rows
}

// Fires a desktop notification once per threshold crossing.
function checkAlerts (snap: Snapshot) {
  const current = new Map(snap.items.map(i => [itemKey(i), i.chaos]))
  for (const w of props.config.watchlist) {
    if (!w.above && !w.below) continue
    const price = current.get(itemKey(w)) ?? null
    const { state, fire } = checkAlert(w, price)
    if (fire && price != null) notify(w, price, state!)
    if ((w.alertState ?? null) !== state) w.alertState = state
  }
}

function notify (w: WatchedItem, price: number, state: 'above' | 'below') {
  const limit = state === 'above' ? w.above : w.below
  const body = `${Math.round(price * 10) / 10}c is ${state === 'above' ? 'at or above' : 'at or below'} your ${limit}c alert`
  try {
    if (typeof Notification === 'undefined') return
    const show = () => { const n = new Notification(`${w.name}${w.variant ? ` (${w.variant})` : ''}`, { body, silent: false }); n.onclick = null }
    if (Notification.permission === 'granted') show()
    else if (Notification.permission !== 'denied') Notification.requestPermission().then(p => { if (p === 'granted') show() }).catch(() => {})
  } catch {}
}

function hasAlert (w: WatchedItem) {
  return !!(w.above || w.below)
}

function alertTitle (w: WatchedItem) {
  if (!hasAlert(w)) return 'Set a price alert'
  const parts = []
  if (w.above) parts.push(`≥ ${w.above}c`)
  if (w.below) parts.push(`≤ ${w.below}c`)
  return `Alert at ${parts.join(' or ')}`
}

function setAlert (w: WatchedItem, side: 'above' | 'below', value: string | number) {
  const n = Number(value)
  w[side] = Number.isFinite(n) && n > 0 ? n : null
  w.alertState = null
}

// ---- dock icon ----
const zone = useZone()
const alerted = computed(() => props.config.watchlist.filter(w => w.alertState != null))
const dockShow = computed(() => alerted.value.length > 0 && (zone.kind === 'town' || zone.kind === 'hideout'))
const seenAlerts = shallowRef(new Set<string>())
const unseenAlerts = computed(() => alerted.value.filter(w => !seenAlerts.value.has(`${itemKey(w)}:${w.alertState}`)).length)
function onCard (open: boolean) {
  if (open) seenAlerts.value = new Set(alerted.value.map(w => `${itemKey(w)}:${w.alertState}`))
}
function priceNow (w: WatchedItem) {
  return latest.value?.items.find(i => itemKey(i) === itemKey(w))?.chaos ?? null
}

watch([league, collector.revision], loadLatest, { immediate: true })
watch(latest, (snap) => { if (snap) checkAlerts(snap) })
watch([latest, () => props.config.period, () => props.config.minChaos, () => props.config.typeFilter, unit, () => props.config.showThin, corrupted],
  () => { loadMovers().catch(() => {}) })
watch([latest, () => props.config.watchlist.length], () => { loadWatchlist().catch(() => {}) })

function key (item: { type: string, name: string, variant: string }) {
  return itemKey(item)
}

function isWatched (item: { type: string, name: string, variant: string }) {
  const k = itemKey(item)
  return props.config.watchlist.some(w => itemKey(w) === k)
}

function toggleWatch (item: { type: string, name: string, variant: string }) {
  const k = itemKey(item)
  if (isWatched(item)) {
    const before = props.config.watchlist
    props.config.watchlist = before.filter(w => itemKey(w) !== k)
    toast(`Stopped watching ${item.name}`, { undo: () => { props.config.watchlist = before }, anchor: panel.value?.el })
  } else {
    props.config.watchlist.push({ type: item.type, name: item.name, variant: item.variant })
  }
}

const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)

function copyName (item: { name: string }) {
  copyText(item.name).then(ok => { if (ok) toast(`Copied "${item.name}"`, { anchor: panel.value?.el, ms: 1800 }) })
}

function rowMenu (e: MouseEvent, item: { type: string, name: string, variant: string }) {
  // Watch, copy, trade and wiki are in the item strip on top (v-item-tip).
  const watched = isWatched(item)
  openMenu(e, [
    ...(watched ? [{ label: 'Set price alert…', icon: 'fas fa-bell', action: () => { query.value = ''; props.config.view = 'watchlist'; alertKey.value = key(item) } }] : []),
    { label: 'Show only this category', icon: 'fas fa-filter', action: () => { query.value = ''; props.config.view = 'movers'; props.config.typeFilter = item.type } }
  ])
}

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => [
  { label: 'Mark alerts as seen', icon: 'fas fa-check-double', disabled: unseenAlerts.value === 0, action: () => { onCard(true) } }
])
</script>

<style module>
.searchRow { flex: 1 1 100%; display: flex; min-width: 0; }
.grid {
  grid-template-columns: 22px minmax(0, 1fr) 64px 72px 52px;
}
</style>
