<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- In the lab or with a layout open: an icon (letter = difficulty) whose card shows the layout. -->
    <DockItem :menu="dockMenu" ref="dockRef" id="lab" title="Labyrinth" :show="inLab || !!openDiff" :badge="cardDiff ? labLabel(cardDiff)[0] : null"
      :wm-id="config.wmId" card-width="45rem" @open-change="cardShown = $event">
      <template #card>
        <div class="flex justify-between w-dim text-xs" style="padding: 4px var(--w-pad);">
          <span>{{ cardDiff ? labLabel(cardDiff) + ' Labyrinth' : 'Labyrinth' }}<template v-if="cardDiff && !labDiff && !openDiff"> · your usual, until the first room</template></span>
          <span title="Labs reset at midnight UTC"><i class="far fa-clock" /> resets in {{ resetIn }}</span>
        </div>
        <img v-if="cardImg" :src="cardImg" :class="$style.cardImg" alt="Today's layout">
        <WBanner v-else-if="peekError">Couldn't load the layout ({{ peekError }}). Click the icon for poelab's page.</WBanner>
        <div v-else-if="peekDiff" :class="$style.cardSkel" aria-busy="true" aria-label="Loading today's layout" />
        <div v-else class="w-dim text-xs" style="padding: 6px var(--w-pad);">Enter Aspirants' Plaza to load the layout.</div>
        <WBanner v-if="cardImg && staleOf(cardImg)" tone="warn">Today's layout isn't posted yet. This one is from {{ staleOf(cardImg) }}.</WBanner>
        <div v-if="config.notes.trim()" class="whitespace-pre-wrap w-dim text-xs" style="padding: 4px var(--w-pad);">{{ config.notes }}</div>
      </template>
    </DockItem>
    <div class="flex gap-2 min-w-0 min-h-0 items-start">
      <WPanel class="shrink-0" :title="config.wmTitle || 'Labyrinth'" icon="lab" width="14rem">
        <template #meta>
          <span title="Labs reset at midnight UTC"><i class="far fa-clock" /> resets in <span class="w-num">{{ resetIn }}</span></span>
        </template>
        <WListItem v-for="d in DIFFICULTIES" :key="d" :active="openDiff === d" @select="open(d, 'overlay')">
          <span class="w-trunc">{{ labLabel(d) }}</span>
          <WKbd v-if="d === config.defaultDifficulty && config.hotkeyOverlay" :keys="config.hotkeyOverlay" class="ml-auto" />
          <template #actions>
            <button @click="open(d, 'external')" class="w-icon-btn" title="Open in your browser">
              <i class="fas fa-external-link-alt" />
            </button>
          </template>
        </WListItem>
        <div v-if="config.notes.trim()" class="whitespace-pre-wrap w-dim py-2" style="padding-left: var(--w-pad); padding-right: var(--w-pad);">{{ config.notes }}</div>
      </WPanel>
      <WPanel v-if="openDiff" size-key="layout" :title="`${labLabel(openDiff)} Labyrinth`" :scroll="false" width="60vw" height="80vh" max-height="none">
        <template v-if="staleDate" #banner>
          <WBanner tone="warn">Today's layout isn't posted yet. This one is from {{ staleDate }}.</WBanner>
        </template>
        <template #actions>
          <button v-if="layoutImg" class="w-icon-btn mr-1" :class="{ 'w-icon-btn--on': config.fullPage }" @click="config.fullPage = !config.fullPage"
            :title="config.fullPage ? 'Show just the layout' : 'Show poelab\'s whole page'"><i class="fas fa-globe" /></button>
          <button @click="open(openDiff, 'external')" class="w-icon-btn" title="Open in your browser"><i class="fas fa-external-link-alt" /></button>
          <button @click="openDiff = null" class="w-icon-btn" title="Close"><i class="fas fa-times" /></button>
        </template>
        <div v-if="showImage" class="pointer-events-auto w-full h-full overflow-auto" :class="$style.imgWrap">
          <img :src="layoutImg!" :class="zoomed ? $style.full : $style.fit" :title="zoomed ? 'Click to fit' : 'Click to zoom'" @click="zoomed = !zoomed">
        </div>
        <webview v-show="!showImage" ref="webviewEl" class="pointer-events-auto w-full h-full flex" width="100%" height="100%" />
      </WPanel>
    </div>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { LAB_TYPE } from './lab'
import type { LabWidget } from './lab'

