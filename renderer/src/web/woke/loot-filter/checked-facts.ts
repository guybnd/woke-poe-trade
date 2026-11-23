// What the loot filter sees of a price checked item. A real copy says it all;
// an item price checked by name from a list (a "Related to" row, Search) comes
// as text the app wrote, whose Item Class is a guess: every bulk item reads as
// "Stackable Currency", though a Zorath's Eye is a Map Fragment in game. The
// filter itself names the class beside the base, so that wins there.
import type { ParsedItem } from '@/parser'
import { isStackText } from '../ui/tooltip/item-menu-logic'
import { itemFacts } from './item-facts'
import type { ItemFacts } from './item-facts'
import { filterClasses } from './item-search'
import type { FilterDoc } from './parse'

const classesOf = new WeakMap<FilterDoc, Map<string, string>>()

export function filterClassesOf (doc: FilterDoc): Map<string, string> {
  let classes = classesOf.get(doc)
  if (!classes) classesOf.set(doc, classes = filterClasses(doc))
  return classes
}

export function checkedItemFacts (doc: FilterDoc, text: string, parsed: ParsedItem | null): ItemFacts {
  const facts = itemFacts(text, parsed)
  if (!isStackText(text) || !facts.baseType) return facts
  const itemClass = filterClassesOf(doc).get(facts.baseType)
  return itemClass ? { ...facts, itemClass } : facts
}
