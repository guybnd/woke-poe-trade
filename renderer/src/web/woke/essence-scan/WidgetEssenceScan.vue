<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <DockItem :menu="dockMenu" :wake="unseenCorrupt" id="essence-scan" title="Essence scan" :show="running || paused || !!message || (config.iconWhenOff && zone.kind === 'map')"
      :game-click="running ? undefined : startFromIcon"
      :led="message ? 'error' : paused ? 'warn' : running ? 'on' : null" :badge="unseenCorrupt || null"
      :wm-id="config.wmId" card-width="18rem" @open-change="onCard">
      <template #card>
        <div v-if="message" class="w-warn text-xs px-3 pt-2">{{ message }}</div>
        <div v-else-if="paused" class="w-dim text-xs px-3 pt-2">Paused while the map scan runs. It resumes when that stops.</div>
        <div v-else-if="!running" class="w-dim text-xs px-3 pt-2">
          Off. <template v-if="config.autoInMaps">Starts by itself in your next map, or</template><template v-else>Start it with</template>
          <template v-if="config.hotkey"> <WKbd :keys="config.hotkey" /> or</template> a click on the icon.
        </div>
        <div v-for="e in recent.slice(0, 5)" :key="e.id" :class="[$style.entry, $style[e.rated.verdict]]">
          <span :class="$style.tag">{{ VERDICT_LABEL[e.rated.verdict] }}</span>
          <span class="flex-1 w-trunc">{{ entryLabel(e) }}</span>
          <WPrice :chaos="e.rated.totalChaos || null" :divine="divine" />
        </div>
        <div v-if="running && !entries.length" class="w-dim text-xs px-3 py-2">Hover an essence monolith.</div>
        <div v-if="running && config.hotkey" class="w-faint text-xs px-3 py-1"><WKbd :keys="config.hotkey" /> to stop</div>
      </template>
    </DockItem>
    <WPanel ref="panel" :title="config.wmTitle || 'Essence scan'" icon="essence" width="19rem">
      <template #actions>
        <button type="button" class="w-icon-btn" title="Read every essence on screen once" @click="readOnce"><i class="fas fa-expand" /></button>
        <span :class="[$style.led, { [$style.on]: running }]" />
        <WButton size="sm" :variant="running ? 'default' : 'primary'" @click="toggle">{{ running ? 'Stop' : 'Start' }}</WButton>
      </template>
      <div v-if="message" class="w-warn text-xs px-3 pt-2">{{ message }}</div>
      <div v-else-if="setupProblem" class="w-warn text-xs px-3 pt-2"><i class="fas fa-exclamation-triangle" /> {{ setupProblem }}</div>
      <div v-if="onceStatus" class="w-dim text-xs px-3 pt-2">{{ onceStatus }}</div>
      <div v-for="e in recent" :key="e.id" :class="[$style.entry, $style[e.rated.verdict]]">
        <span :class="$style.tag">{{ VERDICT_LABEL[e.rated.verdict] }}</span>
        <span class="flex-1 w-trunc">{{ entryLabel(e) }}</span>
        <WPrice :chaos="e.rated.totalChaos || null" :divine="divine" />
      </div>
      <WEmpty v-if="!entries.length" :art="{ mechanic: 'essence' }">
        <template v-if="running">Hover a monolith to price it. CORRUPT marks one with {{ flagText }}.</template>
        <template v-else-if="config.autoInMaps">Starts by itself when you enter a map<template v-if="config.hotkey">, or press <WKbd :keys="config.hotkey" /></template>.</template>
        <template v-else-if="config.hotkey">Press <WKbd :keys="config.hotkey" /> in game to start scanning.</template>
        <template v-else>Start scanning, then hover essence monoliths.</template>
      </WEmpty>
      <template #footer>
        <span class="flex-1 w-trunc">{{ entries.length }} read · flag {{ flagText }}</span>
        <button v-if="entries.length" type="button" class="w-icon-btn" title="Clear. You can undo." @click="clear"><i class="fas fa-eraser" /></button>
      </template>
    </WPanel>
    <Teleport to="body">
      <div v-if="running && current" :class="$style.layer">
        <div :class="[$style.card, $style[current.rated.verdict], { [$style.big]: current.bigValue }]" :style="cardStyle">
          <div class="flex items-center gap-2">
            <span :class="$style.tag">{{ VERDICT_LABEL[current.rated.verdict] }}</span>
            <span class="flex-1 w-dim text-xs w-trunc">{{ headline(current) }}</span>
            <WPrice :chaos="current.rated.totalChaos || null" :divine="divine" class="w-accent font-semibold" />
          </div>
          <div v-for="(r, i) in current.rated.rows" :key="i" :class="$style.erow">
            <span v-item-tip="{ name: r.essence.name, type: 'Essence' }" :class="{ [$style.flagged]: r.flagged }">{{ shortEssenceName(r.essence) }}</span>
            <WPrice :chaos="r.chaos" :divine="divine" :class="{ 'w-dim': !r.flagged }" />
          </div>
          <div v-if="current.rated.estimate" class="text-xs" :class="current.rated.estimate.gain > 0 ? 'w-up' : 'w-dim'"
            :title="estimateTitle(current.rated)">
            Corrupt: ~{{ fmt(current.rated.estimate.after) }} vs {{ fmt(current.rated.estimate.now) }} now
            ({{ current.rated.estimate.gain >= 0 ? '+' : '' }}{{ fmt(current.rated.estimate.gain) }} after Vaal)
          </div>
          <template v-if="current.rated.specials.length">
            <div class="w-faint" style="font-size: var(--w-fs-xs); margin-top: 3px;">Corrupting can turn {{ current.rated.flagged.join(', ') }} into:</div>
            <div v-for="sp in current.rated.specials" :key="sp.name" :class="$style.erow" style="font-size: var(--w-fs-sm);">
              <span v-item-tip="{ name: sp.name, type: 'Essence' }" :class="$style.flagged">{{ sp.name.replace('Essence of ', '') }}</span>
              <WPrice :chaos="sp.chaos" :divine="divine" />
            </div>
          </template>
          <div v-if="!hasPrices" class="w-faint" style="font-size: var(--w-fs-xs);">Waiting for poe.ninja prices.</div>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div v-if="onceLabels.length" :class="$style.layer">
        <div v-for="(l, i) in onceLabels" :key="i" :class="[$style.pin, $style[l.rated.verdict]]"
          :style="{ left: `${l.at.x * 100}%`, top: `${l.at.y * 100}%` }">
          <span :class="$style.tag">{{ VERDICT_LABEL[l.rated.verdict] }}</span>
          <WPrice :chaos="l.rated.totalChaos || null" :divine="divine" />
          <span v-if="l.rated.estimate" :class="l.rated.estimate.gain > 0 ? 'w-up' : 'w-dim'" class="text-xs">
            {{ l.rated.estimate.gain >= 0 ? '+' : '' }}{{ fmt(l.rated.estimate.gain) }}
          </span>
        </div>
      </div>
    </Teleport>
  </Widget>
