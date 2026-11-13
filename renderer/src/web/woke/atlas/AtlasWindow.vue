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
          <div v-if="importOpen" class="flex flex-col gap-1 w-full">
            <textarea v-model="importText" rows="4" :class="$style.textarea" data-import
              placeholder="An atlas tree link, a guide's text (tree link, Threads, currency, regex) or a strategy code" @keydown.esc="importOpen = false" />
            <div class="flex gap-1 items-center">
              <span class="w-faint text-xs">Into</span>
              <select v-model="importInto" :class="$style.select" class="grow" title="Folder for what you import">
                <option value="">The top</option>
                <option v-for="f in folders" :key="f" :value="f">{{ f.split('/').join(' › ') }}</option>
              </select>
              <WButton size="sm" variant="primary" :disabled="!importText.trim()" @click="doImport">Import</WButton>
            </div>
            <div v-if="importError" class="w-down text-xs">{{ importError }}</div>
          </div>
          <WField v-else v-model="filter" icon="fas fa-search" placeholder="Filter by name, Thread, folder…" class="grow" />
        </template>

        <div :class="$style.rows" data-rows @dragover="dragOver" @drop="dropHere" @dragleave="dragLeave">
          <template v-for="row in rows" :key="row.key">
            <div v-if="editing && editing.key === row.key" :class="$style.editRow" :style="rowStyle(row.depth)">
              <span class="w-faint text-xs whitespace-nowrap">{{ editing.kind === 'move' ? 'Folder' : 'Name' }}</span>
              <input data-draft v-model="draft" :class="['w-field', $style.edit]" spellcheck="false" :list="editing.kind === 'move' ? 'atlas-folders' : undefined"
                :placeholder="editing.kind === 'move' ? 'Empty: the top' : ''"
                @keydown.enter.prevent="finishEdit" @keydown.esc.prevent="editing = null" @blur="finishEdit">
            </div>
            <button v-else-if="row.kind === 'folder'" type="button" :class="[$style.folder, $style.row, dropClass(row.key), { [$style.nested]: row.depth > 0 }]" class="w-focusable" :style="rowStyle(row.depth)"
              :data-row="row.key" :aria-expanded="row.open" :draggable="true" @dragstart="dragStart($event, row)" @dragend="dragEnd"
              @click="toggleFolder(row.node.path)" @contextmenu="folderMenu($event, row.node.path)"
              @keydown.f2.prevent="startEdit('folder', row.node.path, 'rename')" @keydown="folderKeys($event, row.node.path)">
              <i class="fas text-xs" :class="row.open ? 'fa-chevron-down' : 'fa-chevron-right'" />
              <span class="w-trunc">{{ row.node.name }}</span>
              <span class="ml-auto w-num">{{ row.node.total }}</span>
            </button>
            <div v-else-if="row.kind === 'new-folder'" />
            <WListItem v-else :active="config.selectedId === row.s.id" :class="[$style.row, dropClass(row.key), { [$style.picked]: isPicked(row.s.id), [$style.nested]: row.depth > 0 }]" :style="rowStyle(row.depth)"
              :data-row="row.key" :draggable="true" @dragstart="dragStart($event, row)" @dragend="dragEnd"
              @click="rowClick($event, row.s)" @contextmenu="rowMenu($event, row.s)" @keydown="rowKeys($event, row.s)"
              @keydown.delete.prevent="removeKey(row.s)" @keydown.f2.prevent="startEdit('strategy', String(row.s.id), 'rename')">
              <span v-if="isDirty(config, row.s)" :class="$style.dirty" title="Tree changes not saved" />
              <span class="w-trunc">{{ row.s.name || 'Untitled' }}</span>
              <span v-if="earnings.get(row.s.name)" class="ml-auto w-num text-xs" :class="earnings.get(row.s.name)!.perHour >= 0 ? 'w-up' : 'w-down'"
                :title="`${earnings.get(row.s.name)!.hours.toFixed(1)} h farmed`">{{ fmt(earnings.get(row.s.name)!.perHour) }}/h</span>
              <template #sub>{{ describe(row.s) }}</template>
            </WListItem>
          </template>
          <div v-if="drag" :class="[$style.tail, { [$style.dropTop]: dropAt?.kind === 'top' }]" data-row="top" />
        </div>
        <datalist id="atlas-folders"><option v-for="f in folders" :key="f" :value="f" /></datalist>
        <WEmpty v-if="!config.strategies.length && !folders.length" :art="{ mechanic: 'map' }">
          No strategies yet. Start one and click passives on the tree, or import a guide's tree link or text.
          <template #actions>
            <WButton size="sm" variant="primary" icon="fas fa-plus" @click="addStrategy('')">New strategy</WButton>
            <WButton size="sm" icon="fas fa-file-import" @click="importOpen = true">Import</WButton>
          </template>
        </WEmpty>
        <WEmpty v-else-if="filter && !rows.length" icon="fas fa-search">
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
          @close="config.treeHidden = true" />
        <WPanel v-else-if="!config.treeHidden && !atlasDataError" title="Atlas tree" size-key="tree" width="44rem" :busy="!atlasTreeError">
          <WEmpty v-if="atlasTreeError" icon="fas fa-exclamation-triangle">{{ atlasTreeError }}</WEmpty>
          <WSkeleton v-else :rows="6" :value="false" />
        </WPanel>
        <AtlasLoadout :config="config" :strategy="selected" :atlas-data="atlasData" :atlas-tree="atlasTree" :atlas-data-error="atlasDataError"
          :tree-url="workingTree(config, selected)" :tree-open="!config.treeHidden" @toggle-tree="config.treeHidden = !config.treeHidden" @show-tree="config.treeHidden = false"
          @retry="retryAtlasData(config.dataUrl)" @search="pasteSearch" />
      </template>
    </div>
