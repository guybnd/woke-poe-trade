<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- While you play: an icon for the build in use; resting on it shows the card. -->
    <DockItem id="pob-builds" :menu="dockMenu" :game-click="config.treeOnIconClick === false ? undefined : iconClick" :title="activeName" :show="Boolean(active.details.value) && active.pobWidget.value?.wmId === config.wmId" :wm-id="config.wmId" card-width="24rem">
      <template #card><BuildHoverCard /></template>
    </DockItem>
    <div class="flex gap-2 min-h-0 items-start">
      <WPanel ref="panel" :title="config.wmTitle || 'PoB builds'" icon="wisdom" :busy="loading && builds.length > 0" width="20rem" max-height="70vh">
        <template #actions>
          <button @click="importOpen = !importOpen" class="w-icon-btn" :class="{ 'w-icon-btn--on': importOpen }" title="Import a pobb.in / pastebin link or PoB code">
            <i class="fas fa-file-import" />
          </button>
          <button class="w-icon-btn" :class="{ 'w-icon-btn--on': config.sortBy === 'manual' }" :title="config.sortBy === 'manual' ? 'Sort: My order. Click for latest save first' : 'Sort: latest save first. Click for My order'"
            @click="config.sortBy = config.sortBy === 'manual' ? undefined : 'manual'; saveConfig()"><i class="fas fa-sort-amount-down" /></button>
          <button @click="refresh" class="w-icon-btn" title="Reload builds folder">
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }" />
          </button>
        </template>
        <template #toolbar>
          <div v-if="importOpen" class="flex gap-1 w-full">
            <WField v-model="importText" icon="fas fa-link" placeholder="pobb.in link, pastebin link or PoB code" class="grow" @keydown.enter="doImport" />
            <WButton size="sm" variant="primary" :disabled="importing || !importText.trim()" @click="doImport">{{ importing ? '…' : 'Import' }}</WButton>
          </div>
          <WField v-else v-model="filter" icon="fas fa-search" placeholder="Filter by name, class, skill, folder…" class="grow" />
        </template>
        <template v-if="error" #banner>
          <WBanner><span :title="error">{{ errorText }}</span><template #actions><WButton size="sm" @click="refresh">Retry</WButton></template></WBanner>
        </template>
        <template v-if="importMsg" #meta>
          <span :class="importOk ? 'w-up' : 'w-down'">{{ importMsg }}</span>
        </template>

        <WSkeleton v-if="loading && !builds.length" :rows="6" />

        <!-- The list (shared/SavedTree, as every saved list): the builds
             folder's folders, drag, Ctrl / Shift picks, Alt + arrows, F2. A
             click shows the build. The order you set is kept in the app; the
             files only move when a build changes folder. -->
        <SavedTree :tree="tree" list-id="pob-folders" :active-id="selectedRow?.id ?? null" :title-of="r => r.relPath" :backspace="false"
          @item-menu="buildMenu" @folder-menu="folderMenu" @item-key="onBuildKey">
          <template #item="{ item: b }">
            <i v-if="config.activeBuild === b.relPath" class="fas fa-check-circle w-up" title="In use" />
            <span class="w-trunc">{{ b.name }}</span>
            <span class="ml-auto w-num w-dim text-xs whitespace-nowrap" title="Saved in PoB">{{ statLine(b.stats) }}</span>
          </template>
          <template #sub="{ item: b }">{{ describe(b) }}</template>
          <template #actions="{ item: b }">
            <button @click.stop="togglePin(b.relPath)" class="w-icon-btn" :class="{ 'w-icon-btn--on': isPinned(b.relPath) }"
              :title="isPinned(b.relPath) ? 'Unpin' : 'Pin to top'">
              <i class="fas fa-thumbtack" />
            </button>
          </template>
        </SavedTree>
        <WEmpty v-if="!loading && !shown.length && !error && builds.length" icon="fas fa-filter">
          Nothing matches "{{ filter }}".
          <template #actions><WButton size="sm" @click="filter = ''">Clear search</WButton></template>
        </WEmpty>
        <WEmpty v-else-if="!loading && !shown.length && !error" icon="fas fa-folder-open">
          No builds in {{ dir || 'the builds folder' }}. Save one in Path of Building, or import a pobb.in link with the button above.
          <template #actions><WButton size="sm" @click="importOpen = true">Import a build</WButton></template>
        </WEmpty>
      </WPanel>

      <BuildDetail v-if="selectedBuild" :config="config" :entry="selectedBuild" :details="details" @close="selected = null" @tree="treeAt = { title: $event }" @tree-character="treeAt = { title: $event, from: CHARACTER_TREE }" @compare="comparing = { a: $event, b: '' }" />
      <BuildCompare v-if="comparing" :config="config" :builds="comparePicks" :a="compareA" :b="compareB"
        @pick="(a, b) => { comparing = { a, b } }" @close="comparing = null" />
      <BuildTree v-if="selectedBuild && details && treeAt != null" :specs="treeSpecs" :start="treeAt" :from="treeAt.from"
        :pin="() => treePin(selectedBuild!.relPath, selectedBuild!.name)" @close="treeAt = null" />
      <WPanel v-if="selectedBuild && detailsError" size-key="detail" title="Couldn't read the build" width="20rem">
        <div class="w-down" style="padding: var(--w-pad);">{{ detailsError }}</div>
      </WPanel>
    </div>
  </Widget>
