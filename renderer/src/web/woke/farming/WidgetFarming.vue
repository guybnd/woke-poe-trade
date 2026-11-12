<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- During a session, in maps and hideout: an icon with divines per hour
         (the map clock while you're in a map). -->
    <DockItem :menu="dockMenu" ref="dockRef" id="farming" title="Farming" :show="dockShow" :badge="dockBadge"
      :tone="t.profit < 0 ? 'down' : 'up'" :led="s && s.runningSince == null ? 'warn' : null" :wm-id="config.wmId"
      card-width="18rem" @open-change="cardShown = $event">
      <template #card>
        <div v-if="s" class="flex flex-col gap-0.5 w-num" style="padding: 6px var(--w-pad) 8px;">
          <div v-if="s.strategy" class="w-head-font w-accent w-trunc">{{ s.strategy }}</div>
          <div v-if="mapClock != null" class="flex justify-between"><span class="w-dim">This map</span><span>{{ formatClock(mapClock, true) }}</span></div>
          <div v-if="lastRun" class="flex justify-between gap-2"><span class="w-dim">Last map</span><span class="w-trunc"><span :class="runResult(lastRun) >= 0 ? 'w-up' : 'w-down'">{{ fmt(runResult(lastRun)) }}</span><span class="w-dim ml-1">{{ lastRun.name }}</span></span></div>
          <div class="flex justify-between"><span class="w-dim">Profit</span><span :class="t.profit >= 0 ? 'w-up' : 'w-down'">{{ fmt(t.profit) }}</span></div>
          <div class="flex justify-between"><span class="w-dim">Per hour</span><span>{{ t.perHour != null ? fmt(t.perHour) : '—' }}</span></div>
          <div class="flex justify-between"><span class="w-dim">Maps</span><span>{{ s.maps }}<span v-if="t.perMap != null" class="w-dim"> · {{ fmt(t.perMap) }} each</span></span></div>
          <div class="flex justify-between"><span class="w-dim">Time</span><span>{{ formatClock(elapsed(s, now), true) }}<span v-if="mapShare != null" class="w-dim"> · {{ Math.round(mapShare * 100) }}% in maps</span></span></div>
          <div v-if="s.runningSince == null" class="text-xs" style="color: var(--w-warn);">Paused<template v-if="s.autoPaused">; resumes when you change zone</template></div>
          <div v-if="config.lootHotkey" class="text-xs w-faint">Hover loot and press <WKbd :keys="config.lootHotkey" /> to add it</div>
        </div>
      </template>
    </DockItem>
    <WPanel ref="panel" :title="config.wmTitle || 'Farming'" icon="chaos" width="27rem"
      :updated="prices.snapshot.value?.ts ?? null" :fresh-min="40" :stale-min="180">
      <template #tabs>
        <WTabs v-model="tab" :options="tabs.map(t => ({ value: t.id, label: t.label }))" />
      </template>
      <template v-if="!prices.snapshot.value" #banner>
        <WBanner tone="info">Waiting for poe.ninja prices.</WBanner>
      </template>

      <div class="flex flex-col gap-2 py-2" style="padding-left: var(--w-pad); padding-right: var(--w-pad);">
        <template v-if="tab === 'session'">
          <div class="flex gap-1 items-center">
            <input v-model="config.strategy" list="woke-farming-strategies" placeholder="Strategy (e.g. Breach + Legion)"
              :class="$style.input" class="grow min-w-0">
            <datalist id="woke-farming-strategies">
              <option v-for="name in strategyNames" :key="name" :value="name" />
            </datalist>
            <WButton v-if="!s" variant="primary" icon="fas fa-play" @click="start">Start</WButton>
            <template v-else>
              <WButton :icon="s.runningSince != null ? 'fas fa-pause' : 'fas fa-play'" @click="toggle">{{ s.runningSince != null ? 'Pause' : 'Resume' }}</WButton>
              <WButton variant="primary" icon="fas fa-flag-checkered" @click="end" title="Save to history">End</WButton>
            </template>
          </div>

          <template v-if="s">
            <div :class="$style.hero">
              <div>
                <div :class="$style.k">Profit</div>
                <div :class="[$style.big, t.profit >= 0 ? 'w-up' : 'w-down']" class="w-num">{{ fmt(t.profit) }}</div>
              </div>
              <div>
                <div :class="$style.k">Per hour</div>
                <div :class="$style.big" class="w-num">{{ t.perHour != null ? fmt(t.perHour) : '—' }}</div>
              </div>
              <div>
                <div :class="$style.k">Time</div>
                <div :class="$style.big" class="w-num">{{ formatClock(elapsed(s, now), true) }}</div>
              </div>
            </div>
            <div :class="$style.stats">
              <span class="w-dim">Maps</span>
              <span class="flex items-center gap-1 w-num">
                <button class="w-icon-btn" @click="s.maps = Math.max(0, s.maps - 1)"><i class="fas fa-minus text-xs" /></button>
                {{ s.maps }}
                <button class="w-icon-btn" @click="s.maps++"><i class="fas fa-plus text-xs" /></button>
              </span>
              <span class="w-dim">Per map</span><span class="w-num">{{ t.perMap != null ? fmt(t.perMap) : '—' }}</span>
              <span class="w-dim">Loot</span><span class="w-num">{{ fmt(t.loot) }}</span>
              <span class="w-dim">Spent</span><span class="w-num">{{ fmt(t.cost) }}</span>
              <span class="w-dim">Map cost</span><span class="w-num">{{ fmt(t.costPerMap) }}</span>
              <template v-if="mapShare != null">
                <span class="w-dim" title="Share of session time spent inside maps (from Client.txt)">In maps</span><span class="w-num">{{ Math.round(mapShare * 100) }}%</span>
              </template>
            </div>
            <div v-if="run" :class="$style.mapLine">
              <div class="min-w-0">
                <div :class="$style.k">This map</div>
                <div class="w-trunc"><span style="color: var(--w-fg);">{{ run.name }}</span><span class="w-dim"> · {{ formatClock(run.mapMs + liveMs(true)) }}<template v-if="runDrops(run)"> · {{ runDrops(run) }} drop{{ runDrops(run) === 1 ? '' : 's' }}</template></span></div>
              </div>
              <div v-if="lastRun" class="text-right min-w-0">
                <div :class="$style.k">Last map</div>
                <div class="w-trunc"><span class="w-num" :class="runResult(lastRun) >= 0 ? 'w-up' : 'w-down'">{{ fmt(runResult(lastRun)) }}</span><span class="w-faint ml-1">{{ lastRun.name }}</span></div>
              </div>
            </div>
            <div v-if="s.autoPaused" class="text-xs w-dim"><i class="fas fa-pause-circle" /> Paused after 5 minutes without a zone change. Resumes when you change zone.</div>
            <div v-if="config.lootHotkey" class="text-xs w-faint">Hover an item in game and press <WKbd :keys="config.lootHotkey" /> to add it.</div>
            <div v-if="t.missingPrices" class="text-xs" style="color: var(--w-warn);">{{ t.missingPrices }} {{ t.missingPrices === 1 ? 'item has' : 'items have' }} no price and count as 0.</div>

            <div class="relative">
              <WField v-model="lootQuery" icon="fas fa-plus" placeholder="Add loot… (e.g. Divine Orb)" class="w-full" />
              <div v-if="lootResults.length" class="w-surface absolute left-0 right-0 z-10 mt-1 py-1">
                <button v-for="item in lootResults" :key="key(item)" v-item-tip="item" @click="addLoot(item)" class="w-row w-full text-left" style="grid-template-columns: minmax(0,1fr) auto;">
                  <span class="w-trunc flex items-center gap-1"><WIcon :src="art(item)" fallback="fas fa-coins" />{{ item.name }}<span v-if="item.variant" class="w-dim ml-1">{{ item.variant }}</span></span>
                  <span class="w-dim w-num text-xs">{{ fmt(item.chaos) }}</span>
                </button>
              </div>
            </div>
            <div>
              <div v-for="line in s.loot" :key="key(line)" class="w-row px-0" :class="$style.lineGrid">
                <span v-item-tip="line" class="w-trunc flex items-center gap-1"><WIcon :src="art(line)" fallback="fas fa-coins" />{{ line.name }}<span v-if="line.variant" class="w-dim ml-1">{{ line.variant }}</span></span>
                <button class="w-icon-btn" @click="changeQty(line, -1)"><i class="fas fa-minus text-xs" /></button>
                <span class="text-center w-num">{{ line.qty }}</span>
                <button class="w-icon-btn" @click="changeQty(line, 1)"><i class="fas fa-plus text-xs" /></button>
                <span class="text-right w-dim w-num">{{ lootPrice(line) }}</span>
              </div>
              <label class="flex items-center gap-2 w-dim pt-2">
                Other loot
                <WField v-model="s.extraChaos" type="number" suffix="c" style="width: 6rem;" />
              </label>
            </div>
          </template>
        </template>

        <template v-else-if="tab === 'costs'">
          <div class="w-dim flex items-center gap-2"><span>What one map costs to run<template v-if="config.strategy.trim()"> · <span style="color: var(--w-fg);">{{ config.strategy.trim() }}</span></template></span> <WInfo text="Map, scarabs, compasses and so on. Saved per atlas strategy, so switching strategy switches costs." /></div>
          <div v-if="filledFromAtlas" class="text-xs w-faint"><i class="fas fa-globe" /> Scarabs filled from the atlas strategy "{{ filledFromAtlas }}".</div>
          <div class="relative">
            <WField v-model="costQuery" icon="fas fa-plus" placeholder="Add an input… (currency, scarabs, maps)" class="w-full" />
            <div v-if="costResults.length" class="w-surface absolute left-0 right-0 z-10 mt-1 py-1">
              <button v-for="item in costResults" :key="key(item)" v-item-tip="item" @click="addCost(item)" class="w-row w-full text-left" style="grid-template-columns: minmax(0,1fr) auto;">
                <span class="w-trunc flex items-center gap-1"><WIcon :src="art(item)" fallback="fas fa-coins" />{{ item.name }}<span v-if="item.variant" class="w-dim ml-1">{{ item.variant }}</span></span>
                <span class="w-dim w-num text-xs">{{ fmt(item.chaos) }}</span>
              </button>
            </div>
          </div>
          <div>
            <div v-for="line in config.costs" :key="key(line)" class="w-row px-0" :class="$style.costGrid">
              <span v-item-tip="line" class="w-trunc flex items-center gap-1"><WIcon :src="art(line)" fallback="fas fa-coins" />{{ line.name }}<span v-if="line.variant" class="w-dim ml-1">{{ line.variant }}</span></span>
              <input v-model.number="line.qty" type="number" min="0" step="1" :class="$style.input" class="w-full">
              <span class="text-right w-dim w-num">{{ linePrice(line) }}</span>
              <button class="w-icon-btn" @click="removeCost(line)" title="Remove. You can undo."><i class="fas fa-times" /></button>
            </div>
            <div class="pt-2 flex justify-between"><span class="w-dim">Per map</span><span class="w-num w-accent">{{ fmt(costPerMap) }}</span></div>
          </div>
        </template>

        <template v-else>
          <WButton size="sm" icon="fas fa-chart-bar" class="self-start" @click="openAnalytics">Open Session analytics</WButton>
          <WEmpty v-if="!config.history.length" icon="fas fa-history">Ended sessions show up here.</WEmpty>
          <div v-else>
            <div class="w-row w-row--head px-0" :class="$style.histGrid">
              <span>Strategy</span><span class="text-right">Maps</span><span class="text-right">Hours</span><span class="text-right">/hour</span><span class="text-right">/map</span>
            </div>
            <div v-for="row in stats" :key="row.strategy" class="w-row px-0" :class="$style.histGrid">
              <span class="w-trunc">{{ row.strategy }}</span>
              <span class="text-right w-num">{{ row.maps }}</span>
              <span class="text-right w-num">{{ row.hours.toFixed(1) }}</span>
              <span class="text-right w-num" :class="row.perHour >= 0 ? 'w-up' : 'w-down'">{{ fmt(row.perHour) }}</span>
              <span class="text-right w-num">{{ fmt(row.perMap) }}</span>
            </div>
            <WButton variant="ghost" size="sm" icon="fas fa-trash" class="mt-2" title="You can undo" @click="clearHistory">Clear history</WButton>
          </div>
        </template>
      </div>
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { FARMING_TYPE } from './farming'
import type { FarmingWidget } from './farming'

export default {
  widget: {
    type: FARMING_TYPE,
    instances: 'multi',
    trNameKey: 'Farming'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { inject, computed, shallowRef, onUnmounted, watch, nextTick } from 'vue'
import { useVisibleClock } from '../shared/visible-clock'
import { AppConfig, saveConfig } from '@/web/Config'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WInfo, WPanel, WTabs, WField, WButton, WEmpty, WKbd, WIcon, WBanner, toast, vItemTip } from '../ui'
import { ninjaIcon } from '../ui/game-icons'
import { MainProcess } from '@/web/background/IPC'
import { parseClipboard } from '@/parser'
import { getDetailsId } from '@/web/price-check/trends/getDetailsId'
import { usePriceIndex } from '../market/price-index'
import { formatChaos, formatClock } from '../ui/format'
import { itemKey } from '../market/types'
import type { PriceItem } from '../market/types'
import { onGameLog } from '../shared/game-log'
import { useZone } from '../shared/zone'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { openOverlay, tickWhile } from '../dock/dock'
import { ATLAS_TYPE } from '../atlas/widget'
import { strategyScarabCosts } from '../atlas/guide'
import { useLeagues } from '@/web/background/Leagues'
import { useSessionStore } from '../analytics/store'
import { ANALYTICS_TYPE } from '../analytics/types'
import type { AtlasWidget } from '../atlas/widget'
import { FARMING_LOOT_TARGET, onEndSessionRequest, addLoot as addLootTo, costsForStrategy, countNewMap, currentRun, elapsed, historyToRecords, initFarmingData, isMapArea, isMapCostItem, isMapSideArea, lineValue, maybeAutoPause, nameRun, pauseSession, newSession, onZoneChange, rememberCosts, removeLoot, sellPrice, sellRules, startRun, strategyStats, toSessionRecord, totals, withScarabCosts } from './farming'
import type { CostLine, LiveRun, LootLine, PricedRef } from './farming'

const props = defineProps<{
  config: FarmingWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Farming'
  props.config.anchor = popupAnchor()
  initFarmingData(props.config)
  wm.show(props.config.wmId)
}

const tabs = [
  { id: 'session', label: 'Session' },
  { id: 'costs', label: 'Map cost' },
  { id: 'history', label: 'History' }
] as const
const tab = shallowRef<'session' | 'costs' | 'history'>('session')

const prices = usePriceIndex()
const now = shallowRef(Date.now())
// Every second on screen; every 15 s while hidden, so auto-pause still works.
useVisibleClock(() => props.config, () => {
  now.value = Date.now()
  const sess = props.config.session
  if (sess && props.config.autoPause !== false && maybeAutoPause(sess, now.value)) saveConfig()
}, 1000, 15000)

const s = computed(() => props.config.session)

// ---- dock icon ----
const zone = useZone()
const inMapNow = computed(() => zone.kind === 'map')
const dockShow = computed(() => !!s.value && (inMapNow.value || zone.kind === 'hideout' || zone.kind === 'town'))
const cardShown = shallowRef(false)
const dockRef = shallowRef<InstanceType<typeof DockItem> | null>(null)
// The badge's map clock ticks while you're in a map; the card ticks while open.
onUnmounted(tickWhile(() => dockShow.value && (cardShown.value || (inMapNow.value && s.value?.runningSince != null)),
  () => { now.value = Date.now() }, 1000))
const mapClock = computed(() => {
  const sess = s.value
  // Paused: no running clock (it used to keep counting the paused time).
  if (!sess || !inMapNow.value || !sess.inMap || sess.lastZoneAt == null || sess.runningSince == null) return null
  return Math.max(0, now.value - Math.max(sess.lastZoneAt, sess.runningSince))
})
const dockBadge = computed(() => {
  if (mapClock.value != null) return formatClock(mapClock.value)
  const ph = t.value.perHour
  if (ph == null) return null
  const div = prices.snapshot.value?.divine
  return div ? `${(ph / div).toFixed(1)}d` : `${Math.round(ph)}c`
})
const price = (r: PricedRef) => prices.price(r)
const rules = computed(() => sellRules(props.config))
const t = computed(() => s.value
  ? totals(s.value, props.config.costs, price, now.value, rules.value)
  : { costPerMap: 0, cost: 0, loot: 0, profit: 0, perHour: null, perMap: null, missingPrices: 0 })
const costPerMap = computed(() => lineValue(props.config.costs, price).total)
const stats = computed(() => strategyStats(props.config.history))

const strategyNames = computed(() => AppConfig().widgets
  .filter(w => w.wmType === ATLAS_TYPE)
  // An Atlas widget that never mounted (just added, or its module is off)
  // has no strategies yet.
  .flatMap(w => ((w as AtlasWidget).strategies ?? []).map(st => st.name))
  .filter(Boolean))

const lootQuery = shallowRef('')
const costQuery = shallowRef('')
const lootResults = computed(() => prices.search(lootQuery.value))
const costResults = computed(() => prices.search(costQuery.value, 8, isMapCostItem))

function key (r: PricedRef) { return itemKey(r) }

function fmt (chaos: number) {
  return formatChaos(chaos, prices.snapshot.value?.divine ?? null)
}

// Share of time in maps, including the zone you're in right now.
const mapShare = computed(() => {
  const sess = s.value
  if (!sess || sess.lastZoneAt == null) return null
  let map = sess.mapMs ?? 0
  let other = sess.otherMs ?? 0
  if (sess.runningSince != null) {
    const span = now.value - Math.max(sess.lastZoneAt, sess.runningSince)
    if (sess.inMap) map += span
    else other += span
  }
  return map + other > 60_000 ? map / (map + other) : null
})

// --- This map (C1) ---
const run = computed(() => s.value ? currentRun(s.value) : null)
const lastRun = computed(() => {
  const runs = s.value?.runs ?? []
  return runs.length >= 2 ? runs[runs.length - 2] : null
})
// Running time not yet booked to the current zone.
function liveMs (inMap: boolean): number {
  const sess = s.value
  if (!sess || sess.runningSince == null || sess.lastZoneAt == null || !!sess.inMap !== inMap) return 0
  return Math.max(0, now.value - Math.max(sess.lastZoneAt, sess.runningSince))
}
function runDrops (r: LiveRun): number {
  return r.loot.reduce((n, l) => n + l.qty, 0)
}
function runResult (r: LiveRun): number {
  return lineValue(r.loot, (x) => sellPrice(x, price(x), rules.value)).total - costPerMap.value
}

// --- Map costs per strategy, filled from Atlas strategies' scarabs ---
const filledFromAtlas = shallowRef('')
watch(() => props.config.strategy, (name) => {
  const trimmed = (name ?? '').trim()
  const saved = costsForStrategy(props.config, trimmed)
  if (saved) {
    props.config.costs = saved
    filledFromAtlas.value = ''
    return
  }
  const atlasLists = AppConfig().widgets.filter(w => w.wmType === ATLAS_TYPE).map(w => (w as AtlasWidget).strategies)
  const scarabs = strategyScarabCosts(atlasLists, trimmed, prices.snapshot.value?.items)
  if (scarabs) {
    props.config.costs = withScarabCosts(props.config.costs, scarabs)
    filledFromAtlas.value = trimmed
  }
})
// Configs from before costs were saved per strategy: keep the current list for the current strategy.
if (!props.config.costsByStrategy) rememberCosts(props.config)
watch(() => props.config.costs, () => { rememberCosts(props.config) }, { deep: true })

// --- Session analytics ---
const leagues = useLeagues()
const sessionStore = useSessionStore()
// Copies the old history (totals only) into Session analytics once.
if (!props.config.historyExported) {
  if (!props.config.history.length) {
    props.config.historyExported = true
  } else {
    const stop = watch(() => leagues.selectedId.value, (league) => {
      if (!league) return
      nextTick(() => stop())
      sessionStore.saveMany(historyToRecords(props.config.history, league))
        .then(() => { props.config.historyExported = true; saveConfig() })
        .catch(() => {})
    }, { immediate: true })
  }
}

function openAnalytics () {
  const existing = AppConfig().widgets.find(w => w.wmType === ANALYTICS_TYPE)
  if (existing) {
    wm.show(existing.wmId)
    return
  }
  wm.create(ANALYTICS_TYPE)
  const created = wm.widgets.value.reduce((a, b) => (a.wmId > b.wmId ? a : b))
  nextTick(() => nextTick(() => wm.show(created.wmId)))
}

function lootPrice (line: PricedRef & { qty: number }) {
  const p = sellPrice(line, price(line), rules.value)
  if (p == null) return 'no price'
  if (p === 0) return 'junk'
  return fmt(p * line.qty)
}

function linePrice (line: PricedRef & { qty: number }) {
  const p = price(line)
  return p == null ? 'no price' : fmt(p * line.qty)
}

function start () {
  props.config.session = newSession(props.config.strategy, Date.now())
}

function toggle () {
  const sess = props.config.session
  if (!sess) return
  if (sess.runningSince != null) {
    pauseSession(sess, Date.now())
  } else {
    sess.runningSince = Date.now()
    sess.autoPaused = false
  }
}

function end () {
  const sess = props.config.session
  if (!sess) return
  const nowTs = Date.now()
  // Book the zone you are in when ending, so the last run's time counts.
  pauseSession(sess, nowTs)
  const tt = totals(sess, props.config.costs, price, nowTs, rules.value)
  if (sess.maps || sess.loot.length || sess.extraChaos) {
    const record = toSessionRecord(sess, props.config.costs, price, rules.value, {
      now: nowTs,
      league: leagues.selectedId.value ?? '',
      divine: prices.snapshot.value?.divine ?? null,
      strategy: props.config.strategy
    })
    sessionStore.save(record).catch(() => {})
    props.config.history.push({
      strategy: sess.strategy || props.config.strategy,
      endedAt: nowTs,
      durationMs: elapsed(sess, nowTs),
      maps: sess.maps,
      costChaos: tt.cost,
      lootChaos: tt.loot,
      divine: prices.snapshot.value?.divine ?? null
    })
  }
  props.config.session = null
  tab.value = 'history'
}

// Net worth's End session button ends this window's session.
const stopEndRequests = onEndSessionRequest(props.config.wmId, end)
onUnmounted(stopEndRequests)

const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)
function art (x: { type: string, name: string }) { return ninjaIcon(x.type, x.name) ?? undefined }

// No "are you sure": clear now, offer Undo (P9).
function clearHistory () {
  const before = props.config.history
  props.config.history = []
  toast('History cleared', { anchor: panel.value?.el, undo: () => { props.config.history = before } })
}

function addLoot (item: PriceItem) {
  const sess = props.config.session
  if (!sess) return
  addLootTo(sess, item, 1)
  lootQuery.value = ''
}

function changeQty (line: LootLine, delta: number) {
  const sess = props.config.session
  if (!sess) return
  if (delta > 0) addLootTo(sess, line, delta)
  else removeLoot(sess, line, -delta)
}

function addCost (item: PriceItem) {
  const k = itemKey(item)
  if (!props.config.costs.some(c => itemKey(c) === k)) {
    props.config.costs.push({ type: item.type, name: item.name, variant: item.variant, qty: 1 })
  }
  costQuery.value = ''
}

function removeCost (line: CostLine) {
  const before = props.config.costs
  props.config.costs = before.filter(c => c !== line)
  toast(`Removed ${line.name}`, { anchor: panel.value?.el, undo: () => { props.config.costs = before } })
}

// Zone changes: count newly generated maps, book map vs other time, and
// resume an auto-paused session.
onGameLog((lines) => {
  const sess = props.config.session
  if (!sess) return
  let changed = false
  for (const { ev } of lines) {
    if (ev?.kind === 'zone') {
      nameRun(sess, ev.name)
      continue
    }
    if (ev?.kind !== 'area') continue
    const nowTs = Date.now()
    const inMap = isMapArea(ev.areaId)
    onZoneChange(sess, inMap || isMapSideArea(ev.areaId), nowTs)
    if (inMap && sess.runningSince != null && props.config.autoCountMaps && countNewMap(sess, ev.areaId, ev.seed)) {
      sess.maps++
      startRun(sess, ev.areaId, ev.areaLevel, nowTs)
      now.value = nowTs
      const per = t.value.perMap
      const prev = sess.runs && sess.runs.length >= 2 ? sess.runs[sess.runs.length - 2] : null
      const text = prev
        ? `Map ${sess.maps} · last map ${fmt(runResult(prev))}`
        : `Map ${sess.maps}` + (per != null ? ` · ${fmt(per)} per map so far` : '')
      setTimeout(() => dockRef.value?.peek(text), 1500)
    }
    changed = true
  }
  // Config is otherwise saved only when the overlay loses focus.
  if (changed) saveConfig()
})

// Hotkey: add the hovered item (copied by APT) to the session's loot.
const itemListener = MainProcess.onEvent('MAIN->CLIENT::item-text', (e) => {
  if (e.target !== FARMING_LOOT_TARGET) return
  const sess = props.config.session
  if (!sess) return
  const parsed = parseClipboard(e.clipboard).unwrapOr(null)
  if (!parsed) return
  const name = parsed.info.refName
  const snap = prices.snapshot.value
  const candidates = snap?.items.filter(i => i.name === name) ?? []
  // poe.ninja's variant the way APT's price check builds it ("20/20c" for a
  // corrupted gem, map tier and generation); with no exact match, the
  // cheapest variant rather than whichever is listed first (a 21/23c gem).
  let wanted = ''
  try { wanted = getDetailsId(parsed)?.variant ?? '' } catch {}
  const match = candidates.find(i => i.variant === wanted) ??
    candidates.find(i => !i.variant) ??
    candidates.slice().sort((a, b) => a.chaos - b.chaos)[0]
  const ref = match ?? { type: '', name, variant: '' }
  const qty = parsed.stackSize?.value ?? 1
  addLootTo(sess, ref, qty)
  saveConfig()
})
onUnmounted(() => { itemListener.abort() })

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => s.value
  ? [
      { label: s.value.runningSince != null ? 'Pause session' : 'Resume session', icon: s.value.runningSince != null ? 'fas fa-pause' : 'fas fa-play', action: toggle },
      { label: 'End session and save', icon: 'fas fa-flag-checkered', action: end },
      { label: 'Session analytics', icon: 'fas fa-chart-bar', action: () => { openOverlay(); openAnalytics() } }
    ]
  : [])
</script>

<style module>
.input {
  height: 26px;
  padding: 0 8px;
  font-size: var(--w-fs-md);
  color: var(--w-fg);
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
}
.input:focus { outline: none; border-color: var(--w-accent); }
.hero {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid var(--w-line);
  border-bottom: 1px solid var(--w-line);
}
.k {
  font-size: var(--w-fs-caps);
  text-transform: var(--w-caps-case);
  letter-spacing: 0.08em;
  color: var(--w-faint);
  font-family: var(--w-caps-face);
}
.big { font-size: var(--w-fs-xl); font-weight: 500; }
.stats {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr;
  align-items: center;
  gap: 2px 12px;
}
.lineGrid { grid-template-columns: minmax(0, 1fr) 22px 28px 22px 72px; gap: 4px; }
.costGrid { grid-template-columns: minmax(0, 1fr) 56px 72px 22px; }
.mapLine {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 8px;
  background: var(--w-panel-2);
  border: 1px solid var(--w-line-soft);
  border-radius: var(--w-r-sm);
}
.histGrid { grid-template-columns: minmax(0, 1fr) 40px 44px 64px 64px; }
</style>
