<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false" :readonly="true">
    <!-- Town and hideout, while a watched item is past one of your alerts. -->
    <DockItem id="market" title="Market alerts" :show="dockShow" :badge="unseenAlerts || null"
      tone="down" :wm-id="config.wmId" card-width="20rem" @open-change="onCard">
      <template #card>
        <div style="padding: 4px var(--w-pad) 6px;" class="flex flex-col gap-0.5">
          <div v-for="w in alerted" :key="key(w)" class="flex justify-between gap-2">
            <span class="w-trunc">{{ w.name }}<span v-if="w.variant" class="w-dim"> {{ w.variant }}</span></span>
            <span class="w-num whitespace-nowrap" :class="w.alertState === 'above' ? 'w-up' : 'w-down'">
              <WPrice :chaos="priceNow(w)" :divine="latest?.divine" /> {{ w.alertState === 'above' ? '≥' : '≤' }} {{ w.alertState === 'above' ? w.above : w.below }}c
            </span>
          </div>
          <div v-if="latest?.divine" class="w-faint text-xs mt-1">Divine {{ Math.round(latest.divine) }}c · poe.ninja</div>
        </div>
      </template>
    </DockItem>
    <WPanel ref="panel" :title="config.wmTitle || 'Market tracker'" icon="divine" :updated="latest?.ts ?? null" :fresh-min="40" :stale-min="180" width="30rem">
      <template v-if="collector.lastError.value" #banner>
        <WBanner>Couldn't save the latest prices ({{ collector.lastError.value }}). Showing the last saved snapshot; it retries on the next refresh.</WBanner>
      </template>
      <template #tabs>
        <WTabs v-model="config.view" :options="[
          { value: 'movers', label: 'Movers' },
          { value: 'watchlist', label: 'Watchlist', count: config.watchlist.length }
        ]" />
      </template>

      <template #toolbar>
        <template v-if="config.view === 'movers'">
          <WSegmented v-model="config.period" :options="[
            { value: '6h', label: '6h' }, { value: '24h', label: '24h' }, { value: '7d', label: '7d' }
          ]" />
          <WSelect v-model="config.typeFilter" :options="typeOptions" style="max-width: 11rem;" />
          <WField v-model="config.minChaos" type="number" suffix="c min" style="width: 7rem;" />
          <WSegmented v-model="unit" title="Measure moves in chaos or in divines" :options="[
            { value: 'chaos', label: 'c' }, { value: 'div', label: 'div' }
          ]" />
          <WChip clickable :active="!!config.showThin" title="Include items poe.ninja barely saw trade on (easy to price-fix)"
            @click="config.showThin = !config.showThin">Thin</WChip>
        </template>
        <div v-else class="relative grow">
          <WField v-model="addQuery" icon="fas fa-plus" placeholder="Add item to watchlist…" class="w-full" />
          <div v-if="addResults.length" class="w-surface absolute left-0 right-0 z-10 mt-1 py-1">
            <button v-for="item in addResults" :key="key(item)" @click="addWatch(item)"
              class="w-row w-full text-left" style="grid-template-columns: minmax(0,1fr) auto;">
              <span class="w-trunc">{{ item.name }}<span v-if="item.variant" class="w-dim ml-1">{{ item.variant }}</span>
                <span class="w-faint"> · {{ item.type }}</span></span>
              <WPrice :chaos="item.chaos" :divine="latest?.divine" />
            </button>
          </div>
        </div>
      </template>

      <template #meta>
        <template v-if="latest">
          <span>{{ latest.league }}</span><span class="w-faint">·</span>
          <span>{{ latest.items.length }} items</span>
          <template v-if="latest.divine"><span class="w-faint">·</span>
            <span class="inline-flex items-center gap-1"><WIcon currency="divine" /> = {{ Math.round(latest.divine) }}<WIcon currency="chaos" /></span>
          </template>
        </template>
        <span v-else-if="league">Waiting for the first poe.ninja snapshot for {{ league }} (refreshes about every 30 min)…</span>
        <span v-else>Select a league in APT's price check settings to start collecting.</span>
        <template v-if="config.view === 'movers' && divMove != null">
          <span class="w-faint">·</span>
          <span :title="unit === 'chaos' ? 'Moves below include this divine swing. Switch to div to remove it.' : 'Moves below are measured in divines.'">
            divine {{ divMove >= 0 ? '+' : '' }}{{ (divMove * 100).toFixed(1) }}% over {{ config.period }}</span>
        </template>
      </template>

      <template v-if="config.view === 'movers'">
        <WSkeleton v-if="!latest && league" :rows="8" />
        <WEmpty v-else-if="moversNote" :art="{ currency: 'divine' }">{{ moversNote }}</WEmpty>
        <template v-else>
          <div class="w-row w-row--head" :class="$style.grid"><span /><span>Item</span><span>Then</span><span class="text-right">Now</span><span class="text-right">%</span></div>
          <div v-for="m in movers" :key="key(m)" class="w-row" :class="$style.grid" tabindex="0"
            @contextmenu="rowMenu($event, m)" @keydown.w.prevent="toggleWatch(m)" @keydown.c.ctrl.prevent="copyName(m)">
            <button @click="toggleWatch(m)" :title="isWatched(m) ? 'Remove from watchlist' : 'Add to watchlist'"
              class="w-icon-btn" :class="{ 'w-icon-btn--on': isWatched(m) }">
              <i :class="isWatched(m) ? 'fas fa-star' : 'far fa-star'" />
            </button>
            <span class="w-trunc inline-flex items-center gap-1.5" :class="rarityClass(m.type)" :title="m.type">
              <WIcon :src="ninjaIcon(m.type, m.name) ?? undefined" /><i v-if="isThin(m)" class="fas fa-exclamation-circle w-faint mr-1" :title="thinTitle(m)" />{{ m.name }}<span v-if="m.variant" class="w-dim ml-1">{{ m.variant }}</span></span>
            <WPrice :chaos="m.then" :divine="latest?.divine" :unit="unitFor(m)" class="w-dim" />
            <WPrice :chaos="m.now" :divine="latest?.divine" :unit="unitFor(m)" />
            <WDelta :value="m.change" class="text-right" />
          </div>
        </template>
      </template>

      <template v-else>
        <WEmpty v-if="!config.watchlist.length" icon="far fa-star">Star items in Movers, press <WKbd keys="W" /> on a row, or search above to watch them.</WEmpty>
        <div v-for="w in watchRows" :key="key(w.item)" class="w-row" :class="$style.grid" tabindex="0"
          @contextmenu="rowMenu($event, w.item)" @keydown.delete.prevent="toggleWatch(w.item)" @keydown.c.ctrl.prevent="copyName(w.item)">
          <button @click="toggleWatch(w.item)" title="Remove from watchlist (Del)" class="w-icon-btn w-icon-btn--on">
            <i class="fas fa-star" />
          </button>
          <span class="w-trunc inline-flex items-center gap-1.5" :class="rarityClass(w.item.type)" :title="w.item.type">
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

      <template #footer>
        <span>Prices from poe.ninja</span>
        <span class="ml-auto w-faint">Right-click a row for actions</span>
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
    trNameKey: 'Market tracker'
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
import { computeMovers, trendThen } from './analysis'
import { WPanel, WTabs, WSegmented, WSelect, WField, WPrice, WDelta, WSpark, WEmpty, WChip, WIcon, WKbd, WSkeleton, WBanner, ninjaIcon, openMenu, toast } from '../ui'
import { copyText } from '../ui/copy'
import type { Mover } from './analysis'
import { isThin, itemKey, thinTitle, utcDate } from './types'
import type { PriceItem, Snapshot } from './types'
import { PERIOD_MS, checkAlert } from './widget'
import type { WatchedItem } from './widget'
import DockItem from '../dock/DockItem.vue'
import { useZone } from '../shared/zone'

