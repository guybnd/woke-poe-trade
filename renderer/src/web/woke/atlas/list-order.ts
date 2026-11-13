// Moving strategies and folders around the list: drag and drop, Alt + arrows,
// A to Z. Pure, so tests can read it; AtlasWindow.vue applies the results.
import { cleanFolder, folderTree } from './strategies'
import type { AtlasStrategy, FolderNode } from './strategies'

// Where a drag lands. A strategy row: before or after it, in its folder. A
// folder row: before it (into its parent), into it (last), or at its start.
// 'top': the top level, after the strategies there.
export type DropAt =
  | { kind: 'strategy', id: number, where: 'before' | 'after' }
  | { kind: 'folder', path: string, where: 'before' | 'into' | 'start' }
  | { kind: 'top' }

export function parentOf (path: string): string {
  return path.split('/').slice(0, -1).join('/')
}

export function leafOf (path: string): string {
  return path.split('/').at(-1) ?? ''
}

export function isUnder (path: string, folder: string): boolean {
  return path === folder || path.startsWith(folder + '/')
}

// The list with `ids` moved (keeping their order) to `at`, and the folder they
// now belong in. Null when there's nothing to move or the spot is gone.
export function moveStrategies (list: AtlasStrategy[], ids: number[], at: DropAt): { list: AtlasStrategy[], folder: string } | null {
  const want = new Set(ids)
  const moving = list.filter(s => want.has(s.id))
  if (!moving.length) return null
  const rest = list.filter(s => !want.has(s.id))
  let folder: string
  let index: number
  if (at.kind === 'strategy') {
    if (want.has(at.id)) {
      // Dropped on one of the rows being moved: they close up around it.
      const first = list.findIndex(s => want.has(s.id))
      folder = cleanFolder(list.find(s => s.id === at.id)!.folder)
      index = list.slice(0, first).filter(s => !want.has(s.id)).length
    } else {
      const t = rest.findIndex(s => s.id === at.id)
      if (t < 0) return null
      folder = cleanFolder(rest[t].folder)
      index = at.where === 'before' ? t : t + 1
    }
  } else {
    folder = at.kind === 'top' ? '' : at.where === 'before' ? parentOf(at.path) : at.path
    const inIt = rest.map((s, i) => cleanFolder(s.folder) === folder ? i : -1).filter(i => i >= 0)
    index = !inIt.length
      ? rest.length
      : at.kind === 'folder' && at.where === 'start' ? inIt[0] : inIt[inIt.length - 1] + 1
  }
  return { list: [...rest.slice(0, index), ...moving, ...rest.slice(index)], folder }
}

// Every folder path, in the order the list draws them.
export function shownFolders (root: FolderNode): string[] {
  const out: string[] = []
  const walk = (n: FolderNode) => { for (const c of n.children) { out.push(c.path); walk(c) } }
  walk(root)
  return out
}

export function folderOrderOf (strategies: AtlasStrategy[], extra: string[], order: string[]): string[] {
  return shownFolders(folderTree([], [...extra, ...strategies.map(s => s.folder ?? '')], order))
}

// Where a dragged folder goes: its new path, and the folder it then sits just
// before (null: last among its new siblings). A string: why it can't.
export function folderDrop (from: string, at: DropAt, strategies: AtlasStrategy[], existing: string[]): { to: string, before: string | null } | string {
  let parent: string
  let before: string | null = null
  if (at.kind === 'folder') {
    parent = at.where === 'before' ? parentOf(at.path) : at.path
    if (at.where === 'before') before = at.path
  } else if (at.kind === 'strategy') {
    const t = strategies.find(s => s.id === at.id)
    if (!t) return 'gone'
    parent = cleanFolder(t.folder)
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
export function placeFolder (order: string[], path: string, before: string | null): string[] {
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
export function nudgeFolder (order: string[], path: string, dir: -1 | 1): string[] | null {
  const siblings = order.filter(p => parentOf(p) === parentOf(path))
  const i = siblings.indexOf(path)
  const j = i + dir
  if (i < 0 || j < 0 || j >= siblings.length) return null
  // Up: before the one above. Down: before the one after the next (or last).
  return dir < 0 ? placeFolder(order, path, siblings[j]) : placeFolder(order, path, siblings[j + 1] ?? null)
}

// A to Z for one folder: its strategies and the folders right inside it.
export function sortFolderByName (list: AtlasStrategy[], order: string[], folder: string): { list: AtlasStrategy[], order: string[] } {
  const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })
  const slots = list.map((s, i) => cleanFolder(s.folder) === folder ? i : -1).filter(i => i >= 0)
  const sorted = slots.map(i => list[i]).sort((a, b) => byName(a.name, b.name))
  const nextList = [...list]
  slots.forEach((slot, k) => { nextList[slot] = sorted[k] })
  const kids = order.filter(p => parentOf(p) === folder).sort((a, b) => byName(leafOf(a), leafOf(b)))
  let nextOrder = order
  for (const k of kids) nextOrder = placeFolder(nextOrder, k, null)
  return { list: nextList, order: nextOrder }
}
