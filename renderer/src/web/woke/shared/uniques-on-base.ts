// Which uniques drop on which base, and the other way: one index for Search,
// the loot filter and every "uniques on this base" list. By English name.
// Some uniques come on several bases (Precursor's Emblem on five rings).
import { ITEMS_ITERATOR } from '@/assets/data'
import type { BaseType } from '@/assets/data'

export interface UniqueBaseIndex {
  byBase: Map<string, string[]>
  basesOf: Map<string, string[]>
}

export function uniqueBaseIndex (uniques: Iterable<{ refName: string, unique?: { base: string } }>): UniqueBaseIndex {
  const byBase = new Map<string, string[]>()
  const basesOf = new Map<string, string[]>()
  const add = (map: Map<string, string[]>, k: string, v: string) => {
    const list = map.get(k)
    if (!list) map.set(k, [v])
    else if (!list.includes(v)) list.push(v)
  }
  for (const u of uniques) {
    if (!u.unique?.base) continue
    add(byBase, u.unique.base, u.refName)
    add(basesOf, u.refName, u.unique.base)
  }
  return { byBase, basesOf }
}

let index: UniqueBaseIndex | null = null

// Built once the item data has loaded; until then every list is empty and
// the next call tries again.
function loaded (): UniqueBaseIndex {
  if (index) return index
  const uniques: BaseType[] = []
  for (const u of ITEMS_ITERATOR('"unique":{"base"') as Generator<BaseType>) {
    if (u.namespace === 'UNIQUE') uniques.push(u)
  }
  const built = uniqueBaseIndex(uniques)
  if (built.byBase.size) index = built
  return built
}

export function uniquesOnBase (base: string): string[] {
  return loaded().byBase.get(base) ?? []
}

export function basesOfUnique (name: string): string[] {
  return loaded().basesOf.get(name) ?? []
}

// Bases that drop as at least one unique.
export function hasUniques (base: string): boolean {
  return uniquesOnBase(base).length > 0
}
