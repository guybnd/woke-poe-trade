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

        <template v-for="g in groups" :key="g.folder">
          <button v-if="groups.length > 1" type="button" :class="$style.folder" class="w-focusable" :aria-expanded="isOpen(g)" @click="toggleFolder(g)">
            <i class="fas text-xs" :class="isOpen(g) ? 'fa-chevron-down' : 'fa-chevron-right'" />
            <span class="w-trunc">{{ g.label }}</span>
            <span class="ml-auto w-num">{{ g.builds.length }}</span>
          </button>
          <template v-if="isOpen(g)">
            <template v-for="b in g.builds" :key="b.relPath">
            <div v-if="editing?.relPath === b.relPath" :class="$style.editRow">
              <span class="w-faint text-xs whitespace-nowrap">{{ editing.kind === 'rename' ? 'Name' : 'Folder' }}</span>
              <input data-draft v-model="draft" :class="['w-field', $style.edit]" spellcheck="false" :list="editing.kind === 'move' ? 'pob-folders' : undefined"
                :placeholder="editing.kind === 'move' ? 'Empty: the top of the builds folder' : ''"
                @keydown.enter.prevent="finishEdit" @keydown.esc.prevent="editing = null" @blur="editing = null">
            </div>
            <WListItem v-else :active="selected === b.relPath" :title="b.relPath" @select="select(b)"
              @contextmenu="buildMenu($event, b)" @keydown.p.prevent="togglePin(b.relPath)"
              @keydown.f2.prevent="startEdit(b, 'rename')" @keydown="$event.key === 'Delete' && ($event.preventDefault(), removeBuild(b))">
              <i v-if="config.activeBuild === b.relPath" class="fas fa-check-circle w-up" title="In use" />
              <span class="w-trunc">{{ b.name }}</span>
              <span class="ml-auto w-num w-dim text-xs whitespace-nowrap" title="Saved in PoB">{{ statLine(b.stats) }}</span>
              <template #sub>{{ describe(b) }}<template v-if="b.folder.includes('/')"> · {{ b.folder.split('/').slice(1).join('/') }}</template></template>
              <template #actions>
                <button @click="togglePin(b.relPath)" class="w-icon-btn" :class="{ 'w-icon-btn--on': isPinned(b.relPath) }"
                  :title="isPinned(b.relPath) ? 'Unpin' : 'Pin to top'">
                  <i class="fas fa-thumbtack" />
                </button>
              </template>
            </WListItem>
            </template>
          </template>
        </template>
        <datalist id="pob-folders"><option v-for="f in folders" :key="f" :value="f" /></datalist>
        <WEmpty v-if="!loading && !shown.length && !error && builds.length" icon="fas fa-filter">
          Nothing matches "{{ filter }}".
          <template #actions><WButton size="sm" @click="filter = ''">Clear search</WButton></template>
        </WEmpty>
        <WEmpty v-else-if="!loading && !shown.length && !error" icon="fas fa-folder-open">
          No builds in {{ dir || 'the builds folder' }}. Save one in Path of Building, or import a pobb.in link with the button above.
          <template #actions><WButton size="sm" @click="importOpen = true">Import a build</WButton></template>
        </WEmpty>
      </WPanel>

      <BuildDetail v-if="selectedBuild" :config="config" :entry="selectedBuild" :details="details" @close="selected = null" @tree="treeAt = { title: $event }" @compare="comparing = { a: $event, b: '' }" />
      <BuildCompare v-if="comparing" :config="config" :builds="comparePicks" :a="compareA" :b="compareB"
        @pick="(a, b) => { comparing = { a, b } }" @close="comparing = null" />
      <BuildTree v-if="selectedBuild && details && treeAt != null" :specs="details.trees" :start="treeAt"
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
import { inject, computed, nextTick, shallowRef, watch, defineAsyncComponent } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel, WField, WButton, WEmpty, WListItem, WBanner, WSkeleton, openMenu, toast } from '../ui'
import { saveConfig } from '@/web/Config'
import DockItem from '../dock/DockItem.vue'
import BuildCompare from './BuildCompare.vue'
import BuildDetail from './BuildDetail.vue'
import BuildHoverCard from './BuildHoverCard.vue'
import { buildPinChoices, moveBuildPins, treePin } from './build-pins'
import { buildRegexFolder, moveRegexFolder } from '../regex-library/folders'
import { isPinned as isPiecePinned, pins, togglePin as togglePinned } from '../pins/pins'
import type { DockMenuAction } from '../dock/dock'
import { showWithOverlay } from '../dock/dock'
import { toggleBuildTree, treeOn } from './tree-toggle'
import { useActiveBuild } from './active'
import { statLine } from './build-model'
import { PINNED_GROUP, buildMatches, describe, groupBuilds, migratePobWidget, moveBuildRefs, pobApi, treeHotkeyOf } from './widget'
import type { BuildGroup, PobBuildEntry, PobDetails } from './widget'

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
const treeAt = shallowRef<{ title: string } | null>(null)
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
  return builds.value.find(b => b.name.toLowerCase().includes(lower))?.relPath ?? null
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
const groups = computed(() => groupBuilds(shown.value, props.config.pinned))

