<template>
    <div class="flex gap-2 min-h-0 items-start">
      <WPanel ref="panel" :title="config.wmTitle || 'Atlas strategies'" icon="map" width="22rem" max-height="80vh"
        :updated="prices.snapshot.value?.ts ?? null" :fresh-min="60" :stale-min="360">
        <!-- Only while a strategy still lists 3.29 scarabs. -->
        <template v-if="hasScarabs" #banner>
          <WBanner tone="warn">Scarabs and the old atlas tree leave in 3.30. Redo a 3.29 strategy's tree and pick its Threads.</WBanner>
        </template>
        <template #actions>
          <button class="w-icon-btn" title="New strategy" @click="addStrategy(newIn)"><i class="fas fa-plus" /></button>
          <button class="w-icon-btn" title="New folder" @click="startFolder(newIn)"><i class="fas fa-folder-plus" /></button>
          <button class="w-icon-btn" :class="{ 'w-icon-btn--on': importOpen }" title="Import a tree link, guide text or strategy code"
            @click="importOpen = !importOpen"><i class="fas fa-file-import" /></button>
          <button class="w-icon-btn" :class="{ 'w-icon-btn--on': sortBy !== 'manual' }" :title="`Sort: ${SORT_LABELS[sortBy]}`"
            @click="sortMenu"><i class="fas fa-sort-amount-down" /></button>
        </template>
        <template #toolbar>
          <div v-if="importOpen" class="flex flex-col gap-1 w-full" @dragover="shotDragOver" @drop="shotDrop">
            <textarea class="w-input" v-model="importText" rows="4" :class="$style.textarea" data-import
              placeholder="An atlas tree link, a guide's text (tree link, Threads, currency, regex), a strategy code, or a pasted screenshot of the atlas tree"
              @keydown.esc="importOpen = false" @paste="shotPaste" />
            <ShotTray ref="shotTray" :model="atlasTree" @update="shotRead = $event" @pending="shotPending = $event" />
            <WField v-model="importName" placeholder="Name" data-import-name @keydown.enter="doImport" />
            <div class="flex gap-1 items-center">
              <span class="w-faint text-xs">Into</span>
              <select v-model="importInto" :class="$style.select" class="w-select grow" title="Folder for what you import">
                <option value="">The top</option>
                <option v-for="f in folders" :key="f" :value="f">{{ f.split('/').join(' › ') }}</option>
              </select>
              <WButton size="sm" variant="primary" :disabled="importDisabled" @click="doImport">{{ importLabel }}</WButton>
            </div>
            <div v-if="importError" class="w-down text-xs">{{ importError }}</div>
          </div>
          <WField v-else v-model="filter" icon="fas fa-search" placeholder="Filter by name, Thread, folder…" class="grow" />
        </template>

        <SavedTree :tree="tree" list-id="atlas-folders" :active-id="config.selectedId" :copy="copyCode"
          @item-menu="rowMenu" @folder-menu="folderMenu">
          <template #item="{ item: s }">
            <span class="w-trunc">{{ s.name || 'Untitled' }}</span>
            <span v-if="isDirty(config, s)" :class="$style.unsavedTag" title="Tree changes not saved">Unsaved</span>
            <span v-if="earnings.get(s.name)" class="ml-auto w-num text-xs" :class="earnings.get(s.name)!.perHour >= 0 ? 'w-up' : 'w-down'"
              :title="`${earnings.get(s.name)!.hours.toFixed(1)} h farmed`">{{ fmt(earnings.get(s.name)!.perHour) }}/h</span>
          </template>
          <template #sub="{ item: s }">{{ describe(s) }}</template>
        </SavedTree>
        <WEmpty v-if="!config.strategies.length && !folders.length" :art="{ mechanic: 'map' }">
          No strategies yet. Start one and click passives on the tree, or import a guide's tree link or text.
          <template #actions>
            <WButton size="sm" variant="primary" icon="fas fa-plus" @click="addStrategy('')">New strategy</WButton>
            <WButton size="sm" icon="fas fa-file-import" @click="importOpen = true">Import</WButton>
          </template>
        </WEmpty>
        <WEmpty v-else-if="filter && !tree.rows.value.length" icon="fas fa-search">
          No strategy matches "{{ filter }}".
          <template #actions><WButton size="sm" variant="ghost" @click="filter = ''">Clear filter</WButton></template>
        </WEmpty>
      </WPanel>

      <template v-if="selected">
        <AtlasTree v-if="!config.treeHidden && atlasTree" :key="selected.id" :model="atlasTree" :tree-url="workingTree(config, selected)" :threads="selected.threads"
          :lit="config.lit ?? []" :list-open="!config.mechanicsHidden" :pin="() => atlasTreePin(config, selected!)"
          :dirty="isDirty(config, selected)" :name="selected.name"
          :points-at="config.pointsAt?.[selected.id] ?? null" @update:points-at="setPointsAt(config, selected!, $event)"
          @update:tree-url="setDraft(config, selected!, $event)" @update:lit="config.lit = $event" @update:list-open="config.mechanicsHidden = !$event"
          @save="saveDraft(config, selected!)" @discard="dropDraft(config, selected!)" @save-as="saveTreeAs"
          @close="closeTree" />
        <WPanel v-else-if="!config.treeHidden && !atlasDataError" title="Atlas tree" size-key="tree" width="44rem" :busy="!atlasTreeError">
          <WEmpty v-if="atlasTreeError" icon="fas fa-exclamation-triangle">{{ atlasTreeError }}</WEmpty>
          <WSkeleton v-else :rows="6" :value="false" />
        </WPanel>
        <AtlasLoadout :config="config" :strategy="selected" :atlas-data="atlasData" :atlas-tree="atlasTree" :atlas-data-error="atlasDataError"
          :tree-url="workingTree(config, selected)" :tree-open="!config.treeHidden" @toggle-tree="config.treeHidden ? config.treeHidden = false : closeTree()" @show-tree="config.treeHidden = false"
          @retry="retryAtlasData(config.dataUrl)" @search="pasteSearch" />
      </template>

      <!-- Closing with unsaved trees (pick W1): ask first. Closing without
           saving keeps the edits as drafts, like before. On the overlay's
           layer, so it's on screen whatever the window's size or place. -->
      <Teleport to="body">
        <div v-if="asking && askList.length" :class="$style.scrim" @mousedown.self.stop="keepEditing">
          <div ref="askBox" :class="$style.ask" class="w-surface" role="alertdialog" aria-modal="true" aria-labelledby="atlas-unsaved-title" @keydown="askKeys">
            <div id="atlas-unsaved-title" :class="$style.askHead">{{ askList.length > 1 ? 'Unsaved trees' : 'Unsaved tree' }}</div>
            <div :class="$style.askBody">
              <template v-if="askList.length === 1"><b>{{ askList[0].name || 'Untitled' }}</b> has tree changes you haven't saved.</template>
              <template v-else>
                These strategies have tree changes you haven't saved:
                <ul :class="$style.askList"><li v-for="s in askList" :key="s.id" class="w-trunc">{{ s.name || 'Untitled' }}</li></ul>
              </template>
            </div>
            <div :class="$style.askFoot">
              <WButton size="sm" variant="ghost" @click="keepEditing">Keep editing</WButton>
              <WButton size="sm" title="Your changes stay as unsaved edits for next time" @click="finishClose(false)">{{ asking === 'tree' ? 'Hide without saving' : 'Close without saving' }}</WButton>
              <WButton size="sm" variant="primary" icon="fas fa-save" data-ask-save @click="finishClose(true)">{{ askList.length > 1 ? 'Save all and ' : 'Save and ' }}{{ asking === 'tree' ? 'hide' : 'close' }}</WButton>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