const props = defineProps<{
  config: MarketTrackerWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Market tracker'
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
const addQuery = shallowRef('')

const types = computed(() => Array.from(new Set(latest.value?.items.map(i => i.type) ?? [])).sort())
const typeOptions = computed(() => [{ value: '', label: 'All categories' }, ...types.value.map(t => ({ value: t, label: t }))])

// Same unit for both prices in a row; the Divine Orb itself stays in chaos.
function unitFor (m: { name: string, now: number }) {
  const div = latest.value?.divine
  return div && m.name !== 'Divine Orb' && m.now >= div ? 'div' : 'chaos'
}

// poe.ninja category -> PoE item colour
function rarityClass (type: string) {
  if (/^Unique/.test(type)) return 'w-rarity-unique'
  if (/Gem/.test(type)) return 'w-rarity-gem'
  if (type === 'DivinationCard') return 'w-rarity-divination'
  return 'w-rarity-currency'
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
  if (!snap) { movers.value = []; moversNote.value = ''; return }
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
    then = trendThen(snap.items, props.config.period)
  }
  divMove.value = (snap.divine && divThen) ? snap.divine / divThen - 1 : null
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
    hideThin: !props.config.showThin
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
watch([latest, () => props.config.period, () => props.config.minChaos, () => props.config.typeFilter, unit, () => props.config.showThin],
  () => { loadMovers().catch(() => {}) })
watch([latest, () => props.config.watchlist.length], () => { loadWatchlist().catch(() => {}) })

const addResults = computed(() => {
  const q = addQuery.value.trim().toLowerCase()
  if (q.length < 2 || !latest.value) return []
  return latest.value.items
    .filter(i => i.name.toLowerCase().includes(q) && !isWatched(i))
    .slice(0, 8)
})

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
  const watched = isWatched(item)
  openMenu(e, [
    { label: watched ? 'Stop watching' : 'Watch price', icon: watched ? 'fas fa-star' : 'far fa-star', keys: watched ? 'Del' : 'W', action: () => toggleWatch(item) },
    ...(watched ? [{ label: 'Set price alert…', icon: 'fas fa-bell', action: () => { props.config.view = 'watchlist'; alertKey.value = key(item) } }] : []),
    { label: 'Copy name', icon: 'far fa-copy', keys: 'Ctrl + C', action: () => copyName(item) },
    { label: 'Show only this category', icon: 'fas fa-filter', action: () => { props.config.view = 'movers'; props.config.typeFilter = item.type } }
  ])
}

function addWatch (item: PriceItem) {
  toggleWatch(item)
  addQuery.value = ''
}
</script>

<style module>
.grid {
  grid-template-columns: 22px minmax(0, 1fr) 64px 72px 52px;
}
</style>
