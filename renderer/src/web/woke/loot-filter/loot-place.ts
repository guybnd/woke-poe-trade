// Which Loot tab section and row a step rule (tier s0-s5) holds an item in.
// One step rule covers many sections, so the price check's filter chip names
// it by the item's section ("Loot › Early league, Decent") and Go to rule
// opens the item's row, as Alt+F's card does. Loaded only when needed: it
// pulls in the whole Loot tab item list.
import { ALL_CATEGORIES, CSTEP_NAMES, CURRENCY_TYPE, currencyItems } from './currency-weights'
import type { CurrencyItem } from './currency-weights'
import { cardFacts, loadCardFacts } from './card-facts'
import { loadOwnTables, ownTables } from './own-lists'
import { gemLinesOf } from './gem-classes'
import { gemItemFor, itemFor, notItsRarity } from './loot-focus'
import { evalCondition } from './match'
import type { ItemFacts } from './item-facts'
import type { FilterBlock } from './parse'
import type { LootFilterStore } from './store'

export interface LootPlace { cat: string, catName: string, name: string, label: string }

export function lootPlaceOf (store: LootFilterStore, facts: ItemFacts, block: FilterBlock): LootPlace | null {
  const step = block.type === CURRENCY_TYPE ? /^s([0-5])$/.exec(block.tier ?? '') : null
  const doc = store.doc.value
  const lookup = store.prices.lootLookup.value
  if (!step || !doc || !lookup) return null
  loadCardFacts()
  loadOwnTables()
  const name = facts.baseType ?? facts.name
  const gem = / Gems$/.test(facts.itemClass ?? '') ? { level: facts.gemLevel ?? 1, quality: facts.quality ?? 0, corrupted: !!facts.corrupted } : null
  const all = currencyItems({ ...doc, blocks: doc.blocks.filter(b => b.type !== CURRENCY_TYPE) }, lookup, {}, cardFacts.value, gem ? gemLinesOf(store.prices.items.value) : null, ownTables.value)
  const it: CurrencyItem | null | undefined = gem
    ? gemItemFor(all, name, gem, block.conditions)
    : [itemFor(all, name, block.conditions)].find(i => i && !notItsRarity(i, facts.rarity)) ?? all
        .filter(i => !notItsRarity(i, facts.rarity) && (i.bts?.length === 0 ? i.cls === facts.itemClass : (i.bts ?? [i.bt ?? i.name]).includes(name)) && (i.conds ?? []).every(x => evalCondition(x, facts) !== false))
        .sort((a, b) => b.chaos - a.chaos)[0]
  if (!it) return null
  const catName = ALL_CATEGORIES.find(x => x.id === it.cat)?.name ?? 'Other'
  return { cat: it.cat, catName, name: it.name, label: `Loot › ${catName}, ${CSTEP_NAMES[Number(step[1])]}` }
}