</template>

<script setup lang="ts">
// The Atlas strategies window: the list with folders, the tree, the loadout.
// Loads the first time the window opens (WidgetAtlas.vue is the shell).
import { computed, defineAsyncComponent, inject, nextTick, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { MainProcess } from '@/web/background/IPC'
import { WPanel, WField, WButton, WEmpty, WBanner, WSkeleton, openMenu, toast, useCopy } from '../ui'
import type { AtlasStrategy, AtlasWidget } from './widget'
import { AppConfig } from '@/web/Config'
import {
  allFolders, claimRegexFolders, setPointsAt, takePointsAt, dropDraft, isDirty, saveDraft, setDraft, strategyBack, takeDrafts, workingTree, cleanFolder, emptyStrategy, regexFolderOf, isStrategyCode,
  strategyMatches, useAtlasData, retryAtlasData, atlasDataState
} from './widget'
import { isUnder } from './list-order'
import { useWidgetVisible } from '../shared/visible-clock'
import { parseGuideText } from './guide'
import { usePriceIndex } from '../market/price-index'
import { useSavedTree } from '../shared/use-saved-tree'
import SavedTree from '../shared/SavedTree.vue'
import { usePriceText } from '../shared/price'
import { FARMING_TYPE, strategyStats } from '../farming/farming'
import type { FarmingWidget } from '../farming/farming'
import { expandShortTreeLinks, extractTreeCode } from './tree'
import type { ShotRead } from './shot-import'
// Not lazy: a paste right after the Import box opens must reach it.
import ShotTray from './ShotTray.vue'
import { addRegex, joinFolder, libraryOn, regexesIn } from '../regex-library/folders'
import { claimNewRegexFolder, copyRegexes, refileRegexes } from './strategy-ops'
import { atlasTreePin } from './atlas-pin'
import { pins } from '../pins/pins'

// The tree editor's code loads the first time a strategy is opened.
const AtlasTree = defineAsyncComponent(() => import('./AtlasTree.vue'))
const AtlasLoadout = defineAsyncComponent(() => import('./AtlasLoadout.vue'))

const props = defineProps<{
  config: AtlasWidget
}>()

claimRegexFolders(props.config.strategies)

// A strategy's map regex from before the Regex library kept them moves there,
// into the strategy's own folder (also when an older copy sits elsewhere).
function moveOldRegexes () {
  if (!libraryOn()) return
  for (const s of props.config.strategies) {
    if (!s.regex.trim()) continue
    const res = addRegex(regexFolderOf(s), 'Map mods', s.regex)
    if (res === 'saved' || res === 'exists') s.regex = ''
  }
}
moveOldRegexes()

// The tree data (1.4 MB) is only used in this window: load it the first time
// the window is on screen, not at startup.
const { atlasData, atlasDataError, atlasTree, atlasTreeError } = atlasDataState()
const panelVisible = useWidgetVisible(() => props.config)
watch(() => panelVisible.value && props.config.dataUrl, () => {
  if (panelVisible.value) useAtlasData(props.config.dataUrl)
}, { immediate: true })

const filter = shallowRef('')
const { copy } = useCopy()
const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)
type SortBy = NonNullable<AtlasWidget['sortBy']>
const SORT_LABELS: Record<SortBy, string> = { manual: 'My order', name: 'Name', earnings: 'Earnings per hour', changed: 'Last changed' }
const sortBy = computed<SortBy>(() => props.config.sortBy && props.config.sortBy in SORT_LABELS ? props.config.sortBy : 'manual')
function sortMenu (e: MouseEvent) {
  openMenu(e, (Object.keys(SORT_LABELS) as SortBy[]).map(k => ({
    label: SORT_LABELS[k],
    icon: sortBy.value === k ? 'fas fa-check' : undefined,
    action: () => { props.config.sortBy = k }
  })))
}
const prices = usePriceIndex()
const { fmt } = usePriceText(prices.snapshot)

