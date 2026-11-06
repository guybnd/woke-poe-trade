<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <DockItem :menu="dockMenu" id="challenges" title="Challenges" :show="config.dockIcon === true"
      :badge="config.summary ? `${config.summary.done}/${config.summary.total}` : null" :wm-id="config.wmId" card-width="20rem">
      <template #card>
        <div v-if="config.summary" style="padding: 6px var(--w-pad);">
          <div class="flex justify-between w-dim text-xs mb-1">
            <span>Next up</span><span>from when you last opened it</span>
          </div>
          <div v-for="c in config.summary.next" :key="c.n" class="w-trunc">{{ c.n }} {{ c.name }}</div>
          <div v-if="!config.summary.next.length">All {{ config.summary.total }} done.</div>
        </div>
        <div v-else class="w-dim text-xs" style="padding: 6px var(--w-pad);">Open the guide once to see your next challenges.</div>
      </template>
    </DockItem>
    <WPanel size-key="guide" :title="config.wmTitle || 'Challenges'" :scroll="false" max-height="none"
      width="70vw" height="85vh" :hotkey="config.hotkey" :busy="syncing">
      <template #actions>
        <span v-if="rows.length" class="w-num text-xs whitespace-nowrap mr-1">{{ summary.done }} / {{ summary.total }}</span>
        <WButton v-if="summary.next.length" class="mr-1" :title="`Go to ${summary.next[0].name}`" @click="goTo(firstOpenAnchor)">
          Next: {{ summary.next[0].n }} {{ summary.next[0].name }}
        </WButton>
        <button class="w-icon-btn mr-1" :disabled="syncing" :title="syncTitle" @click="sync"><i class="fas fa-sync-alt" /></button>
        <button class="w-icon-btn" title="Open in your browser" @click="openExternal"><i class="fas fa-external-link-alt" /></button>
        <button class="w-icon-btn" title="Close" @click="close"><i class="fas fa-times" /></button>
      </template>
      <template v-if="problem" #banner>
        <WBanner tone="warn">{{ problem }}</WBanner>
      </template>
      <div class="flex w-full h-full min-h-0">
        <div :class="$style.list" class="pointer-events-auto">
          <div :class="$style.filter">
            <WField v-model="filter" placeholder="Filter challenges" />
            <button class="w-icon-btn" :class="{ 'w-icon-btn--on': hideDone }" :title="hideDone ? 'Show finished' : 'Hide finished'" @click="hideDone = !hideDone">
              <i class="fas fa-check" />
            </button>
          </div>
          <div class="w-scroll flex-1 min-h-0">
            <div v-for="r in shown" :key="r.n" :class="[$style.row, { [$style.done]: r.done, [$style.at]: at === r.anchor }]" @click="goTo(r.anchor)">
              <button :class="$style.tick" :title="r.done ? 'Mark as not done' : 'Mark as done'" @click.stop="toggle(r.n)">
                <i :class="r.done ? 'fas fa-check' : 'far fa-circle'" />
              </button>
              <span class="w-trunc flex-1">{{ r.n }} {{ r.name }}</span>
              <span v-if="r.need != null && !r.done" class="w-dim w-num text-xs">{{ r.have }}/{{ r.need }}</span>
            </div>
            <div v-if="!rows.length" class="w-dim text-xs" style="padding: 6px var(--w-pad);">Loading the guide…</div>
            <div v-else-if="!shown.length" class="w-dim text-xs" style="padding: 6px var(--w-pad);">No challenges match.</div>
          </div>
          <div class="w-dim text-xs" :class="$style.credit">Guide by CraniumCarnage</div>
        </div>
        <webview v-if="started" ref="guideEl" :src="url" class="pointer-events-auto flex-1 h-full flex" />
      </div>
      <!-- Reads the profile page; only exists during a sync. It has to be
           rendered to load, so it's a 1px speck rather than hidden. -->
      <webview v-if="syncing" ref="profileEl" :src="profileSrc" :class="$style.reader" />
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { CHALLENGES_TYPE } from './widget'
import type { ChallengesWidget } from './widget'