</template>

<script lang="ts">
import { widgetEssenceScanSpec } from '../widget-specs'
import type { EssenceScanWidget } from './widget'

export default { widget: widgetEssenceScanSpec }
</script>

<script setup lang="ts">
import { computed, inject, onUnmounted, shallowRef, watch } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { formatChaos } from '../ui/format'
import { WPanel, WButton, WEmpty, WKbd, WPrice, toast, vItemTip } from '../ui'
import { hostRequest } from '../shared/host'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { dockIconEl, hideWhilePlaying } from '../dock/dock'
import { usePriceIndex } from '../market/price-index'
import { useZone } from '../shared/zone'
import { parseMonolith, rateMonolith, shortEssenceName } from './essences'
import type { EssenceVerdict, PricedMonolith } from './essences'
import { autoScan, initEssenceScanWidget, normalizeEssenceScanWidget, parseEssenceHotkeyTarget } from './widget'

const props = defineProps<{ config: EssenceScanWidget }>()
const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  initEssenceScanWidget(props.config)
  wm.show(props.config.wmId)
}
normalizeEssenceScanWidget(props.config)
hideWhilePlaying(props.config)

const VERDICT_LABEL: Record<EssenceVerdict, string> = { corrupt: 'CORRUPT', open: 'OPEN', done: 'DONE' }

