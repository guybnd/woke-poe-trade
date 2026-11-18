// A saved list as nested folders, and moving things around it: drag and drop,
// Alt + arrows, A to Z. The same for every saved list (Atlas strategies,
// Regex library, Trade searches, PoB builds); each says where an item's
// folder lives (`folderOf`). Pure, so tests can read it.

export interface TreeNode<T> {
  path: string
  name: string
  depth: number
  items: T[]
  // Items in it and every folder below.
  total: number
  children: Array<TreeNode<T>>
}

export type FolderOf<T> = (item: T) => string

// "a//b/" or "a\\b" -> "a/b": no empty parts, no slashes at the ends.
export function cleanPath (folder: string | undefined | null): string {
  return (folder ?? '').split(/[/\\]+/).map(p => p.trim()).filter(Boolean).join('/')
}

export function parentOf (path: string): string {
  return path.split('/').slice(0, -1).join('/')
}

export function leafOf (path: string): string {
  return path.split('/').at(-1) ?? ''
}

export function isUnder (path: string, folder: string): boolean {
  return path === folder || path.startsWith(folder + '/')
}

export function joinPath (parent: string, name: string): string {
  return cleanPath(parent ? `${parent}/${name}` : name)
}

// Items in `path` or any folder under it, each with its folder below `path`
// ('' when it sits in `path` itself). An empty path matches nothing.
export function itemsUnder<T> (items: readonly T[], folderOf: FolderOf<T>, path: string): Array<{ item: T, sub: string }> {
  const root = cleanPath(path)
  if (!root) return []
  const out: Array<{ item: T, sub: string }> = []
  for (const item of items) {
    const at = cleanPath(folderOf(item))
    if (isUnder(at, root)) out.push({ item, sub: at.slice(root.length + 1) })
  }
  return out
}

// A folder moved or renamed: `from` and everything under it now sit at `to`.
export function movedPath (folder: string, from: string, to: string): string {
  const f = cleanPath(folder)
  if (f === from) return to
  if (f.startsWith(from + '/')) return cleanPath(`${to}/${f.slice(from.length + 1)}`)
  return f
}

// The list as nested folders: items in list order, and folders in `order`
// (ones it doesn't list after, A to Z). `extra`: folders kept while empty.
export function treeOf<T> (items: readonly T[], folderOf: FolderOf<T>, extra: readonly string[] = [], order: readonly string[] = []): TreeNode<T> {
  const root: TreeNode<T> = { path: '', name: '', depth: -1, items: [], total: 0, children: [] }
  const at = (path: string): TreeNode<T> => {
    let node = root
    let sofar = ''
    for (const part of path.split('/').filter(Boolean)) {
      sofar = sofar ? `${sofar}/${part}` : part
      let child = node.children.find(c => c.path === sofar)
      if (!child) {
        child = { path: sofar, name: part, depth: node.depth + 1, items: [], total: 0, children: [] }
        node.children.push(child)
      }
      node = child
    }
    return node
  }
  for (const f of extra) at(cleanPath(f))
  for (const item of items) at(cleanPath(folderOf(item))).items.push(item)
  const finish = (n: TreeNode<T>): number => {
    const rank = (p: string) => { const i = order.indexOf(p); return i < 0 ? Infinity : i }
    n.children.sort((a, b) => (rank(a.path) - rank(b.path)) || a.name.localeCompare(b.name))
    n.total = n.items.length + n.children.reduce((sum, c) => sum + finish(c), 0)
    return n.total
  }
  finish(root)
  return root
}

// Every folder path and its parents, A to Z.
export function allPaths (folders: Iterable<string>): string[] {
  const out = new Set<string>()
  for (const f of folders) {
    const parts = cleanPath(f).split('/').filter(Boolean)
    for (let i = 1; i <= parts.length; i++) out.add(parts.slice(0, i).join('/'))
  }
  return [...out].sort((a, b) => a.localeCompare(b))
}

// Every folder path, in the order the list draws them.
export function shownPaths<T> (root: TreeNode<T>): string[] {
  const out: string[] = []
  const walk = (n: TreeNode<T>) => { for (const c of n.children) { out.push(c.path); walk(c) } }
  walk(root)
  return out
}

// The folder order as shown, with every folder in it.
export function fullOrder<T> (items: readonly T[], folderOf: FolderOf<T>, extra: readonly string[], order: readonly string[]): string[] {
  return shownPaths(treeOf([], () => '', [...extra, ...items.map(folderOf)], order))
}

