// PoE filters know a transfigured gem only by its base gem: the game rejects
// the whole filter over `BaseType "Dual Strike of Ambidexterity"` ("No base
// types found"), and tells the variants apart with `TransfiguredGem True`.
// Our rules take gem names from PoB builds and items, which use the full
// name, so every BaseType list is put through this before the filter is
// written.
import { ITEM_BY_REF } from '@/assets/data'
import type { FilterBlock, FilterCondition, FilterDoc } from './parse'

// The name the filter must use instead, or undefined to keep it.
export type BaseRename = (name: string) => string | undefined

export const gemBaseName: BaseRename = name => {
  const gem = ITEM_BY_REF('GEM', name)?.[0]?.gem
  return gem?.transfigured && gem.normalVariant ? gem.normalVariant : undefined
}

const TRANSFIGURED = 'TransfiguredGem'

// The block's own TransfiguredGem setting: true, false, or null for none.
function transfiguredOf (b: FilterBlock): boolean | null {
  const c = b.conditions.find(x => x.key === TRANSFIGURED)
  if (!c) return null
  return /^true$/i.test(c.values[0] ?? '')
}

const cloneConditions = (cs: FilterCondition[]) => cs.map(c => ({ ...c, values: [...c.values] }))

// Fixes every list in place. A rule naming a transfigured gem keeps meaning
// only that kind of gem: its transfigured names move to a copy of the rule
// with `TransfiguredGem True` (placed just before it), named by their base
// gem; plain names stay where they were. Returns how many blocks changed.
export function renameBases (doc: FilterDoc, rename: BaseRename): number {
  let changed = 0
  for (const b of [...doc.blocks]) {
    const lists = b.conditions.filter(c => c.key === 'BaseType' && c.values.some(v => rename(v) != null))
    if (!lists.length) continue
    changed++
    b.dirty = true
    const only = transfiguredOf(b)
    if (only === true) {
      // Already transfigured gems only: the base names say the same thing.
      for (const c of lists) c.values = [...new Set(c.values.map(v => rename(v) ?? v))]
      continue
    }
    // Several BaseType lists in one rule all have to match: too rare to
    // split; keep the rule valid with the base names.
    const split = lists.length === 1 && b.conditions.filter(c => c.key === 'BaseType').length === 1
    if (!split) {
      for (const c of lists) c.values = [...new Set(c.values.map(v => rename(v) ?? v))]
      continue
    }
    const list = lists[0]
    const moved = [...new Set(list.values.filter(v => rename(v) != null).map(v => rename(v)!))]
    list.values = list.values.filter(v => rename(v) == null)
    // TransfiguredGem False: those names could never match this rule.
    if (only === false) {
      if (!list.values.length) b.disabled = true
      continue
    }
    const copy: FilterBlock = {
      ...b,
      conditions: [
        ...cloneConditions(b.conditions).map(c => c.key === 'BaseType' ? { ...c, values: moved } : c),
        { key: TRANSFIGURED, op: '', count: null, values: ['True'] }
      ],
      actions: b.actions.map(a => ({ ...a, args: [...a.args] })),
      raw: [],
      dirty: true,
      added: true
    }
    if (list.values.length) {
      const at = doc.chunks.indexOf(b)
      doc.chunks.splice(at < 0 ? doc.chunks.length : at, 0, copy)
      doc.blocks.splice(doc.blocks.indexOf(b), 0, copy)
    } else {
      // Nothing plain left: the rule itself becomes the transfigured one.
      b.conditions = copy.conditions
    }
  }
  doc.blocks.forEach((x, i) => { x.index = i })
  return changed
}
