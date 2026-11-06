<template>
  <Widget :config="mode === 'card' ? { ...config, anchor: cardAnchor } : config"
    :move-handles="mode === 'card' ? 'none' : 'corners'" :inline-edit="false" :readonly="true">
    <!-- Strictness and anything that needs you, behind one dock icon. -->
    <DockItem :menu="dockMenu" ref="dockRef" id="loot-filter" :art="dockArt" title="Loot filter" :show="dockShow"
      :badge="dockBadge" :tone="dockTone" :readouts="dockReadouts" :wm-id="config.wmId" card-width="22rem" @activate="openFromDock">
      <template #card>
        <div :class="$style.dock">
          <template v-if="config.neversink.on">
            <div class="flex items-center gap-2">
              <span class="whitespace-nowrap">{{ LEVEL_NAMES[shownLevel] }}</span>
              <span class="w-faint text-xs whitespace-nowrap">{{ config.strictAuto.on ? (config.strictAuto.paused ? 'auto paused' : 'auto') : 'manual' }}</span>
              <button v-if="config.strictAuto.on && config.strictAuto.paused" type="button" :class="$style.link" @click="backToAuto">Back to auto</button>
              <span class="grow" />
              <span v-if="!config.strictAuto.paused" class="w-faint text-xs w-num whitespace-nowrap">NeverSink {{ config.neversink.version }}</span>
            </div>
            <div :class="$style.levels" role="group" aria-label="Strictness" @wheel.prevent="onLevelWheel">
              <button v-for="(short, i) in LEVEL_SHORT" :key="i" type="button" :class="{ [$style.levelOn]: i === shownLevel, [$style.levelWanted]: wantedLevel === i }"
                :title="wantedLevel === i ? `${LEVEL_NAMES[i]}: what auto would pick` : LEVEL_NAMES[i]" :aria-label="LEVEL_NAMES[i]" :aria-pressed="i === shownLevel" @click="pickNow(i)">{{ short }}</button>
            </div>
            <div v-if="config.strictAuto.on" :class="$style.ladder">
              <div v-for="(step, i) in sortedLadder" :key="i" :class="{ [$style.stepOn]: step.level === config.neversink.level }">
                <b>{{ stepLabel(config.strictAuto.ladder, i) }}</b><span>{{ LEVEL_NAMES[step.level] }}</span>
              </div>
            </div>
            <div v-if="config.looserHotkey || config.stricterHotkey" class="flex items-center gap-1 text-xs w-dim">
              <WKbd v-if="config.looserHotkey" :keys="config.looserHotkey" /><WKbd v-if="config.stricterHotkey" :keys="config.stricterHotkey" /> looser / stricter
            </div>
          </template>
          <div v-if="reloadWaiting" :class="$style.reload">
            <div class="text-xs">{{ store.pendingReload.value ? 'Loot filter saved.' : 'Safety net updated.' }} The game still uses your old filter.</div>
            <div class="flex items-center gap-2">
              <WButton size="sm" variant="primary" @click="store.reloadInGame(true)">Reload now</WButton>
              <span v-if="config.reloadHotkey" class="flex items-center gap-1 text-xs w-dim">or press <WKbd :keys="config.reloadHotkey" /></span>
            </div>
          </div>
          <div v-for="n in dockNotes" :key="n.id" class="text-xs" :style="n.warn ? 'color: var(--w-warn)' : ''">{{ n.text }}</div>
          <div v-if="dismissable.length" class="flex flex-wrap items-center gap-1">
            <WButton size="sm" variant="primary" @click="seeNotice">{{ noticeAction(dismissable[0]) }}</WButton>
            <WButton size="sm" variant="ghost" @click="gotIt">Got it</WButton>
            <WButton v-if="dismissable.some(canTurnOff)" size="sm" variant="ghost" title="You can turn it back on in the Prices tab" @click="turnOff">Don't tell me about this</WButton>
          </div>
          <div v-if="config.editorHotkey" class="w-faint text-xs">Open the editor with <WKbd :keys="config.editorHotkey" /></div>
        </div>
      </template>
    </DockItem>
    <template v-if="mode === 'card'">
      <SampleCard v-if="sample && match" :store="store" :config="config" :facts="sample" :match="match" :area-level="effectiveAreaLevel"
        @close="close" @open-editor="openEditorFromCard" @area-level="areaOverride = $event" />
      <WPanel v-else title="Filter rule for this item" icon="wisdom" width="24rem" :resizable="false">
        <template #actions><button class="w-icon-btn" title="Close" @click="close"><i class="fas fa-times" /></button></template>
        <template v-if="store.error.value" #banner>
          <WBanner>{{ store.error.value }}<template #actions><WButton size="sm" @click="retry">Retry</WButton></template></WBanner>
        </template>
        <WSkeleton v-if="store.loading.value" :rows="3" />
        <WEmpty v-else-if="!store.error.value" :art="{ item: 'Orb of Scouring' }">
          No filter picked yet. Open the editor and choose your NeverSink filter.
        </WEmpty>
        <template #footer><WButton size="sm" variant="primary" @click="mode = 'editor'">Open editor</WButton></template>
      </WPanel>
    </template>
    <FilterEditor v-else :store="store" :config="config" :focus="focus" :open-tab="openTab" @close="close" @tab-opened="openTab = null" @paste-item="showSample($event, { x: 1, y: 1 })" />
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { LOOT_FILTER_TYPE } from './widget'

