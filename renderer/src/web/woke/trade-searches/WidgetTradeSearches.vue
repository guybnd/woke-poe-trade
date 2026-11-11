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
      <WPanel ref="panel" class="shrink-0" :title="config.wmTitle || 'Trade searches'" icon="exalted" width="38rem" max-height="70vh">
        <template #toolbar>
          <WField v-model="filter" icon="fas fa-search" placeholder="Filter every folder by name, tag…" class="grow" />
          <WSelect v-model="sort" :options="SORTS" title="Sort the list" />
        </template>

        <div :class="$style.split">
          <nav :class="$style.rail" aria-label="Folders">
            <button v-for="v in VIEWS" :key="v.id" type="button" :class="[$style.rl, { [$style.on]: view === v.id && !filter }]"
              @click="pickView(v.id)">
              <i :class="[v.icon, $style.ic]" /><span class="w-trunc">{{ v.label }}</span><span :class="$style.n">{{ counts[v.id] || '' }}</span>
            </button>
            <div class="w-group-label" :class="$style.sec">Folders</div>
            <template v-for="(f, i) in folders" :key="f">
              <input v-if="renaming === `folder:${f}`" data-draft v-model="draft" :class="['w-field', $style.edit]" spellcheck="false"
                @keydown.enter.prevent="finishFolderRename(f)" @keydown.esc.prevent="renaming = null" @blur="finishFolderRename(f)">
              <button v-else type="button" :class="[$style.rl, { [$style.on]: view === `folder:${f}` && !filter, [$style.drop]: dropOn === f }]"
                @click="pickView(`folder:${f}`)" @contextmenu="folderMenu($event, f, i)"
                @dragover.prevent="dropOn = f" @dragleave="dropOn = dropOn === f ? null : dropOn" @drop.prevent="dropInto(f)">
                <img v-if="iconSrc(folderIcon(config, f))" :src="iconSrc(folderIcon(config, f))!" class="w-game-icon" :class="$style.art" alt="">
                <i v-else :class="['fas fa-folder', $style.ic]" />
                <span class="w-trunc">{{ f }}</span><span :class="$style.n">{{ counts[`folder:${f}`] || '' }}</span>
              </button>
              <div v-if="pickingIcon === f" :class="$style.icons" role="group" :aria-label="`Icon for ${f}`">
                <button v-for="key in iconChoices" :key="key" type="button" :class="[$style.iconBtn, { [$style.on]: folderIcon(config, f) === key }]"
                  :title="key.slice(key.indexOf(':') + 1)" @click="setIcon(f, key)">
                  <img :src="iconSrc(key)!" class="w-game-icon" alt="" @error="(($event.target as HTMLElement).parentElement as HTMLElement).style.display = 'none'">
                </button>
                <button type="button" :class="$style.iconBtn" title="Plain folder" @click="setIcon(f, undefined)"><i class="fas fa-folder" /></button>
              </div>
            </template>
            <input v-if="renaming === 'new'" data-draft v-model="draft" :class="['w-field', $style.edit]" placeholder="Folder name" spellcheck="false"
              @keydown.enter.prevent="finishNewFolder" @keydown.esc.prevent="renaming = null" @blur="finishNewFolder">
            <button v-else type="button" :class="[$style.rl, $style.add]" @click="startNewFolder"><i :class="['fas fa-plus', $style.ic]" />New folder</button>
          </nav>

          <div :class="$style.list">
            <div v-if="filter" class="w-faint text-xs" :class="$style.note">Searching every folder</div>
            <div v-if="rows.length" :class="$style.head"><span>Name</span><span>Opened</span><span>Times</span></div>
            <template v-for="entry in rows" :key="entry.id">
              <input v-if="renaming === `entry:${entry.id}`" data-draft v-model="draft" :class="['w-field', $style.edit]" spellcheck="false"
                @keydown.enter.prevent="finishEntryRename(entry)" @keydown.esc.prevent="renaming = null" @blur="finishEntryRename(entry)">
              <WListItem v-else :active="openId === entry.id" draggable="true"
                :title="tooltip(entry)" @select="open(entry, 'overlay')" @dragstart="dragId = entry.id" @dragend="dragId = null; dropOn = null"
                @contextmenu="rowMenu($event, entry)" @keydown.c.ctrl.prevent="copyLink(entry)" @keydown.delete.prevent="remove(entry)" @keydown.f2.prevent="startEntryRename(entry)">
                <i v-if="entry.pinned" class="fas fa-thumbtack w-accent text-xs" title="Pinned" />
                <i v-if="isLiveSearch(entry.url)" class="fas fa-bolt w-accent" title="Live search" />
                <span class="w-trunc grow">{{ entry.name || entry.url }}</span>
                <i v-if="otherLeague(entry)" class="fas fa-history w-faint text-xs" :title="`Saved in ${otherLeague(entry)}. Opens in ${league}.`" />
                <WKbd v-if="config.enableHotkeys && entry.hotkeyOverlay" :keys="entry.hotkeyOverlay" />
                <span :class="$style.num">{{ ago(entry.lastOpened) || '–' }}</span>
                <span :class="$style.num">{{ entry.openCount || '' }}</span>
                <template #actions>
                  <button @click="open(entry, 'external')" class="w-icon-btn" title="Open in your browser">
                    <i class="fas fa-external-link-alt" />
                  </button>
                </template>
              </WListItem>
            </template>
            <WEmpty v-if="!rows.length && filter" icon="fas fa-filter">
              Nothing matches "{{ filter }}".
              <template #actions><WButton size="sm" @click="filter = ''">Clear search</WButton></template>
            </WEmpty>
            <WEmpty v-else-if="!rows.length && config.entries.length" icon="far fa-folder-open">
              Nothing here yet. Drag a search onto a folder in the list on the left.
            </WEmpty>
            <WEmpty v-else-if="!rows.length" :art="{ currency: 'exalted' }">
              No saved searches. Save one with the bookmark next to Trade in price check, or paste a trade link in Settings.
            </WEmpty>
          </div>
        </div>
      </WPanel>

      <WPanel v-if="openEntry" size-key="browser" :title="openEntry.name || openEntry.url" :scroll="false" width="60vw" height="75vh" max-height="none"
        :class="{ [$style.flash]: flashing }">
        <template #actions>
          <WChip v-if="isLiveSearch(openEntry.url)" clickable :active="!!config.liveAlert" class="mr-1"
            :title="config.liveAlert ? 'Beeps when a new result appears. Click to turn off.' : 'Beep and flash when a new result appears on this page'"
            @click="config.liveAlert = !config.liveAlert"><i class="fas fa-bell" /> Ping</WChip>
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
import { AppConfig, pushHostConfig, saveConfig } from '@/web/Config'
import { POB_BUILDS_TYPE } from '../pob-builds/widget'
import type { PobBuildsWidget } from '../pob-builds/widget'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel, WField, WSelect, WChip, WKbd, WEmpty, WListItem, WButton, ago, gameIcon, mechanicIcon, itemRefFromText, openMenu, toast, vItemTip } from '../ui'
import type { MenuEntry } from '../ui'
import { copyText } from '../ui/copy'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { hideWhilePlaying, saveDock } from '../dock/dock'
import { useLeagues } from '@/web/background/Leagues'
import { FOLDER_ICONS, UNCATEGORIZED, deleteFolder, ensureFolder, folderIcon, folderNames, folderOf, inView, isLiveSearch, isValidUrl, leagueOf, matchesFilter, moveFolder, parseHotkeyTarget, pinnedFirst, renameFolder, sortEntries, withLeague } from './widget'
import type { OpenTarget, SearchSort, TradeSearchEntry, TradeSearchFolder } from './widget'

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
// The rail: views, then folders (each one the `category` its searches share).
const VIEWS = [
  { id: 'all', label: 'All', icon: 'fas fa-list' },
  { id: 'pinned', label: 'Pinned', icon: 'fas fa-thumbtack' },
  { id: 'recent', label: 'Recently opened', icon: 'fas fa-history' },
  { id: 'live', label: 'Live searches', icon: 'fas fa-bolt' }
]
const SORTS: Array<{ value: SearchSort, label: string }> = [
  { value: 'opened', label: 'Last opened' },
  { value: 'name', label: 'Name' },
  { value: 'count', label: 'Times opened' },
  { value: 'added', label: 'Newest' }
]
const view = computed(() => props.config.view ?? 'all')
const sort = computed({
  get: () => props.config.sort ?? 'opened',
  set: (v: string) => { props.config.sort = v as SearchSort; saveConfig() }
})
const folders = computed(() => folderNames(props.config))
const counts = computed(() => {
  const now = Date.now()
  const out: Record<string, number> = {}
  for (const id of [...VIEWS.map(v => v.id), ...folders.value.map(f => `folder:${f}`)]) {
    out[id] = props.config.entries.filter(e => inView(e, id, now)).length
  }
  return out
})
// A filter searches every folder; otherwise the picked view. Pinned lead.
const rows = computed(() => {
  const now = Date.now()
  const list = filter.value
    ? props.config.entries.filter(e => matchesFilter(e, filter.value))
    : props.config.entries.filter(e => inView(e, view.value, now))
  return pinnedFirst(sortEntries(list, sort.value))
})

