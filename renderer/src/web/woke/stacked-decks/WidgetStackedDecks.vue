<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- Only the icon while playing, and only while a session runs (A1). -->
    <DockItem id="stacked-decks" title="Stacked decks" :show="!!session" :badge="session ? session.draws.length : null"
      :glow="opening" :wm-id="config.wmId" :menu="dockMenu" card-width="22rem">
      <template #card>
        <div v-if="session" :class="$style.card">
          <DeckSummary :draws="session.draws" :price="price" :deck-chaos="sessionDeck" :divine="sessionDivine" :limit="8" :chart-width="320" />
          <!-- The dock adds "Open Stacked decks" (the window) under this. -->
          <div :class="$style.actions">
            <button type="button" :class="$style.action" @click="newSession(true)"><i class="fas fa-redo text-xs" /> New session</button>
          </div>
        </div>
      </template>
    </DockItem>

    <WPanel ref="panel" :title="config.wmTitle || 'Stacked decks'" icon="fas fa-layer-group" width="26rem">
      <div class="flex flex-col gap-3 py-2" style="padding-left: var(--w-pad); padding-right: var(--w-pad);">
        <template v-if="session">
          <div class="flex items-baseline gap-2">
            <span class="w-accent font-medium">This session</span>
            <span class="w-dim text-xs grow">since {{ clock(session.startedAt) }}</span>
            <WButton size="sm" variant="ghost" icon="fas fa-redo" @click="newSession(false)">New session</WButton>
          </div>
          <DeckSummary :draws="session.draws" :price="price" :deck-chaos="sessionDeck" :divine="sessionDivine" :luck="luck" />
        </template>
        <template v-else>
          <WEmpty :art="{ item: STACKED_DECK }">Open a Stacked Deck in game to start a session. It ends after 15 minutes without a card.</WEmpty>
          <template v-if="lastRecord">
            <div class="flex items-baseline gap-2">
              <span class="w-accent font-medium">Last session</span>
              <span class="w-dim text-xs">{{ clock(lastRecord.startedAt) }}</span>
            </div>
            <DeckSummary :draws="lastRecord.draws" :price="recordPrice(lastRecord)" :deck-chaos="lastRecord.deckChaos" :divine="lastRecord.divine" :limit="12" />
          </template>
        </template>
        <OwnAverageLine :records="store.records.value" :price="price" :deck-chaos="deckChaos" :divine="divine" />
        <div class="text-xs w-faint">Every session is saved in Session analytics, under Stacked decks.</div>
      </div>
    </WPanel>

    <!-- A3 + C2: one popup for a big hit, gone by itself. -->
    <Teleport to="body">
      <div v-if="hit" :key="hit.key" :class="$style.hitLayer">
        <div :class="$style.hit" data-deck="big-hit">
          <WIcon :src="art(hit.name)" fallback="fas fa-clone" size="lg" />
          <div class="min-w-0">
            <div class="w-head-font w-accent w-trunc" :class="$style.hitName">{{ hit.name }}</div>
            <div class="text-xs w-dim">Deck {{ hit.deck }} · session {{ hit.result != null ? signed(hit.result) : '—' }}</div>
          </div>
          <span class="w-num font-semibold" :class="$style.hitValue">{{ money(hit.chaos) }}</span>
        </div>
      </div>
    </Teleport>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { STACKED_DECKS_TYPE, initStackedDecksWidget } from './deck'