const earnings = computed(() => {
  const history = AppConfig().widgets
    .filter(w => w.wmType === FARMING_TYPE)
    .flatMap(w => (w as FarmingWidget).history ?? [])
  return new Map(strategyStats(history).map(r => [r.strategy, r]))
})

function contentOf (s: AtlasStrategy): string {
  return JSON.stringify({ ...s, folder: undefined, regexFolder: undefined, changedAt: undefined })
}
watch(() => props.config.strategies.map(s => [s.id, contentOf(s)] as const), (now, before) => {
  const was = new Map(before)
  const t = Date.now()
  for (const [id, key] of now) {
    if (was.get(id) === key) continue
    const s = props.config.strategies.find(o => o.id === id)
    // New ones get a time; ones back from Undo keep theirs.
    if (s && (was.has(id) || s.changedAt == null)) s.changedAt = t
  }
  // Picked ids that went away, or were given to a new strategy, drop out.
  const prev = new Set(was.keys())
  const cur = new Set(now.map(([id]) => id))
  tree.forgetPicks(tree.picked.value.filter(id => !prev.has(id) || !cur.has(id)))
})

const selected = computed(() => props.config.strategies.find(s => s.id === props.config.selectedId) ?? null)

// ---- closing with unsaved trees ----

// Closing the window (its close button or tab) or hiding the tree asks first
// while a tree has unsaved edits. Going back to the game only hides the
// overlay, so it never asks.
const wm = inject<WidgetManager>('wm')!
const asking = shallowRef<null | 'window' | 'tree'>(null)
// The strategy the tree question is about, fixed when it's asked.
const askTreeId = shallowRef<number | null>(null)
const askBox = shallowRef<HTMLElement | null>(null)
// Drafts already answered with "without saving": not asked about again
// until they change (they stay unsaved, and the list still marks them).
const declined = new Map<string, string>()
function unanswered (s: AtlasStrategy): boolean {
  return isDirty(props.config, s) && declined.get(String(s.id)) !== props.config.drafts?.[s.id]
}
const unsavedTrees = computed(() => props.config.strategies.filter(unanswered))
const askList = computed<AtlasStrategy[]>(() => {
  if (asking.value === 'tree') return props.config.strategies.filter(s => s.id === askTreeId.value && isDirty(props.config, s))
  return asking.value ? unsavedTrees.value : []
})
let focusBack: HTMLElement | null = null
function ask (kind: 'window' | 'tree') {
  if (!asking.value) focusBack = document.activeElement instanceof HTMLElement ? document.activeElement : null
  asking.value = kind
  nextTick(() => askBox.value?.querySelector<HTMLElement>('[data-ask-save]')?.focus())
}
function endAsk () {
  asking.value = null
  const el = focusBack
  focusBack = null
  if (el?.isConnected) nextTick(() => el.focus({ preventScroll: true }))
}
// Set while this window closes itself after the question.
let closing = false
// The config the guard watches: a whole new config (another window saved
// settings) isn't the user closing this one.
let watched: AtlasWidget | null = null
watch(() => [props.config, props.config.wmWants] as const, ([config, now], [, was]) => {
  const same = watched === config
  watched = config
  if (!same || closing || now !== 'hide' || was !== 'show') return
  if (!wm.active.value || !unsavedTrees.value.length) return
  config.wmWants = 'show'
  ask('window')
}, { flush: 'sync', immediate: false })
watched = props.config
// Saved or undone elsewhere meanwhile: nothing left to ask about.
watch(() => askList.value.length, (n) => { if (!n && asking.value) endAsk() })
// Back to the game (Esc goes there too): the question goes away.
watch(() => wm.active.value, (a) => { if (!a && asking.value) endAsk() })