</template>

<script setup lang="ts">
// The Atlas strategies window: the list with folders, the tree, the loadout.
// Loads the first time the window opens (WidgetAtlas.vue is the shell).
import { computed, defineAsyncComponent, nextTick, shallowRef, useCssModule, watch } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { WPanel, WField, WButton, WEmpty, WListItem, WBanner, WSkeleton, openMenu, toast, useCopy } from '../ui'
import type { AtlasStrategy, AtlasWidget } from './widget'
import { AppConfig } from '@/web/Config'
import {
  allFolders, claimRegexFolders, setPointsAt, takePointsAt, dropDraft, isDirty, saveDraft, setDraft, strategyBack, takeDrafts, workingTree, cleanFolder, emptyStrategy, regexFolderOf, folderTree, isStrategyCode, movedFolder,
  strategyMatches, useAtlasData, retryAtlasData, atlasDataState
} from './widget'
import type { FolderNode } from './widget'
import { folderDrop, folderOrderOf, isUnder, moveStrategies, nudgeFolder, parentOf, placeFolder, sortFolderByName } from './list-order'
import type { DropAt } from './list-order'
import { useWidgetVisible } from '../shared/visible-clock'
import { parseGuideText } from './guide'
import { usePriceIndex } from '../market/price-index'
import { formatChaos } from '../ui/format'
import { FARMING_TYPE, strategyStats } from '../farming/farming'
import type { FarmingWidget } from '../farming/farming'
import { extractTreeCode } from './tree'
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
const styles = useCssModule()
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
function fmt (chaos: number) { return formatChaos(chaos, prices.snapshot.value?.divine ?? null) }

const earnings = computed(() => {
  const history = AppConfig().widgets
    .filter(w => w.wmType === FARMING_TYPE)
    .flatMap(w => (w as FarmingWidget).history ?? [])
  return new Map(strategyStats(history).map(r => [r.strategy, r]))
})

function contentOf (s: AtlasStrategy): string {
  return JSON.stringify({ ...s, folder: undefined, changedAt: undefined })
}
watch(() => props.config.strategies.map(s => [s.id, contentOf(s)] as const), (now, before) => {
  const was = new Map(before)
  const t = Date.now()
  for (const [id, key] of now) {
    if (was.get(id) === key) continue
    const s = props.config.strategies.find(o => o.id === id)
    if (s) s.changedAt = t
  }
})

const selected = computed(() => props.config.strategies.find(s => s.id === props.config.selectedId) ?? null)
const hasScarabs = computed(() => props.config.strategies.some(s => /scarab/i.test(s.scarabs)))

function describe (s: AtlasStrategy): string {
  const threads = s.threads.map(t => `${t.count} ${t.type}`).join(', ')
  return [threads || (workingTree(props.config, s) ? 'No Threads' : 'Empty'), ...s.tags].filter(Boolean).join(' · ')
}