</template>

<script lang="ts">
import { widgetPobBuildsSpec } from '../widget-specs'
import type { PobBuildsWidget } from './widget'

export default { widget: widgetPobBuildsSpec }
</script>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { inject, computed, shallowRef, watch, defineAsyncComponent } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel, WField, WButton, WEmpty, WBanner, WSkeleton, openMenu, toast } from '../ui'
import { useSavedTree } from '../shared/use-saved-tree'
import { isUnder, movedPath } from '../shared/saved-tree'
import SavedTree from '../shared/SavedTree.vue'
import { saveConfig } from '@/web/Config'
import DockItem from '../dock/DockItem.vue'
import BuildCompare from './BuildCompare.vue'
import BuildDetail from './BuildDetail.vue'
import BuildHoverCard from './BuildHoverCard.vue'
import { CHARACTER_TREE, characterStatus, characterTreeNodes, characterTreeSpec, startCharacterSync } from './character'
import { liveBuildXml } from './live-pob'
import { passiveTreeJewelSlots } from './passive-tree'
import { personalOn } from '../personal'
import { buildPinChoices, moveBuildPins, treePin } from './build-pins'
import { buildRegexFolder, moveRegexFolder } from '../regex-library/folders'
import { isPinned as isPiecePinned, pins, togglePin as togglePinned } from '../pins/pins'
import type { DockMenuAction } from '../dock/dock'
import { showWithOverlay } from '../dock/dock'
import { toggleBuildTree, treeOn } from './tree-toggle'
import { useActiveBuild } from './active'
import { statLine } from './build-model'
import { POB_BUILDS_TYPE, buildMatches, describe, groupBuilds, lastBuildList, migratePobWidget, moveBuildRefs, pobApi, sortBuilds, treeHotkeyOf } from './widget'
import { onSavedOpen } from '../shared/saved-open'
import type { PobBuildEntry, PobDetails } from './widget'

// The tree loads on first open: it's big and most sessions never open it.
const BuildTree = defineAsyncComponent(() => import('./BuildTree.vue'))

const props = defineProps<{
  config: PobBuildsWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'PoB builds'
  props.config.anchor = popupAnchor()
  props.config.buildsDir = ''
  props.config.pobExe = ''
  props.config.pinned = []
  props.config.activeBuild = null
  props.config.followChars = {}
  props.config.followOff = []
  props.config.loadouts = {}
  wm.show(props.config.wmId)
}
migratePobWidget(props.config)

const builds = shallowRef<PobBuildEntry[]>([])
const dir = shallowRef('')
const loading = shallowRef(false)
const error = shallowRef('')
// A missing folder is a setting to fix, so it does not need the system's error text.
const errorText = computed(() => error.value.includes('ENOENT')
  ? 'No builds folder found. Set it in Settings.'
  : `Couldn't read the builds folder: ${error.value}`)
