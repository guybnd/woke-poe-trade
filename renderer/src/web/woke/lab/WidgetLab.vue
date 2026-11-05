<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- In the lab: an icon (letter = difficulty) whose card shows the layout. -->
    <DockItem ref="dockRef" id="lab" title="Labyrinth" :show="inLab" :badge="labDiff ? labLabel(labDiff)[0] : null"
      :wm-id="config.wmId" card-width="34rem" @open-change="now = Date.now()">
      <template #card>
        <div class="flex justify-between w-dim text-xs" style="padding: 4px var(--w-pad);">
          <span>{{ labDiff ? labLabel(labDiff) + ' Labyrinth' : 'Labyrinth' }}</span>
          <span title="Labs reset at midnight UTC"><i class="far fa-clock" /> resets in {{ resetIn }}</span>
        </div>
        <img v-if="peekImg" :src="peekImg" :class="$style.cardImg" alt="Today's layout">
        <WBanner v-else-if="peekError">Couldn't load the layout ({{ peekError }}). Open the overlay and click the icon for poelab's page.</WBanner>
        <div v-else-if="peekDiff" :class="$style.cardSkel" aria-busy="true" aria-label="Loading today's layout" />
        <div v-else class="w-dim text-xs" style="padding: 6px var(--w-pad);">Enter Aspirants' Plaza to load the layout.</div>
        <WBanner v-if="peekImg && staleOf(peekImg)" tone="warn">Today's layout isn't posted yet. This one is from {{ staleOf(peekImg) }}.</WBanner>
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
        <template #footer><span>Layouts from poelab.com</span></template>
      </WPanel>
      <WPanel v-if="openDiff" size-key="layout" :title="`${labLabel(openDiff)} Labyrinth`" :scroll="false" width="60vw" height="80vh" max-height="none">
        <template v-if="staleDate" #banner>
          <WBanner tone="warn">Today's layout isn't posted yet. This one is from {{ staleDate }}.</WBanner>
        </template>
        <template #actions>
          <button v-if="layoutImg" class="w-icon-btn mr-1" :class="{ 'w-icon-btn--on': config.fullPage }" @click="config.fullPage = !config.fullPage"
            :title="config.fullPage ? 'Show just the layout' : 'Show poelab\'s whole page'"><i class="fas fa-globe" /></button>
          <span class="w-faint text-xs whitespace-nowrap mr-1">{{ overlayKey }} to interact</span>
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
import { AppConfig } from '@/web/Config'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { formatDuration } from '../ui/format'
import { WPanel, WKbd, WListItem, WBanner } from '../ui'
import { DEFAULT_LAB_URLS, DIFFICULTIES, FIND_LAYOUT_JS, difficultyForAreaLevel, isPlazaArea, labLabel, msUntilLabReset, parseHotkeyTarget, staleLayoutDate } from './lab'
import { useZone } from '../shared/zone'
import { hostRequest } from '../shared/host'
import DockItem from '../dock/DockItem.vue'
import { hideWhilePlaying } from '../dock/dock'
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

// In the lab, the dock icon shows the layout; nothing opens over the game.
// Entering Aspirants' Plaza loads that difficulty's layout in the background.
const zone = useZone()
const inLab = computed(() => zone.kind === 'lab')
const labDiff = computed<LabDifficulty | null>(() => inLab.value && zone.areaLevel != null ? difficultyForAreaLevel(zone.areaLevel) : null)
const peekDiff = shallowRef<LabDifficulty | null>(null)
const peekImg = shallowRef<string | null>(null)
const peekError = shallowRef<string | null>(null)
let peekDay = ''
const dockRef = shallowRef<InstanceType<typeof DockItem> | null>(null)
watch(() => [zone.areaId, zone.enteredAt, labDiff.value] as const, async ([areaId, _at, d]) => {
  if (!isPlazaArea(areaId) || !d || props.config.autoOpen === false) return
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
      dockRef.value?.peek(`${labLabel(d)} lab · today's layout is ready here`)
    } else peekError.value = 'no layout on the page'
  } catch (err) {
    if (peekDiff.value === d) peekError.value = err instanceof Error ? err.message : String(err)
  }
})
// Reads the real clock too: `now` only ticks while the panel is on screen,
// and in the lab only the dock icon is.
function staleOf (url: string) {
  return staleLayoutDate(url, Math.max(now.value, Date.now()))
}
const overlayKey = computed(() => AppConfig().overlayKey)

const now = shallowRef(Date.now())
useVisibleClock(() => props.config, () => { now.value = Date.now() }, 30 * 1000)
const resetIn = computed(() => formatDuration(msUntilLabReset(now.value)))

function urlFor (d: LabDifficulty): string {
  const url = (props.config.urls?.[d] ?? '').trim() || DEFAULT_LAB_URLS[d]
  return /^https?:\/\//i.test(url) ? url : DEFAULT_LAB_URLS[d]
}

// The window shows only with the overlay open, except a layout you opened
// yourself (hotkey or click), which stays up until you close it.
hideWhilePlaying(props.config)
watch(openDiff, (d) => {
  wm.setFlag(props.config.wmId, 'invisible-on-blur', !d)
})

function open (d: LabDifficulty, where: OpenTarget) {
  const url = urlFor(d)
  if (where === 'external' || !Host.isElectron) {
    window.open(url)
    return
  }
  if (openDiff.value !== d) layoutImg.value = null
  openDiff.value = d
  wm.show(props.config.wmId)
  nextTick(() => {
    if (webviewEl.value) webviewEl.value.src = url
  })
}

const hotkeys = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  const parsed = parseHotkeyTarget(e.target)
  if (!parsed || parsed.wmId !== props.config.wmId) return
  if (parsed.where === 'overlay' && openDiff.value) {
    openDiff.value = null
    wm.hide(props.config.wmId)
    return
  }
  open(props.config.defaultDifficulty, parsed.where)
})
onUnmounted(() => { hotkeys.abort() })
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
