// A saved list's behaviour, the same for every list (lifted from Atlas
// strategies): nested folders that fold, Ctrl / Shift picking, drag and drop
// of items and folders, Alt + arrows, F2 rename and Move in one inline field,
// Delete, A to Z. SavedTree.vue draws it; each list gives an adapter for where
// its items, folders and order live and what removing one means there.
import { computed, nextTick, shallowRef, watch } from 'vue'
import { clickOf, selectPick } from './picks'
import {
  allPaths, altArrowTarget, cleanPath, folderDropOf, folderKey, fullOrder, isUnder, itemKey, joinPath, leafOf,
  moveItems, movedPath, nudgeFolder, parentOf, placeFolder, sortFolderAtoZ, treeOf, treeRows
} from './saved-tree'
import type { DropAt, TreeRow } from './saved-tree'

export interface SavedTreeAdapter<T extends { id: number }> {
  // The element holding the list (for its inline field and row focus).
  root: () => Element | null | undefined
  items: () => T[]
  setItems: (list: T[]) => void
  folderOf: (item: T) => string
  // One item into a folder (a list can do more: Atlas moves its regexes).
  setFolder: (item: T, folder: string) => void
  nameOf: (item: T) => string
  setName: (item: T, name: string) => void
  // Folders kept while empty, the folders' order, and the folded ones.
  extraFolders: () => string[]
  setExtraFolders: (folders: string[]) => void
  folderOrder: () => string[] | undefined
  setFolderOrder: (order: string[]) => void
  closed: () => string[]
  setClosed: (closed: string[]) => void
  // The filter and what it matches.
  query: () => string
  matches: (item: T, query: string) => boolean
  // A sort other than the list's own order (drag and Alt + arrows switch back).
  sorted?: (list: T[]) => T[]
  manual?: () => boolean
  toManual?: () => void
  // Folders A to Z too (a sort by name).
  foldersByName?: () => boolean
  // The open item: a click opens one.
  selected: () => number | null
  select: (id: number | null) => void
  // Remove with Undo, the list's own way.
  remove: (list: T[]) => void
  // A short note (a toast).
  note: (text: string) => void
  // Moving folders is something the list can't do (files on disk): a reason.
  cantMoveFolders?: string
  // Reordering items is something the list can't do (sorted by name): a reason.
  cantReorder?: string
  // A folder another tool keeps its things in: why it can't be renamed, moved
  // or removed here (null: it can).
  folderLocked?: (path: string) => string | null
  // A plain click on an item does this too (Regex library: search the stash).
  open?: (item: T) => void
}

// `start`: the text the field opened with.
export type SavedEdit = { target: 'item' | 'folder', key: string, kind: 'rename' | 'move', id: string, ids?: number[], start?: string }
type Drag = { kind: 'items', ids: number[] } | { kind: 'folder', path: string }