interface Entry {
  id: number
  at: { x: number, y: number }
  rated: PricedMonolith
  bigValue: boolean
}

const running = shallowRef(false)
const message = shallowRef<string | null>(null)
// Another scan mode has the screen; this one resumes when it stops.
const paused = shallowRef(false)
const entries = shallowRef<Entry[]>([])
const current = shallowRef<Entry | null>(null)
let nextId = 1

// Badge: monoliths worth corrupting since the dock card was last opened.
// By entry, not by count: a re-read monolith replaces its entry, so counts
// can drop and a new find would hide behind the old total.
const seenCorrupt = shallowRef(new Set<number>())
const corruptIds = computed(() => entries.value.filter(e => e.rated.verdict === 'corrupt').map(e => e.id))
const unseenCorrupt = computed(() => corruptIds.value.filter(id => !seenCorrupt.value.has(id)).length)
function onCard (open: boolean) {
  if (open) seenCorrupt.value = new Set(corruptIds.value)
}

const prices = usePriceIndex()
const divine = computed(() => prices.snapshot.value?.divine ?? null)
const essencePrices = computed(() => {
  const map = new Map<string, number>()
  for (const item of prices.snapshot.value?.items ?? []) {
    if (item.type === 'Essence') map.set(item.name, item.chaos)
  }
  return map
})
const hasPrices = computed(() => essencePrices.value.size > 0)
const vaalCost = computed(() => prices.snapshot.value?.items.find(i => i.name === 'Vaal Orb')?.chaos ?? 1)

function rate (lines: string[]): PricedMonolith | null {
  const scanned = parseMonolith(lines)
  if (!scanned) return null
  return rateMonolith(scanned, props.config.flagTypes, name => essencePrices.value.get(name) ?? null, vaalCost.value)
}

function fmt (c: number) {
  return formatChaos(c, null)
}

function estimateTitle (r: PricedMonolith) {
  const e = r.estimate!
  return 'Estimate: each corrupt outcome (all upgrade a tier, one M/E/D/S becomes a special essence, nothing, ' +
    'lose the cheapest) counted as equally likely; real odds aren\'t published.' +
    (e.complete ? '' : ' Some prices are missing, so the CORRUPT call uses your ticked essences instead.')
}

const setupProblem = shallowRef<string | null>(null)
hostRequest('ocr-check', null)
  .then(c => { setupProblem.value = c.ok ? null : c.message })
  .catch(() => {})

// One-shot read of the whole screen: pins on every essence label for a while.
const ONCE_SHOW_MS = 10000
const onceLabels = shallowRef<Array<{ at: { x: number, y: number }, rated: PricedMonolith }>>([])
const onceStatus = shallowRef('')
let onceTimer: ReturnType<typeof setTimeout> | undefined
async function readOnce () {
  onceStatus.value = 'Reading the screen…'
  try {
    const res = await hostRequest('essence-scan-once', null)
    const found = res.labels
      .map(l => ({ at: l.at, rated: rate(l.lines) }))
      .filter((l): l is { at: { x: number, y: number }, rated: PricedMonolith } => l.rated != null)
    onceLabels.value = found
    onceStatus.value = found.length
      ? `Found ${found.length} monolith${found.length > 1 ? 's' : ''}, ${found.filter(f => f.rated.verdict === 'corrupt').length} worth corrupting.`
      : 'No essence labels found on screen.'
    clearTimeout(onceTimer)
    onceTimer = setTimeout(() => { onceLabels.value = []; onceStatus.value = '' }, ONCE_SHOW_MS)
  } catch (err) {
    onceStatus.value = ''
    message.value = err instanceof Error ? err.message : String(err)
    wm.show(props.config.wmId)
  }
}

