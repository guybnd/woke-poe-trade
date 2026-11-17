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
// `also`: a tier to offer even if it isn't one you'd move to by hand.
// `markHidden`: say which tiers hide what goes there.
export function tierMoveEntries (doc: FilterDoc | null | undefined, type: string | null | undefined, from: string | null | undefined, pick: (to: string) => void, opts: { label?: (to: string) => string, also?: string | null, markHidden?: boolean } = {}): MenuEntry[] {
  if (!doc || !type) return []
  const tiers = moveTargets(doc, type)
  if (opts.also && !tiers.includes(opts.also)) tiers.push(opts.also)
  return tiers.filter(t => t !== from).map(t => {
    const blocks = doc.blocks.filter(x => x.type === type && x.tier === t)
    const block = blocks.find(x => !x.disabled) ?? blocks[0]
    const live = blocks.filter(x => !x.disabled)
    const hides = opts.markHidden === true && live.length > 0 && live.every(x => x.visibility === 'Hide')
    return { label: `${opts.label?.(t) ?? tierLabel(t)}${hides ? ' · hides it' : ''}`, labelStyle: block ? labelCss(block.actions) : undefined, icon: 'fas fa-share', action: () => { pick(t) } }
  })
}