// Where a drag lands. An item row: before or after it, in its folder. A
// folder row: before it (into its parent), into it (last), or at its start.
// 'top': the top level, after the items there.
export type DropAt =
  | { kind: 'item', id: number, where: 'before' | 'after' }
  | { kind: 'folder', path: string, where: 'before' | 'into' | 'start' }
  | { kind: 'top' }

// The list with `ids` moved (keeping their order) to `at`, and the folder they
// now belong in. Null when there's nothing to move or the spot is gone.
export function moveItems<T extends { id: number }> (list: readonly T[], folderOf: FolderOf<T>, ids: number[], at: DropAt): { list: T[], folder: string } | null {
  const want = new Set(ids)
  const moving = list.filter(s => want.has(s.id))
  if (!moving.length) return null
  const rest = list.filter(s => !want.has(s.id))
  let folder: string
  let index: number
  if (at.kind === 'item') {
    if (want.has(at.id)) {
      // Dropped on one of the rows being moved: they close up around it.
      const first = list.findIndex(s => want.has(s.id))
      folder = cleanPath(folderOf(list.find(s => s.id === at.id)!))
      index = list.slice(0, first).filter(s => !want.has(s.id)).length
    } else {
      const t = rest.findIndex(s => s.id === at.id)
      if (t < 0) return null
      folder = cleanPath(folderOf(rest[t]))
      index = at.where === 'before' ? t : t + 1
    }
  } else {
    folder = at.kind === 'top' ? '' : at.where === 'before' ? parentOf(at.path) : at.path
    const inIt = rest.map((s, i) => cleanPath(folderOf(s)) === folder ? i : -1).filter(i => i >= 0)
    index = !inIt.length
      ? rest.length
      : at.kind === 'folder' && at.where === 'start' ? inIt[0] : inIt[inIt.length - 1] + 1
  }
  return { list: [...rest.slice(0, index), ...moving, ...rest.slice(index)], folder }
}

// Where a dragged folder goes: its new path, and the folder it then sits just
// before (null: last among its new siblings). A string: why it can't.
export function folderDropOf<T extends { id: number }> (from: string, at: DropAt, items: readonly T[], folderOf: FolderOf<T>, existing: readonly string[]): { to: string, before: string | null } | string {
  let parent: string
  let before: string | null = null
  if (at.kind === 'folder') {
    parent = at.where === 'before' ? parentOf(at.path) : at.path
    if (at.where === 'before') before = at.path
  } else if (at.kind === 'item') {
    const t = items.find(s => s.id === at.id)
    if (!t) return 'gone'
    parent = cleanPath(folderOf(t))
  } else {
    parent = ''
  }
  if (parent && isUnder(parent, from)) return "A folder can't go inside itself"
  const to = parent ? `${parent}/${leafOf(from)}` : leafOf(from)
  if (to !== from && existing.includes(to)) return `There's already a folder "${leafOf(from)}" there`
  if (before === from) before = null
  return { to, before }
}

// The folder order with `path` (and everything under it) placed just before
// `before`, or last among its siblings.
export function placeFolder (order: readonly string[], path: string, before: string | null): string[] {
  const under = order.filter(p => isUnder(p, path) && p !== path)
  const block = [path, ...under]
  const rest = order.filter(p => !isUnder(p, path))
  if (before != null) {
    const i = rest.indexOf(before)
    if (i >= 0) return [...rest.slice(0, i), ...block, ...rest.slice(i)]
  }
  // Last among its siblings: after the last sibling and everything under it.
  const parent = parentOf(path)
  const last = rest.filter(p => parentOf(p) === parent).at(-1)
  let at = -1
  if (last != null) rest.forEach((p, i) => { if (isUnder(p, last)) at = i })
  if (at < 0) {
    // No siblings: right after the parent folder, or at the end.
    const pi = parent ? rest.indexOf(parent) : -1
    at = pi >= 0 ? pi : rest.length - 1
  }
  return [...rest.slice(0, at + 1), ...block, ...rest.slice(at + 1)]
}

// A folder one place up or down among its siblings. Null at either end.
export function nudgeFolder (order: readonly string[], path: string, dir: -1 | 1): string[] | null {
  const siblings = order.filter(p => parentOf(p) === parentOf(path))
  const i = siblings.indexOf(path)
  const j = i + dir
  if (i < 0 || j < 0 || j >= siblings.length) return null
  // Up: before the one above. Down: before the one after the next (or last).
  return dir < 0 ? placeFolder(order, path, siblings[j]) : placeFolder(order, path, siblings[j + 1] ?? null)
}

