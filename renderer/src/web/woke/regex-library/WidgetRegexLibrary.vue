<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- Town and hideout: your hotkeyed strings at a glance. -->
    <DockItem :menu="dockMenu" id="regex-library" title="Regex library" :show="dockShow" :wm-id="config.wmId" card-width="20rem">
      <template #card>
        <div style="padding: 4px 0 6px;">
          <button v-for="e in glance" :key="e.id" type="button" class="w-row w-full text-left" style="grid-template-columns: minmax(0, 1fr) auto;"
            :title="effectiveText(e)" @click="stashSearch(effectiveText(e))">
            <span class="w-trunc">{{ e.name || effectiveText(e) }}</span>
            <WKbd v-if="e.hotkey && config.enableHotkeys" :keys="e.hotkey" />
          </button>
          <div class="w-faint text-xs" style="padding: 2px var(--w-pad);">Click to search your stash</div>
        </div>
      </template>
    </DockItem>
    <!-- One click listener for the panel's own buttons (data-act). -->
    <WPanel ref="panel" :title="config.wmTitle || 'Regex library'" icon="stash" width="22rem" max-height="70vh" @click="onAction">
      <template #toolbar>
        <WField v-model="filter" icon="fas fa-search" placeholder="Filter by name, tag, category…" class="grow" />
        <WButton size="sm" icon="fas fa-plus" title="Add a search string" data-qa="regex-new" data-act="new">New</WButton>
      </template>

      <RegexEntryForm v-if="editing === 'new'" :key="'new'" :entry="newDraft" @save="saveEntry" @cancel="editing = null" />

      <!-- The list (shared/SavedTree): folders that fold, drag, Ctrl / Shift
           picks, Alt + arrows, F2 rename. A click searches the stash. -->
      <SavedTree :tree="tree" list-id="regex-folders" :active-id="selectedId" :editor-for="typeof editing === 'number' ? editing : null"
        :copy="copyMany" :title-of="tooltip" :sub-for="e => !!e.name" @item-menu="rowMenu" @folder-menu="folderMenu">
        <template #editor="{ item: entry }">
          <RegexEntryForm :entry="entry" @save="saveEntry" @cancel="editing = null" />
        </template>
        <template #item="{ item: entry }">
          <span class="w-trunc">{{ entry.name || effectiveText(entry) }}</span>
          <WChip v-if="entry.negate && canNegate(entry.text)" title="Highlights items WITHOUT this">not</WChip>
          <WChip v-for="tag in entry.tags.slice(0, 2)" :key="tag">{{ tag }}</WChip>
          <span v-if="entry.patch && entry.patch !== GAME_PATCH" class="text-xs shrink-0" style="color: var(--w-warn);" :title="`Saved in ${entry.patch}: mods may be worded differently in ${GAME_PATCH}`">{{ entry.patch }}</span>
          <span v-if="effectiveText(entry).length > MAX_SEARCH_LENGTH" class="w-down text-xs shrink-0" title="Too long: the game cuts the search off at 250 characters">{{ effectiveText(entry).length }}/{{ MAX_SEARCH_LENGTH }}</span>
          <WKbd v-if="entry.hotkey && config.enableHotkeys" :keys="entry.hotkey" class="ml-auto" />
        </template>
        <template #sub="{ item: entry }"><span class="w-mono">{{ effectiveText(entry) }}</span></template>
        <template #actions="{ item: entry }">
          <button :class="$style.hoverOnly" class="w-icon-btn" title="Edit" data-qa="regex-edit" @click.stop="edit(entry)">
            <i class="fas fa-pen" />
          </button>
          <button :class="$style.hoverOnly" class="w-icon-btn" title="Remove (Undo for a moment after)" data-qa="regex-remove" @click.stop="remove(entry)">
            <i class="far fa-trash-alt" />
          </button>
          <button @click.stop="copy(entry)" class="w-icon-btn" :class="{ 'w-up': copied === String(entry.id) }" title="Copy to clipboard">
            <i :class="copied === String(entry.id) ? 'fas fa-check' : 'far fa-copy'" />
          </button>
        </template>
      </SavedTree>
      <WEmpty v-if="!tree.rows.value.length && config.entries.length && searching" icon="fas fa-filter">
        Nothing matches "{{ filter }}".
        <template #actions><WButton size="sm" @click="filter = ''">Clear search</WButton></template>
      </WEmpty>
      <WEmpty v-else-if="!config.entries.length && !(config.folders ?? []).length && editing !== 'new'" :art="{ mechanic: 'stash' }">
        No saved searches yet. Add one, or build one on poe.re and save it from there.
        <template #actions>
          <WButton size="sm" icon="fas fa-plus" data-act="new">New</WButton>
          <WButton size="sm" data-act="poe-re">Open poe.re</WButton>
        </template>
      </WEmpty>

      <template #footer>
        <button type="button" class="ml-auto w-accent hover:underline" data-qa="regex-poe-re" title="Opens poe.re inside the app; save what you build straight to this list"
          data-act="poe-re">Generate on poe.re</button>
      </template>
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { widgetRegexLibrarySpec } from '../widget-specs'
import { starterEntries } from './widget'
import type { RegexLibraryWidget } from './widget'

