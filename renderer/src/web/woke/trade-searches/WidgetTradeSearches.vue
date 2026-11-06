<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- A live search keeps running out of sight; its icon counts new results. -->
    <DockItem :menu="dockMenu" :wake="unseen" ref="dockRef" id="trade-live" icon="fas fa-bolt" :title="openEntry?.name || 'Live search'" :show="liveOpen"
      :badge="unseen || null" :tone="unseen ? 'down' : 'accent'" :led="liveOpen ? 'on' : null" :wm-id="config.wmId"
      card-width="20rem" @open-change="onCard">
      <template #card>
        <div style="padding: 4px var(--w-pad) 6px;">
          <div class="w-dim text-xs">{{ unseen ? `${unseen} new since you last looked` : 'No new results since you last looked' }}<template v-if="total >= 0"> · {{ total }} on the page</template></div>
          <div v-for="(r, i) in latest" :key="i" class="flex justify-between gap-2">
            <span v-item-tip="itemRefFromText(r.name)" class="w-trunc">{{ r.name || 'Item' }}</span><span class="w-num w-accent whitespace-nowrap">{{ r.price }}</span>
          </div>
          <div class="w-faint text-xs mt-1">Ping {{ config.liveAlert ? 'on' : 'off' }} · click the icon to whisper</div>
        </div>
      </template>
    </DockItem>
    <div class="flex gap-2 min-w-0 min-h-0 items-start">
      <WPanel ref="panel" class="shrink-0" :title="config.wmTitle || 'Trade searches'" icon="exalted" width="19rem" max-height="70vh">
        <template #toolbar>
          <WField v-model="filter" icon="fas fa-search" placeholder="Filter by name, tag, category…" class="grow" />
        </template>

        <template v-for="group in groups" :key="group.category">
          <div class="w-group-label">{{ group.category }}</div>
          <WListItem v-for="entry in group.entries" :key="entry.id" :active="openId === entry.id"
            :title="tooltip(entry)" @select="open(entry, 'overlay')"
            @contextmenu="rowMenu($event, entry)" @keydown.c.ctrl.prevent="copyLink(entry)" @keydown.delete.prevent="remove(entry)">
            <i v-if="isLiveSearch(entry.url)" class="fas fa-bolt w-accent" title="Live search" />
            <span class="w-trunc">{{ entry.name || entry.url }}</span>
            <WChip v-if="otherLeague(entry)" :title="`Saved in ${otherLeague(entry)}. Opens in ${league}.`">{{ otherLeague(entry) }} → now</WChip>
            <WKbd v-if="config.enableHotkeys && entry.hotkeyOverlay" :keys="entry.hotkeyOverlay" class="ml-auto" />
            <template #actions>
              <button @click="open(entry, 'external')" class="w-icon-btn" title="Open in your browser">
                <i class="fas fa-external-link-alt" />
              </button>
            </template>
          </WListItem>
        </template>
        <WEmpty v-if="!groups.length && config.entries.length" icon="fas fa-filter">
          Nothing matches "{{ filter }}".
          <template #actions><WButton size="sm" @click="filter = ''">Clear search</WButton></template>
        </WEmpty>
        <WEmpty v-else-if="!groups.length" :art="{ currency: 'exalted' }">
          No saved searches. Paste a trade site link in Settings to add one.
        </WEmpty>

      </WPanel>

      <WPanel v-if="openEntry" size-key="browser" :title="openEntry.name || openEntry.url" :scroll="false" width="60vw" height="75vh" max-height="none"
        :class="{ [$style.flash]: flashing }">
        <template #actions>
          <WChip v-if="isLiveSearch(openEntry.url)" clickable :active="!!config.liveAlert" class="mr-1"
            :title="config.liveAlert ? 'Beeps when a new result appears. Click to turn off.' : 'Beep and flash when a new result appears on this page'"
            @click="config.liveAlert = !config.liveAlert"><i class="fas fa-bell" /> Ping</WChip>
          <span class="w-faint text-xs whitespace-nowrap mr-1">{{ overlayKey }} to interact</span>
          <button @click="open(openEntry, 'external')" class="w-icon-btn" title="Open in your browser">
            <i class="fas fa-external-link-alt" />
          </button>
          <button @click="closeBrowser" class="w-icon-btn" title="Close">
            <i class="fas fa-times" />
          </button>
        </template>
        <webview ref="webviewEl" class="pointer-events-auto w-full h-full flex"
          width="100%" height="100%" />
      </WPanel>
    </div>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { TRADE_SEARCHES_TYPE } from './widget'