export default {
  widget: {
    type: LOOT_FILTER_TYPE,
    instances: 'multi',
    trNameKey: 'Loot filter'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { computed, inject, onUnmounted, ref, shallowRef, watch } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { parseClipboard } from '@/parser'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel, WEmpty, WButton, WBanner, WSkeleton, WKbd, gameIcon, toast } from '../ui'
import DockItem from '../dock/DockItem.vue'
import { showWithOverlay } from '../dock/dock'
import type { DockMenuAction } from '../dock/dock'
import { LEVEL_NAMES, LEVEL_SHORT, clampLevel, stepLabel } from './strictness'
import { canTurnOff, markSeen, noticeAction, visibleNotices } from './notices'
import type { Notice } from './notices'
import SampleCard from './SampleCard.vue'
import FilterEditor from './FilterEditor.vue'
import { useLootFilter } from './store'
import { pressedKeys, sortKeys } from './hotkey-match'
import { itemFacts } from './item-facts'
import type { ItemFacts } from './item-facts'
import { matchItem } from './match'
import { LOOT_FILTER_SAMPLE_TARGET, initLootFilterWidget, normalizeLootFilterWidget, parseEditorHotkeyTarget, parseReloadHotkeyTarget, parseStrictnessTarget } from './widget'
import type { LootFilterWidget } from './widget'

const props = defineProps<{
  config: LootFilterWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  initLootFilterWidget(props.config)
  wm.show(props.config.wmId)
}
normalizeLootFilterWidget(props.config)
// Left over if the app closed while the sample card was open.
if (props.config.wmZorder === 'exclusive') props.config.wmZorder = null
props.config.wmFlags = props.config.wmFlags.filter(f => f !== 'hide-on-blur')
// Settings can swap in a whole new config object; fill in any new fields.
watch(() => props.config, (c) => normalizeLootFilterWidget(c))

const store = useLootFilter(() => props.config)
const mode = ref<'card' | 'editor'>('editor')
const sample = shallowRef<ItemFacts | null>(null)
const samplePosition = shallowRef({ x: 1, y: 1 })
const focus = shallowRef<{ type: string, tier: string } | null>(null)
const openTab = shallowRef<{ tab: 'prices' | 'neversink' | 'changes' } | null>(null)
const areaOverride = ref<number | null>(null)

// The card shows alone, not with every open panel, and closes when you go back
// to the game. The editor is an ordinary window.
watch(mode, (m) => {
  const w = props.config
  wm.setFlag(w.wmId, 'hide-on-blur', m === 'card')
  if (m === 'card') {
    w.wmZorder = 'exclusive'
  } else if (w.wmZorder === 'exclusive') {
    w.wmZorder = null
    if (w.wmWants === 'show') wm.bringToTop(w.wmId)
  }
}, { flush: 'sync' })

const effectiveAreaLevel = computed(() => areaOverride.value ?? store.areaLevel.value ?? props.config.fallbackAreaLevel)

const match = computed(() => {
  const doc = store.doc.value
  if (!doc || !sample.value) return null
  return matchItem(doc, { ...sample.value, areaLevel: effectiveAreaLevel.value })
})

// One load at a time: store.loading only turns on after listFiles resolves.
let loading: Promise<void> | null = null
function ensureLoaded () {
  if (store.doc.value || store.loading.value || loading) return loading
  loading = (async () => {
    try {
      await store.listFiles()
      await store.load()
    } finally {
      loading = null
    }
  })()
  return loading
}
// Never set up: read nothing until it's first used, so an overlay you haven't
// touched stays quiet.
if (props.config.sourceName || props.config.neversink.on || props.config.wmWants === 'show') ensureLoaded()

async function retry () {
  await store.listFiles()
  await store.load()
}

const itemEvents = MainProcess.onEvent('MAIN->CLIENT::item-text', (e) => {
  if (e.target !== LOOT_FILTER_SAMPLE_TARGET) return
  showSample(e.clipboard, e.position)
})

function showSample (text: string, position: { x: number, y: number }) {
  samplePosition.value = position
  const parsed = parseClipboard(text).unwrapOr(null)
  sample.value = itemFacts(text, parsed)
  areaOverride.value = null
  mode.value = 'card'
  wm.show(props.config.wmId)
  ensureLoaded()
}

const itemFailed = MainProcess.onEvent('MAIN->CLIENT::item-text-failed', (e) => {
  if (e.target === LOOT_FILTER_SAMPLE_TARGET) toast('The game gave no item text for what is under the mouse.')
})

// Hotkeys only reach the game while it has focus: say so instead of nothing.
function onOverlayKey (e: KeyboardEvent) {
  const key = props.config.sampleHotkey
  if (!key || e.repeat || props.config.wmWants !== 'show') return
  // Typing or recording a hotkey somewhere in the overlay, not trying to sample.
  const t = e.target as HTMLElement | null
  if (t?.closest?.('input, textarea, select, [contenteditable]')) return
  if (pressedKeys(e) === sortKeys(key)) toast(`Click into the game first, hover the item, then press ${key}.`)
}
window.addEventListener('keydown', onOverlayKey)

const hotkeys = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  const step = parseStrictnessTarget(e.target)
  if (step && step.wmId === props.config.wmId) {
    store.stepLevel(step.dir === 'stricter' ? 1 : -1).catch(() => {})
    return
  }
  if (parseReloadHotkeyTarget(e.target) === props.config.wmId) {
    if (store.outputSaved.value) store.reloadInGame(true)
    else toast('No saved loot filter to reload yet. Save it in the editor first.')
    return
  }
  if (parseEditorHotkeyTarget(e.target) !== props.config.wmId) return
  // Always opens: the key only fires from the game, where the editor can't be seen.
  mode.value = 'editor'
  wm.show(props.config.wmId)
  ensureLoaded()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onOverlayKey)
  itemFailed.abort()
  itemEvents.abort()
  hotkeys.abort()
})

