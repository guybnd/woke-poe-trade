// The right-click menu on a folder in every saved tree (Atlas strategies,
// Regex library, PoB builds, Trade searches): the same words, icons and order.
// Each tree adds its own lines: a "New … here", extras after Move (Copy folder
// code, Change icon) and how Remove folder treats what's inside.
import type { MenuEntry } from '../ui/layer'

export interface FolderMenuTree {
  startFolder: (parent: string) => void
  startEdit: (target: 'item' | 'folder', key: string, kind: 'rename' | 'move') => void
  sortFolder: (path: string) => void
  foldAll: () => void
  openAll: () => void
}

export interface FolderMenuOptions {
  // "New strategy here"
  newHere?: { label: string, action: () => void }
  // Lines after Move.
  extra?: MenuEntry[]
  // Left out: the tree can't remove folders here.
  remove?: { label?: string, action: () => void }
  // A folder the app keeps (the Regex library's own): no rename, move or remove.
  locked?: boolean
}

export function folderMenuEntries (tree: FolderMenuTree, path: string, o: FolderMenuOptions = {}): MenuEntry[] {
  const locked = !!o.locked
  return [
    ...(o.newHere ? [{ label: o.newHere.label, icon: 'fas fa-plus', action: o.newHere.action }] : []),
    { label: 'New folder inside', icon: 'fas fa-folder-plus', action: () => tree.startFolder(path) },
    { label: 'Rename', icon: 'fas fa-i-cursor', keys: 'F2', disabled: locked, action: () => tree.startEdit('folder', path, 'rename') },
    { label: 'Move', icon: 'fas fa-folder-open', disabled: locked, action: () => tree.startEdit('folder', path, 'move') },
    ...(o.extra ?? []),
    { separator: true },
    { label: 'Sort this folder A to Z', icon: 'fas fa-sort-alpha-down', action: () => tree.sortFolder(path) },
    { label: 'Fold all folders', icon: 'fas fa-compress-alt', action: tree.foldAll },
    { label: 'Open all folders', icon: 'fas fa-expand-alt', action: tree.openAll },
    ...(o.remove
      ? [{ separator: true } as const, { label: o.remove.label ?? 'Remove folder', icon: 'fas fa-trash', danger: true, disabled: locked, action: o.remove.action }]
      : [])
  ]
}