export function useSavedTree<T extends { id: number }> (a: SavedTreeAdapter<T>) {
  const manual = () => a.manual?.() ?? true
  const folders = computed(() => allPaths([...a.extraFolders(), ...a.items().map(a.folderOf)]))

  // ---- rows ----
  const editing = shallowRef<SavedEdit | null>(null)
  const draft = shallowRef('')

  function rowsFor (sortedList: boolean): Array<TreeRow<T>> {
    const q = a.query().trim()
    const list = a.items().filter(t => a.matches(t, q))
    const ordered = sortedList && a.sorted ? a.sorted(list) : list
    const byName = sortedList && (a.foldersByName?.() ?? false)
    const tree = treeOf(ordered, a.folderOf, q ? [] : a.extraFolders(), byName ? [] : a.folderOrder() ?? [])
    const e = editing.value
    const newIn = e?.target === 'folder' && e.key.startsWith('n:') ? e.key.slice(2) : null
    return treeRows(tree, { closed: a.closed(), filtering: Boolean(q), newIn })
  }
  const rows = computed(() => rowsFor(true))
  const shownIds = () => rows.value.flatMap(r => r.kind === 'item' ? [r.item.id] : [])

  // ---- several at once (Ctrl and Shift click) ----
  const picked = shallowRef<number[]>([])
  const isPicked = (id: number) => picked.value.length > 1 && picked.value.includes(id)
  // What a row's menu, drag or Delete acts on: the picked group if it's in it.
  function groupOf (item: T): T[] {
    if (!isPicked(item.id)) return [item]
    const ids = new Set(picked.value)
    const shown = new Set(shownIds())
    return a.items().filter(o => ids.has(o.id) && shown.has(o.id))
  }
  watch(a.query, () => { picked.value = [] })
  // A file list (shared/picks): a click opens one, Ctrl picks more, Shift
  // picks the run from the open one.
  function rowClick (e: MouseEvent, item: T) {
    const click = clickOf(e)
    const next = selectPick(shownIds(), picked.value, item.id, click, a.selected())
    picked.value = next.picked
    if (next.anchor !== a.selected()) a.select(next.anchor)
    // Once per double click, not for each of its clicks.
    if (!click.ctrl && !click.shift && e.detail < 2) a.open?.(item)
  }
  // Why a folder can't change here, as a note; true when it can't.
  function locked (path: string): boolean {
    const why = a.folderLocked?.(path)
    if (why) a.note(why)
    return Boolean(why)
  }

  // ---- folders ----
  function openFolder (path: string) {
    const parts = cleanPath(path).split('/').filter(Boolean)
    const opens = parts.map((_, i) => parts.slice(0, i + 1).join('/'))
    const closed = a.closed()
    if (closed.some(p => opens.includes(p))) a.setClosed(closed.filter(p => !opens.includes(p)))
  }
  function toggleFolder (path: string) {
    const closed = a.closed()
    a.setClosed(closed.includes(path) ? closed.filter(p => p !== path) : [...closed, path])
  }
  const foldAll = () => { a.setClosed([...folders.value]) }
  const openAll = () => { a.setClosed([]) }
  function orderNow (): string[] {
    return fullOrder(a.items(), a.folderOf, a.extraFolders(), a.folderOrder() ?? [])
  }
  function inFolder (path: string): T[] {
    return a.items().filter(t => isUnder(cleanPath(a.folderOf(t)), path))
  }
  function refile (list: T[], folder: string) {
    for (const t of list) if (cleanPath(a.folderOf(t)) !== folder) a.setFolder(t, folder)
  }
  function moveFolder (from: string, to: string) {
    if (!to || from === to || to.startsWith(from + '/')) return
    for (const t of a.items()) {
      const next = movedPath(a.folderOf(t), from, to)
      if (next !== cleanPath(a.folderOf(t))) a.setFolder(t, next)
    }
    a.setExtraFolders(a.extraFolders().map(f => movedPath(f, from, to)))
    a.setClosed(a.closed().map(f => movedPath(f, from, to)))
    const order = a.folderOrder()
    if (order) a.setFolderOrder([...new Set(order.map(f => movedPath(f, from, to)))])
    openFolder(to)
  }
  function toManual () {
    if (!manual()) a.toManual?.()
  }
  // Once: a folder's items and the folders right inside it, by name.
  function sortFolder (path: string) {
    if (a.cantReorder) { a.note(a.cantReorder); return }
    toManual()
    const res = sortFolderAtoZ(a.items(), a.folderOf, a.nameOf, orderNow(), path)
    a.setItems(res.list)
    a.setFolderOrder(res.order)
  }

  // ---- moving ----
  function moveTo (ids: number[], at: DropAt): boolean {
    const res = moveItems(a.items(), a.folderOf, ids, at)
    if (!res) return false
    const want = new Set(ids)
    if (!a.cantReorder) a.setItems(res.list)
    refile(a.items().filter(t => want.has(t.id)), res.folder)
    openFolder(res.folder)
    return true
  }
  function moveFolderTo (from: string, at: DropAt) {
    if (a.cantMoveFolders) { a.note(a.cantMoveFolders); return }
    const res = folderDropOf(from, at, a.items(), a.folderOf, folders.value)
    if (typeof res === 'string') {
      if (res !== 'gone') a.note(res)
      return
    }
    // A moved folder is kept, so moving its last item out later doesn't remove it.
    // A locked folder can change place among its siblings, never its path, and
    // nothing moves into a locked one.
    if (res.to !== from) {
      if (locked(from) || locked(res.to)) return
      if (!a.extraFolders().includes(from)) a.setExtraFolders([...a.extraFolders(), from])
      moveFolder(from, res.to)
    }
    a.setFolderOrder(placeFolder(orderNow(), res.to, res.before))
  }

  // ---- drag and drop ----
  const drag = shallowRef<Drag | null>(null)
  const dropAt = shallowRef<DropAt | null>(null)
  let openTimer: ReturnType<typeof setTimeout> | null = null
  let openFor = ''

  function dragStart (e: DragEvent, row: TreeRow<T>) {
    if (editing.value) { e.preventDefault(); return }
    if (row.kind === 'item') {
      const group = groupOf(row.item)
      drag.value = { kind: 'items', ids: group.map(t => t.id) }
      e.dataTransfer?.setData('text/plain', group.map(a.nameOf).join(', '))
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
      // An item goes into it: one dropped "before" would land above all the
      // parent's folders, not where the line showed.
      return { kind: 'folder', path, where: d.kind === 'folder' && y < 0.3 ? 'before' : 'into' }
    }
    // Folders sit after a folder's items, never between them.
    if (d.kind === 'folder') return null
    return { kind: 'item', id: Number(key.slice(2)), where: y < 0.5 ? 'before' : 'after' }
  }
  function dragOver (e: DragEvent) {
    const at = dropFor(e)
    if (!at) { dropAt.value = null; stopOpenTimer(); return }
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    if (JSON.stringify(at) !== JSON.stringify(dropAt.value)) dropAt.value = at
    // Held over a folded folder: it opens.
    const folded = at.kind === 'folder' && at.where === 'into' && a.closed().includes(at.path) ? at.path : ''
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
    if (d.kind === 'items') {
      toManual()
      moveTo(d.ids, at)
    } else {
      if (a.foldersByName?.()) toManual()
      moveFolderTo(d.path, at)
    }
  }
  // Which line or box a row shows while dragging: 'before', 'after', 'into'.
  function dropMark (key: string): 'before' | 'after' | 'into' | null {
    const at = dropAt.value
    if (!at || at.kind === 'top') return null
    if (at.kind === 'folder' && key === folderKey(at.path)) return at.where === 'into' ? 'into' : 'before'
    if (at.kind === 'item' && key === itemKey(at.id)) return at.where
    return null
  }

  // ---- Alt + arrows ----
  function focusRow (key: string) {
    nextTick(() => {
      const el = a.root()?.querySelector<HTMLElement>(`[data-row="${CSS.escape(key)}"]`)
      ;(el?.matches('button') ? el : el?.querySelector<HTMLElement>('button'))?.focus()
    })
  }
  function itemAltKeys (e: KeyboardEvent, item: T) {
    if (!e.altKey || !['ArrowUp', 'ArrowDown', 'ArrowLeft'].includes(e.key)) return
    // Not the panel's arrow keys, which would move the focus off it.
    e.preventDefault()
    e.stopPropagation()
    // As the list's own order shows them, without switching yet.
    const at = altArrowTarget(rowsFor(false), item, a.folderOf, e.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft')
    if (!at) return
    if (e.key !== 'ArrowLeft' && a.cantReorder) { a.note(a.cantReorder); return }
    toManual()
    if (moveTo([item.id], at)) focusRow(itemKey(item.id))
  }
  function folderAltKeys (e: KeyboardEvent, path: string) {
    if (!e.altKey || !['ArrowUp', 'ArrowDown'].includes(e.key)) return
    e.preventDefault()
    e.stopPropagation()
    if (a.cantMoveFolders) { a.note(a.cantMoveFolders); return }
    if (a.foldersByName?.()) toManual()
    const next = nudgeFolder(orderNow(), path, e.key === 'ArrowUp' ? -1 : 1)
    if (!next) return
    a.setFolderOrder(next)
    focusRow(folderKey(path))
  }

  // ---- rename, move, new folder: one inline field ----
  function focusDraft () {
    nextTick(() => {
      const el = a.root()?.querySelector<HTMLInputElement>('[data-draft]')
      el?.focus()
      el?.select()
    })
  }
  // `ids`: Move to folder for a picked group.
  function startEdit (target: 'item' | 'folder', id: string, kind: 'rename' | 'move', ids?: number[]) {
    if (target === 'item') {
      const t = a.items().find(x => String(x.id) === id)
      if (!t) return
      draft.value = kind === 'rename' ? a.nameOf(t) : a.folderOf(t)
      editing.value = { target, key: itemKey(t.id), kind, id, ids, start: draft.value }
    } else {
      if (a.cantMoveFolders && kind === 'move') { a.note(a.cantMoveFolders); return }
      if (locked(id)) return
      draft.value = kind === 'rename' ? leafOf(id) : parentOf(id)
      editing.value = { target, key: folderKey(id), kind, id }
    }
    focusDraft()
  }
  function startFolder (parent: string) {
    draft.value = ''
    editing.value = { target: 'folder', key: 'n:' + parent, kind: 'rename', id: '' }
    openFolder(parent)
    focusDraft()
  }
  function cancelEdit () { editing.value = null }
  function finishEdit () {
    const e = editing.value
    if (!e) return
    editing.value = null
    const value = draft.value.trim()
    if (e.target === 'item') {
      if (e.kind === 'move' && e.ids) {
        const want = new Set(e.ids)
        refile(a.items().filter(t => want.has(t.id)), cleanPath(value))
        openFolder(cleanPath(value))
        return
      }
      const t = a.items().find(x => String(x.id) === e.id)
      if (!t) return
      // An unchanged name stays as it was (the field may start from a fallback).
      if (e.kind === 'rename') { if (value && value !== e.start) a.setName(t, value) } else { const f = cleanPath(value); if (f !== cleanPath(a.folderOf(t))) a.setFolder(t, f); openFolder(f) }
      return
    }
    if (e.key.startsWith('n:')) {
      if (!value) return
      const path = joinPath(e.key.slice(2), value)
      a.setExtraFolders([...new Set([...a.extraFolders(), path])])
      openFolder(path)
      return
    }
    const from = e.id
    const to = e.kind === 'rename'
      ? (value ? joinPath(parentOf(from), value.replace(/[/\\]+/g, '-')) : from)
      : joinPath(value, leafOf(from))
    if (to !== from && locked(to)) return
    moveFolder(from, to)
  }

  // ---- removing ----
  function removeGroup (item: T) { a.remove(groupOf(item)) }
  function forgetPicks (ids: Iterable<number>) {
    const gone = new Set(ids)
    if (picked.value.some(id => gone.has(id))) picked.value = picked.value.filter(id => !gone.has(id))
  }

  return {
    rows,
    folders,
    picked,
    isPicked,
    groupOf,
    rowClick,
    openFolder,
    toggleFolder,
    foldAll,
    openAll,
    inFolder,
    moveFolder,
    sortFolder,
    locked,
    drag,
    dropAt,
    dragStart,
    dragEnd,
    dragOver,
    dragLeave,
    dropHere,
    dropMark,
    itemAltKeys,
    folderAltKeys,
    focusRow,
    editing,
    draft,
    startEdit,
    startFolder,
    finishEdit,
    cancelEdit,
    removeGroup,
    forgetPicks
  }
}

export type SavedTree<T extends { id: number }> = ReturnType<typeof useSavedTree<T>>