const filter = shallowRef('')
const selected = shallowRef<string | null>(null)
// The tree panel, on this tree's title.
const treeAt = shallowRef<{ title: string, from?: string } | null>(null)
// Two builds side by side, by file.
const comparing = shallowRef<{ a: string, b: string } | null>(null)
const compareA = computed(() => builds.value.find(b => b.relPath === comparing.value?.a))
const compareB = computed(() => builds.value.find(b => b.relPath === comparing.value?.b))
// By folder, latest league first, as in the list.
const comparePicks = computed(() => groupBuilds(builds.value, []).flatMap(g => g.builds))
const details = shallowRef<PobDetails | null>(null)
const detailsError = shallowRef('')
const importOpen = shallowRef(false)
const importText = shallowRef('')
const importing = shallowRef(false)
const importMsg = shallowRef('')
const importOk = shallowRef(false)

const active = useActiveBuild()
// Right-click the icon to pin any piece of the build in use.
const pinMenu = computed<DockMenuAction[]>(() => {
  const d = active.details.value
  const rel = active.relPath.value
  if (!d || !rel) return []
  return buildPinChoices(rel, activeName.value, d, active.level.value, active.act.value, active.loadout.value)
    .map(c => ({ label: c.label, icon: c.pin.icon, checked: isPiecePinned(c.pin.id), action: () => togglePinned(c.pin) }))
})
// The right-click menu: draw on the tree, then the pins.
const dockMenu = computed<DockMenuAction[]>(() => {
  const key = treeHotkeyOf(props.config)
  const draw: DockMenuAction = {
    label: `Draw on the game's tree${key ? ` (${key})` : ''}`,
    icon: 'fas fa-diagram-project',
    checked: treeOn.value,
    disabled: !active.details.value,
    action: () => { toggleBuildTree().catch(() => {}) }
  }
  return [draw, ...pinMenu.value]
})

// A click on the dock icon while playing: with the passive tree open, draws
// the build over it; otherwise opens the window, as a click always did.
async function iconClick () {
  if (await toggleBuildTree(true)) return
  showWithOverlay(wm, props.config.wmId)
}

// Your character (character.ts): read by main while the stash reader is on,
// on Read now (or on area changes, if turned on), kept apart from every build.
startCharacterSync(() => active.charName.value, () => props.config.characterAutoRead === true)

// Each new read is saved as a PoB build of your character (live-pob.ts), once
// the tree data can place its jewels. Never the build you picked.
// The tree data loads only once there is a read to save (it costs ~1 MB of heap).
let liveSaved = 0
watch(() => {
  const s = characterStatus.value.snapshot
  if (!s || !personalOn.value || props.config.characterLiveBuild === false) return null
  return characterTreeNodes() ? s : null
}, (s) => {
  if (!s || s.readAt === liveSaved) return
  liveSaved = s.readAt
  pobApi.saveLive(props.config, s.character.name, liveBuildXml(s, passiveTreeJewelSlots()))
    .then(() => refresh(), (e: Error) => { console.warn('[pob-builds] live build not saved', e) })
})
// The tree window: the build's trees, plus your character's when comparing with it.
const treeSpecs = computed(() => {
  const trees = details.value?.trees ?? []
  const s = characterStatus.value.snapshot
  return treeAt.value?.from === CHARACTER_TREE && s ? [...trees, characterTreeSpec(s)] : trees
})
const activeName = computed(() => (active.relPath.value ?? '').split('/').pop()?.replace(/\.xml$/i, '') || 'PoB builds')

// Follow the character Client.txt shows levelling: a build linked to that
// name (or, failing that, one whose file name contains it) becomes active.
// The build for this character: its link, or a build named after it unless
// you stopped following it. Null while the list hasn't loaded.
function followedBuild (name: string): string | null {
  const linked = props.config.followChars[name]
  if (linked) return builds.value.some(b => b.relPath === linked) ? linked : null
  if (name.length < 4 || props.config.followOff.includes(name)) return null
  const lower = name.toLowerCase()
  // Never the Live folder: that's your character as read, not a build to follow.
  return builds.value.find(b => b.folder.split('/')[0] !== 'Live' && b.name.toLowerCase().includes(lower))?.relPath ?? null
}

