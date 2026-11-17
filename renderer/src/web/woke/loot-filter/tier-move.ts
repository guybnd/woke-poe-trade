// Moving items between a group's tiers, the same from the filter editor and
// the Alt+F card: one undo step for the lot and a "Moved …" note with Undo.
import { toast } from '../ui/layer'
import type { MenuEntry } from '../ui/layer'
import { moveTargets } from './edits'
import { labelCss } from './label-style'
import type { FilterDoc } from './parse'
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

// The "Move to" menu: every tier of the group the items can go to, each drawn
// in its own look. One list for the editor, Alt+F and the Prices tab.
export function tierMoveEntries (doc: FilterDoc | null | undefined, type: string | null | undefined, from: string | null | undefined, pick: (to: string) => void, opts: { label?: (to: string) => string } = {}): MenuEntry[] {
  if (!doc || !type) return []
  return moveTargets(doc, type).filter(t => t !== from).map(t => {
    const block = doc.blocks.find(x => x.type === type && x.tier === t && !x.disabled) ?? doc.blocks.find(x => x.type === type && x.tier === t)
    return { label: opts.label?.(t) ?? tierLabel(t), labelStyle: block ? labelCss(block.actions) : undefined, icon: 'fas fa-share', action: () => { pick(t) } }
  })
}