import type { TradeSearchesWidget } from './widget'

export default {
  widget: {
    type: TRADE_SEARCHES_TYPE,
    instances: 'multi',
    trNameKey: 'Trade searches'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { inject, computed, watch, shallowRef, nextTick, onUnmounted } from 'vue'
import { Host, MainProcess } from '@/web/background/IPC'
import { AppConfig, pushHostConfig } from '@/web/Config'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel, WField, WChip, WKbd, WEmpty, WListItem, WButton, itemRefFromText, openMenu, toast, vItemTip } from '../ui'
import { copyText } from '../ui/copy'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { hideWhilePlaying, saveDock } from '../dock/dock'
import { useLeagues } from '@/web/background/Leagues'
import { groupByCategory, isLiveSearch, isValidUrl, leagueOf, matchesFilter, parseHotkeyTarget, withLeague } from './widget'
import type { OpenTarget, TradeSearchEntry } from './widget'

const props = defineProps<{
  config: TradeSearchesWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Trade searches'
  props.config.anchor = popupAnchor()
  props.config.enableHotkeys = true
  props.config.entries = []
  wm.show(props.config.wmId)
}

const filter = shallowRef('')
const openId = shallowRef<number | null>(null)
const webviewEl = shallowRef<HTMLElement & { src: string, executeJavaScript?: (code: string) => Promise<unknown> } | null>(null)
const leagues = useLeagues()
const league = computed(() => leagues.selectedId.value)

// Saved league differs from the current one (and we'll rewrite it).
function otherLeague (entry: TradeSearchEntry): string | null {
  if (props.config.followLeague === false || !league.value) return null
  const saved = leagueOf(entry.url)
  return saved && saved !== league.value ? saved : null
}

function urlFor (entry: TradeSearchEntry): string {
  return props.config.followLeague === false ? entry.url : withLeague(entry.url, league.value)
}

// Live-search ping: counts result rows on the page that's already open (no
// extra requests) and beeps when the count goes up.
const flashing = shallowRef(false)
let lastCount = -1
const ROWS_JS = "document.querySelectorAll('.resultset > .row[data-id]').length"
// The newest few results (name, price), for the dock card.
const LATEST_JS = `JSON.stringify(Array.from(document.querySelectorAll('.resultset > .row[data-id]')).slice(0, 3).map(r => ({
  name: (r.querySelector('.itemName') || {}).innerText || '',
  price: ((r.querySelector('[data-field="price"]') || {}).innerText || '').replace(/\\s+/g, ' ').trim()
})))`
const unseen = shallowRef(0)
const total = shallowRef(-1)
const latest = shallowRef<Array<{ name: string, price: string }>>([])
const dockRef = shallowRef<InstanceType<typeof DockItem> | null>(null)
// Ticks only while a live search is open (it used to tick all the time).
async function pollLive () {
  const el = webviewEl.value
  if (!liveOpen.value || !el?.executeJavaScript) {
    lastCount = -1
    return
  }
  try {
    const n = Number(await el.executeJavaScript(ROWS_JS))
    if (lastCount >= 0 && n > lastCount) {
      unseen.value += n - lastCount
      if (props.config.liveAlert) ping()
      latest.value = JSON.parse(String(await el.executeJavaScript(LATEST_JS))) as Array<{ name: string, price: string }>
      const top = latest.value[0]
      if (top && !wm.active.value) dockRef.value?.peek(`${top.name || 'New result'} · ${top.price}`)
    }
    lastCount = n
    total.value = n
  } catch {}
}
let livePoll: ReturnType<typeof setInterval> | undefined
function onCard (open: boolean) {
  if (!open) unseen.value = 0
}
onUnmounted(() => { clearInterval(livePoll) })

function ping () {
  flashing.value = true
  setTimeout(() => { flashing.value = false }, 900)
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
    osc.onended = () => { ctx.close().catch(() => {}) }
  } catch {}
}