export default {
  widget: {
    type: STACKED_DECKS_TYPE,
    instances: 'single',
    trNameKey: 'Stacked decks',
    initInstance: () => initStackedDecksWidget(0)
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { computed, inject, onUnmounted, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { beforeQuitSave, saveConfig } from '@/web/Config'
import { useLeagues } from '@/web/background/Leagues'
import { WButton, WEmpty, WIcon, WPanel, toast } from '../ui'
import { formatChaos } from '../ui/format'
import { ninjaIcon } from '../ui/game-icons'
import { popupAnchor } from '../ui/window-anchor'
import DockItem from '../dock/DockItem.vue'
import { dockIconEl, showWithOverlay, tickWhile } from '../dock/dock'
import type { DockMenuAction } from '../dock/dock'
import { followGameLog } from '../shared/game-log'
import { lineTime } from '../campaign/log-tail'
import DeckSummary from './DeckSummary.vue'
import OwnAverageLine from './OwnAverageLine.vue'
import { ACTIVE_MS, IDLE_END_MS, STACKED_DECK, initStackedDecks, isBigHit, isOver, markSeen, parseCardLine, recordPrice, replaySince, startSession, toRecord, totals } from './deck'
import type { StackedDecksWidget } from './deck'
import { useDeckPrices, useLuck } from './prices'
import { useDeckStore } from './store'
import { playHitSound } from './sound'

const props = defineProps<{
  config: StackedDecksWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Stacked decks'
  props.config.anchor = popupAnchor()
  initStackedDecks(props.config)
  wm.show(props.config.wmId)
}

const store = useDeckStore()
store.load()
const leagues = useLeagues()
const { price, deckChaos, divine, ready: pricesReady, fetch: fetchPrices } = useDeckPrices()
fetchPrices()

const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)
const session = computed(() => props.config.session)
// The session's own deck price and divine rate, once known.
const sessionDeck = computed(() => session.value?.deckChaos ?? deckChaos.value)
const sessionDivine = computed(() => session.value?.divine ?? divine.value)
const lastRecord = computed(() => store.records.value[0] ?? null)

// --- Saving: cards can come several a second, so the config is saved a
// moment after the last one (and on quit), not on every card. ---
let saveTimer: ReturnType<typeof setTimeout> | undefined
function flushSave () {
  if (saveTimer === undefined) return
  clearTimeout(saveTimer)
  saveTimer = undefined
  saveConfig()
}
function saveSoon () {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(flushSave, 2_000)
}
beforeQuitSave.add(flushSave)
onUnmounted(() => { beforeQuitSave.delete(flushSave); flushSave() })

// Prices that arrive after the session started are its prices.
watch([deckChaos, divine, session], () => {
  const s = props.config.session
  if (!s) return
  let changed = false
  if (s.deckChaos == null && deckChaos.value != null) { s.deckChaos = deckChaos.value; changed = true }
  if (s.divine == null && divine.value != null) { s.divine = divine.value; changed = true }
  if (changed) saveSoon()
})

const money = (chaos: number) => formatChaos(chaos, sessionDivine.value)
const signed = (chaos: number) => `${chaos > 0 ? '+' : ''}${money(chaos)}`
const art = (name: string) => ninjaIcon('DivinationCard', name) ?? undefined
const clock = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

// Luck (C3): only while the window is on screen, since it simulates sessions.
const windowShown = computed(() => props.config.wmWants === 'show' && wm.active.value)
const luckInput = computed(() => {
  const s = session.value
  if (!s || !windowShown.value) return null
  return { draws: s.draws, got: totals(s.draws, price.value, null).got, id: s.id }
})
const luck = useLuck(luckInput, price, store.records)

// --- The clock: glow while opening, end the session after 15 quiet minutes ---
const now = shallowRef(Date.now())
const opening = computed(() => !!session.value && now.value - session.value.lastAt < ACTIVE_MS)
// Not before the start-up log read: cards drawn while the app was closed may
// still belong to this session.
let caughtUp = false
const mountedAt = Date.now()
// Or 20 s after start-up, if no log was read (no timer: the tick checks).
const isCaughtUp = () => caughtUp || Date.now() - mountedAt >= 20_000
// Ticks only while there's a session or an ended one still to save, so
// nothing wakes up while you play without opening decks.
const stopTick = tickWhile(() => !!props.config.session || !!props.config.ended?.length, () => {
  now.value = Date.now()
  const s = props.config.session
  if (isCaughtUp() && s && isOver(s, now.value)) finish()
  saveEnded()
}, 5_000)
onUnmounted(stopTick)

// Ends the session. It goes into the history now, or once prices and the
// league are known (a session can end during the start-up log read).
function finish () {
  const s = props.config.session
  props.config.session = null
  if (s?.draws.length) props.config.ended = [...(props.config.ended ?? []), s]
  saveSoon()
  saveEnded()
}

// Without poe.ninja for a few minutes, saved anyway: its cards show no price.
const PRICE_WAIT_MS = 3 * 60_000
function saveEnded () {
  const ended = props.config.ended
  if (!ended?.length) return
  const league = leagues.selectedId.value
  if ((!pricesReady.value || !league) && Date.now() - mountedAt < PRICE_WAIT_MS) return
  props.config.ended = []
  saveSoon()
  for (const s of ended) {
    const record = toRecord({ ...s, league: s.league || league || '' }, s.lastAt, price.value, deckChaos.value, divine.value)
    store.save(record).catch((err: Error) => {
      toast(`Couldn't save the deck session: ${err.message}`)
    })
  }
}
watch([pricesReady, () => leagues.selectedId.value], saveEnded)

function newSession (fromDock: boolean) {
  const had = props.config.session?.draws.length ?? 0
  finish()
  flushSave()
  if (had) toast('Saved. The next card starts a new session.', { anchor: fromDock ? dockIconEl('stacked-decks') : panel.value?.el, dock: fromDock })
}

function openWindow () {
  showWithOverlay(wm, props.config.wmId)
}

const dockMenu = computed<DockMenuAction[]>(() => [
  { label: 'New session', icon: 'fas fa-redo', action: () => { newSession(true) } },
  { label: 'Open in window', icon: 'fas fa-up-right-from-square', action: openWindow }
])

// --- Cards from Client.txt ---
interface Hit { key: number, name: string, chaos: number, deck: number, result: number | null }
const hit = shallowRef<Hit | null>(null)
let hitTimer: ReturnType<typeof setTimeout> | undefined
let hitKey = 0
onUnmounted(() => { clearTimeout(hitTimer) })

function showHit (h: Omit<Hit, 'key'>) {
  if (props.config.hitPopup) {
    hit.value = { ...h, key: ++hitKey }
    clearTimeout(hitTimer)
    hitTimer = setTimeout(() => { hit.value = null }, 6_000)
  }
  if (props.config.hitSound) playHitSound()
}

followGameLog({
  since: () => replaySince(props.config.seenUntil, Date.now()),
  // Only a real read: with no Client.txt yet (the game not started), cards
  // from before may still come for this session.
  onTail: (tail) => { if (tail.path) setTimeout(() => { caughtUp = true }, 0) },
  onLines (lines, live) {
    let changed = false
    let best: Omit<Hit, 'key'> | null = null
    for (const { line, at } of lines) {
      const name = parseCardLine(line)
      if (!name) continue
      if (!markSeen(props.config, line, lineTime(line) ?? at)) continue
      let s = props.config.session
      if (s && at - s.lastAt >= IDLE_END_MS) {
        finish()
        s = null
      }
      if (!s) {
        props.config.session = startSession(at, leagues.selectedId.value ?? '', deckChaos.value, divine.value)
        s = props.config.session
      }
      s.draws.push(name)
      s.lastAt = Math.max(s.lastAt, at)
      changed = true
      if (live) {
        const chaos = price.value(name)
        if (isBigHit(chaos, s.divine ?? divine.value, props.config.hitDiv) && (!best || chaos! > best.chaos)) {
          best = { name, chaos: chaos!, deck: s.draws.length, result: null }
        }
      }
    }
    if (!changed) return
    now.value = Date.now()
    fetchPrices()
    saveSoon()
    if (best && props.config.session) {
      best.result = totals(props.config.session.draws, price.value, sessionDeck.value).result
      showHit(best)
    }
  }
})
</script>

<style module>
.card { display: flex; flex-direction: column; gap: 6px; padding: 6px var(--w-pad) 0; }
.actions { display: flex; border-top: 1px solid var(--w-line); margin: 0 calc(-1 * var(--w-pad)); }
.action {
  flex: 1;
  height: 30px;
  background: none;
  border: 0;
  color: var(--w-dim);
  font: inherit;
  cursor: pointer;
}
.action:hover { color: var(--w-fg); background: var(--w-line-soft); }
.hitLayer { position: fixed; inset: 0; pointer-events: none; z-index: 1000; display: flex; justify-content: center; align-items: flex-start; padding-top: 24vh; }
.hit {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 18rem;
  max-width: 28rem;
  padding: 10px 14px;
  background: var(--w-panel);
  border: 1px solid var(--w-accent);
  border-radius: var(--w-radius);
  box-shadow: var(--w-shadow), 0 0 18px color-mix(in srgb, var(--w-accent) 40%, transparent);
  color: var(--w-fg);
  animation: hit-in-out 6s ease forwards;
}
.hitName { font-size: var(--w-fs-lg); }
.hitValue { font-size: var(--w-fs-lg); color: var(--w-up); }
@keyframes hit-in-out {
  0% { opacity: 0; transform: translateY(-8px) scale(0.97); }
  6% { opacity: 1; transform: none; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .hit { animation: none; }
}
</style>