// A folder picked in the rail that no longer exists falls back to All.
watch(folders, (list) => {
  if (view.value.startsWith('folder:') && !list.includes(view.value.slice(7))) props.config.view = 'all'
})

function pickView (id: string) {
  filter.value = ''
  props.config.view = id
  saveConfig()
}

// Only icons the item data has art for.
const iconChoices = computed(() => FOLDER_ICONS.filter(key => iconSrc(key)))

function iconSrc (key: string | undefined): string | null {
  if (!key) return null
  const at = key.indexOf(':')
  const kind = key.slice(0, at)
  const name = key.slice(at + 1)
  return kind === 'mechanic' ? mechanicIcon(name).src : gameIcon(name)
}

// Inline rename and new folder: one field at a time.
const renaming = shallowRef<string | null>(null)
const draft = shallowRef('')
const pickingIcon = shallowRef<string | null>(null)
watch(renaming, async (r) => {
  if (!r) return
  await nextTick()
  const input = panel.value?.el?.querySelector<HTMLInputElement>('[data-draft]')
  input?.focus()
  input?.select()
})
function startNewFolder () { draft.value = ''; renaming.value = 'new' }
function finishNewFolder () {
  if (renaming.value !== 'new') return
  renaming.value = null
  const name = draft.value.trim()
  if (!name) return
  ensureFolder(props.config, name)
  props.config.view = `folder:${name}`
  saveConfig()
}
function finishFolderRename (from: string) {
  if (renaming.value !== `folder:${from}`) return
  renaming.value = null
  const to = renameFolder(props.config, from, draft.value)
  // Builds whose Trades tab shows this folder keep showing it.
  for (const w of AppConfig().widgets) {
    if (w.wmType !== POB_BUILDS_TYPE) continue
    const links = (w as PobBuildsWidget).tradeFolders
    if (links && Object.values(links).includes(from)) {
      (w as PobBuildsWidget).tradeFolders = Object.fromEntries(Object.entries(links).map(([rel, f]) => [rel, f === from ? to : f]))
    }
  }
  pickingIcon.value = null
  saveConfig()
}
function startEntryRename (entry: TradeSearchEntry) { draft.value = entry.name; renaming.value = `entry:${entry.id}` }
function finishEntryRename (entry: TradeSearchEntry) {
  if (renaming.value !== `entry:${entry.id}`) return
  renaming.value = null
  if (draft.value.trim()) { entry.name = draft.value.trim(); saveConfig() }
}

