// What each stage of a build costs: its uniques at poe.ninja prices, and how
// many rares it needs, since a rare's price is in its mods.
import { parseClipboard } from '@/parser'
import type { ParsedItem } from '@/parser'
import { isGearSlot, realSets, slotLabel } from './build-model'
import { pobItemText } from './item-text'
import type { PobDetails, PobItem } from './widget'

export interface Price {
  chaos: number
  // Above chaos when only the name is known and its variants differ.
  high?: number
}

export interface CostRow {
  slot: string
  item: PobItem
  price: Price | null
}

export interface StageCost {
  title: string
  // Priced uniques, most expensive first.
  uniques: CostRow[]
  // Uniques poe.ninja has no price for.
  unpriced: CostRow[]
  rares: CostRow[]
  // The lowest price of each unique.
  chaos: number
  // Some uniques are a range, so the total is where it starts.
  atLeast: boolean
}

// `parsed` is null when the price check can't read the item.
export type PriceOf = (item: PobItem, parsed: ParsedItem | null) => Price | null

function isUnique (item: PobItem) {
  return item.rarity === 'UNIQUE' || item.rarity === 'RELIC'
}

export function stageCosts (d: PobDetails, priceOf: PriceOf): StageCost[] {
  const sets = realSets(d.itemSets ?? [])
  const trees = realSets(d.trees ?? [])
  return sets.map(set => {
    const uniques: CostRow[] = []
    const unpriced: CostRow[] = []
    const rares: CostRow[] = []
    const addUnique = (slot: string, item: PobItem) => {
      const parsed = parseClipboard(pobItemText(item))
      const price = priceOf(item, parsed.isOk() ? parsed.value : null)
      ;(price ? uniques : unpriced).push({ slot, item, price })
    }
    for (const { slot, item } of set.slots) {
      if (!isGearSlot(slot)) continue
      if (item.rarity === 'RARE') rares.push({ slot: slotLabel(slot), item, price: null })
      else if (isUnique(item)) addUnique(slotLabel(slot), item)
    }
    // Jewels go with the tree of the same name, or the only one.
    const tree = trees.find(t => t.title === set.title) ?? (sets.length === 1 ? trees.find(t => t.isActive) ?? trees[0] : undefined)
    for (const jewel of tree?.jewels ?? []) {
      if (isUnique(jewel)) addUnique('Tree', jewel)
    }
    uniques.sort((a, b) => (b.price?.chaos ?? 0) - (a.price?.chaos ?? 0))
    return {
      title: set.title,
      uniques,
      unpriced,
      rares,
      chaos: uniques.reduce((sum, r) => sum + (r.price?.chaos ?? 0), 0),
      atLeast: uniques.some(r => r.price?.high != null) || unpriced.length > 0
    }
  })
}
