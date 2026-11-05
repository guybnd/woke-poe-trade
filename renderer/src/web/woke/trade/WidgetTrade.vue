<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- While you play: an icon with a badge for open offers that peeks when
         one arrives (A1); resting on it opens the offers with buttons (B1). -->
    <DockItem :menu="dockMenu" :wake="sellCount" ref="dockRef" id="trade" title="Trades" :show="shown.length > 0 || lingering"
      :badge="sellCount || null" :tone="anyInArea ? 'up' : 'accent'" :led="book.afk ? 'warn' : null" :wm-id="config.wmId"
      card-width="23rem" @open-change="onCard">
      <template #card>
        <div v-if="book.afk" class="text-xs" style="padding: 2px var(--w-pad); color: var(--w-warn);">You're AFK: buyers get your autoreply.</div>
        <OfferRow v-for="o in shown" :key="o.id" :offer="o" :expanded="o.id === expandedId" :now="now" :row-style="rowStyle"
          :step-key="o.id === frontId ? config.stepHotkey : null" :value="valueText(o)" :delta="deltaOf(o)" :art="artFor(o)"
          @expand="expand(o)" @reply="reply(o, $event)" @traded="traded(o)" @dismiss="dismissOffer(o)" @reopen="reopenOffer(o)" />
        <OfferHistory :offers="older" :open="historyOpen" :now="now" :row-style="rowStyle" :art-for="artFor"
          @toggle="toggleHistory" @reopen="reopenOffer" />
        <div v-if="!tipClosed('trade-step-key')" class="w-faint text-xs" :class="$style.hint" data-tip="trade-step-key">
          <span v-if="config.stepHotkey"><WKbd :keys="config.stepHotkey" /> next step for the top offer</span>
          <span v-else>A "next step" key answers without the mouse. <button type="button" :class="$style.hintLink" data-open-settings @click="openSettingsPage(wm, 'Trades')">Set it in Settings</button></span>
          <button type="button" :class="$style.hintClose" title="Don't show this again" aria-label="Don't show this again" @click="closeTip('trade-step-key')"><i class="fas fa-times" /></button>
        </div>
      </template>
    </DockItem>

    <WPanel ref="panel" :title="config.wmTitle || 'Trades'" icon="divine" width="26rem" max-height="70vh" :hotkey="config.stepHotkey">
      <template v-if="log.error.value" #banner>
        <WBanner>Couldn't read the sales log: {{ log.error.value }}
          <template #actions><WButton size="sm" @click="log.load(true)">Retry</WButton></template>
        </WBanner>
      </template>
      <template #tabs>
        <WTabs v-model="config.tab" :options="tabOptions" />
      </template>

      <template v-if="config.tab === 'offers'">
        <WEmpty v-if="!shown.length" :art="{ currency: 'divine' }">
          No open offers. Trade whispers you get (and send) show up here and in the trade icon while you play.
        </WEmpty>
        <OfferRow v-for="o in shown" :key="o.id" :offer="o" :expanded="o.id === expandedId" :now="now" :row-style="rowStyle"
          :step-key="o.id === frontId ? config.stepHotkey : null" :value="valueText(o)" :delta="deltaOf(o)" :art="artFor(o)"
          @expand="expand(o)" @reply="reply(o, $event)" @traded="traded(o)" @dismiss="dismissOffer(o)" @reopen="reopenOffer(o)" />
        <OfferHistory :offers="older" :open="historyOpen" :now="now" :row-style="rowStyle" :art-for="artFor"
          @toggle="toggleHistory" @reopen="reopenOffer" />
      </template>

      <template v-else>
        <div :class="$style.totals">
          <div><span class="w-dim">Today</span> <b class="w-num" :class="net(today) >= 0 ? 'w-up' : 'w-down'">{{ signed(net(today)) }}</b></div>
          <div class="w-dim text-xs">
            League: sold <span class="w-num">{{ money(league.sold) }}</span> ({{ league.sales }}) · spent <span class="w-num">{{ money(league.spent) }}</span> ({{ league.buys }})
            <span v-if="league.unpriced" :title="'No poe.ninja price when they happened, so they are left out of the sums'"> · {{ league.unpriced }} unpriced</span>
          </div>
        </div>
        <WSkeleton v-if="!log.loaded.value && !log.error.value" :rows="4" />
        <WEmpty v-else-if="!leagueTrades.length" :art="{ currency: 'chaos' }">
          Nothing traded this league yet. A trade is logged when the trade window completes with a buyer from your offers.
        </WEmpty>
        <div v-else :class="$style.log">
          <div v-for="t in leagueTrades.slice(0, 200)" :key="t.id" class="w-row" :class="$style.logRow" @contextmenu="logMenu($event, t)">
            <span class="w-faint w-num">{{ timeOf(t.at) }}</span>
            <span class="w-trunc">{{ offerLabel({ item: t.item, qty: t.qty, bulk: t.qty !== 1 }) }}</span>
            <span class="w-dim w-trunc text-xs">{{ t.dir === 'sell' ? t.who : `from ${t.who}` }}</span>
            <span class="w-num text-right whitespace-nowrap" :class="t.dir === 'sell' ? 'w-up' : 'w-down'">{{ t.dir === 'sell' ? '+' : '−' }}{{ priceLabel(t.price) }}</span>
          </div>
        </div>
      </template>

      <template #footer>
        <span>{{ config.tab === 'offers' ? 'Replies send one chat line per click' : 'Right-click a trade to remove it' }}</span>
      </template>
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { TRADE_TYPE } from './widget'
import type { TradeWidget } from './widget'