function setIcon (folder: string, key: string | undefined) {
  ensureFolder(props.config, folder).icon = key
  pickingIcon.value = null
  saveConfig()
}

function moveTo (entry: TradeSearchEntry, folder: string) {
  entry.category = folder === UNCATEGORIZED ? '' : folder
  saveConfig()
}

// Drag a row onto a folder in the rail.
const dragId = shallowRef<number | null>(null)
const dropOn = shallowRef<string | null>(null)
function dropInto (folder: string) {
  const entry = props.config.entries.find(e => e.id === dragId.value)
  dropOn.value = null
  dragId.value = null
  if (entry && folderOf(entry) !== folder) {
    moveTo(entry, folder)
    toast(`Moved "${entry.name || 'search'}" to ${folder}`, { anchor: panel.value?.el, ms: 1800 })
  }
}

function folderMenu (e: MouseEvent, folder: string, index: number) {
  const items: MenuEntry[] = [
    { label: 'Rename', icon: 'fas fa-pen', action: () => { draft.value = folder; renaming.value = `folder:${folder}` } },
    { label: 'Change icon', icon: 'far fa-image', disabled: folder === UNCATEGORIZED, action: () => { pickingIcon.value = pickingIcon.value === folder ? null : folder } },
    { label: 'Move up', icon: 'fas fa-arrow-up', disabled: index === 0 || folder === UNCATEGORIZED, action: () => { moveFolder(props.config, folder, -1); saveConfig() } },
    { label: 'Move down', icon: 'fas fa-arrow-down', disabled: index === folders.value.length - 1 || folder === UNCATEGORIZED, action: () => { moveFolder(props.config, folder, 1); saveConfig() } },
    { separator: true },
    { label: 'Delete folder', icon: 'fas fa-trash', danger: true, disabled: folder === UNCATEGORIZED, action: () => removeFolder(folder) }
  ]
  openMenu(e, items)
}