export default { widget: widgetRegexLibrarySpec }
</script>

<script setup lang="ts">
import { inject, computed, watch, shallowRef, defineAsyncComponent } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { pushHostConfig, saveConfig } from '@/web/Config'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel, WField, WChip, WKbd, WEmpty, WButton, openMenu, toast } from '../ui'
import { removeEntries } from '../shared/saved-list'
import { useSavedTree } from '../shared/use-saved-tree'
import { onSavedOpen } from '../shared/saved-open'
import { isUnder, itemKey } from '../shared/saved-tree'
import SavedTree from '../shared/SavedTree.vue'
import { ATLAS_FOLDER, POB_FOLDER } from './folder-names'
import { openPoeReWindow } from './poe-re'
import { useCopy } from '../ui/copy'
import { GAME_PATCH, MAX_SEARCH_LENGTH, REGEX_LIBRARY_TYPE, canNegate, effectiveText, emptyEntry, matchesFilter } from './widget'
import type { RegexEntry } from './widget'
import DockItem from '../dock/DockItem.vue'
import { saveDock } from '../dock/dock'
import type { DockMenuAction } from '../dock/dock'
import { useZone } from '../shared/zone'

const props = defineProps<{
  config: RegexLibraryWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Regex library'
  props.config.anchor = popupAnchor()
  props.config.enableHotkeys = true
  props.config.entries = starterEntries()
  wm.show(props.config.wmId)
}

// The edit form's code loads the first time a form opens.
const RegexEntryForm = defineAsyncComponent(() => import('./RegexEntryForm.vue'))

const filter = shallowRef('')
// The entry open in the form: an id, 'new' for one being added, or none.
const editing = shallowRef<number | 'new' | null>(null)
const newDraft = shallowRef<RegexEntry>(emptyEntry([]))
const { copied, copy: copyText } = useCopy(1200)

const searching = computed(() => filter.value.trim().length > 0)
// The open (last clicked) string: new ones go in its folder.
const selectedId = shallowRef<number | null>(null)

const zone = useZone()
const dockShow = computed(() => props.config.entries.length > 0 && (zone.kind === 'town' || zone.kind === 'hideout'))
// Strings with a hotkey first, then the rest, six at most.
const glance = computed(() => [...props.config.entries]
  .sort((a, b) => Number(b.hotkey != null) - Number(a.hotkey != null))
  .slice(0, 6))

const hasHotkeys = computed(() => props.config.entries.some(e => e.hotkey != null))

watch(() => props.config.enableHotkeys, () => { pushHostConfig() })

function stashSearch (text: string) {
  MainProcess.sendEvent({
    name: 'CLIENT->MAIN::user-action',
    payload: { action: 'stash-search', text }
  })
}

async function copy (entry: RegexEntry) {
  await copyText(effectiveText(entry), String(entry.id))
}

const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)

// Atlas strategies and PoB builds file their regexes in folders of their own.
const isLocked = (path: string) => [ATLAS_FOLDER, POB_FOLDER].some(root => isUnder(path, root))