function closeTree () {
  const s = selected.value
  if (s && unanswered(s)) {
    askTreeId.value = s.id
    ask('tree')
  } else {
    props.config.treeHidden = true
  }
}
function keepEditing () {
  endAsk()
}
function finishClose (save: boolean) {
  const kind = asking.value
  for (const s of askList.value) {
    if (save) saveDraft(props.config, s)
    else declined.set(String(s.id), props.config.drafts?.[s.id] ?? '')
  }
  endAsk()
  if (kind === 'tree') {
    props.config.treeHidden = true
  } else if (kind === 'window') {
    closing = true
    try { wm.hide(props.config.wmId) } finally { closing = false }
  }
}
function askKeys (e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault(); e.stopPropagation(); keepEditing()
  } else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
    e.preventDefault(); e.stopPropagation(); finishClose(true)
  } else if (e.key === 'Tab') {
    // Keep the keyboard in the question.
    const buttons = [...(askBox.value?.querySelectorAll<HTMLElement>('button') ?? [])]
    if (!buttons.length) return
    const at = buttons.indexOf(document.activeElement as HTMLElement)
    const next = (at + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length
    e.preventDefault()
    buttons[at < 0 ? 0 : next].focus()
  }
  e.stopPropagation()
}
const hasScarabs = computed(() => props.config.strategies.some(s => /scarab/i.test(s.scarabs)))

function describe (s: AtlasStrategy): string {
  const threads = s.threads.map(t => `${t.count} ${t.type}`).join(', ')
  return [threads || (workingTree(props.config, s) ? 'No Threads' : 'Empty'), ...s.tags].filter(Boolean).join(' · ')
}

// ---- the list: nested folders ----

const folders = computed(() => allFolders(props.config.strategies, props.config.folders))

// Dragging and Alt + arrows work on the order you set: other sorts switch back to it.
function toManual () {
  if (sortBy.value === 'manual') return
  props.config.sortBy = 'manual'
  toast('Sorted by My order', { anchor: panel.value?.el })
}