export default {
  widget: {
    type: TRADE_TYPE,
    instances: 'multi',
    trNameKey: 'Trades'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { computed, inject, nextTick, onUnmounted, reactive, shallowRef, watch } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { AppConfig } from '@/web/Config'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel, WTabs, WEmpty, WButton, WBanner, WSkeleton, WKbd, openMenu, toast } from '../ui'
import { gameIcon } from '../ui/game-icons'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { closeTip, dockIconEl, hideWhilePlaying, openSettingsPage, saveDock, tipClosed } from '../dock/dock'
import { usePriceIndex } from '../market/price-index'
import { priceResolver } from '../boss-runs/calc'
import { useLeagues } from '@/web/background/Leagues'
import { logTail } from '../campaign/log-tail'
import { onGameLog } from '../shared/game-log'
import OfferRow from './OfferRow.vue'
import OfferHistory from './OfferHistory.vue'
import { OPEN_FOR_MS, alreadyClosed, applyEvent, belongsInHistory, dismiss, front, markSent, markTraded, newBook, nextStep, prune, queue, recordFor, reopen, skip } from './book'
import type { Offer, TradeBook, TradeRecord } from './book'
import { DEFAULT_REPLIES, REPLY_LABELS, parseHotkeyTarget, replyText } from './widget'
import type { ReplyId } from './widget'
import { artNames, offerLabel, parseTradeLine, priceLabel } from './whispers'
import { bulkDelta, priceChaos } from './value'
import { formatChaos } from '../ui/format'
import { tradeTotals, tradesInRange, useOfferHistory, useTradeLog } from './log-store'

const props = defineProps<{
  config: TradeWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Trades'
  props.config.anchor = { pos: 'tr', x: 98, y: 15 }
  props.config.stepHotkey ??= null
  props.config.busyHotkey ??= null
  props.config.skipHotkey ??= null
  props.config.replies ??= { ...DEFAULT_REPLIES }
  props.config.ping ??= true
  props.config.trackBuying ??= true
  props.config.tab ??= 'offers'
  wm.show(props.config.wmId)
}
props.config.replies ??= { ...DEFAULT_REPLIES }
props.config.tab ??= 'offers'
hideWhilePlaying(props.config)

const book = reactive<TradeBook>(newBook())
const log = useTradeLog()
log.load()
const history = useOfferHistory()

// --- Prices ---
const prices = usePriceIndex()
const divine = computed(() => prices.snapshot.value?.divine ?? null)
const px = computed(() => {
  const r = priceResolver(prices.snapshot.value?.items ?? [])
  return { price: (name: string) => name === 'Chaos Orb' ? 1 : r.price(name) }
})
function valueText (o: Offer): string | null {
  const c = priceChaos(o.price, px.value)
  if (c == null) return null
  const text = formatChaos(c, divine.value)
  // "120 div" next to a price of "120 div" says nothing.
  return text === priceLabel(o.price) ? null : text
}
function deltaOf (o: Offer): number | null {
  return bulkDelta(o, px.value)
}
// Item art: bulk currency by name; uniques by their name without the base.
function artFor (o: Offer): string | null {
  if (o.bulk) return gameIcon(o.item)
  for (const name of artNames(o.item)) {
    const art = gameIcon(name, 'UNIQUE') ?? gameIcon(name, 'GEM')
    if (art) return art
  }
  return null
}

// --- Offers ---
const shown = computed(() => {
  const open = queue(book).filter(o => props.config.trackBuying !== false || o.dir === 'sell')
  const closed = book.offers.filter(o => o.closed && o.closed !== 'expired').sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))
  return [...open, ...closed]
})
const frontOffer = computed(() => shown.value.find(o => !o.closed) ?? null)
const frontId = computed(() => frontOffer.value?.id ?? null)
const sellCount = computed(() => shown.value.filter(o => !o.closed && o.dir === 'sell').length)
const anyInArea = computed(() => shown.value.some(o => !o.closed && o.inArea))