function close () {
  wm.hide(props.config.wmId)
}

function openEditorFromCard (at?: { type: string, tier: string }) {
  const b = match.value?.final?.block
  focus.value = at ?? (b?.type && b.tier ? { type: b.type, tier: b.tier } : null)
  mode.value = 'editor'
}

// ---- dock icon ----

// Saved prices load a moment after the start: no warning about none until then.
const pricesSettled = ref(false)
const settleTimer = setTimeout(() => { pricesSettled.value = true }, 30000)
onUnmounted(() => { clearTimeout(settleTimer) })

const dockRef = shallowRef<InstanceType<typeof DockItem> | null>(null)

// The card's level row. Scrolling shows each step at once and saves once it
// stops, so five notches write one file.
const SCROLL_SETTLE_MS = 350
const scrolledTo = ref<number | null>(null)
let scrollTimer: ReturnType<typeof setTimeout> | undefined
const shownLevel = computed(() => scrolledTo.value ?? props.config.neversink.level)
// Only worth marking once it differs from what's on.
const wantedLevel = computed(() => props.config.strictAuto.on && props.config.strictAuto.paused && store.ladderPick.value !== shownLevel.value ? store.ladderPick.value : null)

function pickNow (level: number) {
  clearTimeout(scrollTimer)
  scrolledTo.value = null
  store.pickLevel(level).catch(() => {})
}

function onLevelWheel (e: WheelEvent) {
  if (!e.deltaY) return
  // One level per event: how far a notch reports depends on your Windows setting.
  const next = clampLevel(shownLevel.value + Math.sign(e.deltaY))
  scrolledTo.value = next
  clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => pickNow(next), SCROLL_SETTLE_MS)
}
function backToAuto () {
  clearTimeout(scrollTimer)
  scrolledTo.value = null
  store.resumeLadder()
  if (store.ladderPick.value == null) toast('Auto strictness is back on. It picks a level from your next map.')
}

