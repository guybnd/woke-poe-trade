<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <DockItem ref="dockEl" id="net-worth" title="Net worth" :show="config.dockIcon !== false" :wm-id="config.wmId"
      :badge="badge" :stack="stack" :glow="!!liveRun" :wheel="swapGlance" card-width="25rem" :menu="dockMenu" @open-change="cardOpen = $event">
      <template #card>
        <!-- Its data loads the first time the card opens, never at startup. -->
        <NetWorthCard v-if="cardOpen && personalReady" :status="status" :league="leagueId" :rate-window="config.rateWindow ?? '1h'" @window="config.rateWindow = $event" @refresh="refresh" @settings="openSettingsPage(wm, 'Game & league')"
          :run="liveRun" :stopping="stopping" :starting-run="startingRun" @start="startLive" :listed-chaos="listedChaos" @stop="stopLive" @open-run="openRun" />
        <div v-else class="w-dim text-xs" style="padding: 6px var(--w-pad);">{{ cardText }}</div>
      </template>
    </DockItem>
    <NetWorthPanel v-if="started" :config="config" :status="status" />
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { NET_WORTH_TYPE } from './widget'

export default {
  widget: {
    type: NET_WORTH_TYPE,
    instances: 'multi',
    trNameKey: 'Net worth'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
// The shell stays small: the window and its data load the first time it opens,
// or after a read finishes.
import { computed, defineAsyncComponent, inject, onUnmounted, shallowRef, watch } from 'vue'
import { Host, MainProcess } from '@/web/background/IPC'
import { AppConfig } from '@/web/Config'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { hideWhilePlaying, openSettingsPage, showWithOverlay } from '../dock/dock'
import { popupAnchor } from '../ui/window-anchor'
import { agoPhrase, nowMinute } from '../ui/format'
import { hostRequest } from '../shared/host'
import { RUN_HOLD_TARGET, parseHotkeyTarget, parseListedTarget } from './widget'
import { DOCS, GLANCE_LABELS, glanceFromPoints, glanceKey, glanceText, isGlance, ledgerKey, nextShows } from './glance'
import type { Glance } from './glance'
import { isRunGlance, runGlanceKey } from './runs'
import type { RunGlance } from './runs'
import type { LedgerPoint } from './ledger'
import { isListedWorth, isPendingGlance, keptSales, listedGlance, listedTotal, listedWorth, listedWorthKey, pendingGlanceKey, staleCount } from './pending-glance'
import { useZone } from '../shared/zone'
import type { NetWorthWidget, ReaderStatus } from './widget'
import { useGoto } from '../tab-bar/goto'

const NetWorthPanel = defineAsyncComponent(() => import('./NetWorthPanel.vue'))
const NetWorthCard = defineAsyncComponent(() => import('./NetWorthCard.vue'))
const cardOpen = shallowRef(false)
// The card's data needs the reader (main) to answer; outside Electron, the text.
const personalReady = computed(() => Host.isElectron || status.value != null)

const props = defineProps<{
  config: NetWorthWidget
}>()

const wm = inject<WidgetManager>('wm')!
// What's new's Show me (tab-bar/goto.ts): the view it names.
useGoto(props.config, 'woke-net-worth', {
  holdings: () => { props.config.view = 'holdings' },
  sales: () => { props.config.view = 'sales' },
  listed: () => { props.config.view = 'listed' },
  runs: () => { props.config.view = 'runs' }
})

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Net worth'
  props.config.anchor = popupAnchor()
  props.config.hotkey = null
  props.config.dockIcon = true
  wm.show(props.config.wmId)
}
hideWhilePlaying(props.config)

const status = shallowRef<ReaderStatus | null>(null)
const onScreen = computed(() => props.config.wmWants === 'show' && wm.active.value)
const started = shallowRef(false)
watch(onScreen, (yes) => { if (yes) started.value = true }, { immediate: true })

// The store loads once the window opens, or once a read finishes here.
let store: typeof import('./store') | null = null
let stopGlance: (() => void) | null = null
let firstReadAt: number | null | undefined
async function feed (s: ReaderStatus) {
  if (!store) {
    const readNow = firstReadAt !== undefined && s.lastReadAt !== firstReadAt && !s.running
    firstReadAt ??= s.lastReadAt
    if (!started.value && !readNow) return
    store = await import('./store')
    const stopA = watch(store.glance, (g) => { if (g) glance.value = g })
    const stopB = watch(store.runGlance, (g) => { runG.value = g })
    stopGlance = () => { stopA(); stopB() }
  }
  store.setLeague(leagueId.value)
  store.onStatus(s)
}
watch(started, (yes) => { if (yes && status.value) feed(status.value).catch(() => {}) })

const events = MainProcess.onEvent('MAIN->CLIENT::woke-event', ({ topic, data }) => {
  if (topic !== 'stash-reader') return
  status.value = data as ReaderStatus
  feed(status.value).catch(() => {})
})

// Main reads the league picked in Settings; the Account name setting is the fallback.
const leagueId = computed(() => AppConfig().leagueId ?? null)
watch([leagueId, () => AppConfig().accountName], ([league, accountName]) => {
  if (!Host.isElectron) return
  (hostRequest('stash-reader-config', { league, accountName }) as Promise<ReaderStatus>)
    .then((s) => { status.value = s; return feed(s) })
    .catch(() => {})
}, { immediate: true })

// The icon's number, from one small saved doc: the store isn't loaded for it.
const glance = shallowRef<Glance | null>(null)
let glanceFor: string | null = null
async function loadGlance (league: string) {
  glanceFor = league
  let g: unknown = await hostRequest('doc-get', { collection: DOCS, key: glanceKey(league) }).catch(() => null)
  if (!isGlance(g)) {
    // Read before glances were saved: the chart's last point, till the next read saves one.
    const led = await (hostRequest('doc-get', { collection: DOCS, key: ledgerKey(league) }) as Promise<{ points?: LedgerPoint[] } | null>).catch(() => null)
    g = glanceFromPoints(league, led?.points)
  }
  // A read counted meanwhile (store) is newer.
  if (glanceFor !== league || !isGlance(g) || g.league !== league) return
  if (glance.value?.league === league && glance.value.at >= g.at) return
  glance.value = g
}
watch(leagueId, (league) => {
  glance.value = null
  glanceFor = null
  if (league && Host.isElectron) loadGlance(league).catch(() => {})
}, { immediate: true })
// A strategy run going (runs.ts, D2): the icon shows its profit and glows.
const runG = shallowRef<RunGlance | null>(null)
watch(leagueId, (league) => {
  runG.value = null
  if (!league || !Host.isElectron) return
  hostRequest('doc-get', { collection: DOCS, key: runGlanceKey(league) })
    .then((g) => { if (leagueId.value === league && runG.value == null) runG.value = isRunGlance(g) && g.league === league ? g : null })
    .catch(() => {})
}, { immediate: true })
const liveRun = computed(() => runG.value && runG.value.league === leagueId.value ? runG.value : null)
// The run hotkey (K1, run-hold.ts): listened to only while a run goes.
let holdListener: AbortController | null = null
watch(() => !!liveRun.value, (on) => {
  holdListener?.abort()
  holdListener = null
  if (!on) return
  holdListener = MainProcess.onEvent('MAIN->CLIENT::item-text', (e) => {
    const league = leagueId.value
    if (e.target !== RUN_HOLD_TARGET || !league) return
    Promise.all([import('./run-hold'), store ? Promise.resolve(store) : import('./store')])
      .then(([hold, s]) => hold.holdHovered(e.clipboard, league, s.ledger.value.points, s.divine.value))
      .catch(() => {})
  })
}, { immediate: true })
onUnmounted(() => { holdListener?.abort() })
const stack = computed(() => {
  const r = liveRun.value
  if (r) return glanceText({ league: r.league, at: r.at, chaos: r.profitChaos, netChaos: r.profitChaos, divine: r.divine }, 'change', nowMinute.value)
  const g = glance.value
  if (!g || g.league !== leagueId.value) return null
  return glanceText(g, props.config.glanceShows ?? 'change', nowMinute.value)
})
// The wheel steps through what the number shows, naming it for a moment.
const dockEl = shallowRef<{ peek: (text: string, ms?: number) => void } | null>(null)
function swapGlance (dir: 1 | -1) {
  if (liveRun.value) { dockEl.value?.peek(`Run: ${liveRun.value.name}`, 1500); return }
  if (!glance.value) return
  const next = nextShows(props.config.glanceShows, dir)
  props.config.glanceShows = next
  dockEl.value?.peek(`${GLANCE_LABELS[next]}${stack.value ? '' : ': not yet'}`, 1500)
}

const hotkeys = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  // The Listed hotkey: open on Listed, or close when Listed is already showing.
  if (parseListedTarget(e.target) === props.config.wmId) {
    if (onScreen.value && props.config.view === 'listed') {
      wm.hide(props.config.wmId)
      Host.sendEvent({ name: 'OVERLAY->MAIN::focus-game', payload: undefined })
      return
    }
    props.config.view = 'listed'
    wm.show(props.config.wmId)
    wm.bringToTop(props.config.wmId)
    return
  }
  if (parseHotkeyTarget(e.target) !== props.config.wmId) return
  if (onScreen.value) {
    wm.hide(props.config.wmId)
    Host.sendEvent({ name: 'OVERLAY->MAIN::focus-game', payload: undefined })
    return
  }
  wm.show(props.config.wmId)
  wm.bringToTop(props.config.wmId)
})
onUnmounted(() => {
  events.abort()
  hotkeys.abort()
  stopGlance?.()
})