// The history, minus what's still on show above it.
const older = computed(() => {
  const onShow = new Set(shown.value.map(o => o.id))
  return history.offers.value.filter(o => belongsInHistory(o) && !onShow.has(o.id) && (props.config.trackBuying !== false || o.dir === 'sell'))
})
const historyOpen = shallowRef(false)
function toggleHistory () {
  historyOpen.value = !historyOpen.value
  // The clock only runs while there are offers.
  now.value = Date.now()
}
const rowStyle = computed(() => props.config.rowStyle ?? 'hover')

// The front offer is open; clicking an offer opens it, clicking it again closes
// it. Once you've closed one they all stay closed until you open one.
const ALL_CLOSED = 'all-closed'
const picked = shallowRef<string | null>(null)
const expandedId = computed(() => {
  if (picked.value === ALL_CLOSED) return null
  const p = picked.value && shown.value.find(o => o.id === picked.value && !o.closed)
  return p ? p.id : frontId.value
})
function expand (o: Offer) {
  if (o.closed) return
  picked.value = expandedId.value === o.id ? ALL_CLOSED : o.id
}
// The next offer after an empty queue opens by itself again.
watch(frontId, (id) => { if (id == null) picked.value = null })

const now = shallowRef(Date.now())
// Ticks only while there are offers to age (the perf checks count wakeups
// while you play).
let clock: ReturnType<typeof setInterval> | undefined
watch(() => book.offers.length > 0, (any) => {
  clearInterval(clock)
  clock = undefined
  if (any) {
    clock = setInterval(() => {
      now.value = Date.now()
      prune(book, now.value)
    }, 1000)
  }
}, { immediate: true })

// --- Client.txt ---
const dockRef = shallowRef<InstanceType<typeof DockItem> | null>(null)
const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)
const seenAtStart = new Set<string>()

function handle (line: string, live: boolean) {
  const ev = parseTradeLine(line, Date.now(), AppConfig().language)
  if (!ev) return
  // Live lines use this computer's clock, so offers age the same way
  // whatever the log's clock says. Trades keep the log's time: it names
  // them, so reading the same lines again after a restart finds the same trade.
  const lineAt = ev.at
  if (live) ev.at = Date.now()
  if (ev.kind === 'whisper-out' && ev.offer && props.config.trackBuying === false) return
  const res = applyEvent(book, ev)
  if (!live && res.added && alreadyClosed(history.offers.value, res.added)) {
    const id = res.added.id
    book.offers = book.offers.filter(o => o.id !== id)
    return
  }
  if (res.finished) logTrade(res.finished, lineAt, false)
  if (res.added && live) announce(res.added)
  now.value = Date.now()
}