function followCharacter (name: string) {
  const rel = followedBuild(name)
  if (!rel) return
  const linksBefore = props.config.followChars
  const newLink = !linksBefore[name]
  if (newLink) props.config.followChars = { ...linksBefore, [name]: rel }
  const before = props.config.activeBuild
  if (rel === before) {
    if (newLink) saveConfig()
    return
  }
  props.config.activeBuild = rel
  saveConfig()
  const shown = builds.value.find(b => b.relPath === rel)?.name ?? rel
  // Takes the mouse in game: it came from your character changing, and Undo needs a click.
  toast(`Now using ${shown} for ${name}`, {
    dock: true,
    undo: () => {
      props.config.activeBuild = before
      props.config.followChars = linksBefore
      if (newLink) props.config.followOff = [...props.config.followOff, name]
      saveConfig()
    }
  })
}

// A character seen before the build list loaded waits for it. After that, only
// a change of character switches builds, so a refresh never undoes your pick.
let followWaiting = false
watch(active.charName, (name) => {
  if (!name) return
  followWaiting = !builds.value.length
  if (!followWaiting) followCharacter(name)
})
watch(builds, (list) => {
  const name = active.charName.value
  if (!list.length || !name) return
  if (followWaiting || !props.config.followChars[name]) {
    followWaiting = false
    // A linked character here means the list just came in; else look for a
    // build named after it, which may have just been saved.
    followCharacter(name)
  }
}, { immediate: false })

async function doImport () {
  const input = importText.value.trim()
  if (!input || importing.value) return
  importing.value = true
  importMsg.value = ''
  try {
    const { relPath } = await pobApi.import(props.config, input)
    importOk.value = true
    importMsg.value = `Saved to ${relPath}`
    importText.value = ''
    importOpen.value = false
    await refresh()
    selected.value = relPath
  } catch (err) {
    importOk.value = false
    importMsg.value = (err as Error).message
  } finally {
    importing.value = false
  }
}

const shown = computed(() => builds.value.filter(b => buildMatches(b, filter.value)))

// A build in the list: its file, and an id for the list's picks and rows.
type BuildRow = PobBuildEntry & { id: number }
const rowIds = new Map<string, number>()
let lastRowId = 0
function idOf (relPath: string): number {
  let id = rowIds.get(relPath)
  if (id == null) rowIds.set(relPath, id = ++lastRowId)
  return id
}
// In the order you set (kept in the app); builds not in it yet after, by name.
const rows = computed<BuildRow[]>(() => {
  const order = props.config.buildOrder ?? []
  const at = new Map(order.map((rel, i) => [rel, i]))
  return [...builds.value]
    .sort((a, b) => (at.get(a.relPath) ?? Infinity) - (at.get(b.relPath) ?? Infinity) || a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map(b => ({ ...b, id: idOf(b.relPath) }))
})
const selectedRow = computed(() => rows.value.find(r => r.relPath === selected.value) ?? null)
const pickedFrom = shallowRef<number | null>(null)
const manualOrder = computed(() => props.config.sortBy === 'manual')

const tree = useSavedTree<BuildRow>({
  root: () => panel.value?.el,
  items: () => rows.value,
  setItems: (list) => { props.config.buildOrder = list.map(r => r.relPath); saveConfig() },
  folderOf: r => r.folder,
  setFolder: (r, folder) => { queueMove(r, folder) },
  nameOf: r => r.name,
  setName: (r, name) => { renameTo(r, name).catch(() => {}) },
  extraFolders: () => props.config.folders ?? [],
  setExtraFolders: (list) => { props.config.folders = list },
  folderOrder: () => props.config.folderOrder,
  setFolderOrder: (order) => { props.config.folderOrder = order },
  closed: () => props.config.closedFolders ?? [],
  setClosed: (list) => { props.config.closedFolders = list },
  query: () => filter.value,
  matches: buildMatches,
  // Latest save first (pinned first) unless you set your own order.
  sorted: (list) => manualOrder.value ? list : sortBuilds(list, props.config.pinned) as BuildRow[],
  manual: () => manualOrder.value,
  toManual: () => { props.config.sortBy = 'manual'; saveConfig(); note('Sorted by My order') },
  selected: () => pickedFrom.value,
  select: (id) => { pickedFrom.value = id },
  open: (r) => { select(r) },
  remove: (list) => { removeBuilds(list).catch(() => {}) },
  note: (text) => { note(text) },
  moveFolderAs: (from, to) => { moveFolderOnDisk(from, to).catch(() => {}) }
})

function onBuildKey (e: KeyboardEvent, r: BuildRow) {
  if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); togglePin(r.relPath) }
}

