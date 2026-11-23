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

// Every class the filter names beside each base, single-class blocks first.
// The app's own rules (`woke->`) are left out: one made from a by-name check
// before this fix copied its wrong "Stackable Currency" class.
const namedOf = new WeakMap<FilterDoc, Map<string, string[]>>()
function namedClasses (doc: FilterDoc): Map<string, string[]> {
  let named = namedOf.get(doc)
  if (named) return named
  named = new Map()
  const blocks = doc.blocks.filter(b => !b.type?.startsWith('woke->'))
  for (const single of [true, false]) {
    for (const b of blocks) {
      const cls = b.conditions.find(c => c.key === 'Class' && c.op === '==' && c.values.length >= 1)
      if (!cls || (cls.values.length === 1) !== single) continue
      for (const c of b.conditions) {
        if (c.key !== 'BaseType' || c.op !== '==') continue
        for (const v of c.values) {
          const list = named.get(v) ?? []
          for (const k of cls.values) if (!list.includes(k)) list.push(k)
          named.set(v, list)
        }
      }
    }
  }
  namedOf.set(doc, named)
  return named
}

// Scarabs are Map Fragments in game; newer filters no longer list them.
function guessed (base: string): string | undefined {
  return /Scarab\b/.test(base) ? 'Map Fragments' : undefined
}

export function checkedItemFacts (doc: FilterDoc, text: string, parsed: ParsedItem | null): ItemFacts {
  const facts = itemFacts(text, parsed)
  if (!isStackText(text) || !facts.baseType) return facts
  const named = namedClasses(doc).get(facts.baseType)
  // The text's own class stands when the filter names it too (fossils sit
  // under "Delve Stackable Socketable Currency" "Stackable Currency").
  if (named?.length && facts.itemClass && named.includes(facts.itemClass)) return facts
  const itemClass = named?.[0] ?? guessed(facts.baseType)
  return itemClass ? { ...facts, itemClass } : facts
}