// The list's folders, picking, drag and drop, Alt + arrows and inline field
// (shared/use-saved-tree, drawn by SavedTree.vue).
const tree = useSavedTree<AtlasStrategy>({
  root: () => panel.value?.el,
  items: () => props.config.strategies,
  setItems: (list) => { props.config.strategies = list },
  folderOf: s => s.folder ?? '',
  // Strategies that leave a folder, or get a new name, take their regexes along.
  setFolder: (s, folder) => { s.folder = folder; refileRegexes(s, props.config.strategies) },
  nameOf: s => s.name,
  setName: (s, name) => { s.name = name; refileRegexes(s, props.config.strategies) },
  extraFolders: () => props.config.folders ?? [],
  setExtraFolders: (list) => { props.config.folders = list },
  folderOrder: () => props.config.folderOrder,
  setFolderOrder: (order) => { props.config.folderOrder = order },
  closed: () => props.config.closedFolders ?? [],
  setClosed: (list) => { props.config.closedFolders = list },
  query: () => filter.value,
  matches: strategyMatches,
  sorted (list) {
    const v = (name: string) => earnings.value.get(name)?.perHour ?? -Infinity
    const by = sortBy.value
    return by === 'earnings'
      ? [...list].sort((a, b) => v(b.name) - v(a.name))
      : by === 'name'
        ? [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        : by === 'changed' ? [...list].sort((a, b) => (b.changedAt ?? 0) - (a.changedAt ?? 0)) : list
  },
  manual: () => sortBy.value === 'manual',
  toManual,
  foldersByName: () => sortBy.value === 'name',
  selected: () => props.config.selectedId,
  select: (id) => { props.config.selectedId = id },
  remove: (list) => { removeMany(list) },
  note: (text) => { toast(text, { anchor: panel.value?.el }) }
})
const { openFolder, startFolder, inFolder } = tree

function startEdit (target: 'strategy' | 'folder', id: string, kind: 'rename' | 'move', ids?: number[]) {
  tree.startEdit(target === 'strategy' ? 'item' : 'folder', id, kind, ids)
}

// New things go in the selected strategy's folder.
const newIn = computed(() => selected.value?.folder ?? '')

function addStrategy (folder: string) {
  const s = { ...emptyStrategy(props.config.strategies), name: 'New strategy', folder }
  claimNewRegexFolder(s, props.config.strategies)
  props.config.strategies.push(s)
  props.config.selectedId = s.id
  props.config.treeHidden = false
  openFolder(folder)
  startEdit('strategy', String(s.id), 'rename')
}

// ---- menus ----

// The tree pins of strategies being removed, as they were then: a strategy
// made since may take one's id and pin it, and that pin isn't theirs.
function pinsOf (list: AtlasStrategy[]) {
  const ids = new Set(list.map(s => atlasTreePin(props.config, s).id))
  return new Set(pins.value.filter(p => ids.has(p.id)))
}

// Put back under new ids: their tree pins follow, all in one pass so one
// strategy's new id can't catch another's pin.
function movePins (moves: Array<{ old: AtlasStrategy, back: AtlasStrategy }>, before: Set<unknown>) {
  const to = new Map(moves.filter(m => m.old.id !== m.back.id).map(m => [atlasTreePin(props.config, m.old).id, m.back]))
  if (!to.size) return
  pins.value = pins.value.map(p => {
    const back = before.has(p) ? to.get(p.id) : undefined
    return back ? { ...p, ...atlasTreePin(props.config, back) } : p
  })
}

// No "are you sure": remove now, offer Undo. Their regexes stay in the library.
function remove (s: AtlasStrategy) { removeMany([s]) }

function removeMany (list: AtlasStrategy[]) {
  if (!list.length) return
  const ids = new Set(list.map(s => s.id))
  const at = new Map(list.map(s => [s.id, props.config.strategies.findIndex(o => o.id === s.id)]))
  const selectedBefore = props.config.selectedId
  props.config.strategies = props.config.strategies.filter(o => !ids.has(o.id))
  if (selectedBefore != null && ids.has(selectedBefore)) props.config.selectedId = null
  tree.forgetPicks(ids)
  const drafts = takeDrafts(props.config, ids)
  const pinned = pinsOf(list)
  const sliders = takePointsAt(props.config, ids)
  const text = list.length === 1 ? `Removed "${list[0].name || 'Untitled'}"` : `Removed ${list.length} strategies`
  // Undo puts back these strategies only, so anything made since stays.
  toast(text, {
    anchor: panel.value?.el,
    undo: () => {
      const back = [...list].sort((x, y) => at.get(x.id)! - at.get(y.id)!)
      const moves: Array<{ old: AtlasStrategy, back: AtlasStrategy }> = []
      for (const s of back) {
        // One made since may hold its old id: it comes back under a new one.
        const b = strategyBack(props.config, s, drafts, sliders)
        const next = [...props.config.strategies]
        next.splice(Math.min(at.get(s.id)!, next.length), 0, b)
        props.config.strategies = next
        moves.push({ old: s, back: b })
        if (s.id === selectedBefore) props.config.selectedId = b.id
      }
      movePins(moves, pinned)
    }
  })
}

// Save as: a new strategy beside this one with the edited tree and the same
// loadout and regexes; this one goes back to its saved tree.
function saveTreeAs (name: string) {
  const s = selected.value
  if (!s) return
  const copyOf: AtlasStrategy = { ...JSON.parse(JSON.stringify(s)) as AtlasStrategy, id: emptyStrategy(props.config.strategies).id, name, treeUrl: workingTree(props.config, s), regexFolder: undefined }
  copyRegexes(s, copyOf, props.config.strategies)
  dropDraft(props.config, s)
  props.config.strategies.push(copyOf)
  props.config.selectedId = copyOf.id
  toast(`Saved as "${name}". "${s.name || 'Untitled'}" keeps its saved tree.`, { anchor: panel.value?.el })
}

function duplicate (s: AtlasStrategy) {
  const copyOf = { ...JSON.parse(JSON.stringify(s)) as AtlasStrategy, id: emptyStrategy(props.config.strategies).id, name: `${s.name || 'Untitled'} (copy)`, regexFolder: undefined }
  copyRegexes(s, copyOf, props.config.strategies)
  props.config.strategies.push(copyOf)
  props.config.selectedId = copyOf.id
}

function copyCode (list: AtlasStrategy[]) {
  codeFor(list).then(copy).then(() => toast('Strategy code copied', { anchor: panel.value?.el })).catch(() => {})
}

async function codeFor (list: AtlasStrategy[], base = ''): Promise<string> {
  const { strategyCode } = await import('./strategy-code')
  return strategyCode(list.map(s => ({ ...s, regexes: regexesIn(regexFolderOf(s)).map(r => ({ name: r.name, text: r.text })) })), base)
}

function rowMenu (e: MouseEvent, s: AtlasStrategy) {
  const group = tree.groupOf(s)
  if (group.length > 1) {
    openMenu(e, [
      { label: `Move ${group.length} to folder`, icon: 'fas fa-folder-open', action: () => startEdit('strategy', String(s.id), 'move', group.map(g => g.id)) },
      { label: 'Copy strategy code', icon: 'fas fa-share-square', keys: 'Ctrl + C', action: () => copyCode(group) },
      { separator: true },
      { label: `Remove ${group.length} strategies`, icon: 'fas fa-trash', keys: 'Del', danger: true, action: () => removeMany(group) }
    ])
    return
  }
  openMenu(e, [
    { label: 'Rename', icon: 'fas fa-i-cursor', keys: 'F2', action: () => startEdit('strategy', String(s.id), 'rename') },
    { label: 'Move to folder', icon: 'fas fa-folder-open', action: () => startEdit('strategy', String(s.id), 'move') },
    { label: 'Duplicate', icon: 'far fa-clone', action: () => duplicate(s) },
    { label: 'Copy strategy code', icon: 'fas fa-share-square', keys: 'Ctrl + C', action: () => copyCode([s]) },
    { separator: true },
    { label: 'Remove', icon: 'fas fa-trash', keys: 'Del', danger: true, action: () => remove(s) }
  ])
}

function folderMenu (e: MouseEvent, path: string) {
  openMenu(e, [
    { label: 'New strategy here', icon: 'fas fa-plus', action: () => addStrategy(path) },
    { label: 'New folder inside', icon: 'fas fa-folder-plus', action: () => startFolder(path) },
    { label: 'Rename', icon: 'fas fa-i-cursor', keys: 'F2', action: () => startEdit('folder', path, 'rename') },
    { label: 'Move', icon: 'fas fa-folder-open', action: () => startEdit('folder', path, 'move') },
    { label: 'Copy folder code', icon: 'fas fa-share-square', disabled: !inFolder(path).length, action: () => { codeFor(inFolder(path), path).then(copy).then(() => toast('Folder code copied', { anchor: panel.value?.el })).catch(() => {}) } },
    { separator: true },
    { label: 'Sort this folder A to Z', icon: 'fas fa-sort-alpha-down', action: () => sortFolder(path) },
    { label: 'Fold all folders', icon: 'fas fa-compress-alt', action: tree.foldAll },
    { label: 'Open all folders', icon: 'fas fa-expand-alt', action: tree.openAll },
    { separator: true },
    { label: 'Remove folder', icon: 'fas fa-trash', danger: true, action: () => removeFolder(path) }
  ])
}

const sortFolder = tree.sortFolder

// Takes the folder and every strategy in it; Undo puts all of it back.
function removeFolder (path: string) {
  const removed = inFolder(path)
  const gone = new Set(removed.map(s => s.id))
  const goneFolders = (props.config.folders ?? []).filter(f => f === path || f.startsWith(path + '/'))
  const orderBefore = props.config.folderOrder
  const selectedBefore = props.config.selectedId
  props.config.strategies = props.config.strategies.filter(s => !gone.has(s.id))
  props.config.folders = (props.config.folders ?? []).filter(f => !goneFolders.includes(f))
  if (orderBefore) props.config.folderOrder = orderBefore.filter(f => !isUnder(f, path))
  if (selectedBefore != null && gone.has(selectedBefore)) props.config.selectedId = null
  const drafts = takeDrafts(props.config, gone)
  const pinned = pinsOf(removed)
  const sliders = takePointsAt(props.config, gone)
  toast(gone.size ? `Removed "${path}" and ${gone.size} ${gone.size === 1 ? 'strategy' : 'strategies'}` : `Removed "${path}"`, {
    anchor: panel.value?.el,
    undo: () => {
      let selectedBack: number | null = null
      const moves: Array<{ old: AtlasStrategy, back: AtlasStrategy }> = []
      for (const s of removed) {
        const back = strategyBack(props.config, s, drafts, sliders)
        props.config.strategies = [...props.config.strategies, back]
        moves.push({ old: s, back })
        if (s.id === selectedBefore) selectedBack = back.id
      }
      movePins(moves, pinned)
      props.config.folders = [...new Set([...(props.config.folders ?? []), ...goneFolders])]
      if (orderBefore && !props.config.folderOrder?.some(f => isUnder(f, path))) props.config.folderOrder = orderBefore
      if (selectedBack != null) props.config.selectedId = selectedBack
    }
  })
}

// ---- import ----

const importOpen = shallowRef(false)
const importText = shallowRef('')
const importInto = shallowRef('')
const importError = shallowRef('')
watch(importOpen, (on) => {
  importError.value = ''
  if (!on) return
  importInto.value = newIn.value
  nextTick(() => panel.value?.el?.querySelector<HTMLTextAreaElement>('[data-import]')?.focus())
})

// Before it joins the list: its own regex folder, holding what came with it.
function fileImported (s: AtlasStrategy, regexes: Array<{ name: string, text: string }>) {
  claimNewRegexFolder(s, props.config.strategies)
  if (!libraryOn()) return
  for (const r of regexes) addRegex(regexFolderOf(s), r.name, r.text)
  if (s.regex) {
    const res = addRegex(regexFolderOf(s), 'Map mods', s.regex)
    if (res === 'saved' || res === 'exists') s.regex = ''
  }
}

// A short poeplanner link is opened while importing; no double import meanwhile.
const importing = shallowRef(false)
async function fetchProxied (url: string): Promise<string> {
  const res = await MainProcess.proxy(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.text()
}

// ---- screenshots of the atlas tree (ShotTray.vue) ----

const shotTray = shallowRef<{ add: (files: Iterable<File>) => boolean, clear: () => void }>()
const shotRead = shallowRef<ShotRead | null>(null)
// The imported strategy's name (Guy: "allow to set a name"). Empty: the
// guide's own name, else "From screenshot" / "Imported tree".
const importName = shallowRef('')
watch(importOpen, (on) => { if (!on) { shotRead.value = null; importName.value = '' } })

const shotPending = shallowRef(false)
// Screenshots in the tray win over text left in the box (a pasted link that
// failed earlier): the button says which it imports.
const importLabel = computed(() => {
  const n = shotRead.value?.nodes.length ?? 0
  if (shotPending.value) return 'Reading…'
  return n ? `Import ${n} ${n === 1 ? 'passive' : 'passives'}` : 'Import'
})
const importDisabled = computed(() => importing.value || shotPending.value || (!importText.value.trim() && !shotRead.value?.nodes.length))

function shotFiles (list: DataTransferItemList | null | undefined): File[] {
  return [...(list ?? [])].filter(i => i.kind === 'file' && i.type.startsWith('image/')).map(i => i.getAsFile()).filter((f): f is File => f != null)
}

function shotPaste (e: ClipboardEvent) {
  const files = shotFiles(e.clipboardData?.items)
  // Text with a picture (copied from a page or a document): the text.
  if (!files.length || e.clipboardData?.types.includes('text/plain')) return
  e.preventDefault()
  shotTray.value?.add(files)
}

function shotDragOver (e: DragEvent) {
  if ([...(e.dataTransfer?.items ?? [])].some(i => i.kind === 'file')) e.preventDefault()
}

function shotDrop (e: DragEvent) {
  const files = [...(e.dataTransfer?.files ?? [])].filter(f => f.type.startsWith('image/'))
  if (!files.length) return
  e.preventDefault()
  e.stopPropagation()
  shotTray.value?.add(files)
}

async function doImport () {
  if (importing.value) return
  importError.value = ''
  const text = importText.value.trim()
  const shots = shotRead.value
  const into = cleanFolder(importInto.value)
  if (shotPending.value) return
  if (shots?.nodes.length) {
    // Always a new strategy: nothing you have is changed.
    const { encodeAtlasTree } = await import('./atlas-tree')
    const s: AtlasStrategy = { ...emptyStrategy(props.config.strategies), name: importName.value.trim() || 'From screenshot', treeUrl: encodeAtlasTree(shots.nodes, {}), folder: into }
    fileImported(s, [])
    props.config.strategies.push(s)
    props.config.selectedId = s.id
    props.config.treeHidden = false
    openFolder(s.folder)
    shotTray.value?.clear()
    importText.value = ''
    importOpen.value = false
    return
  }
  if (!text) return
  const added: AtlasStrategy[] = []
  try {
    if (isStrategyCode(text)) {
      const { readStrategyCode } = await import('./strategy-code')
      const codes = readStrategyCode(text)
      for (const shared of codes) {
        const { regexes, ...rest } = shared
        const s: AtlasStrategy = { ...emptyStrategy(props.config.strategies), ...rest, folder: joinFolder(into, rest.folder) }
        if (codes.length === 1 && importName.value.trim()) s.name = importName.value.trim()
        fileImported(s, regexes)
        props.config.strategies.push(s)
        added.push(s)
      }
    } else {
      importing.value = true
      const full = await expandShortTreeLinks(text, fetchProxied).finally(() => { importing.value = false })
      const lone = !/\s/.test(full) && extractTreeCode(full)
      const parsed = lone ? { name: 'Imported tree', treeUrl: full } : parseGuideText(full)
      const s: AtlasStrategy = { ...emptyStrategy(props.config.strategies), ...parsed, folder: into }
      if (importName.value.trim()) s.name = importName.value.trim()
      fileImported(s, [])
      props.config.strategies.push(s)
      added.push(s)
    }
  } catch (err) {
    importError.value = (err as Error).message
    return
  }
  if (!added.length) return
  props.config.selectedId = added[0].id
  props.config.treeHidden = false
  openFolder(added[0].folder)
  importText.value = ''
  importOpen.value = false
  if (added.length > 1) toast(`Imported ${added.length} strategies`, { anchor: panel.value?.el })
}

function pasteSearch (text: string) {
  MainProcess.sendEvent({
    name: 'CLIENT->MAIN::user-action',
    payload: { action: 'stash-search', text }
  })
}
</script>

<style module>
.textarea {
  width: 100%;
  padding: 4px 8px;
  font-size: var(--w-fs-md);
  color: var(--w-fg);
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  resize: vertical;
}
.select {
  height: 26px;
  padding: 0 6px;
  font-size: var(--w-fs-md);
  color: var(--w-fg);
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
}
.unsavedTag {
  flex: none;
  font-size: var(--w-fs-caps);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1.4;
  padding: 0 5px;
  border-radius: var(--w-r-sm);
  color: var(--w-panel-solid-base);
  background: var(--w-accent);
}
.scrim {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgb(0 0 0 / 0.55);
  pointer-events: auto;
}
.ask {
  width: 34rem;
  max-width: calc(100% - 16px);
  border: 1px solid var(--w-accent);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.6);
}
.askHead {
  padding: 6px var(--w-pad);
  font-family: var(--w-caps-face);
  color: var(--w-accent);
  border-bottom: 1px solid var(--w-line);
}
.askBody { padding: 10px var(--w-pad); color: var(--w-fg); line-height: 1.5; }
.askList { margin: 4px 0 0; padding-left: 1.1rem; list-style: disc; max-height: 8rem; overflow-y: auto; }
.askFoot { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; padding: 6px var(--w-pad); border-top: 1px solid var(--w-line); }
</style>