const recent = computed(() => entries.value.slice(-8).reverse())
const flagText = computed(() => props.config.flagTypes.length ? props.config.flagTypes.join(', ') : 'nothing')

function entryLabel (e: Entry) {
  return e.rated.rows.map(r => r.essence.type).join(' · ')
}

function headline (e: Entry) {
  if (e.rated.verdict === 'done') return 'already corrupted'
  if (e.rated.flagged.length) return `has ${e.rated.flagged.join(', ')}`
  if (e.bigValue) return 'worth opening'
  return `${e.rated.rows.length} essence${e.rated.rows.length === 1 ? '' : 's'}`
}

const cardStyle = computed(() => {
  const e = current.value
  if (!e) return {}
  // Beside the label: right of the cursor unless it's near the right edge.
  if (e.at.x < 0.75) return { left: `${e.at.x * 100 + 6}%`, top: `${Math.max(2, e.at.y * 100 - 18)}%` }
  return { right: `${(1 - e.at.x) * 100 + 6}%`, top: `${Math.max(2, e.at.y * 100 - 18)}%` }
})

function onReading (reading: { lines: string[], at: { x: number, y: number } }) {
  const rated = rate(reading.lines)
  if (!rated) {
    current.value = null
    return
  }
  const alert = props.config.valueAlertChaos
  // The same monolith read again (after corrupting it, say): replace it,
  // keeping its id while the verdict stays the same so the badge doesn't
  // count it again.
  const list = entries.value.slice()
  const idx = list.findIndex(e => Math.hypot(e.at.x - reading.at.x, e.at.y - reading.at.y) < 0.06)
  const prev = idx >= 0 ? list[idx] : null
  const entry: Entry = {
    id: prev && prev.rated.verdict === rated.verdict ? prev.id : nextId++,
    at: reading.at,
    rated,
    bigValue: alert > 0 && rated.totalChaos >= alert
  }
  if (idx >= 0) list.splice(idx, 1)
  list.push(entry)
  entries.value = list.slice(-50)
  current.value = entry
}

const events = MainProcess.onEvent('MAIN->CLIENT::woke-event', ({ topic, data }) => {
  if (topic !== 'essence-scan') return
  const d = data as { type: string, running?: boolean, paused?: boolean, message?: string, reading?: { lines: string[], at: { x: number, y: number } } }
  if (d.type === 'state') {
    running.value = Boolean(d.running)
    paused.value = Boolean(d.paused)
    message.value = d.message ?? null
    if (!running.value) current.value = null
  } else if (d.type === 'clear') {
    current.value = null
  } else if (d.type === 'reading' && d.reading) {
    onReading(d.reading)
  }
})

const zone = useZone()

async function toggle () {
  message.value = null
  const stopping = running.value && !paused.value
  // Stopped by hand in a map: stays off in that map, even back through a portal.
  autoScan.stoppedSeed = stopping && zone.kind === 'map' ? zone.seed : null
  try {
    // Paused for the other scan mode: the hotkey takes the screen back.
    if (stopping) {
      await hostRequest('essence-scan-stop', null)
      running.value = false
      current.value = null
    } else {
      // Stopped again while it was starting: main says it's off.
      const res = await hostRequest('essence-scan-start', null)
      running.value = res.running
      if (res.running) wm.show(props.config.wmId)
    }
  } catch (err) {
    message.value = err instanceof Error ? err.message : String(err)
    wm.show(props.config.wmId)
  }
}

function startFromIcon () {
  if (!running.value) toggle().catch(() => {})
}