// Pending sales (pending-glance.ts): listings unsold past the stale line
// count on the icon (pick R1: a count, no popup).
const glanceSales = shallowRef<Array<{ id: string, at: number }>>([])
watch(leagueId, (league) => {
  listedGlance.value = null
  glanceSales.value = []
  if (!league || !Host.isElectron) return
  hostRequest('doc-get', { collection: DOCS, key: pendingGlanceKey(league) })
    .then((g) => { if (leagueId.value === league && listedGlance.value == null && isPendingGlance(g) && g.league === league) listedGlance.value = g })
    .catch(() => {})
  if (listedWorth.value?.league !== league) listedWorth.value = null
  hostRequest('doc-get', { collection: DOCS, key: listedWorthKey(league) })
    .then((w) => { if (leagueId.value === league && listedWorth.value == null && isListedWorth(w) && w.league === league) listedWorth.value = w })
    .catch(() => {})
}, { immediate: true })
// The At Faustus box (countListed): the card's total adds your unsold
// listings, as the window's does.
const listedChaos = computed(() => {
  const g = listedGlance.value
  if (props.config.countListed === false || !g || g.league !== leagueId.value) return 0
  const kept = keptSales.value?.league === g.league ? keptSales.value.sales : null
  return listedTotal(g, listedWorth.value, kept ?? glanceSales.value, glance.value?.divine ?? null)
})
const salesOk = (r: unknown, league: string): r is { league: string, sales: Array<{ id: string, at: number }> } =>
  !!r && typeof r === 'object' && (r as { league?: unknown }).league === league && Array.isArray((r as { sales?: unknown }).sales)
