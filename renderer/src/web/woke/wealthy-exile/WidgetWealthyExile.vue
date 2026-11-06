<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <DockItem :menu="dockMenu" id="wealthy-exile" title="Wealthy Exile" :show="config.dockIcon === true"
      :wm-id="config.wmId" card-width="16rem">
      <template #card>
        <div class="w-dim text-xs" style="padding: 6px var(--w-pad);">Click to open Wealthy Exile.</div>
      </template>
    </DockItem>
    <WPanel size-key="site" :title="config.wmTitle || 'Wealthy Exile'" :scroll="false" max-height="none"
      width="70vw" height="85vh" :hotkey="config.hotkey">
      <template #actions>
        <button class="w-icon-btn mr-1" :disabled="!canGoBack" title="Back" @click="goBack"><i class="fas fa-arrow-left" /></button>
        <button class="w-icon-btn mr-1" title="Reload" @click="reload"><i class="fas fa-sync-alt" /></button>
        <button class="w-icon-btn" title="Open in your browser" @click="openExternal"><i class="fas fa-external-link-alt" /></button>
      </template>
      <webview v-if="started" ref="siteEl" :src="url" class="pointer-events-auto w-full h-full flex" />
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { WEALTHY_EXILE_TYPE } from './widget'
import type { WealthyExileWidget } from './widget'

export default {
  widget: {
    type: WEALTHY_EXILE_TYPE,
    instances: 'multi',
    trNameKey: 'Wealthy Exile'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { computed, inject, onUnmounted, shallowRef, watch } from 'vue'
import { Host, MainProcess } from '@/web/background/IPC'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel } from '../ui'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { hideWhilePlaying, showWithOverlay } from '../dock/dock'
import { parseHotkeyTarget, siteUrl } from './widget'

const props = defineProps<{
  config: WealthyExileWidget
}>()

type WebviewEl = HTMLElement & {
  getURL: () => string
  canGoBack: () => boolean
  goBack: () => void
  reload: () => void
}

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Wealthy Exile'
  props.config.anchor = popupAnchor()
  props.config.url = ''
  props.config.hotkey = null
  props.config.dockIcon = false
  wm.show(props.config.wmId)
}
hideWhilePlaying(props.config)

const url = computed(() => siteUrl(props.config.url))
const siteEl = shallowRef<WebviewEl | null>(null)
// The site loads the first time the window is on screen, not at launch.
const started = shallowRef(false)
const canGoBack = shallowRef(false)

const onScreen = computed(() => props.config.wmWants === 'show' && wm.active.value)
watch(onScreen, (yes) => { if (yes) started.value = true }, { immediate: true })

function onNavigated () {
  try { canGoBack.value = siteEl.value?.canGoBack() ?? false } catch { canGoBack.value = false }
}
watch(siteEl, (el, old) => {
  old?.removeEventListener('did-navigate', onNavigated)
  old?.removeEventListener('did-navigate-in-page', onNavigated)
  el?.addEventListener('did-navigate', onNavigated)
  el?.addEventListener('did-navigate-in-page', onNavigated)
})

// A webview throws if asked before it has attached.
function currentUrl (): string {
  try {
    const at = siteEl.value?.getURL()
    if (at && /^https:\/\//i.test(at)) return at
  } catch { /* Not attached yet. */ }
  return url.value
}

function goBack () {
  try { siteEl.value?.goBack() } catch { /* Not attached yet. */ }
}

function reload () {
  if (!started.value) {
    started.value = true
    return
  }
  try { siteEl.value?.reload() } catch { /* Not attached yet. */ }
}

function openExternal () {
  window.open(currentUrl())
}

function focusGame () {
  if (Host.isElectron) Host.sendEvent({ name: 'OVERLAY->MAIN::focus-game', payload: undefined })
}

function close () {
  wm.hide(props.config.wmId)
}

const hotkeys = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  if (parseHotkeyTarget(e.target) !== props.config.wmId) return
  if (!Host.isElectron) {
    openExternal()
    return
  }
  // The hotkey also gives the overlay focus. Pressed again, it returns to the game.
  if (onScreen.value) {
    close()
    focusGame()
    return
  }
  wm.show(props.config.wmId)
  wm.bringToTop(props.config.wmId)
})
onUnmounted(() => {
  hotkeys.abort()
})

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => [
  { label: 'Open Wealthy Exile', icon: 'fas fa-window-maximize', action: () => { showWithOverlay(wm, props.config.wmId) } },
  { label: 'Open in your browser', icon: 'fas fa-external-link-alt', action: openExternal }
])
</script>
