<template>
  <!-- One listener per kind for every row (perf: a long list adds up). -->
  <div :class="$style.rows" data-rows @dragover="tree.dragOver" @drop="tree.dropHere" @dragleave="tree.dragLeave"
    @dragstart="onRow($event, row => tree.dragStart($event as DragEvent, row))" @dragend="tree.dragEnd" @click="onClick" @dblclick="onDblClick"
    @contextmenu="onMenu" @keydown="onKey">
    <template v-for="row in tree.rows.value" :key="row.key">
      <div v-if="tree.editing.value && tree.editing.value.key === row.key" :class="$style.editRow" :style="rowStyle(row.depth)">
        <span class="w-faint text-xs whitespace-nowrap">{{ tree.editing.value.kind === 'move' ? 'Folder' : 'Name' }}</span>
        <input data-draft v-model="draft" :class="['w-field', $style.edit]" spellcheck="false" :list="tree.editing.value.kind === 'move' ? listId : undefined"
          :placeholder="tree.editing.value.kind === 'move' ? 'Empty: the top' : ''"
          @keydown.enter.prevent="tree.finishEdit" @keydown.esc.prevent="tree.cancelEdit" @blur="tree.finishEdit">
      </div>
      <button v-else-if="row.kind === 'folder'" type="button" :class="[$style.folder, $style.row, mark(row.key), { [$style.nested]: row.depth > 0 }]" class="w-focusable" :style="rowStyle(row.depth)"
        :data-row="row.key" :aria-expanded="row.open" :draggable="true">
        <i class="fas text-xs" :class="row.open ? 'fa-chevron-down' : 'fa-chevron-right'" />
        <span class="w-trunc">{{ row.node.name }}</span>
        <span class="ml-auto w-num">{{ row.node.total }}</span>
      </button>
      <div v-else-if="row.kind === 'new-folder'" />
      <slot v-else-if="editorFor != null && row.item.id === editorFor" name="editor" :item="row.item" />
      <WListItem v-else :active="active(row.item)" :class="[$style.row, mark(row.key), { [$style.picked]: tree.isPicked(row.item.id), [$style.nested]: row.depth > 0 }]" :style="rowStyle(row.depth)"
        :data-row="row.key" :draggable="true" :title="titleOf?.(row.item)">
        <slot name="item" :item="row.item" />
        <template v-if="$slots.sub && (subFor?.(row.item) ?? true)" #sub><slot name="sub" :item="row.item" /></template>
        <template v-if="$slots.actions" #actions><slot name="actions" :item="row.item" /></template>
      </WListItem>
    </template>
    <div v-if="tree.drag.value" :class="[$style.tail, { [$style.dropTop]: tree.dropAt.value?.kind === 'top' }]" data-row="top" />
    <datalist :id="listId"><option v-for="f in tree.folders.value" :key="f" :value="f" /></datalist>
  </div>
</template>

<script setup lang="ts" generic="T extends { id: number }">
// A saved list drawn the same way everywhere (shared/use-saved-tree): folders
// that fold, items in them, the inline name field, drag marks. The list fills
// in each item's row (#item, #sub) and its menus (item-menu, folder-menu).
import { computed, useCssModule } from 'vue'
import WListItem from '../ui/WListItem.vue'
import type { SavedTree } from './use-saved-tree'
import type { TreeRow } from './saved-tree'
import { rowKeys } from './saved-list'

const props = defineProps<{
  tree: SavedTree<T>
  // The folder suggestions' id, unique in the window.
  listId: string
  // Ctrl + C on an item (or the picked group).
  copy?: (items: T[]) => void
  // Enter / double click on an item, when a click only picks it.
  activeId?: number | null
  // The item shown as its edit form (#editor) instead of its row.
  editorFor?: number | null
  // A row's tooltip.
  titleOf?: (item: T) => string
  // Whether an item has a second line (#sub).
  subFor?: (item: T) => boolean
}>()
const emit = defineEmits<{
  'item-menu': [e: MouseEvent, item: T]
  'folder-menu': [e: MouseEvent, path: string]
  'open': [item: T]
}>()

const styles = useCssModule()
const draft = computed({ get: () => props.tree.draft.value, set: (v: string) => { props.tree.draft.value = v } })

function active (item: T) { return props.activeId != null && props.activeId === item.id }

function mark (key: string) {
  const m = props.tree.dropMark(key)
  return m === 'before' ? styles.dropBefore : m === 'after' ? styles.dropAfter : m === 'into' ? styles.dropInto : undefined
}

function indent (depth: number): string {
  return `calc(var(--w-pad) + ${Math.max(0, depth) * 12}px)`
}
// A faint line down the side of a folder's contents.
function rowStyle (depth: number) {
  return depth > 0
    ? { 'padding-left': indent(depth), '--guide': `calc(var(--w-pad) + ${(depth - 1) * 12 + 4}px)` }
    : { paddingLeft: indent(depth) }
}

// The row an event came from, by its data-row key.
const byKey = computed(() => new Map(props.tree.rows.value.map(r => [r.key, r])))
function rowOf (e: Event): TreeRow<T> | undefined {
  const key = (e.target as Element | null)?.closest<HTMLElement>('[data-row]')?.dataset.row
  return key ? byKey.value.get(key) : undefined
}
function onRow (e: Event, act: (row: TreeRow<T>) => void) {
  const row = rowOf(e)
  if (row) act(row)
}
function onClick (e: MouseEvent) {
  const row = rowOf(e)
  if (row?.kind === 'folder') props.tree.toggleFolder(row.node.path)
  else if (row?.kind === 'item') props.tree.rowClick(e, row.item)
}
function onDblClick (e: MouseEvent) {
  const row = rowOf(e)
  if (row?.kind === 'item') emit('open', row.item)
}
function onMenu (e: MouseEvent) {
  const row = rowOf(e)
  if (row?.kind === 'folder') emit('folder-menu', e, row.node.path)
  else if (row?.kind === 'item') emit('item-menu', e, row.item)
}
function onKey (e: KeyboardEvent) {
  const row = rowOf(e)
  if (row?.kind === 'item') onItemKey(e, row.item)
  else if (row?.kind === 'folder') {
    if (e.key === 'F2') { e.preventDefault(); props.tree.startEdit('folder', row.node.path, 'rename') } else props.tree.folderAltKeys(e, row.node.path)
  }
}

function onItemKey (e: KeyboardEvent, item: T) {
  props.tree.itemAltKeys(e, item)
  if (e.defaultPrevented) return
  rowKeys({
    remove: () => props.tree.removeGroup(item),
    copy: props.copy ? () => props.copy!(props.tree.groupOf(item)) : undefined,
    rename: () => props.tree.startEdit('item', String(item.id), 'rename')
  }, { backspace: true })(e)
}
</script>

<style module>
.rows { display: flex; flex-direction: column; }
.row { position: relative; }
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