// Start in maps. Main decides: it never takes the screen from map scan, and
// does nothing with the game in the background or stops a scan you started.
// Quiet on purpose: a failed start shows on the icon, never a panel over the
// game, and is tried again in the next map.
// Only a map entered while the app runs: the last map read back from the log
// at start-up would load the OCR workers before any scan was asked for.
watch(() => [zone.kind, zone.seed, props.config.autoInMaps] as const, async ([kind, seed, auto]) => {
  if (kind === 'map') {
    if (!auto || !zone.live || seed === autoScan.stoppedSeed || seed === autoScan.failedSeed) return
    try {
      const res = await hostRequest('essence-scan-auto-start', null)
      if (res.running) running.value = true
    } catch (err) {
      autoScan.failedSeed = seed
      message.value = err instanceof Error ? err.message : String(err)
    }
  } else if (kind === 'town' || kind === 'hideout') {
    const res = await hostRequest('essence-scan-auto-stop', null).catch(() => null)
    if (res && !res.running) { running.value = false; current.value = null }
  }
}, { immediate: true })

const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)
function clear (from?: Event | 'icon') {
  const before = { entries: entries.value, seen: seenCorrupt.value }
  entries.value = []
  seenCorrupt.value = new Set()
  current.value = null
  hostRequest('essence-scan-reread', null).catch(() => {})
  toast('Scan list cleared', { anchor: from === 'icon' ? dockIconEl('essence-scan') : panel.value?.el, dock: from === 'icon', undo: () => { entries.value = before.entries; seenCorrupt.value = before.seen } })
}

const hotkeys = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  const t = parseEssenceHotkeyTarget(e.target)
  if (t?.id !== props.config.wmId) return
  if (t.once) readOnce()
  else toggle()
})

hostRequest('essence-scan-status', null)
  .then(s => { running.value = s.running; paused.value = Boolean(s.paused) })
  .catch(() => {})

onUnmounted(() => {
  events.abort()
  hotkeys.abort()
  // Removed or switched off: its hotkey is gone too, so nothing could stop
  // the scan (screenshots several times a second) until its idle timeout.
  if (running.value) hostRequest('essence-scan-stop', null).catch(() => {})
  clearTimeout(onceTimer)
})

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => [
  { label: 'Read the screen once', icon: 'fas fa-eye', action: () => { readOnce().catch(() => {}) } },
  { label: running.value && !paused.value ? 'Stop scanning' : 'Start scanning', icon: running.value && !paused.value ? 'fas fa-stop' : 'fas fa-play', action: () => { toggle().catch(() => {}) } },
  { label: 'Clear the list', icon: 'fas fa-broom', disabled: !entries.value.length, action: () => { clear('icon') } }
])
</script>

<style module>
.led { width: 8px; height: 8px; border-radius: var(--w-r-sm); background: var(--w-faint); align-self: center; margin-right: 4px; }
.led.on { background: var(--w-up); }
.entry { display: flex; align-items: center; gap: 8px; padding: 3px var(--w-pad); font-size: var(--w-fs-md); border-bottom: 1px solid var(--w-line-soft); }
.tag {
  flex: none;
  min-width: 52px;
  text-align: center;
  font-size: var(--w-fs-xs);
  font-weight: 600;
  border-radius: var(--w-r-sm);
  color: var(--w-accent-fg);
  padding: 0 4px;
}
.corrupt .tag { background: var(--ess-flag, var(--w-corrupt)); }
.open .tag { background: var(--w-up); }
.done .tag { background: var(--w-panel-3); color: var(--w-dim); }

.layer { position: fixed; inset: 0; pointer-events: none; z-index: 1000; }
.card {
  position: absolute;
  width: 13rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 9px;
  background: var(--w-panel);
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-md);
  box-shadow: var(--w-shadow);
}
.card.corrupt { border-color: color-mix(in srgb, var(--ess-flag, var(--w-corrupt)) 70%, transparent); }
.card.big { border-color: color-mix(in srgb, var(--w-up) 60%, transparent); }
.pin {
  position: absolute;
  transform: translate(-50%, -140%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  background: var(--w-panel);
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-md);
  box-shadow: var(--w-shadow);
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
  color: var(--w-fg);
}
.pin.corrupt { border-color: color-mix(in srgb, var(--ess-flag, var(--w-corrupt)) 70%, transparent); }
.erow { display: flex; justify-content: space-between; gap: 8px; font-size: var(--w-fs-md); }
.flagged { color: var(--ess-flag, var(--w-corrupt)); font-weight: 600; }
</style>