export default {
  widget: {
    type: LAB_TYPE,
    instances: 'multi',
    trNameKey: 'Labyrinth'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { inject, computed, shallowRef, watch, nextTick, onUnmounted } from 'vue'
import { useVisibleClock } from '../shared/visible-clock'
import { Host, MainProcess } from '@/web/background/IPC'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { formatDuration } from '../ui/format'
import { WPanel, WKbd, WListItem, WBanner } from '../ui'
import { DEFAULT_LAB_URLS, DIFFICULTIES, FIND_LAYOUT_JS, isPlazaArea, labDifficultyOf, labLabel, msUntilLabReset, parseHotkeyTarget, staleLayoutDate } from './lab'
import { useZone } from '../shared/zone'
import { hostRequest } from '../shared/host'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { dockConfig, hideWhilePlaying, tickWhile } from '../dock/dock'
import type { LabDifficulty, OpenTarget } from './lab'

const props = defineProps<{
  config: LabWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Labyrinth'
  props.config.anchor = popupAnchor()
  props.config.urls = { normal: '', cruel: '', merciless: '', uber: '' }
  props.config.defaultDifficulty = 'uber'
  props.config.hotkeyOverlay = null
  props.config.hotkeyExternal = null
  props.config.notes = ''
  wm.show(props.config.wmId)
}

const openDiff = shallowRef<LabDifficulty | null>(null)
const webviewEl = shallowRef<HTMLElement & { src: string, executeJavaScript?: (code: string) => Promise<unknown> } | null>(null)
const layoutImg = shallowRef<string | null>(null)
const zoomed = shallowRef(false)
const showImage = computed(() => !!layoutImg.value && !props.config.fullPage)
const staleDate = computed(() => staleLayoutDate(layoutImg.value, now.value))

// Once poelab's page has loaded, look for the layout image in it.
function onPageLoaded () {
  const el = webviewEl.value
  if (!el?.executeJavaScript) return
  el.executeJavaScript(FIND_LAYOUT_JS)
    .then(src => { layoutImg.value = typeof src === 'string' && /^https:\/\//.test(src) ? src : null })
    .catch(() => { layoutImg.value = null })
}
watch(webviewEl, (el, old) => {
  old?.removeEventListener('did-stop-loading', onPageLoaded)
  el?.addEventListener('did-stop-loading', onPageLoaded)
})

// While you play, the dock icon shows the layout; nothing stays over the game.
// Entering Aspirants' Plaza loads that difficulty's layout in the background.
const zone = useZone()
const inLab = computed(() => zone.kind === 'lab')
const labDiff = computed<LabDifficulty | null>(() => inLab.value ? labDifficultyOf(zone.areaId, zone.areaLevel) : null)
const peekDiff = shallowRef<LabDifficulty | null>(null)
const peekImg = shallowRef<string | null>(null)
const peekError = shallowRef<string | null>(null)
let peekDay = ''
const dockRef = shallowRef<InstanceType<typeof DockItem> | null>(null)
// What the icon and its card show: the layout you opened, else the room you're
// in, else in the plaza the layout loaded for your usual difficulty.
const cardDiff = computed(() => openDiff.value ?? labDiff.value ?? (inLab.value && props.config.autoOpen !== false ? peekDiff.value : null))
const cardImg = computed(() => (openDiff.value ? layoutImg.value : null) ?? peekImg.value)

async function loadPeek (d: LabDifficulty, announce: boolean) {
  // Reuse the layout only within the same lab day (resets at midnight UTC),
  // and retry when what we got was yesterday's because today's wasn't up.
  const day = new Date().toISOString().slice(0, 10)
  if (peekDiff.value === d && peekImg.value && peekDay === day && !staleOf(peekImg.value)) return
  peekDay = day
  peekImg.value = null
  peekError.value = null
  peekDiff.value = d
  try {
    const img = await hostRequest<string | null>('lab-layout-image', { url: urlFor(d) }, 20_000)
    if (peekDiff.value !== d) return
    if (img) {
      peekImg.value = img
      if (announce) dockRef.value?.peek(`${labLabel(d)} lab · today's layout is ready here`)
    } else peekError.value = 'no layout on the page'
  } catch (err) {
    if (peekDiff.value === d) peekError.value = err instanceof Error ? err.message : String(err)
  }
}
function clearPeek () {
  peekDiff.value = null
  peekImg.value = null
  peekError.value = null
}
watch(() => [zone.areaId, zone.enteredAt, labDiff.value] as const, ([areaId, _at, room]) => {
  // A layout you picked yourself comes first. Otherwise the plaza can't tell
  // the difficulty, so it starts with your usual one and the first room corrects it.
  const plaza = isPlazaArea(areaId)
  const d = openDiff.value ?? (plaza ? props.config.defaultDifficulty : room)
  if (!inLab.value || !d || props.config.autoOpen === false) return
  // The layout you're running stays put from room to room, whatever the clock
  // says; a failed load is retried at the next plaza.
  if (plaza || peekDiff.value !== d) loadPeek(d, true)
})
// Reads the real clock too: `now` only ticks while the panel is on screen,
// and in the lab only the dock icon is.
function staleOf (url: string) {
  return staleLayoutDate(url, Math.max(now.value, Date.now()))
}

const now = shallowRef(Date.now())
useVisibleClock(() => props.config, () => { now.value = Date.now() }, 30 * 1000)
// A card can stay open a long time (the hotkey holds it).
const cardShown = shallowRef(false)
const stopCardClock = tickWhile(() => cardShown.value, () => { now.value = Date.now() }, 30 * 1000)
const resetIn = computed(() => formatDuration(msUntilLabReset(now.value)))

function urlFor (d: LabDifficulty): string {
  const url = (props.config.urls?.[d] ?? '').trim() || DEFAULT_LAB_URLS[d]
  return /^https?:\/\//i.test(url) ? url : DEFAULT_LAB_URLS[d]
}

// The window shows only with the overlay open. A layout you opened stays as
// the dock icon while you play, until you close it, leave the lab or the lab resets.
hideWhilePlaying(props.config)
watch(inLab, (on, was) => {
  if (!was || on) return
  openDiff.value = null
  clearPeek()
})
// Closing the whole window (its X) closes the layout too.
watch(() => props.config.wmWants, (wants) => { if (wants === 'hide') openDiff.value = null })
let resetTimer: ReturnType<typeof setTimeout> | undefined
watch(openDiff, (d) => {
  clearTimeout(resetTimer)
  if (d) {
    resetTimer = setTimeout(() => { if (!inLab.value) openDiff.value = null }, msUntilLabReset(Date.now()))
    return
  }
  // Closed: back to the lab you're in, or nothing.
  if (inLab.value && labDiff.value && props.config.autoOpen !== false) loadPeek(labDiff.value, false)
  else clearPeek()
})

function open (d: LabDifficulty, where: OpenTarget, showWindow = true) {
  const url = urlFor(d)
  if (where === 'external' || !Host.isElectron) {
    window.open(url)
    return
  }
  if (openDiff.value !== d) layoutImg.value = null
  openDiff.value = d
  if (showWindow) wm.show(props.config.wmId)
  loadPeek(d, false)
  nextTick(() => {
    if (webviewEl.value) webviewEl.value.src = url
  })
}

// While you play, the hotkey holds the icon's card open, and the next press
// lets go of it (and of the layout, outside the lab). With the icon switched
// off it opens and closes the layout, which shows with the overlay.
function togglePlayingCard () {
  if (dockConfig().hidden.includes('lab')) {
    if (openDiff.value) {
      openDiff.value = null
      wm.hide(props.config.wmId)
    } else open(props.config.defaultDifficulty, 'overlay')
    return
  }
  const dock = dockRef.value
  if (dock?.pinned) {
    dock.togglePin()
    if (!inLab.value) openDiff.value = null
    return
  }
  if (!openDiff.value && !(inLab.value && peekDiff.value)) open(props.config.defaultDifficulty, 'overlay', false)
  nextTick(() => { dockRef.value?.togglePin() })
}

// However the pin ended (a click on the icon too), outside the lab the layout goes
// with it, unless it ended because the layout's window is opening.
watch(() => dockRef.value?.pinned, (pinned, was) => {
  if (was && !pinned && !inLab.value && props.config.wmWants !== 'show') openDiff.value = null
})

const hotkeys = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  const parsed = parseHotkeyTarget(e.target)
  if (!parsed || parsed.wmId !== props.config.wmId) return
  if (parsed.where === 'overlay' && !wm.active.value) {
    togglePlayingCard()
    return
  }
  if (parsed.where === 'overlay' && openDiff.value) {
    openDiff.value = null
    wm.hide(props.config.wmId)
    return
  }
  open(props.config.defaultDifficulty, parsed.where)
})
onUnmounted(() => {
  hotkeys.abort()
  clearTimeout(resetTimer)
  stopCardClock()
})

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => labDiff.value
  ? [
      { label: "Open today's layout", icon: 'fas fa-map', action: () => { if (labDiff.value) open(labDiff.value, 'overlay') } },
      { label: 'Open poelab in your browser', icon: 'fas fa-external-link-alt', action: () => { if (labDiff.value) open(labDiff.value, 'external') } }
    ]
  : [])
</script>

<style module>
.imgWrap { background: #000; }
.cardImg { display: block; width: 100%; height: auto; background: #000; }
.cardSkel {
  height: 12rem; margin: 0 var(--w-pad) 6px; border-radius: var(--w-r-sm);
  background: linear-gradient(90deg, var(--w-panel-2), var(--w-panel-3), var(--w-panel-2));
  background-size: 200% 100%; animation: labShimmer 1.4s linear infinite;
}
@keyframes labShimmer { to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .cardSkel { animation: none; } }

.fit { max-width: 100%; max-height: 100%; margin: auto; display: block; cursor: zoom-in; }
.full { max-width: none; cursor: zoom-out; }
</style>