const selectedBuild = computed(() => builds.value.find(b => b.relPath === selected.value) ?? null)

async function refresh () {
  loading.value = true
  error.value = ''
  try {
    const res = await pobApi.list(props.config)
    const before = selectedBuild.value?.mtime
    builds.value = res.builds
    lastBuildList.value = { at: Date.now(), builds: res.builds }
    dir.value = res.dir
    // PoB saved the build you are looking at.
    const now = selectedBuild.value
    if (now && before != null && now.mtime !== before) loadDetails(now.relPath)
    openOnActive()
    // PoB may have saved the active build meanwhile.
    active.reload()
  } catch (err) {
    builds.value = []
    // An empty list stamped now: the palette's 5-minute wait and its
    // newer-list check still hold.
    lastBuildList.value = { at: Date.now(), builds: [] }
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

// Opening the panel shows the build in use, unless you are looking at one.
let openPending = true
function openOnActive () {
  if (!openPending) return
  openPending = false
  const rel = props.config.activeBuild
  if (!selected.value && rel && builds.value.some(b => b.relPath === rel)) selected.value = rel
}

// Picked in the search palette: show its details, its folder unfolded.
onSavedOpen(POB_BUILDS_TYPE, (relPath) => {
  filter.value = ''
  const folder = builds.value.find(b => b.relPath === relPath)?.folder ?? relPath.split('/').slice(0, -1).join('/')
  tree.openFolder(folder)
  selected.value = relPath
  wm.show(props.config.wmId)
})

function select (b: PobBuildEntry) {
  selected.value = selected.value === b.relPath ? null : b.relPath
}

watch(selected, (relPath) => {
  details.value = null
  treeAt.value = null
  loadDetails(relPath)
})

let latestRead = 0
async function loadDetails (relPath: string | null) {
  const read = ++latestRead
  detailsError.value = ''
  if (!relPath) return
  try {
    const d = await pobApi.read(props.config, relPath)
    if (read === latestRead) details.value = d
  } catch (err) {
    if (read === latestRead) detailsError.value = (err as Error).message
  }
}

// Reload when the folder changes, and whenever the widget is shown, so
// builds saved in PoB meanwhile appear.
watch(() => props.config.buildsDir, refresh, { immediate: true })
watch(() => props.config.wmWants, (wants) => {
  if (wants !== 'show') return
  openPending = true
  refresh()
})
// It stays "shown" while you are in PoB or the game, so check on coming back.
watch(wm.active, (active) => { if (active && props.config.wmWants === 'show') refresh() })

function isPinned (relPath: string) {
  return props.config.pinned.includes(relPath)
}

function buildMenu (e: MouseEvent, b: PobBuildEntry) {
  const pinned = isPinned(b.relPath)
  const active = props.config.activeBuild === b.relPath
  openMenu(e, [
    { label: selected.value === b.relPath ? 'Hide details' : 'Show details', icon: 'fas fa-info-circle', keys: 'Enter', action: () => select(b) },
    { label: active ? 'In use' : 'Use build', icon: 'fas fa-check-circle', disabled: active, action: () => { props.config.activeBuild = b.relPath; saveConfig() } },
    { label: pinned ? 'Unpin' : 'Pin to top', icon: 'fas fa-thumbtack', keys: 'P', action: () => togglePin(b.relPath) },
    ...(selectedBuild.value && selectedBuild.value.relPath !== b.relPath
      ? [{
          label: `Compare with ${selectedBuild.value.name}`,
          icon: 'fas fa-balance-scale',
          action: () => { comparing.value = { a: selectedBuild.value!.relPath, b: b.relPath } }
        }]
      : []),
    { label: 'Rename', icon: 'fas fa-i-cursor', keys: 'F2', action: () => startEdit(b, 'rename') },
    { label: 'Duplicate', icon: 'fas fa-clone', action: () => duplicateBuild(b) },
    { label: 'Move to folder', icon: 'fas fa-folder', action: () => startEdit(b, 'move') },
    { label: 'Delete', icon: 'fas fa-trash-alt', keys: 'Del', action: () => removeBuild(b) }
  ])
}

// ---- rename, move, duplicate, delete ----
// Settings that name the build follow its file. PoB still has the old path if
// the build is open there: its next save writes the old file again.

const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)

function note (text: string, undo?: () => void) {
  toast(text, { anchor: panel.value?.el, undo })
}

function startEdit (b: PobBuildEntry, kind: 'rename' | 'move') {
  tree.startEdit('item', String(idOf(b.relPath)), kind)
}

async function renameTo (b: PobBuildEntry, text: string) {
  if (!text || text === b.name) return
  try {
    const { relPath } = await pobApi.rename(props.config, b.relPath, text)
    if (relPath === b.relPath) return
    followFile(b.relPath, relPath)
    await refresh()
    note(`Renamed to ${relPath.split('/').pop()!.replace(/\.xml$/i, '')}`, () => {
      pobApi.rename(props.config, relPath, b.name).then(r => { followFile(relPath, r.relPath); return refresh() }, (err: Error) => note(err.message))
    })
  } catch (err) {
    note((err as Error).message)
  }
}

// Builds a drag or Move sends to another folder: their files move, one at a
// time, then one note with Undo for all of them.
let moving: Array<{ b: PobBuildEntry, folder: string }> = []
function queueMove (b: PobBuildEntry, folder: string) {
  if (folder.toLowerCase() === b.folder.toLowerCase()) return
  moving.push({ b, folder })
  if (moving.length === 1) queueMicrotask(() => { flushMoves().catch(() => {}) })
}
async function flushMoves () {
  const batch = moving
  moving = []
  const done: Array<{ from: string, to: string, folder: string }> = []
  try {
    for (const { b, folder } of batch) {
      const { relPath } = await pobApi.move(props.config, b.relPath, folder)
      if (relPath === b.relPath) continue
      followFile(b.relPath, relPath)
      done.push({ from: b.relPath, to: relPath, folder: b.folder })
    }
  } catch (err) {
    note((err as Error).message)
  }
  await refresh()
  if (!done.length) return
  const where = batch[0].folder || 'the builds folder'
  note(done.length === 1 ? `Moved to ${where}` : `Moved ${done.length} builds to ${where}`, () => {
    (async () => {
      for (const m of done) {
        const r = await pobApi.move(props.config, m.to, m.folder)
        followFile(m.to, r.relPath)
      }
      await refresh()
    })().catch((err: Error) => note(err.message))
  })
}

// A folder renamed or moved: the folder itself moves on disk, its builds'
// settings follow their files.
async function moveFolderOnDisk (from: string, asked: string) {
  // The list's own folder settings already moved to `asked`; they follow the
  // disk's name (cleaned of characters a file name can't have), or go back.
  const relist = (a: string, b: string) => {
    const map = (list?: string[]) => list && [...new Set(list.map(p => movedPath(p, a, b)))]
    props.config.folders = map(props.config.folders)
    props.config.closedFolders = map(props.config.closedFolders)
    props.config.folderOrder = map(props.config.folderOrder)
  }
  const inIt = builds.value.filter(b => isUnder(b.folder, from))
  const fileIn = (folder: string, rel: string) => folder + '/' + rel.split('/').pop()
  let to: string
  try {
    to = (await pobApi.moveFolder(props.config, from, asked)).to
  } catch (err) {
    relist(asked, from)
    saveConfig()
    note((err as Error).message)
    await refresh()
    return
  }
  if (to !== asked) relist(asked, to)
  for (const b of inIt) followFile(b.relPath, fileIn(movedPath(b.folder, from, to), b.relPath))
  saveConfig()
  await refresh()
  note(`Moved "${from}" to "${to}"`, () => {
    pobApi.moveFolder(props.config, to, from).then(() => {
      relist(to, from)
      for (const b of inIt) followFile(fileIn(movedPath(b.folder, from, to), b.relPath), b.relPath)
      saveConfig()
      return refresh()
    }, (err: Error) => note(err.message))
  })
}

function folderMenu (e: MouseEvent, path: string) {
  openMenu(e, [
    { label: 'New folder inside', icon: 'fas fa-folder-plus', action: () => tree.startFolder(path) },
    { label: 'Rename', icon: 'fas fa-i-cursor', keys: 'F2', action: () => tree.startEdit('folder', path, 'rename') },
    { label: 'Move', icon: 'fas fa-folder-open', action: () => tree.startEdit('folder', path, 'move') },
    { separator: true },
    { label: 'Sort this folder A to Z', icon: 'fas fa-sort-alpha-down', action: () => tree.sortFolder(path) },
    { label: 'Fold all folders', icon: 'fas fa-compress-alt', action: tree.foldAll },
    { label: 'Open all folders', icon: 'fas fa-expand-alt', action: tree.openAll }
  ])
}

function followFile (from: string, to: string) {
  // Its row stays the same row (picks, focus).
  const id = rowIds.get(from)
  if (id != null) { rowIds.delete(from); rowIds.set(to, id) }
  moveBuildRefs(props.config, from, to)
  // Its regexes in the Regex library follow the file too.
  moveRegexFolder(buildRegexFolder(from), buildRegexFolder(to))
  // So do its pinned pieces (tree, gear slot, gems, next step).
  pins.value = moveBuildPins(pins.value, from, to).list
  if (selected.value === from) selected.value = to
  saveConfig()
}

async function duplicateBuild (b: PobBuildEntry) {
  try {
    const { relPath } = await pobApi.duplicate(props.config, b.relPath)
    await refresh()
    selected.value = relPath
    startEdit(builds.value.find(x => x.relPath === relPath) ?? b, 'rename')
  } catch (err) {
    note((err as Error).message)
  }
}

// To the Recycle Bin, with one Undo for all of them.
async function removeBuilds (list: PobBuildEntry[]) {
  tree.forgetPicks(list.map(b => idOf(b.relPath)))
  const gone: Array<() => Promise<void>> = []
  for (const b of list) {
    try {
      gone.push(await takeBuild(b))
    } catch (err) {
      note((err as Error).message)
    }
  }
  saveConfig()
  await refresh()
  if (!gone.length) return
  note(gone.length === 1 ? `Moved ${list[0].name} to the Recycle Bin` : `Moved ${gone.length} builds to the Recycle Bin`, () => {
    (async () => {
      for (const back of gone) await back()
      saveConfig()
      await refresh()
    })().catch((err: Error) => note(err.message))
  })
}

async function removeBuild (b: PobBuildEntry) {
  await removeBuilds([b])
}

// One build to the Recycle Bin; returns what puts it back.
async function takeBuild (b: PobBuildEntry): Promise<() => Promise<void>> {
  const { xml } = await pobApi.delete(props.config, b.relPath)
  const putBack = moveBuildRefs(props.config, b.relPath, null)
  // Its pinned pieces go with it, and come back on Undo.
  const { list, dropped } = moveBuildPins(pins.value, b.relPath, null)
  pins.value = list
  if (selected.value === b.relPath) selected.value = null
  return async () => {
    await pobApi.restore(props.config, b.relPath, xml)
    putBack()
    pins.value = [...pins.value.filter(p => !dropped.some(d => d.id === p.id)), ...dropped]
  }
}

function togglePin (relPath: string) {
  props.config.pinned = isPinned(relPath)
    ? props.config.pinned.filter(p => p !== relPath)
    : [...props.config.pinned, relPath]
}

</script>

<style module>
.editRow {
  display: flex;
  align-items: center;
  gap: var(--w-s2);
  padding: 4px var(--w-s2);
  border-bottom: 1px solid var(--w-line-soft);
}
.edit { flex: 1; min-width: 0; height: var(--w-row-h); padding: 0 var(--w-s2); }
.folder {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 5px var(--w-pad);
  text-align: left;
  font-size: var(--w-fs-caps);
  letter-spacing: 0.08em;
  text-transform: var(--w-caps-case);
  color: var(--w-dim);
  background: var(--w-panel-2);
  border-bottom: 1px solid var(--w-line-soft);
  font-family: var(--w-caps-face);
}
.folder:hover { color: var(--w-fg); }
</style>