// The list's folders (categories with "/" nest), picking, drag and drop,
// Alt + arrows and inline names: shared/use-saved-tree, as Atlas strategies.
const tree = useSavedTree<RegexEntry>({
  root: () => panel.value?.el,
  items: () => props.config.entries,
  setItems: (list) => { props.config.entries = list; pushHostConfig() },
  folderOf: e => e.category,
  setFolder: (e, folder) => { e.category = folder },
  nameOf: e => e.name || effectiveText(e),
  setName: (e, name) => { e.name = name },
  extraFolders: () => props.config.folders ?? [],
  setExtraFolders: (list) => { props.config.folders = list },
  folderOrder: () => props.config.folderOrder,
  setFolderOrder: (order) => { props.config.folderOrder = order },
  closed: () => props.config.closedFolders ?? [],
  setClosed: (list) => { props.config.closedFolders = list },
  query: () => filter.value,
  // The entry open in the form stays listed while you filter, so its edits aren't lost.
  matches: (e, q) => e.id === editing.value || matchesFilter(e, q),
  selected: () => selectedId.value,
  select: (id) => { selectedId.value = id },
  open: (e) => { stashSearch(effectiveText(e)) },
  remove: (list) => { removeMany(list) },
  note: (text) => { toast(text, { anchor: panel.value?.el }) },
  folderLocked: path => isLocked(path)
    ? 'Atlas strategies and PoB builds keep their regexes in this folder: rename or move them there'
    : null
})

// Picked in the search palette: show it, unfolded and selected.
onSavedOpen(REGEX_LIBRARY_TYPE, (id) => {
  const e = props.config.entries.find(e => String(e.id) === id)
  if (!e) return
  filter.value = ''
  tree.openFolder(e.category)
  selectedId.value = e.id
  wm.show(props.config.wmId)
  tree.focusRow(itemKey(e.id))
})

function copyMany (list: RegexEntry[]) {
  if (list.length === 1) { copy(list[0]).catch(() => {}); return }
  copyText(list.map(effectiveText).join('\n'), 'many').catch(() => {})
}
function startNew (inFolder?: string) {
  // A new entry lands in the category you're filtering by, if that's one.
  const cats = new Set(props.config.entries.map(e => e.category).filter(Boolean))
  const draft = emptyEntry(props.config.entries)
  if (cats.has(filter.value.trim())) draft.category = filter.value.trim()
  else if (inFolder != null) draft.category = inFolder
  else {
    const open = props.config.entries.find(e => e.id === selectedId.value)
    if (open && !searching.value) draft.category = open.category
  }
  newDraft.value = draft
  editing.value = 'new'
}

function edit (entry: RegexEntry) {
  editing.value = entry.id
}

function onAction (e: MouseEvent) {
  const btn = (e.target as Element).closest<HTMLElement>('[data-act]')
  if (!btn) return
  if (btn.dataset.act === 'new') { startNew(); return }
  if (btn.dataset.act === 'poe-re') openPoeRe()
}

function saveEntry (entry: RegexEntry) {
  const list = props.config.entries
  if (editing.value === 'new') {
    // Ids can move on while the form is open (a save from poe.re): take a fresh one.
    props.config.entries = [...list, { ...entry, id: emptyEntry(list).id }]
  } else if (list.some(e => e.id === entry.id)) {
    props.config.entries = list.map(e => e.id === entry.id ? entry : e)
  } else {
    // Removed (in Settings, say) while the form was open: keep the edit as a new entry.
    props.config.entries = [...list, { ...entry, id: emptyEntry(list).id }]
  }
  editing.value = null
  // A new entry must show even if the filter would hide it.
  if (!matchesFilter(entry, filter.value)) filter.value = ''
  saveConfig()
  pushHostConfig()
}

function openPoeRe () {
  openPoeReWindow(wm, props.config.wmId, panel.value?.el)
}

// No "are you sure": remove now, offer Undo (P9), which puts back just this
// entry where it was (shared/saved-list): edits and saves made since stay.
function remove (entry: RegexEntry) { removeMany([entry]) }

function removeMany (list: RegexEntry[]) {
  if (typeof editing.value === 'number' && list.some(e => e.id === editing.value)) editing.value = null
  const out = removeEntries(props.config.entries, list.map(e => e.id))
  if (!out) return
  props.config.entries = out.list
  tree.forgetPicks(list.map(e => e.id))
  pushHostConfig()
  const text = list.length === 1 ? `Removed "${list[0].name || effectiveText(list[0])}"` : `Removed ${list.length} strings`
  toast(text, {
    anchor: panel.value?.el,
    undo: () => {
      props.config.entries = out.restore(props.config.entries, l => emptyEntry([...l]).id)
      pushHostConfig()
    }
  })
}