// The kept sales (a file read, no request) once there are listings to count.
watch(() => listedGlance.value?.items.length ? listedGlance.value.league : null, (league) => {
  if (!league) return
  hostRequest('trade-history', { league, read: 'none' }, 60_000)
    .then((r) => { if (salesOk(r, league) && leagueId.value === league) glanceSales.value = r.sales })
    .catch(() => {})
}, { immediate: true })
const salesEvents = MainProcess.onEvent('MAIN->CLIENT::woke-event', ({ topic, data }) => {
  if (topic === 'trade-history' && leagueId.value && salesOk(data, leagueId.value)) glanceSales.value = data.sales
})
const staleListed = computed(() => {
  const g = listedGlance.value
  if (!g || g.league !== leagueId.value) return 0
  const kept = keptSales.value?.league === g.league ? keptSales.value.sales : null
  return staleCount(g, kept ?? glanceSales.value, nowMinute.value, props.config.staleDays)
})
// On entering your hideout: the listings' quiet refresh (Guy, 2026-11-23).
const zoneNow = useZone()
watch(() => zoneNow.live && zoneNow.kind === 'hideout' ? zoneNow.enteredAt : 0, (at) => {
  const league = leagueId.value
  if (!at || !league || props.config.listedAuto === false || !status.value?.account) return
  // After main's own quiet sales read on the same entry, if you're still there.
  clearTimeout(autoTimer)
  autoTimer = setTimeout(() => {
    if (zoneNow.kind !== 'hideout' || zoneNow.enteredAt !== at || leagueId.value !== league) return
    import('./pending-store').then(m => m.autoRefreshListed(league)).catch(() => {})
  }, 5_000)
})
let autoTimer: ReturnType<typeof setTimeout> | undefined
onUnmounted(() => { salesEvents.abort(); clearTimeout(autoTimer) })

const badge = computed(() => status.value?.running ? '…' : status.value?.error ? '!' : staleListed.value || null)
const cardText = computed(() => {
  const s = status.value
  if (!s) return 'Click to open.'
  if (s.error) return s.error.message
  if (s.running) return 'Reading your stash…'
  return s.lastReadAt ? `Read ${agoPhrase(s.lastReadAt)}. Click to open.` : 'Not read yet. Click to open.'
})

function refresh () {
  hostRequest('stash-reader-read', null, 15 * 60_000).catch(() => {})
}

// The card's Run tab (pick Q1): Stop, and Open run (the window's Runs view).
const stopping = shallowRef(false)
async function stopLive () {
  const league = leagueId.value
  if (!league || stopping.value) return
  stopping.value = true
  try {
    const [s, rs] = await Promise.all([import('./store'), import('./run-stop')])
    if (!s.ledger.value.points.length) return
    await rs.stopLiveRun(league, s.ledger.value.points, s.divine.value)
    // The store may not be watched here yet (it loads with the window).
    if (leagueId.value === league) runG.value = s.runGlance.value
  } catch {} finally { stopping.value = false }
}
// Start from the card: from the last read, like the Runs view's Start.
const startingRun = shallowRef(false)
async function startLive (name: string) {
  const league = leagueId.value
  if (!league || startingRun.value) return
  startingRun.value = true
  try {
    const [s, rs] = await Promise.all([import('./store'), import('./run-start')])
    const led = s.ledger.value
    const at = led.points[led.points.length - 1]?.at
    if (at == null) return
    if (await rs.startRunAt(league, name, at, led.diffs, led.points, s.divine.value) && leagueId.value === league) runG.value = s.runGlance.value
  } catch {} finally { startingRun.value = false }
}
function openRun () {
  props.config.view = 'runs'
  showWithOverlay(wm, props.config.wmId)
}

const dockMenu = computed<DockMenuAction[]>(() => [
  { label: 'Open net worth', icon: 'fas fa-window-maximize', action: () => { showWithOverlay(wm, props.config.wmId) } },
  { label: 'Read stash now', icon: 'fas fa-sync-alt', action: refresh }
])
</script>
