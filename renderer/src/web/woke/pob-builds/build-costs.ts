// What each stage of a build costs: its uniques at poe.ninja prices, and how
// many rares it needs, since a rare's price is in its mods.
import { parseClipboard } from '@/parser'
import type { ParsedItem } from '@/parser'
import { isGearSlot, realSets, slotLabel } from './build-model'
import { pobItemText } from './item-text'
import type { PobDetails, PobItem } from './widget'

export interface CostRow {
  slot: string
  item: PobItem
  chaos: number | null
}

export interface StageCost {
  title: string
  // Priced uniques, most expensive first.
  uniques: CostRow[]
  // Uniques poe.ninja has no price for.
  unpriced: CostRow[]
  rares: CostRow[]
  chaos: number
}

// The same query the price check uses, so links and Foulborn variants count.
export type PriceOf = (item: ParsedItem) => number | null

function isUnique (item: PobItem) {
  return item.rarity === 'UNIQUE' || item.rarity === 'RELIC'
}

export function stageCosts (d: PobDetails, priceOf: PriceOf): StageCost[] {
  return realSets(d.itemSets ?? []).map(set => {
    const uniques: CostRow[] = []
    const unpriced: CostRow[] = []
    const rares: CostRow[] = []
    for (const { slot, item } of set.slots) {
      if (!isGearSlot(slot)) continue
      if (item.rarity === 'RARE') {
        rares.push({ slot: slotLabel(slot), item, chaos: null })
      } else if (isUnique(item)) {
        const parsed = parseClipboard(pobItemText(item))
        const chaos = parsed.isOk() ? priceOf(parsed.value) : null
        ;(chaos != null ? uniques : unpriced).push({ slot: slotLabel(slot), item, chaos })
      }
    }
    uniques.sort((a, b) => (b.chaos ?? 0) - (a.chaos ?? 0))
    return {
      title: set.title,
      uniques,
      unpriced,
      rares,
      chaos: uniques.reduce((sum, r) => sum + (r.chaos ?? 0), 0)
    }
  })
}