export default {
  widget: {
    type: CHALLENGES_TYPE,
    instances: 'multi',
    trNameKey: 'Challenges'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { computed, inject, nextTick, onUnmounted, shallowRef, watch } from 'vue'
import { Host, MainProcess } from '@/web/background/IPC'
import { AppConfig } from '@/web/Config'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WBanner, WButton, WField, WPanel } from '../ui'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { hideWhilePlaying, showWithOverlay, tickWhile } from '../dock/dock'
import {
  READ_GUIDE_JS, READ_PROFILE_JS, guideSkinCss, guideUrl, matchesFilter, mergeProgress, parseHotkeyTarget,
  profileUrl, readProfile, scrollToJs, summarize, tickJs, toggleTickJs
} from './widget'
import type { GuideRow, ProfilePage, ProfileRow } from './widget'

const props = defineProps<{
  config: ChallengesWidget
}>()

type WebviewEl = HTMLElement & {
  executeJavaScript: (code: string) => Promise<unknown>
  insertCSS: (css: string) => Promise<string>
}

const RESYNC_MS = 5 * 60 * 1000

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Challenges'
  props.config.anchor = popupAnchor()
  props.config.url = ''
  props.config.hotkey = null
  props.config.dockIcon = false
  props.config.summary = null
  props.config.lastSynced = null
  wm.show(props.config.wmId)
}
hideWhilePlaying(props.config)

const url = computed(() => guideUrl(props.config.url))
const guideEl = shallowRef<WebviewEl | null>(null)
const profileEl = shallowRef<WebviewEl | null>(null)
const started = shallowRef(false)
const guide = shallowRef<GuideRow[]>([])
const profile = shallowRef<ProfileRow[] | null>(null)
const syncing = shallowRef(false)
const profileSrc = shallowRef('')
const problem = shallowRef<string | null>(null)
const filter = shallowRef('')
const hideDone = shallowRef(false)
const at = shallowRef<string | null>(null)
let ticksPending = false

const merged = computed(() => mergeProgress(guide.value, profile.value))
const rows = computed(() => merged.value.rows)
const summary = computed(() => summarize(rows.value))
const shown = computed(() => rows.value.filter(r => matchesFilter(r, filter.value) && !(hideDone.value && r.done)))
const firstOpenAnchor = computed(() => rows.value.find(r => !r.done)?.anchor ?? '')
const syncTitle = computed(() => {
  const when = props.config.lastSynced
  return when ? `Sync from your profile (last ${new Date(when).toLocaleTimeString()})` : 'Sync from your profile'
})

const onScreen = computed(() => props.config.wmWants === 'show' && wm.active.value)

// The site's look stays out; its content and tick buttons stay in.
function onGuideLoaded () {
  const el = guideEl.value
  if (!el) return
  const bg = getComputedStyle(el).getPropertyValue('--w-panel-2-base').trim() || '#1d1a16'
  el.insertCSS(guideSkinCss(bg)).catch(() => {})
}
watch(guideEl, (el, old) => {
  old?.removeEventListener('did-stop-loading', onGuideLoaded)
  el?.addEventListener('did-stop-loading', onGuideLoaded)
})

// Ticks can change on the page too, so keep reading while it's on screen.
async function readGuide () {
  const el = guideEl.value
  if (!el) return
  try {
    const read = await el.executeJavaScript(READ_GUIDE_JS) as GuideRow[]
    if (JSON.stringify(read) !== JSON.stringify(guide.value)) guide.value = read
  } catch { /* Not ready yet. */ }
  applyTicks()
}
const stopReading = tickWhile(() => onScreen.value && started.value, () => { readGuide() }, 1500)