// By hand, for this session. Until then: pinned, the latest folder, and the
// folder holding the build in use.
const folderChoice = shallowRef<Record<string, boolean>>({})
function isOpen (g: BuildGroup) {
  if (filter.value.trim() || groups.value.length < 2) return true
  const chosen = folderChoice.value[g.folder]
  if (chosen != null) return chosen
  const firstFolder = groups.value.find(x => x.folder !== PINNED_GROUP)
  return g.folder === PINNED_GROUP || g === firstFolder ||
    g.builds.some(b => b.relPath === props.config.activeBuild || b.relPath === selected.value)
}
function toggleFolder (g: BuildGroup) {
  // A filter shows every match, whatever is open.
  if (filter.value.trim()) return
  folderChoice.value = { ...folderChoice.value, [g.folder]: !isOpen(g) }
}
const selectedBuild = computed(() => builds.value.find(b => b.relPath === selected.value) ?? null)

async function refresh () {
  loading.value = true
  error.value = ''
  try {
    const res = await pobApi.list(props.config)
    const before = selectedBuild.value?.mtime
    builds.value = res.builds
    dir.value = res.dir
    // PoB saved the build you are looking at.
    const now = selectedBuild.value
    if (now && before != null && now.mtime !== before) loadDetails(now.relPath)
    openOnActive()
    // PoB may have saved the active build meanwhile.
    active.reload()
  } catch (err) {
    builds.value = []
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
const editing = shallowRef<{ relPath: string, kind: 'rename' | 'move' } | null>(null)
const draft = shallowRef('')
const folders = computed(() => [...new Set(builds.value.map(b => b.folder).filter(Boolean))].sort((a, b) => a.localeCompare(b)))

function note (text: string, undo?: () => void) {
  toast(text, { anchor: panel.value?.el, undo })
}

function startEdit (b: PobBuildEntry, kind: 'rename' | 'move') {
  draft.value = kind === 'rename' ? b.name : b.folder
  editing.value = { relPath: b.relPath, kind }
  nextTick(() => {
    const input = panel.value?.el?.querySelector<HTMLInputElement>('[data-draft]')
    input?.focus()
    input?.select()
  })
}

async function finishEdit () {
  const edit = editing.value
  if (!edit) return
  editing.value = null
  const b = builds.value.find(x => x.relPath === edit.relPath)
  if (!b) return
  const text = draft.value.trim()
  if (edit.kind === 'rename' ? !text || text === b.name : text.toLowerCase() === b.folder.toLowerCase()) return
  try {
    const { relPath } = edit.kind === 'rename'
      ? await pobApi.rename(props.config, b.relPath, text)
      : await pobApi.move(props.config, b.relPath, text)
    if (relPath === b.relPath) return
    followFile(b.relPath, relPath)
    await refresh()
    const back = () => {
      const call = edit.kind === 'rename' ? pobApi.rename(props.config, relPath, b.name) : pobApi.move(props.config, relPath, b.folder)
      call.then(r => { followFile(relPath, r.relPath); return refresh() }, (err: Error) => note(err.message))
    }
    note(edit.kind === 'rename' ? `Renamed to ${relPath.split('/').pop()!.replace(/\.xml$/i, '')}` : `Moved to ${relPath.includes('/') ? relPath.slice(0, relPath.lastIndexOf('/')) : 'the builds folder'}`, back)
  } catch (err) {
    note((err as Error).message)
  }
}

function followFile (from: string, to: string) {
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

async function removeBuild (b: PobBuildEntry) {
  try {
    const { xml } = await pobApi.delete(props.config, b.relPath)
    const putBack = moveBuildRefs(props.config, b.relPath, null)
    // Its pinned pieces go with it, and come back on Undo.
    const { list, dropped } = moveBuildPins(pins.value, b.relPath, null)
    pins.value = list
    if (selected.value === b.relPath) selected.value = null
    saveConfig()
    await refresh()
    note(`Moved ${b.name} to the Recycle Bin`, () => {
      pobApi.restore(props.config, b.relPath, xml).then(() => {
        putBack()
        pins.value = [...pins.value.filter(p => !dropped.some(d => d.id === p.id)), ...dropped]
        saveConfig()
        return refresh()
      }, (err: Error) => note(err.message))
    })
  } catch (err) {
    note((err as Error).message)
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