function announce (o: Offer) {
  if (o.dir !== 'sell') return
  if (props.config.ping !== false) ping()
  touched()
  showBubble(o)
}

// --- The bubble: the icon grown into one line naming an offer. It stays until
// no offers are open, or with a time in the settings, until that long after the
// last whisper or reply (the icon stays that long too, for what you just closed). ---
const BUBBLE_HOLD_MS = 24 * 3_600_000
const lingering = shallowRef(false)
const bubbleId = shallowRef<string | null>(null)
let lingerTimer: ReturnType<typeof setTimeout> | undefined

function showBubble (o: Offer) {
  bubbleId.value = o.id
  // Ended by endBubble, not by the peek's own clock.
  nextTick(() => dockRef.value?.peek(`${o.who}: ${offerLabel(o)} · ${priceLabel(o.price)}`, BUBBLE_HOLD_MS))
}
function endBubble () {
  bubbleId.value = null
  dockRef.value?.unpeek()
}
function touched () {
  clearTimeout(lingerTimer)
  const seconds = props.config.bubbleSeconds ?? 0
  lingering.value = seconds > 0
  if (seconds <= 0) return
  lingerTimer = setTimeout(() => {
    lingering.value = false
    endBubble()
  }, seconds * 1000)
}
// The offer it names is closed: the next one takes over, or it ends.
watch(() => shown.value.filter(o => !o.closed && o.dir === 'sell').map(o => o.id).join(), () => {
  const id = bubbleId.value
  if (!id) return
  const open = shown.value.filter(o => !o.closed && o.dir === 'sell')
  if (open.some(o => o.id === id)) return
  if (open.length) showBubble(open[0])
  else endBubble()
})

// Lines handled live before the start-up read came back: that read (it
// retries for a few seconds while the log watcher starts) can hold them too.
let replayed = false
const seenLive = new Set<string>()

onGameLog((lines) => {
  for (const { line } of lines) {
    if (seenAtStart.has(line)) continue
    if (!replayed) seenLive.add(line)
    handle(line, true)
  }
})

// After a restart, pick up offers from the last half hour of Client.txt. The
// history comes first, so offers you already closed stay closed.
loadHistory().then(() => logTail()).then(tail => {
  const since = Date.now() - 30 * 60_000
  const until = Date.now() + 60_000
  for (const line of tail.lines) {
    if (seenLive.has(line)) continue
    const ev = parseTradeLine(line, 0, AppConfig().language)
    if (!ev || ev.at < since || ev.at > until) continue
    // The same line may also arrive live if it was written as the app
    // started: count it once.
    seenAtStart.add(line)
    handle(line, false)
  }
  prune(book, Date.now())
  // Offers open since before a restart: no ping, but the bubble stays until
  // none are open, so it shows for them too.
  if ((props.config.bubbleSeconds ?? 0) <= 0 && !bubbleId.value) {
    const open = shown.value.find(o => !o.closed && o.dir === 'sell')
    if (open) showBubble(open)
  }
}).catch(() => {}).finally(() => {
  replayed = true
  seenLive.clear()
})

// Offers you reopened and hadn't closed again come back; old ones rest in the history.
function restoreReopened () {
  for (const rec of history.offers.value) {
    if (rec.reopenedAt == null) continue
    if (Date.now() - rec.reopenedAt < OPEN_FOR_MS) reopen(book, rec, rec.reopenedAt)
    else history.forgetReopened(rec.id)
  }
}