// No "are you sure": the searches move to Uncategorized, with Undo.
function removeFolder (folder: string) {
  // Undo puts back only what the delete changed, so opens and renames since stay.
  const moved = props.config.entries.filter(e => folderOf(e) === folder).map(e => ({ id: e.id, category: e.category }))
  const folders: TradeSearchFolder[] = JSON.parse(JSON.stringify(props.config.folders ?? []))
  const { view: viewBefore, lastFolder } = props.config
  deleteFolder(props.config, folder)
  saveConfig()
  toast(`Deleted "${folder}". Its searches are in ${UNCATEGORIZED}.`, {
    anchor: panel.value?.el,
    undo: () => {
      for (const m of moved) {
        const e = props.config.entries.find(e => e.id === m.id)
        if (e && !e.category) e.category = m.category
      }
      props.config.folders = folders
      props.config.view = viewBefore
      props.config.lastFolder = lastFolder
      saveConfig()
    }
  })
}

watch(() => props.config.enableHotkeys, () => { pushHostConfig() })

const liveOpen = computed(() => !!openEntry.value && isLiveSearch(openEntry.value.url))
watch(liveOpen, (open) => {
  clearInterval(livePoll)
  livePoll = undefined
  lastCount = -1
  if (open) livePoll = setInterval(pollLive, 1500)
}, { immediate: true })

// The list and an open search both go away with the overlay and come back
// with it: a page left over the game couldn't be clicked. A live search keeps
// running out of sight and its dock icon shows new results.
hideWhilePlaying(props.config)
watch(openEntry, () => {
  unseen.value = 0
  total.value = -1
  latest.value = []
})