// A to Z for one folder: its items and the folders right inside it.
export function sortFolderAtoZ<T> (list: readonly T[], folderOf: FolderOf<T>, nameOf: (item: T) => string, order: readonly string[], folder: string): { list: T[], order: string[] } {
  const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })
  const slots = list.map((s, i) => cleanPath(folderOf(s)) === folder ? i : -1).filter(i => i >= 0)
  const sorted = slots.map(i => list[i]).sort((a, b) => byName(nameOf(a), nameOf(b)))
  const nextList = [...list]
  slots.forEach((slot, k) => { nextList[slot] = sorted[k] })
  const kids = order.filter(p => parentOf(p) === folder).sort((a, b) => byName(leafOf(a), leafOf(b)))
  let nextOrder = [...order]
  for (const k of kids) nextOrder = placeFolder(nextOrder, k, null)
  return { list: nextList, order: nextOrder }
}

// ---- the rows a list draws ----

export type TreeRow<T> =
  | { kind: 'folder', key: string, depth: number, node: TreeNode<T>, open: boolean }
  | { kind: 'item', key: string, depth: number, item: T }
  | { kind: 'new-folder', key: string, depth: number }

export const itemKey = (id: number) => `s:${id}`
export const folderKey = (path: string) => `f:${path}`

// Folders and items as rows, folded folders closed. A filter shows every
// match with its folders open, and no empty folders. `newIn`: a folder being
// made, drawn at the end of its parent's contents.
export function treeRows<T extends { id: number }> (root: TreeNode<T>, opts: { closed: readonly string[], filtering: boolean, newIn?: string | null }): Array<TreeRow<T>> {
  const closed = new Set(opts.closed)
  const out: Array<TreeRow<T>> = []
  function walk (node: TreeNode<T>) {
    for (const child of node.children) {
      if (opts.filtering && !child.total) continue
      const open = opts.filtering || !closed.has(child.path)
      out.push({ kind: 'folder', key: folderKey(child.path), depth: child.depth, node: child, open })
      if (open) walkAll(child)
    }
  }
  // A folder's items come before the folders inside it, so loose ones never
  // look like the last folder's.
  function walkAll (node: TreeNode<T>) {
    for (const item of node.items) out.push({ kind: 'item', key: itemKey(item.id), depth: node.depth + 1, item })
    walk(node)
  }
  walkAll(root)
  if (opts.newIn != null) {
    const parent = opts.newIn
    const depth = parent ? parent.split('/').length : 0
    const head = parent ? out.findIndex(r => r.kind === 'folder' && r.node.path === parent) : -1
    let at = out.length
    if (head >= 0) {
      at = head + 1
      while (at < out.length && out[at].depth >= depth) at++
    }
    out.splice(at, 0, { kind: 'new-folder', key: 'n:' + parent, depth })
  }
  return out
}

// Alt + arrow on an item: where it goes. Up and down step past a neighbour in
// its folder (or out of / into the edge of one); Left leaves its folder.
export function altArrowTarget<T extends { id: number }> (rows: Array<TreeRow<T>>, item: T, folderOf: FolderOf<T>, key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft'): DropAt | null {
  const list = rows.filter(r => r.kind !== 'new-folder')
  const i = list.findIndex(r => r.kind === 'item' && r.item.id === item.id)
  if (i < 0) return null
  const folder = cleanPath(folderOf(item))
  if (key === 'ArrowLeft') return folder ? { kind: 'folder', path: folder, where: 'before' } : null
  if (key === 'ArrowUp') {
    const prev = list[i - 1]
    if (prev?.kind === 'item') return { kind: 'item', id: prev.item.id, where: 'before' }
    if (prev?.kind === 'folder' && prev.node.path === folder) return { kind: 'folder', path: folder, where: 'before' }
    return null
  }
  const next = list[i + 1]
  if (next?.kind === 'item' && cleanPath(folderOf(next.item)) === folder) return { kind: 'item', id: next.item.id, where: 'after' }
  if (next?.kind === 'folder' && parentOf(next.node.path) === folder) return { kind: 'folder', path: next.node.path, where: 'start' }
  return null
}