const openEntry = computed(() => props.config.entries.find(e => e.id === openId.value))
const groups = computed(() => groupByCategory(
  props.config.entries.filter(e => matchesFilter(e, filter.value))))
const overlayKey = computed(() => AppConfig().overlayKey)

watch(() => props.config.enableHotkeys, () => { pushHostConfig() })

const liveOpen = computed(() => !!openEntry.value && isLiveSearch(openEntry.value.url))
watch(liveOpen, (open) => {
  clearInterval(livePoll)
  livePoll = undefined
  lastCount = -1
  if (open) livePoll = setInterval(pollLive, 1500)
}, { immediate: true })

// A search you opened stays over the game until you close it, like before,
// except a live search: it keeps running out of sight and its dock icon
// shows new results. The list alone shows only with the overlay open.
hideWhilePlaying(props.config)
watch(openEntry, (entry) => {
  unseen.value = 0
  total.value = -1
  latest.value = []
  wm.setFlag(props.config.wmId, 'invisible-on-blur', !entry || isLiveSearch(entry.url))
})

function open (entry: TradeSearchEntry, where: OpenTarget) {
  // Only http(s): the host passes window.open URLs to the OS shell.
  const url = urlFor(entry)
  if (!isValidUrl(url)) return
  if (where === 'external' || !Host.isElectron) {
    window.open(url)
    return
  }
  openId.value = entry.id
  lastCount = -1
  wm.show(props.config.wmId)
  nextTick(() => {
    if (webviewEl.value) webviewEl.value.src = url
  })
}

function closeBrowser () {
  openId.value = null
}

const hotkeyController = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  const parsed = parseHotkeyTarget(e.target)
  if (!parsed || parsed.wmId !== props.config.wmId) return
  const entry = props.config.entries.find(en => en.id === parsed.entryId)
  if (entry) open(entry, parsed.where)
})
onUnmounted(() => { hotkeyController.abort() })

const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)

function copyLink (entry: TradeSearchEntry) {
  copyText(urlFor(entry)).then(ok => { if (ok) toast('Copied the trade link', { anchor: panel.value?.el, ms: 1800 }) })
}

// No "are you sure": remove now, offer Undo (P9).
function remove (entry: TradeSearchEntry) {
  const before = props.config.entries
  if (openId.value === entry.id) closeBrowser()
  props.config.entries = before.filter(e => e.id !== entry.id)
  pushHostConfig()
  toast(`Removed "${entry.name || 'search'}"`, {
    anchor: panel.value?.el,
    undo: () => { props.config.entries = before; pushHostConfig() }
  })
}

function rowMenu (e: MouseEvent, entry: TradeSearchEntry) {
  openMenu(e, [
    { label: 'Open here', icon: 'far fa-window-maximize', keys: entry.hotkeyOverlay ?? 'Enter', action: () => open(entry, 'overlay') },
    { label: 'Open in browser', icon: 'fas fa-external-link-alt', keys: entry.hotkeyExternal ?? undefined, action: () => open(entry, 'external') },
    { label: 'Copy link', icon: 'far fa-copy', keys: 'Ctrl + C', action: () => copyLink(entry) },
    { separator: true },
    { label: 'Remove', icon: 'fas fa-trash', keys: 'Del', danger: true, action: () => remove(entry) }
  ])
}

function tooltip (entry: TradeSearchEntry) {
  return [entry.url, entry.tags.length ? `Tags: ${entry.tags.join(', ')}` : '', entry.notes]
    .filter(Boolean).join('\n')
}

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => [
  { label: 'Stop live search', icon: 'fas fa-stop', action: closeBrowser },
  { label: 'Mark results as seen', icon: 'fas fa-check-double', disabled: unseen.value === 0, action: () => { unseen.value = 0 } },
  {
    label: 'Beep on new results',
    icon: 'fas fa-volume-up',
    checked: !!props.config.liveAlert,
    action: () => { props.config.liveAlert = !props.config.liveAlert; saveDock() }
  },
  { label: 'Open in your browser', icon: 'fas fa-external-link-alt', action: () => { if (openEntry.value) open(openEntry.value, 'external') } }
])
</script>

<style module>
.flash { box-shadow: 0 0 0 2px var(--w-accent); transition: box-shadow 0.2s; }
</style>