async function loadHistory () {
  for (let tries = 0; tries < 3; tries++) {
    try {
      await history.load()
      restoreReopened()
      return
    } catch (err) {
      // A locked file throws rather than reading as empty.
      if (tries === 2) toast(`Couldn't read the offer history: ${(err as Error).message}`)
      else await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}

function ping () {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 660
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    // Each context holds an audio thread until it's closed.
    osc.onended = () => { ctx.close().catch(() => {}) }
  } catch {}
}

// --- Replies ---
function send (text: string) {
  MainProcess.sendEvent({
    name: 'CLIENT->MAIN::user-action',
    payload: { action: 'paste-in-chat', text, immediate: true }
  })
}

// The app drops a chat line typed while the previous one is still going
// out (it guards the clipboard), so presses closer than this are ignored
// rather than moving the offer on without a message sent.
const MIN_GAP_MS = 500
let lastSentAt = 0

function reply (o: Offer, id: ReplyId) {
  if (Date.now() - lastSentAt < MIN_GAP_MS) return
  const text = replyText(props.config.replies ?? DEFAULT_REPLIES, o, id)
  if (!text) {
    toast('That reply has no text. Set it in Settings → Trades.', { anchor: panel.value?.$el })
    return
  }
  lastSentAt = Date.now()
  touched()
  send(text)
  markSent(book, o, id, Date.now())
  if (picked.value === o.id && o.closed) picked.value = null
}

function traded (o: Offer) {
  touched()
  const t = markTraded(o, Date.now())
  if (t) {
    logTrade(t, Date.now(), true)
    // No "Trade accepted" line to find, so remember it: otherwise a restart
    // brings the whisper back open, and it could be sold twice. History hides it.
    history.add(o).catch(() => {})
  }
}

function dismissOffer (o: Offer) {
  touched()
  dismiss(o, Date.now())
  // In the dock card the row's Reopen does this: a toast out on the screen isn't
  // clickable while the game has the mouse.
  const el: Element | undefined = panel.value?.$el
  if (!el?.getBoundingClientRect().width) return
  toast(`Removed ${o.who}'s offer`, { anchor: el, undo: () => reopenOffer(o) })
}

function reopenOffer (o: Offer) {
  touched()
  const open = reopen(book, o, Date.now())
  // They whispered again meanwhile, so the new offer stands in for this one.
  if (open.id !== o.id) history.remove(o.id).catch(() => {})
  else history.markReopened(o.id, Date.now()).catch(() => {})
  picked.value = open.id
  now.value = Date.now()
  // An offer is open again, so the bubble that ended with the last one is back.
  if ((props.config.bubbleSeconds ?? 0) <= 0 && !bubbleId.value && open.dir === 'sell') showBubble(open)
}

// Closed offers go into the history as they close, so a restart can't lose them.
watch(() => book.offers.filter(belongsInHistory).map(o => o.id).join(), () => {
  for (const o of book.offers) {
    if (!belongsInHistory(o)) continue
    const saved = history.get(o.id)
    if (!saved || saved.reopenedAt != null) {
      history.add(o).catch((err: Error) => toast(`Couldn't save the offer history: ${err.message}`))
    }
  }
})

function logTrade (o: Offer, at: number, manual: boolean) {
  const chaos = priceChaos(o.price, px.value)
  const rec = recordFor(o, at, chaos, divine.value, manual)
  // Filed under the league the toolkit follows, like farming sessions.
  if (leagueId.value) rec.league = leagueId.value
  log.add(rec).catch((err: Error) => toast(`Couldn't save the trade: ${err.message}`))
}

// --- Hotkeys (C1): one key walks the front offer through its steps ---
const hotkeys = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  const parsed = parseHotkeyTarget(e.target)
  if (!parsed || parsed.wmId !== props.config.wmId) return
  const o = front(book)
  if (!o || (o.dir === 'buy' && props.config.trackBuying === false)) return
  if (parsed.what === 'skip') {
    skip(o, Date.now())
    const next = front(book)
    // The bubble moves on to the next offer; a short peek would end it for good.
    if (next && next !== o) {
      if (bubbleId.value && next.dir === 'sell') showBubble(next)
      else dockRef.value?.peek(`Next: ${next.who}, ${offerLabel(next)}`, 2500)
    }
    touched()
    return
  }
  if (parsed.what === 'busy') {
    if (o.dir === 'sell') reply(o, 'busy')
    return
  }
  const steps = o.dir === 'sell' ? ['invite', 'trade', 'thanks', 'kick'] as const : ['hideout', 'thanks'] as const
  const step = steps[o.step]
  if (step) reply(o, step)
})

