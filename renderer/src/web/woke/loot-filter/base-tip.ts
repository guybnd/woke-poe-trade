// The item tooltip for a base in the filter editor. A base in a unique tier is
// really the uniques it can drop as, so the tooltip lists those with their
// prices, graded as the Prices tab grades them.
import { ECONOMY_GROUPS } from './economy'
import type { EconomyGroup } from './economy'
import { GRADE_LABEL, gradeItems } from './health'
import type { PricedName } from './health'
import { FOULBORN_PREFIX, UNIQUE_CLS } from './unique-classes'
import type { CurrencyItem } from './currency-weights'
import type { ItemTipRef } from '../ui'

type Breakdown = (group: EconomyGroup, base: string) => PricedName[]

export function baseTipRef (breakdown: Breakdown, line: number, type: string, base: string) {
  const group = ECONOMY_GROUPS.find(g => g.type === type)
  if (!group?.unique) return { name: base }
  return {
    name: base,
    uniques: () => gradeItems(breakdown(group, base), line)
      .map(i => ({ ...i, label: GRADE_LABEL[i.grade] }))
  }
}

// A Loot tab row's or ground label's tooltip (Guy 2026-11-28: "why unique
// previews no tooltip?"). A unique base, Foulborn too, lists the uniques that
// drop on it with their prices; anything else is its own item.
export function lootTipRef (it: CurrencyItem, breakdown: Breakdown | null, line: number): ItemTipRef {
  if (it.cls !== UNIQUE_CLS) return { name: it.bt ?? it.name }
  const foul = it.name.startsWith(FOULBORN_PREFIX)
  const base = it.bt ?? (foul ? it.name.slice(FOULBORN_PREFIX.length) : it.name)
  const page = ECONOMY_GROUPS.find(g => g.unique)
  if (!breakdown || !page) return { name: base }
  const group = foul ? { ...page, foulborn: true } : page
  return {
    name: base,
    uniques: () => gradeItems(breakdown(group, base), line).map(i => ({ ...i, label: GRADE_LABEL[i.grade] }))
  }
}
