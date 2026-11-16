// A real item a rule with no item list can catch, for its label preview: a
// unique map for "corrupted unique maps", a 2x2 item for "small RGB". Only the
// conditions that say what kind of item it is are checked (class, base,
// rarity, size); the rest (corrupted, mods, quality) are shown beside it in
// words. No item fits: null, and the preview keeps the class name.
import type { FilterBlock, FilterDoc } from './parse'
import type { FilterRarity } from './item-facts'
import { filterClasses, itemCatalog, searchFacts } from './item-search'
import { evalCondition } from './match'

const KIND_KEYS = new Set(['Class', 'BaseType', 'Rarity', 'Width', 'Height'])
const RARITIES: FilterRarity[] = ['Normal', 'Magic', 'Rare', 'Unique']
const AREA_LEVEL = 83

const examples = new WeakMap<FilterBlock, string | null>()
const classesOf = new WeakMap<FilterDoc, Map<string, string>>()

export function exampleItem (block: FilterBlock, doc: FilterDoc): string | null {
  if (examples.has(block)) return examples.get(block)!
  const found = find(block, doc)
  // Game data still loading: try again next time rather than remember nothing.
  if (found !== undefined) examples.set(block, found)
  return found ?? null
}

function find (block: FilterBlock, doc: FilterDoc): string | null | undefined {
  const conds = block.conditions.filter(c => KIND_KEYS.has(c.key))
  if (!conds.length) return null
  const catalog = itemCatalog()
  if (!catalog.length) return undefined
  let classes = classesOf.get(doc)
  if (!classes) classesOf.set(doc, classes = filterClasses(doc))
  const rarityCond = conds.find(c => c.key === 'Rarity')
  const rarities = rarityCond
    ? RARITIES.filter(r => evalCondition(rarityCond, { rarity: r } as Parameters<typeof evalCondition>[1]) === true)
    : ['Rare' as FilterRarity]
  for (const rarity of rarities) {
    for (const item of catalog) {
      if ((rarity === 'Unique') !== (item.kind === 'Unique')) continue
      if (rarity !== 'Unique' && rarity !== 'Normal' && !item.gear) continue
      const facts = searchFacts(item, { areaLevel: AREA_LEVEL, rarity, classes })
      if (conds.every(c => evalCondition(c, facts) === true)) return item.baseType
    }
  }
  return null
}