// ---- the list: nested folders ----

const folders = computed(() => allFolders(props.config.strategies, props.config.folders))

type Row =
  | { kind: 'folder', key: string, depth: number, node: FolderNode, open: boolean }
  | { kind: 'strategy', key: string, depth: number, s: AtlasStrategy }
  | { kind: 'new-folder', key: string, depth: number }

const rows = computed<Row[]>(() => {
  const q = filter.value.trim()
  const list = props.config.strategies.filter(s => strategyMatches(s, q))
  const v = (name: string) => earnings.value.get(name)?.perHour ?? -Infinity
  const by = sortBy.value
  const ordered = by === 'earnings'
    ? [...list].sort((a, b) => v(b.name) - v(a.name))
    : by === 'name'
      ? [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      : by === 'changed' ? [...list].sort((a, b) => (b.changedAt ?? 0) - (a.changedAt ?? 0)) : list
  const tree = folderTree(ordered, q ? [] : props.config.folders, by === 'name' ? [] : props.config.folderOrder ?? [])
  const closed = new Set(props.config.closedFolders ?? [])
  const out: Row[] = []
  function walk (node: FolderNode) {
    for (const child of node.children) {
      if (q && !child.total) continue
      const open = Boolean(q) || !closed.has(child.path)
      out.push({ kind: 'folder', key: 'f:' + child.path, depth: child.depth, node: child, open })
      if (open) walkAll(child)
    }
  }
  // A folder's strategies come before the folders inside it, so loose ones
  // never look like the last folder's.
  function walkAll (node: FolderNode) {
    for (const s of node.strategies) out.push({ kind: 'strategy', key: 's:' + s.id, depth: node.depth + 1, s })
    walk(node)
  }
  walkAll(tree)
  if (editing.value?.target === 'folder' && editing.value.key.startsWith('n:')) {
    // A folder being made: where it will sit.
    const parent = editing.value.key.slice(2)
    const at = parent ? out.findIndex(r => r.kind === 'folder' && r.node.path === parent) : -1
    const depth = parent ? parent.split('/').length : 0
    out.splice(at + 1, 0, { kind: 'new-folder', key: editing.value.key, depth })
  }
  return out
})

function indent (depth: number): string {
  return `calc(var(--w-pad) + ${Math.max(0, depth) * 12}px)`
}

// A faint line down the side of a folder's contents.
function rowStyle (depth: number) {
  return depth > 0
    ? { 'padding-left': indent(depth), '--guide': `calc(var(--w-pad) + ${(depth - 1) * 12 + 4}px)` }
    : { paddingLeft: indent(depth) }
}

// ---- several at once (Ctrl and Shift click) ----

const picked = shallowRef<number[]>([])
function isPicked (id: number) { return picked.value.length > 1 && picked.value.includes(id) }
// What a row's menu, drag or Delete acts on: the picked group if it's in it.
function groupOf (s: AtlasStrategy): AtlasStrategy[] {
  if (!isPicked(s.id)) return [s]
  const ids = new Set(picked.value)
  return props.config.strategies.filter(o => ids.has(o.id))
}

function rowClick (e: MouseEvent, s: AtlasStrategy) {
  if (e.ctrlKey || e.metaKey) {
    const now = picked.value.length ? picked.value : (props.config.selectedId != null ? [props.config.selectedId] : [])
    picked.value = now.includes(s.id) ? now.filter(id => id !== s.id) : [...now, s.id]
    if (picked.value.includes(s.id)) props.config.selectedId = s.id
    return
  }
  if (e.shiftKey && props.config.selectedId != null) {
    const shown = rows.value.flatMap(r => r.kind === 'strategy' ? [r.s.id] : [])
    const a = shown.indexOf(props.config.selectedId)
    const b = shown.indexOf(s.id)
    if (a >= 0 && b >= 0) {
      picked.value = shown.slice(Math.min(a, b), Math.max(a, b) + 1)
      return
    }
  }
  picked.value = []
  props.config.selectedId = s.id
}

// Strategies that leave a folder take their regexes along.
function refile (list: AtlasStrategy[], folder: string) {
  for (const s of list) {
    if (cleanFolder(s.folder) === folder) continue
    s.folder = folder
    refileRegexes(s, props.config.strategies)
  }
}

// Dragging and Alt + arrows work on the order you set: other sorts switch back to it.
function toManual () {
  if (sortBy.value === 'manual') return
  props.config.sortBy = 'manual'
  toast('Sorted by My order', { anchor: panel.value?.el })
}

function moveTo (ids: number[], at: DropAt): boolean {
  const res = moveStrategies(props.config.strategies, ids, at)
  if (!res) return false
  const want = new Set(ids)
  props.config.strategies = res.list
  refile(res.list.filter(s => want.has(s.id)), res.folder)
  openFolder(res.folder)
  return true
}

// The folder order as shown now, with every folder in it.
function fullFolderOrder (): string[] {
  return folderOrderOf(props.config.strategies, props.config.folders ?? [], props.config.folderOrder ?? [])
}

function moveFolderTo (from: string, at: DropAt) {
  const res = folderDrop(from, at, props.config.strategies, folders.value)
  if (typeof res === 'string') {
    if (res !== 'gone') toast(res, { anchor: panel.value?.el })
    return
  }
  // A moved folder is kept, so moving its last strategy out later doesn't remove it.
  if (!(props.config.folders ?? []).includes(from)) props.config.folders = [...(props.config.folders ?? []), from]
  if (res.to !== from) moveFolder(from, res.to)
  props.config.folderOrder = placeFolder(fullFolderOrder(), res.to, res.before)
}

// ---- drag and drop ----

type Drag = { kind: 'strategies', ids: number[] } | { kind: 'folder', path: string }
const drag = shallowRef<Drag | null>(null)
const dropAt = shallowRef<DropAt | null>(null)
let openTimer: ReturnType<typeof setTimeout> | null = null
let openFor = ''

function dragStart (e: DragEvent, row: Row) {
  if (editing.value) { e.preventDefault(); return }
  if (row.kind === 'strategy') {
    const group = groupOf(row.s)
    drag.value = { kind: 'strategies', ids: group.map(s => s.id) }
    e.dataTransfer?.setData('text/plain', group.map(s => s.name).join(', '))
  } else if (row.kind === 'folder') {
    drag.value = { kind: 'folder', path: row.node.path }
    e.dataTransfer?.setData('text/plain', row.node.path)
  }
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function stopOpenTimer () {
  if (openTimer) clearTimeout(openTimer)
  openTimer = null
  openFor = ''
}

function dragEnd () {
  drag.value = null
  dropAt.value = null
  stopOpenTimer()
}

// What the pointer is over, and where in it.
function dropFor (e: DragEvent): DropAt | null {
  const d = drag.value
  if (!d) return null
  const el = (e.target as Element | null)?.closest<HTMLElement>('[data-row]')
  const key = el?.dataset.row ?? 'top'
  if (key === 'top' || !el) return { kind: 'top' }
  const r = el.getBoundingClientRect()
  const y = (e.clientY - r.top) / Math.max(1, r.height)
  if (key.startsWith('f:')) {
    const path = key.slice(2)
    if (d.kind === 'folder' && isUnder(path, d.path)) return null
    return { kind: 'folder', path, where: y < 0.3 ? 'before' : 'into' }
  }
  const id = Number(key.slice(2))
  if (d.kind === 'folder') {
    const s = props.config.strategies.find(o => o.id === id)
    if (!s || isUnder(cleanFolder(s.folder), d.path)) return null
  }
  return { kind: 'strategy', id, where: y < 0.5 ? 'before' : 'after' }
}

function dragOver (e: DragEvent) {
  const at = dropFor(e)
  if (!at) { dropAt.value = null; stopOpenTimer(); return }
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  if (JSON.stringify(at) !== JSON.stringify(dropAt.value)) dropAt.value = at
  // Held over a folded folder: it opens.
  const folded = at.kind === 'folder' && at.where === 'into' && (props.config.closedFolders ?? []).includes(at.path) ? at.path : ''
  if (folded !== openFor) {
    stopOpenTimer()
    if (folded) {
      openFor = folded
      openTimer = setTimeout(() => { openFolder(folded); openTimer = null }, 500)
    }
  }
}

function dragLeave (e: DragEvent) {
  const to = e.relatedTarget as Node | null
  if (to && (e.currentTarget as Element).contains(to)) return
  dropAt.value = null
  stopOpenTimer()
}

function dropHere (e: DragEvent) {
  const d = drag.value
  const at = dropFor(e)
  dragEnd()
  if (!d || !at) return
  e.preventDefault()
  if (d.kind === 'strategies') {
    toManual()
    moveTo(d.ids, at)
  } else {
    moveFolderTo(d.path, at)
  }
}

function dropClass (key: string) {
  const at = dropAt.value
  if (!at || at.kind === 'top') return undefined
  if (at.kind === 'folder' && key === 'f:' + at.path) return at.where === 'into' ? styles.dropInto : styles.dropBefore
  if (at.kind === 'strategy' && key === 's:' + at.id) return at.where === 'before' ? styles.dropBefore : styles.dropAfter
  return undefined
}

// ---- Alt + arrows ----

function focusRow (key: string) {
  nextTick(() => {
    const el = panel.value?.el?.querySelector<HTMLElement>(`[data-row="${CSS.escape(key)}"]`)
    ;(el?.matches('button') ? el : el?.querySelector<HTMLElement>('button'))?.focus()
  })
}

function rowKeys (e: KeyboardEvent, s: AtlasStrategy) {
  if (!e.altKey || !['ArrowUp', 'ArrowDown', 'ArrowLeft'].includes(e.key)) return
  // Not the panel's arrow keys, which would move the focus off it.
  e.preventDefault()
  e.stopPropagation()
  toManual()
  const list = rows.value.filter(r => r.kind !== 'new-folder')
  const i = list.findIndex(r => r.kind === 'strategy' && r.s.id === s.id)
  if (i < 0) return
  const folder = cleanFolder(s.folder)
  let at: DropAt | null = null
  if (e.key === 'ArrowLeft') {
    if (folder) at = { kind: 'folder', path: folder, where: 'before' }
  } else if (e.key === 'ArrowUp') {
    const prev = list[i - 1]
    if (prev?.kind === 'strategy') at = { kind: 'strategy', id: prev.s.id, where: 'before' }
    else if (prev?.kind === 'folder' && prev.node.path === folder) at = { kind: 'folder', path: folder, where: 'before' }
  } else {
    const next = list[i + 1]
    if (next?.kind === 'strategy' && cleanFolder(next.s.folder) === folder) at = { kind: 'strategy', id: next.s.id, where: 'after' }
    else if (next?.kind === 'folder' && parentOf(next.node.path) === folder) at = { kind: 'folder', path: next.node.path, where: 'start' }
  }
  if (at && moveTo([s.id], at)) focusRow('s:' + s.id)
}

function folderKeys (e: KeyboardEvent, path: string) {
  if (!e.altKey || !['ArrowUp', 'ArrowDown'].includes(e.key)) return
  e.preventDefault()
  e.stopPropagation()
  if (sortBy.value === 'name') toManual()
  const next = nudgeFolder(fullFolderOrder(), path, e.key === 'ArrowUp' ? -1 : 1)
  if (!next) return
  props.config.folderOrder = next
  focusRow('f:' + path)
}

function toggleFolder (path: string) {
  const closed = props.config.closedFolders ?? []
  props.config.closedFolders = closed.includes(path) ? closed.filter(p => p !== path) : [...closed, path]
}

// New things go in the selected strategy's folder.
const newIn = computed(() => selected.value?.folder ?? '')

function openFolder (path: string) {
  const parts = cleanFolder(path).split('/').filter(Boolean)
  const opens = parts.map((_, i) => parts.slice(0, i + 1).join('/'))
  props.config.closedFolders = (props.config.closedFolders ?? []).filter(p => !opens.includes(p))
}

function addStrategy (folder: string) {
  const s = { ...emptyStrategy(props.config.strategies), name: 'New strategy', folder }
  claimNewRegexFolder(s, props.config.strategies)
  props.config.strategies.push(s)
  props.config.selectedId = s.id
  props.config.treeHidden = false
  openFolder(folder)
  startEdit('strategy', String(s.id), 'rename')
}

// ---- rename, move, new folder: one inline field ----

// `ids`: Move to folder for a picked group.
const editing = shallowRef<{ target: 'strategy' | 'folder', key: string, kind: 'rename' | 'move', id: string, ids?: number[] } | null>(null)
const draft = shallowRef('')

function startEdit (target: 'strategy' | 'folder', id: string, kind: 'rename' | 'move', ids?: number[]) {
  if (target === 'strategy') {
    const s = props.config.strategies.find(x => String(x.id) === id)
    if (!s) return
    draft.value = kind === 'rename' ? s.name : s.folder
    editing.value = { target, key: 's:' + id, kind, id, ids }
  } else {
    draft.value = kind === 'rename' ? id.split('/').at(-1) ?? '' : id.split('/').slice(0, -1).join('/')
    editing.value = { target, key: 'f:' + id, kind, id }
  }
  focusDraft()
}

function startFolder (parent: string) {
  draft.value = ''
  editing.value = { target: 'folder', key: 'n:' + parent, kind: 'rename', id: '' }
  openFolder(parent)
  focusDraft()
}

function focusDraft () {
  nextTick(() => {
    const el = panel.value?.el?.querySelector<HTMLInputElement>('[data-draft]')
    el?.focus()
    el?.select()
  })
}

function finishEdit () {
  const e = editing.value
  if (!e) return
  editing.value = null
  const value = draft.value.trim()
  if (e.target === 'strategy') {
    if (e.kind === 'move' && e.ids) {
      const want = new Set(e.ids)
      refile(props.config.strategies.filter(s => want.has(s.id)), cleanFolder(value))
      openFolder(cleanFolder(value))
      return
    }
    const s = props.config.strategies.find(x => String(x.id) === e.id)
    if (!s) return
    if (e.kind === 'rename') { if (value) s.name = value } else { s.folder = cleanFolder(value); openFolder(s.folder) }
    refileRegexes(s, props.config.strategies)
    return
  }
  if (e.key.startsWith('n:')) {
    if (!value) return
    const path = cleanFolder(joinFolder(e.key.slice(2), value))
    props.config.folders = [...new Set([...(props.config.folders ?? []), path])]
    openFolder(path)
    return
  }
  const from = e.id
  const to = e.kind === 'rename'
    ? (value ? cleanFolder(joinFolder(from.split('/').slice(0, -1).join('/'), value.replace(/[/\\]+/g, '-'))) : from)
    : cleanFolder(joinFolder(value, from.split('/').at(-1) ?? ''))
  moveFolder(from, to)
}

function moveFolder (from: string, to: string) {
  if (!to || from === to || to.startsWith(from + '/')) return
  // Each strategy that moves takes its own regexes along.
  for (const s of props.config.strategies) {
    const next = movedFolder(s.folder, from, to)
    if (next === cleanFolder(s.folder)) continue
    s.folder = next
    refileRegexes(s, props.config.strategies)
  }
  props.config.folders = (props.config.folders ?? []).map(f => movedFolder(f, from, to))
  props.config.closedFolders = (props.config.closedFolders ?? []).map(f => movedFolder(f, from, to))
  if (props.config.folderOrder) props.config.folderOrder = props.config.folderOrder.map(f => movedFolder(f, from, to))
  openFolder(to)
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

function removeKey (s: AtlasStrategy) { removeMany(groupOf(s)) }

function removeMany (list: AtlasStrategy[]) {
  if (!list.length) return
  const ids = new Set(list.map(s => s.id))
  const at = new Map(list.map(s => [s.id, props.config.strategies.findIndex(o => o.id === s.id)]))
  const selectedBefore = props.config.selectedId
  props.config.strategies = props.config.strategies.filter(o => !ids.has(o.id))
  if (selectedBefore != null && ids.has(selectedBefore)) props.config.selectedId = null
  picked.value = picked.value.filter(id => !ids.has(id))
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

async function codeFor (list: AtlasStrategy[], base = ''): Promise<string> {
  const { strategyCode } = await import('./strategy-code')
  return strategyCode(list.map(s => ({ ...s, regexes: regexesIn(regexFolderOf(s)).map(r => ({ name: r.name, text: r.text })) })), base)
}

function rowMenu (e: MouseEvent, s: AtlasStrategy) {
  const group = groupOf(s)
  if (group.length > 1) {
    openMenu(e, [
      { label: `Move ${group.length} to folder`, icon: 'fas fa-folder-open', action: () => startEdit('strategy', String(s.id), 'move', group.map(g => g.id)) },
      { label: 'Copy strategy code', icon: 'fas fa-share-square', action: () => { codeFor(group).then(copy).then(() => toast('Strategy code copied', { anchor: panel.value?.el })).catch(() => {}) } },
      { separator: true },
      { label: `Remove ${group.length} strategies`, icon: 'fas fa-trash', keys: 'Del', danger: true, action: () => removeMany(group) }
    ])
    return
  }
  openMenu(e, [
    { label: 'Rename', icon: 'fas fa-i-cursor', keys: 'F2', action: () => startEdit('strategy', String(s.id), 'rename') },
    { label: 'Move to folder', icon: 'fas fa-folder-open', action: () => startEdit('strategy', String(s.id), 'move') },
    { label: 'Duplicate', icon: 'far fa-clone', action: () => duplicate(s) },
    { label: 'Copy strategy code', icon: 'fas fa-share-square', action: () => { codeFor([s]).then(copy).then(() => toast('Strategy code copied', { anchor: panel.value?.el })).catch(() => {}) } },
    { separator: true },
    { label: 'Remove', icon: 'fas fa-trash', keys: 'Del', danger: true, action: () => remove(s) }
  ])
}

function inFolder (path: string): AtlasStrategy[] {
  return props.config.strategies.filter(s => { const f = cleanFolder(s.folder); return f === path || f.startsWith(path + '/') })
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
    { label: 'Fold all folders', icon: 'fas fa-compress-alt', action: () => { props.config.closedFolders = [...folders.value] } },
    { label: 'Open all folders', icon: 'fas fa-expand-alt', action: () => { props.config.closedFolders = [] } },
    { separator: true },
    { label: 'Remove folder', icon: 'fas fa-trash', danger: true, action: () => removeFolder(path) }
  ])
}

// Once: its strategies and the folders right inside it, by name.
function sortFolder (path: string) {
  toManual()
  const res = sortFolderByName(props.config.strategies, fullFolderOrder(), path)
  props.config.strategies = res.list
  props.config.folderOrder = res.order
}

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

async function doImport () {
  importError.value = ''
  const text = importText.value.trim()
  if (!text) return
  const into = cleanFolder(importInto.value)
  const added: AtlasStrategy[] = []
  try {
    if (isStrategyCode(text)) {
      const { readStrategyCode } = await import('./strategy-code')
      for (const shared of readStrategyCode(text)) {
        const { regexes, ...rest } = shared
        const s: AtlasStrategy = { ...emptyStrategy(props.config.strategies), ...rest, folder: joinFolder(into, rest.folder) }
        fileImported(s, regexes)
        props.config.strategies.push(s)
        added.push(s)
      }
    } else {
      const lone = !/\s/.test(text) && extractTreeCode(text)
      const parsed = lone ? { name: 'Imported tree', treeUrl: text } : parseGuideText(text)
      const s: AtlasStrategy = { ...emptyStrategy(props.config.strategies), ...parsed, folder: into }
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
.folder {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding-top: 5px;
  padding-bottom: 3px;
  padding-right: var(--w-pad);
  font-size: var(--w-fs-caps);
  text-transform: var(--w-caps-case);
  letter-spacing: 0.08em;
  font-family: var(--w-caps-face);
  color: var(--w-dim);
  text-align: left;
}
.folder:hover { color: var(--w-fg); }
.editRow {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 3px;
  padding-bottom: 3px;
  padding-right: var(--w-pad);
}
.edit { flex: 1; min-width: 0; }
.dirty { flex: none; width: 6px; height: 6px; border-radius: 50%; background: var(--w-accent); }
.rows { display: flex; flex-direction: column; }
.row { position: relative; }
.nested::before {
  content: "";
  position: absolute;
  left: var(--guide);
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--w-line);
  pointer-events: none;
}
.dropBefore::after, .dropAfter::after, .dropTop::after {
  content: "";
  position: absolute;
  left: 4px;
  right: 4px;
  height: 2px;
  border-radius: 1px;
  background: var(--w-accent);
  pointer-events: none;
  z-index: 1;
}
.dropBefore::after { top: -1px; }
.dropAfter::after { bottom: -1px; }
.dropTop::after { top: 0; }
.dropInto { background: var(--w-accent-soft); outline: 1px dashed var(--w-accent); outline-offset: -1px; color: var(--w-fg); }
.picked { background: var(--w-accent-soft); box-shadow: inset 2px 0 0 var(--w-accent); }
/* Room under the last row to drop on the top level while dragging. */
.tail { position: relative; height: 24px; }
</style>