function rowMenu (e: MouseEvent, entry: RegexEntry) {
  const group = tree.groupOf(entry)
  if (group.length > 1) {
    openMenu(e, [
      { label: `Move ${group.length} to folder`, icon: 'fas fa-folder-open', action: () => tree.startEdit('item', String(entry.id), 'move', group.map(g => g.id)) },
      { label: 'Copy strings', icon: 'far fa-copy', keys: 'Ctrl + C', action: () => copyMany(group) },
      { separator: true },
      { label: `Remove ${group.length} strings`, icon: 'fas fa-trash', keys: 'Del', danger: true, action: () => removeMany(group) }
    ])
    return
  }
  openMenu(e, [
    { label: 'Search stash', icon: 'fas fa-search', keys: 'Enter', action: () => stashSearch(effectiveText(entry)) },
    { label: 'Copy string', icon: 'far fa-copy', keys: 'Ctrl + C', action: () => { copy(entry).catch(() => {}) } },
    { label: 'Edit', icon: 'fas fa-pen', action: () => edit(entry) },
    { label: 'Rename', icon: 'fas fa-i-cursor', keys: 'F2', action: () => tree.startEdit('item', String(entry.id), 'rename') },
    { label: 'Move to folder', icon: 'fas fa-folder-open', action: () => tree.startEdit('item', String(entry.id), 'move') },
    ...(entry.tags.length ? [{ label: `Filter by "${entry.tags[0]}"`, icon: 'fas fa-filter', action: () => { filter.value = entry.tags[0] } }] : []),
    { separator: true },
    { label: 'Remove', icon: 'fas fa-trash', keys: 'Del', danger: true, action: () => remove(entry) }
  ])
}

function folderMenu (e: MouseEvent, path: string) {
  const locked = isLocked(path)
  openMenu(e, [
    { label: 'New string here', icon: 'fas fa-plus', action: () => startNew(path) },
    { label: 'New folder inside', icon: 'fas fa-folder-plus', action: () => tree.startFolder(path) },
    { label: 'Rename', icon: 'fas fa-i-cursor', keys: 'F2', disabled: locked, action: () => tree.startEdit('folder', path, 'rename') },
    { label: 'Move', icon: 'fas fa-folder-open', disabled: locked, action: () => tree.startEdit('folder', path, 'move') },
    { separator: true },
    { label: 'Sort this folder A to Z', icon: 'fas fa-sort-alpha-down', action: () => tree.sortFolder(path) },
    { label: 'Fold all folders', icon: 'fas fa-compress-alt', action: tree.foldAll },
    { label: 'Open all folders', icon: 'fas fa-expand-alt', action: tree.openAll },
    { separator: true },
    { label: 'Remove folder', icon: 'fas fa-trash', danger: true, disabled: locked, action: () => removeFolder(path) }
  ])
}

// Takes the folder and every string in it; Undo puts all of it back.
function removeFolder (path: string) {
  const inIt = tree.inFolder(path)
  const goneFolders = (props.config.folders ?? []).filter(f => isUnder(f, path))
  const out = removeEntries(props.config.entries, inIt.map(e => e.id))
  if (out) props.config.entries = out.list
  props.config.folders = (props.config.folders ?? []).filter(f => !goneFolders.includes(f))
  pushHostConfig()
  toast(inIt.length ? `Removed "${path}" and ${inIt.length} ${inIt.length === 1 ? 'string' : 'strings'}` : `Removed "${path}"`, {
    anchor: panel.value?.el,
    undo: () => {
      if (out) props.config.entries = out.restore(props.config.entries, l => emptyEntry([...l]).id)
      props.config.folders = [...new Set([...(props.config.folders ?? []), ...goneFolders])]
      pushHostConfig()
    }
  })
}

function tooltip (entry: RegexEntry) {
  return [effectiveText(entry), entry.tags.length ? `Tags: ${entry.tags.join(', ')}` : '', entry.notes]
    .filter(Boolean).join('\n')
}

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => [
  // Each types one stash search, from this click.
  ...glance.value.slice(0, 3).map(e => ({
    label: `Search stash: ${e.name || effectiveText(e)}`,
    icon: 'fas fa-search',
    action: () => { stashSearch(effectiveText(e)) }
  })),
  ...(hasHotkeys.value
    ? [{
        label: 'Entry hotkeys',
        icon: 'far fa-keyboard',
        checked: !!props.config.enableHotkeys,
        action: () => { props.config.enableHotkeys = !props.config.enableHotkeys; saveDock() }
      }]
    : [])
])
</script>

<style module>
/* Mock A: pencil and bin show on the row under the mouse (or with focus). */
.hoverOnly { visibility: hidden; }
[data-row]:hover .hoverOnly, [data-row]:focus-within .hoverOnly { visibility: visible; }
</style>