onUnmounted(() => {
  // A scroll still settling is still what you asked for.
  if (scrolledTo.value != null) pickNow(scrolledTo.value)
})
const dockArt = computed(() => gameIcon('Orb of Scouring', 'ITEM'))
const sortedLadder = computed(() => [...props.config.strictAuto.ladder].sort((a, b) => a.from - b.from))
const allNotes = computed<Notice[]>(() => {
  const out: Notice[] = []
  const ready = store.updateReady.value
  if (ready) out.push({ id: 'update', value: ready.version, tab: 'neversink', text: `NeverSink ${ready.version} is ready: ${ready.ok} of ${ready.total} changes fit${ready.movesTotal > ready.movesFit ? `, and ${ready.movesTotal - ready.movesFit} price moves will go back to NeverSink's tiers` : ''}. Update in the editor.` })
  const moves = store.plan.value?.moves.length ?? 0
  if (moves) out.push({ id: 'prices', value: moves, tab: 'prices', text: `${moves} item${moves > 1 ? 's' : ''} would move to match today's prices.` })
  if (store.safetyCount.value) out.push({ id: 'safety', value: store.safetyCount.value, tab: 'prices', text: `Safety net shows ${store.safetyCount.value} valuable item${store.safetyCount.value > 1 ? 's' : ''} the filter hides.` })
  if (store.netWithoutPrices.value && pricesSettled.value) {
    out.push({
      id: 'net-prices',
      value: store.safetyCount.value,
      tab: 'prices',
      text: store.safetyCount.value
        ? `No poe.ninja prices for this league yet. The safety net is using its last list of ${store.safetyCount.value}.`
        : 'No poe.ninja prices for this league yet, so the safety net is empty.'
    })
  } else if (store.pricesStale.value) {
    const hours = Math.round(store.priceAgeHours.value ?? 0)
    out.push({ id: 'prices-old', value: Math.floor(hours / 24), warn: true, tab: 'prices', text: `Prices are ${hours >= 48 ? `${Math.round(hours / 24)} days` : `${hours} hours`} old, so the safety net and price moves may be off.` })
  }
  if (store.movesFromOtherLeague.value) {
    const n = store.movesFromOtherLeague.value
    out.push({ id: 'moves-league', value: n, warn: true, tab: 'prices', text: `${n} price move${n > 1 ? 's' : ''} from ${store.otherMovesLeague.value} ${n > 1 ? 'are' : 'is'} off in this league.` })
  }
  if (store.gameFilter.value.loaded === false) out.push({ id: 'load', value: 1, warn: true, tab: 'changes', text: 'The game couldn\'t load your filter. Open the editor and save again.' })
  else if (store.wrongFilterInGame.value) out.push({ id: 'wrong', value: store.gameFilter.value.name ?? '', warn: true, text: `The game is using "${store.gameFilter.value.name}", not your saved copy.` })
  if (store.failed.value.length) out.push({ id: 'failed', value: store.failed.value.length, warn: true, tab: 'changes', text: `${store.failed.value.length} change(s) need a new home after a NeverSink update.` })
  if (store.sourceChanged.value) out.push({ id: 'source-changed', value: 1, passing: true, tab: 'changes', text: 'The filter you started from has changed. Save to bring your copy up to date.' })
  return out
})
// Warnings' Got it lasts until a restart, so it isn't saved.
const sessionSeen = ref<Record<string, string | number>>({})
const dockNotes = computed(() => visibleNotices(allNotes.value, {
  off: props.config.noticesOff,
  seen: { ...props.config.noticesSeen, ...sessionSeen.value }
}))
const dismissable = computed(() => dockNotes.value.filter(n => !n.passing))

function gotIt () {
  const next = markSeen(dismissable.value, props.config.noticesSeen, sessionSeen.value)
  props.config.noticesSeen = next.saved
  sessionSeen.value = next.session
}

function turnOff () {
  const ids = dismissable.value.filter(canTurnOff).map(n => n.id)
  props.config.noticesOff = [...new Set([...props.config.noticesOff, ...ids])]
}

function seeNotice () {
  const n = dismissable.value[0]
  if (!n) return
  openTab.value = n.tab ? { tab: n.tab } : null
  mode.value = 'editor'
  showWithOverlay(wm, props.config.wmId)
  ensureLoaded()
}

// The icon or the card's Open row: straight to what the card is telling you. An
// editor you can see stays on its tab; one left open stays 'show' behind the game.
function openFromDock () {
  const tab = dismissable.value[0]?.tab
  if (tab && (!wm.active.value || props.config.wmWants !== 'show' || mode.value === 'card')) openTab.value = { tab }
  mode.value = 'editor'
  ensureLoaded()
}

// A saved filter the game hasn't loaded. Reloading takes a key press or a click:
// GGG's rules don't allow it on a log line or a timer.
const reloadWaiting = computed(() => props.config.reloadViaChat && (store.pendingReload.value || store.netWaitsForReload.value))
const dockReadouts = computed(() => reloadWaiting.value ? [{ id: 'reload', text: 'Reload', tone: 'up' as const }] : undefined)
const dockShow = computed(() => reloadWaiting.value || (Boolean(store.doc.value) && (props.config.neversink.on || dockNotes.value.length > 0)))
const dockBadge = computed(() => props.config.neversink.on ? LEVEL_SHORT[props.config.neversink.level] : (dockNotes.value.length || null))
const dockTone = computed(() => dockNotes.value.some(n => n.warn) ? 'warn' : (dockNotes.value.some(n => n.id === 'update') ? 'accent' : undefined))

// Say it briefly when the strictness changes.
watch(() => props.config.neversink.level, (l, old) => {
  if (old != null && l !== old) dockRef.value?.peek(LEVEL_NAMES[l])
})

// The card is a one-off; showing the widget again from the menu opens the editor.
watch(() => props.config.wmWants, (wants) => {
  if (wants === 'hide') mode.value = 'editor'
  else ensureLoaded()
})

// Same placement as APT's item info: next to the stash or inventory panel,
// on the side away from the hovered item.
const cardAnchor = computed(() => {
  const width = wm.size.value.width
  const poePanelWidth = wm.poePanelWidth.value
  const side = samplePosition.value.x > (window.screenX + width / 2) ? 'inventory' : 'stash'
  return {
    pos: side === 'stash' ? 'cl' : 'cr',
    y: 50,
    x: side === 'stash'
      ? (poePanelWidth / width) * 100
      : ((width - poePanelWidth) / width) * 100
  }
})

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => [
  // Each sets the filter once, from this click.
  ...(props.config.neversink.on
    ? [
        { label: 'Stricter', icon: 'fas fa-filter', action: () => { store.stepLevel(1).catch(() => {}) } },
        { label: 'Looser', icon: 'fas fa-border-none', action: () => { store.stepLevel(-1).catch(() => {}) } }
      ]
    : []),
  ...(dismissable.value.length
    ? [
        { label: 'See the notice', icon: 'fas fa-eye', action: seeNotice },
        { label: 'Got it', icon: 'fas fa-check', action: gotIt },
        ...(dismissable.value.some(canTurnOff) ? [{ label: "Don't tell me about this", icon: 'fas fa-bell-slash', action: turnOff }] : [])
      ]
    : [])
])
</script>

<style module>
.dock {
  padding: 6px var(--w-pad) 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.reload {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-radius-sm);
  background: var(--w-accent-soft);
}
.link {
  color: var(--w-accent);
  font-size: var(--w-fs-xs);
  white-space: nowrap;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.link:hover { text-decoration: underline; }
.levels {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px;
}
.levels button {
  position: relative;
  padding: 5px 0;
  font-size: var(--w-fs-xs);
  font-weight: 600;
  color: var(--w-dim);
  background: var(--w-line-soft);
  border: 0;
  border-radius: var(--w-radius-sm);
  cursor: pointer;
}
.levels button:hover { background: var(--w-accent-soft); color: var(--w-fg); }
.levels button.levelOn { background: var(--w-accent); color: var(--w-accent-fg); }
/* What auto would pick, while you've paused it. */
.levels button.levelWanted::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -1px;
  margin-left: -3px;
  border: 3px solid transparent;
  border-bottom-color: var(--w-accent);
}
.ladder {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 3px;
  font-size: var(--w-fs-xs);
}
.ladder div {
  display: flex;
  flex-direction: column;
  border-top: 3px solid var(--w-line);
  padding-top: 2px;
  color: var(--w-dim);
}
.ladder b { font-weight: 600; }
.stepOn {
  border-color: var(--w-accent) !important;
  color: var(--w-fg) !important;
}
</style>