// Once per sync, so unticking something the game calls done sticks until the next one.
function applyTicks () {
  const el = guideEl.value
  if (!ticksPending || !el || !guide.value.length) return
  ticksPending = false
  if (profile.value && !merged.value.matched) {
    problem.value = "Your profile's challenges don't match this guide. It may be for another league."
    return
  }
  for (const n of merged.value.toTick) el.executeJavaScript(tickJs(n)).catch(() => {})
}

watch(summary, (s) => {
  if (guide.value.length && JSON.stringify(s) !== JSON.stringify(props.config.summary)) props.config.summary = s
})

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function sync () {
  if (syncing.value || !Host.isElectron) return
  const account = AppConfig().accountName.trim()
  if (!account) {
    problem.value = 'Set your account name in Settings under Challenge guide to sync. Manual ticks still work.'
    return
  }
  problem.value = null
  profileSrc.value = profileUrl(account)
  syncing.value = true
  try {
    await nextTick()
    const result = await readProfilePage()
    if (result === 'not-found') problem.value = `No profile found for ${account}. Check the account name in Settings.`
    else if (result === 'private') problem.value = 'No challenges visible on your profile. It may be private: public profiles are needed to sync.'
    else if (result === 'failed') problem.value = "Couldn't read your profile. Try Sync again."
    else {
      profile.value = result
      props.config.lastSynced = Date.now()
      ticksPending = true
      applyTicks()
    }
  } finally {
    syncing.value = false
  }
}

async function readProfilePage (): Promise<ProfileRow[] | 'not-found' | 'private' | 'failed'> {
  let empty = 0
  for (let i = 0; i < 20; i++) {
    await wait(1000)
    const el = profileEl.value
    if (!el) return 'failed'
    let page: ProfilePage
    try {
      page = await el.executeJavaScript(READ_PROFILE_JS) as ProfilePage
    } catch { continue }
    const read = readProfile(page, ++empty)
    if (read === 'ok') return page.rows
    if (read !== 'waiting') return read
  }
  return 'failed'
}

// Opening starts the page, and syncs when the last sync is getting old.
watch(onScreen, (yes) => {
  if (!yes) return
  started.value = true
  const last = props.config.lastSynced ?? 0
  if (!profile.value || Date.now() - last > RESYNC_MS) {
    if (AppConfig().accountName.trim()) sync()
    else problem.value = 'Set your account name in Settings under Challenge guide to sync. Manual ticks still work.'
  }
}, { immediate: true })

function goTo (anchor: string) {
  if (!anchor) return
  at.value = anchor
  guideEl.value?.executeJavaScript(scrollToJs(anchor)).catch(() => {})
}

function toggle (n: number) {
  guideEl.value?.executeJavaScript(toggleTickJs(n))
    .then(() => readGuide())
    .catch(() => {})
}

function openExternal () {
  window.open(url.value)
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
  stopReading()
})

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => [
  {
    label: 'Sync from your profile',
    icon: 'fas fa-sync-alt',
    disabled: syncing.value,
    action: () => {
      showWithOverlay(wm, props.config.wmId)
      nextTick(() => { sync().catch(() => {}) })
    }
  },
  { label: 'Open in your browser', icon: 'fas fa-external-link-alt', action: openExternal }
])
</script>

<style module>
.list {
  width: 17rem; flex: none; display: flex; flex-direction: column; min-height: 0;
  border-right: 1px solid var(--w-line);
}
.filter { display: flex; align-items: center; gap: 4px; padding: 6px; }
.filter > :first-child { flex: 1; min-width: 0; }
.row { display: flex; align-items: center; gap: 6px; padding: 2px 8px 2px 6px; cursor: pointer; }
.row:hover { background: var(--w-panel-3); }
.at { background: var(--w-accent-soft); }
.done { color: var(--w-dim); }
.tick { width: 1.2rem; flex: none; color: var(--w-dim); font-size: .8em; }
.done .tick { color: var(--w-accent); }
.credit { padding: 4px 8px; }
.reader { position: absolute; left: 0; bottom: 0; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
</style>
