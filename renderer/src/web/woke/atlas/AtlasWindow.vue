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
          <button class="w-icon-btn" :class="{ 'w-icon-btn--on': sortByProfit }" title="Best earning first (from Farming history)"
            @click="sortByProfit = !sortByProfit"><i class="fas fa-sort-amount-down" /></button>
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

        <template v-for="row in rows" :key="row.key">
          <div v-if="editing && editing.key === row.key" :class="$style.editRow" :style="{ paddingLeft: indent(row.depth) }">
            <span class="w-faint text-xs whitespace-nowrap">{{ editing.kind === 'move' ? 'Folder' : 'Name' }}</span>
            <input data-draft v-model="draft" :class="['w-field', $style.edit]" spellcheck="false" :list="editing.kind === 'move' ? 'atlas-folders' : undefined"
              :placeholder="editing.kind === 'move' ? 'Empty: the top' : ''"
              @keydown.enter.prevent="finishEdit" @keydown.esc.prevent="editing = null" @blur="finishEdit">
          </div>
          <button v-else-if="row.kind === 'folder'" type="button" :class="$style.folder" class="w-focusable" :style="{ paddingLeft: indent(row.depth) }"
            :aria-expanded="row.open" @click="toggleFolder(row.node.path)" @contextmenu="folderMenu($event, row.node.path)"
            @keydown.f2.prevent="startEdit('folder', row.node.path, 'rename')">
            <i class="fas text-xs" :class="row.open ? 'fa-chevron-down' : 'fa-chevron-right'" />
            <span class="w-trunc">{{ row.node.name }}</span>
            <span class="ml-auto w-num">{{ row.node.total }}</span>
          </button>
          <div v-else-if="row.kind === 'new-folder'" />
          <WListItem v-else :active="config.selectedId === row.s.id" :style="{ paddingLeft: indent(row.depth) }" @select="config.selectedId = row.s.id"
            @contextmenu="rowMenu($event, row.s)" @keydown.delete.prevent="remove(row.s)" @keydown.f2.prevent="startEdit('strategy', String(row.s.id), 'rename')">
            <span v-if="isDirty(config, row.s)" :class="$style.dirty" title="Tree changes not saved" />
            <span class="w-trunc">{{ row.s.name || 'Untitled' }}</span>
            <span v-if="earnings.get(row.s.name)" class="ml-auto w-num text-xs" :class="earnings.get(row.s.name)!.perHour >= 0 ? 'w-up' : 'w-down'"
              :title="`${earnings.get(row.s.name)!.hours.toFixed(1)} h farmed`">{{ fmt(earnings.get(row.s.name)!.perHour) }}/h</span>
            <template #sub>{{ describe(row.s) }}</template>
          </WListItem>
        </template>
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
import { computed, defineAsyncComponent, nextTick, shallowRef, watch } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { WPanel, WField, WButton, WEmpty, WListItem, WBanner, WSkeleton, openMenu, toast, useCopy } from '../ui'
import type { AtlasStrategy, AtlasWidget } from './widget'
import { AppConfig } from '@/web/Config'
import {
  allFolders, claimRegexFolders, restorePointsAt, setPointsAt, takePointsAt, dropDraft, isDirty, restoreDrafts, saveDraft, setDraft, takeDrafts, workingTree, cleanFolder, emptyStrategy, regexFolderOf, folderTree, isStrategyCode, movedFolder,
  strategyMatches, useAtlasData, retryAtlasData, atlasDataState
} from './widget'
import type { FolderNode } from './widget'
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
const sortByProfit = shallowRef(false)
const prices = usePriceIndex()
function fmt (chaos: number) { return formatChaos(chaos, prices.snapshot.value?.divine ?? null) }

