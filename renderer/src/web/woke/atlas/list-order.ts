// Moving strategies and folders around the list: drag and drop, Alt + arrows,
// A to Z. The shared saved-list tree (shared/saved-tree.ts) with a strategy's
// `folder`; kept under Atlas's names for its callers and tests.
import { folderDropOf, fullOrder, moveItems, sortFolderAtoZ } from '../shared/saved-tree'
import type { DropAt as TreeDropAt } from '../shared/saved-tree'
import type { AtlasStrategy } from './strategies'

export { parentOf, leafOf, isUnder, placeFolder, nudgeFolder } from '../shared/saved-tree'

// Where a drag lands. A strategy row: before or after it, in its folder. A
// folder row: before it (into its parent), into it (last), or at its start.
// 'top': the top level, after the strategies there.
export type DropAt =
  | { kind: 'strategy', id: number, where: 'before' | 'after' }
  | { kind: 'folder', path: string, where: 'before' | 'into' | 'start' }
  | { kind: 'top' }

const folderOf = (s: AtlasStrategy) => s.folder ?? ''
const toTree = (at: DropAt): TreeDropAt => at.kind === 'strategy' ? { kind: 'item', id: at.id, where: at.where } : at

export function moveStrategies (list: AtlasStrategy[], ids: number[], at: DropAt): { list: AtlasStrategy[], folder: string } | null {
  return moveItems(list, folderOf, ids, toTree(at))
}

export function folderOrderOf (strategies: AtlasStrategy[], extra: string[], order: string[]): string[] {
  return fullOrder(strategies, folderOf, extra, order)
}

export function folderDrop (from: string, at: DropAt, strategies: AtlasStrategy[], existing: string[]): { to: string, before: string | null } | string {
  return folderDropOf(from, toTree(at), strategies, folderOf, existing)
}

export function sortFolderByName (list: AtlasStrategy[], order: string[], folder: string): { list: AtlasStrategy[], order: string[] } {
  return sortFolderAtoZ(list, folderOf, s => s.name, order, folder)
}