function open (entry: TradeSearchEntry, where: OpenTarget) {
  // Only http(s): the host passes window.open URLs to the OS shell.
  const url = urlFor(entry)
  if (!isValidUrl(url)) return
  entry.lastOpened = Date.now()
  entry.openCount = (entry.openCount ?? 0) + 1
  saveConfig()
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
    { label: entry.pinned ? 'Unpin' : 'Pin to the top', icon: 'fas fa-thumbtack', action: () => { entry.pinned = !entry.pinned; saveConfig() } },
    { label: 'Rename', icon: 'fas fa-pen', keys: 'F2', action: () => startEntryRename(entry) },
    { label: 'Move to folder', icon: 'fas fa-folder', action: () => moveMenu(e, entry) },
    { separator: true },
    { label: 'Remove', icon: 'fas fa-trash', keys: 'Del', danger: true, action: () => remove(entry) }
  ])
}

function moveMenu (e: MouseEvent, entry: TradeSearchEntry) {
  const here = folderOf(entry)
  const items: MenuEntry[] = folders.value.filter(f => f !== here).map(f => ({
    label: f,
    icon: 'fas fa-folder',
    gameIcon: iconSrc(folderIcon(props.config, f)) ?? undefined,
    action: () => moveTo(entry, f)
  }))
  if (!items.length) items.push({ label: 'No other folders yet', icon: 'fas fa-folder', disabled: true, action: () => {} })
  openMenu({ x: e.clientX, y: e.clientY }, items)
}

function tooltip (entry: TradeSearchEntry) {
  return [entry.url, `Folder: ${folderOf(entry)}`, entry.tags.length ? `Tags: ${entry.tags.join(', ')}` : '', entry.notes]
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
.split { display: flex; align-items: flex-start; min-height: 100%; }
.rail {
  position: sticky; top: 0; width: 11.5rem; flex: none; align-self: stretch;
  display: flex; flex-direction: column; gap: 1px; padding: var(--w-s1);
  border-right: 1px solid var(--w-line);
}
.rl {
  display: flex; align-items: center; gap: var(--w-s2); width: 100%; height: var(--w-row-h);
  padding: 0 var(--w-s2); border-radius: var(--w-r-sm); text-align: left; color: var(--w-fg);
  font-family: var(--w-label); font-size: var(--w-fs-md);
}
.rl:hover { background: var(--w-accent-soft); }
.on { background: var(--w-accent-soft); box-shadow: inset 2px 0 0 var(--w-accent); }
.drop { outline: 1px dashed var(--w-accent); background: var(--w-accent-soft); }
.add { color: var(--w-dim); }
.ic { width: 18px; flex: none; text-align: center; font-size: var(--w-fs-xs); color: var(--w-dim); }
.art { width: 18px; height: 18px; flex: none; object-fit: contain; }
.n { margin-left: auto; font-family: var(--w-num); font-size: var(--w-fs-xs); color: var(--w-faint); }
.sec { padding: var(--w-s2) var(--w-s2) 2px; }
.edit { width: 100%; height: var(--w-row-h); padding: 0 var(--w-s2); }
.icons { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 2px; padding: 2px var(--w-s1) var(--w-s2); }
.iconBtn { display: grid; place-items: center; height: 28px; border-radius: var(--w-r-sm); color: var(--w-dim); }
.iconBtn img { width: 22px; height: 22px; object-fit: contain; }
.iconBtn:hover { background: var(--w-accent-soft); }
.list { flex: 1; min-width: 0; }
.note { padding: var(--w-s1) var(--w-pad) 0; }
.head {
  display: flex; gap: var(--w-s2); padding: var(--w-s1) 40px 2px var(--w-pad);
  font-family: var(--w-label); font-size: var(--w-fs-sm); color: var(--w-dim);
}
.head span:first-child { margin-right: auto; }
.head span:not(:first-child), .num { width: 3rem; flex: none; text-align: right; }
.num { font-family: var(--w-num); font-size: var(--w-fs-xs); color: var(--w-faint); }
.flash { box-shadow: 0 0 0 2px var(--w-accent); transition: box-shadow 0.2s; }
</style>