const earnings = computed(() => {
  const history = AppConfig().widgets
    .filter(w => w.wmType === FARMING_TYPE)
    .flatMap(w => (w as FarmingWidget).history ?? [])
  return new Map(strategyStats(history).map(r => [r.strategy, r]))
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
  const ordered = sortByProfit.value ? [...list].sort((a, b) => v(b.name) - v(a.name)) : list
  const tree = folderTree(ordered, q ? [] : props.config.folders)
  const closed = new Set(props.config.closedFolders ?? [])
  const out: Row[] = []
  const walk = (node: FolderNode) => {
    for (const child of node.children) {
      if (q && !child.total) continue
      const open = Boolean(q) || !closed.has(child.path)
      out.push({ kind: 'folder', key: 'f:' + child.path, depth: child.depth, node: child, open })
      if (open) walk(child)
    }
    for (const s of node.strategies) out.push({ kind: 'strategy', key: 's:' + s.id, depth: node.depth + 1, s })
  }
  walk(tree)
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

const editing = shallowRef<{ target: 'strategy' | 'folder', key: string, kind: 'rename' | 'move', id: string } | null>(null)
const draft = shallowRef('')

function startEdit (target: 'strategy' | 'folder', id: string, kind: 'rename' | 'move') {
  if (target === 'strategy') {
    const s = props.config.strategies.find(x => String(x.id) === id)
    if (!s) return
    draft.value = kind === 'rename' ? s.name : s.folder
    editing.value = { target, key: 's:' + id, kind, id }
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
  openFolder(to)
}

// ---- menus ----

// No "are you sure": remove now, offer Undo. Its regexes stay in the library.
function remove (s: AtlasStrategy) {
  const at = props.config.strategies.findIndex(o => o.id === s.id)
  const wasSelected = props.config.selectedId === s.id
  props.config.strategies = props.config.strategies.filter(o => o.id !== s.id)
  if (wasSelected) props.config.selectedId = null
  const drafts = takeDrafts(props.config, [s.id])
  const sliders = takePointsAt(props.config, [s.id])
  // Undo puts back this strategy only, so anything made since stays.
  toast(`Removed "${s.name || 'Untitled'}"`, {
    anchor: panel.value?.el,
    undo: () => {
      if (props.config.strategies.some(o => o.id === s.id)) return
      const list = [...props.config.strategies]
      list.splice(Math.min(at, list.length), 0, s)
      props.config.strategies = list
      restoreDrafts(props.config, drafts)
      restorePointsAt(props.config, sliders)
      if (wasSelected) props.config.selectedId = s.id
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
    { label: 'Remove folder', icon: 'fas fa-trash', danger: true, action: () => removeFolder(path) }
  ])
}

// Takes the folder and every strategy in it; Undo puts all of it back.
function removeFolder (path: string) {
  const removed = inFolder(path)
  const gone = new Set(removed.map(s => s.id))
  const goneFolders = (props.config.folders ?? []).filter(f => f === path || f.startsWith(path + '/'))
  const selectedBefore = props.config.selectedId
  props.config.strategies = props.config.strategies.filter(s => !gone.has(s.id))
  props.config.folders = (props.config.folders ?? []).filter(f => !goneFolders.includes(f))
  if (selectedBefore != null && gone.has(selectedBefore)) props.config.selectedId = null
  const drafts = takeDrafts(props.config, gone)
  const sliders = takePointsAt(props.config, gone)
  toast(gone.size ? `Removed "${path}" and ${gone.size} ${gone.size === 1 ? 'strategy' : 'strategies'}` : `Removed "${path}"`, {
    anchor: panel.value?.el,
    undo: () => {
      const have = new Set(props.config.strategies.map(s => s.id))
      const back = removed.filter(s => !have.has(s.id))
      props.config.strategies = [...props.config.strategies, ...back]
      restoreDrafts(props.config, Object.fromEntries(Object.entries(drafts).filter(([id]) => back.some(s => String(s.id) === id))))
      restorePointsAt(props.config, Object.fromEntries(Object.entries(sliders).filter(([id]) => back.some(s => String(s.id) === id))))
      props.config.folders = [...new Set([...(props.config.folders ?? []), ...goneFolders])]
      if (selectedBefore != null && gone.has(selectedBefore)) props.config.selectedId = selectedBefore
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
</style>
