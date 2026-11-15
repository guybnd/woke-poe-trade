// PoE filters know a transfigured gem only by its base gem: the game rejects
// the whole filter over `BaseType "Dual Strike of Ambidexterity"` ("No base
// types found"), and tells the variants apart with `TransfiguredGem True`.
// Our rules take gem names from PoB builds and items, which use the full
// name, so every BaseType list is put through this before the filter is
// written.
import { ITEM_BY_REF } from '@/assets/data'
import type { FilterDoc } from './parse'

// The name the filter must use instead, or undefined to keep it.
export type BaseRename = (name: string) => string | undefined

export const gemBaseName: BaseRename = name => {
  const gem = ITEM_BY_REF('GEM', name)?.[0]?.gem
  return gem?.transfigured && gem.normalVariant ? gem.normalVariant : undefined
}

// Renames in place, without repeats, and marks changed blocks to be written
// out again. Returns how many blocks changed.
export function renameBases (doc: FilterDoc, rename: BaseRename): number {
  let changed = 0
  for (const b of doc.blocks) {
    let touched = false
    for (const c of b.conditions) {
      if (c.key !== 'BaseType') continue
      if (!c.values.some(v => rename(v) != null)) continue
      c.values = [...new Set(c.values.map(v => rename(v) ?? v))]
      touched = true
    }
    if (touched) {
      b.dirty = true
      changed++
    }
  }
  return changed
}