function onCard (open: boolean) {
  if (open) now.value = Date.now()
}

onUnmounted(() => {
  hotkeys.abort()
  clearInterval(clock)
  clearTimeout(lingerTimer)
})

function clearOffers () {
  const open = shown.value.filter(o => !o.closed)
  if (!open.length) return
  const at = Date.now()
  touched()
  for (const o of open) dismiss(o, at)
  toast(open.length > 1 ? `Cleared ${open.length} offers` : 'Cleared the offer', {
    anchor: dockIconEl('trade'),
    dock: true,
    undo: () => { for (const o of open) reopenOffer(o) }
  })
}

// --- Log tab ---
const leagues = useLeagues()
const leagueId = computed(() => leagues.selectedId.value ?? '')
const leagueTrades = computed(() => {
  const all = log.trades.value
  // Before the league is known (or with nothing in it yet), show everything.
  const mine = tradesInRange(all, 'league', leagueId.value, now.value)
  return mine.length ? mine : all
})
const today = computed(() => tradeTotals(tradesInRange(leagueTrades.value, 'today', leagueId.value, now.value)))
const league = computed(() => tradeTotals(leagueTrades.value))
const net = (t: { sold: number, spent: number }) => t.sold - t.spent
function money (chaos: number): string {
  return formatChaos(chaos, divine.value)
}
function signed (chaos: number): string {
  return `${chaos >= 0 ? '+' : '−'}${money(Math.abs(chaos))}`
}
function timeOf (ts: number): string {
  const d = new Date(ts)
  const sameDay = new Date().toDateString() === d.toDateString()
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const tabOptions = computed(() => [
  { value: 'offers', label: 'Offers', count: shown.value.filter(o => !o.closed).length },
  { value: 'log', label: 'Log' }
])

function logMenu (e: MouseEvent, t: TradeRecord) {
  openMenu(e, [{
    label: 'Remove from the log',
    icon: 'fas fa-trash',
    danger: true,
    action: () => {
      log.remove(t).catch(() => {})
      toast('Removed from the log', { anchor: panel.value?.$el, undo: () => { log.add(t).catch(() => {}) } })
    }
  }])
}

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => {
  const o = frontOffer.value
  const step = o && nextStep(o)
  const openCount = shown.value.filter(x => !x.closed).length
  const rows: DockMenuAction[] = []
  // Sends one chat line, from this click.
  if (o && step) rows.push({ label: `${REPLY_LABELS[step]} ${o.who}`, icon: 'fas fa-reply', action: () => { reply(o, step) } })
  rows.push(
    { label: openCount > 1 ? `Clear all ${openCount} offers` : 'Clear the offer', icon: 'fas fa-broom', disabled: openCount === 0, action: clearOffers },
    {
      label: 'Sound on new offers',
      icon: 'fas fa-volume-up',
      checked: props.config.ping !== false,
      action: () => { props.config.ping = props.config.ping === false; saveDock() }
    }
  )
  return rows
})
</script>

<style module>
.hint { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 4px var(--w-pad) 6px; }
.hintLink { background: none; border: 0; padding: 0; color: var(--w-accent); font: inherit; cursor: pointer; text-decoration: underline; }
.hintClose { flex: none; background: none; border: 0; padding: 0 2px; color: var(--w-faint); font: inherit; cursor: pointer; }
.hintLink:focus-visible, .hintClose:focus-visible { outline: 2px solid var(--w-accent); outline-offset: 1px; }
.hintClose:hover { color: var(--w-fg); }
.totals { display: flex; flex-direction: column; gap: 2px; padding: 6px var(--w-pad); border-bottom: 1px solid var(--w-line); }
.log { display: flex; flex-direction: column; }
.logRow { display: grid; grid-template-columns: 3.2rem minmax(0, 1fr) minmax(0, 7rem) auto; gap: 6px; align-items: center; padding: 0 var(--w-pad); }
</style>
