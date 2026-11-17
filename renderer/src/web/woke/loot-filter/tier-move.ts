// Moving items between a group's tiers, the same from the filter editor and
// the Alt+F card: one undo step for the lot and a "Moved …" note with Undo.
import { toast } from '../ui/layer'
import { tierLabel } from './names'
import type { LootFilterStore } from './store'

export interface TierMoveAt {
  // The group and the tier the items are in now.
  type: () => string | null | undefined
  from: () => string | null | undefined
  // What the note calls the tier they went to.
  label?: (to: string) => string
  // Where the note shows.
  anchor?: () => HTMLElement | null | undefined
  // After a move: drop the picks, follow the items...
  after?: (to: string) => void
}

export function movedNote (bases: string[], label: string): string {
  return `Moved ${bases.length > 1 ? `${bases.length} items` : bases[0]} to ${label}`
}

export function useTierMove (store: LootFilterStore, at: TierMoveAt) {
  return function moveBases (bases: string[], to: string) {
    const type = at.type()
    const from = at.from()
    if (!bases.length || !type || !from || !to || to === from) return
    const undo = store.editsWithUndo(bases.map(base => ({ kind: 'move' as const, type, base, from, to })))
    toast(movedNote(bases, at.label?.(to) ?? tierLabel(to)), { anchor: at.anchor?.() ?? undefined, undo })
    at.after?.(to)
  }
}
