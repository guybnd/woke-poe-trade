<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <DockItem id="net-worth" title="Net worth" :show="config.dockIcon !== false" :wm-id="config.wmId"
      :badge="badge" card-width="14rem" :menu="dockMenu">
      <template #card>
        <div class="w-dim text-xs" style="padding: 6px var(--w-pad);">{{ cardText }}</div>
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
import { hideWhilePlaying, showWithOverlay } from '../dock/dock'
import { popupAnchor } from '../ui/window-anchor'
import { agoPhrase } from '../ui/format'
import { hostRequest } from '../shared/host'
import { parseHotkeyTarget } from './widget'
import type { NetWorthWidget, ReaderStatus } from './widget'

const NetWorthPanel = defineAsyncComponent(() => import('./NetWorthPanel.vue'))

const props = defineProps<{
  config: NetWorthWidget
}>()

const wm = inject<WidgetManager>('wm')!

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
let firstReadAt: number | null | undefined
async function feed (s: ReaderStatus) {
  if (!store) {
    const readNow = firstReadAt !== undefined && s.lastReadAt !== firstReadAt && !s.running
    firstReadAt ??= s.lastReadAt
    if (!started.value && !readNow) return
    store = await import('./store')
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
  hostRequest<ReaderStatus>('stash-reader-config', { league, accountName })
    .then((s) => { status.value = s; return feed(s) })
    .catch(() => {})
}, { immediate: true })

const hotkeys = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
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
})

const badge = computed(() => status.value?.running ? '…' : status.value?.error ? '!' : null)
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

const dockMenu = computed<DockMenuAction[]>(() => [
  { label: 'Open net worth', icon: 'fas fa-window-maximize', action: () => { showWithOverlay(wm, props.config.wmId) } },
  { label: 'Read stash now', icon: 'fas fa-sync-alt', action: refresh }
])
</script>
