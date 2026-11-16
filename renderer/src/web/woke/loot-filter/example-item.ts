// A real item a rule with no item list can catch, for its label preview: a
// unique map for "corrupted unique maps", a 2x2 item for "small RGB". Only the
// conditions that say what kind of item it is are checked (class, base,
// rarity, size); the rest (corrupted, mods, quality) are shown beside it in
// words. No item fits: null, and the preview keeps the class name.
import type { FilterBlock, FilterDoc } from './parse'
import type { FilterRarity } from './item-facts'
import { filterClasses, itemCatalog, searchFacts } from './item-search'
import { evalCondition } from './match'

const KIND_KEYS = new Set(['Class', 'BaseType', 'Rarity', 'Width', 'Height', 'Sockets', 'LinkedSockets', 'SocketGroup'])
// The item classes that take sockets: as many as fit the item's size, up to 6.
const SOCKETED = new Set(['Body Armours', 'Helmets', 'Gloves', 'Boots', 'Shields', 'One Hand Axes', 'Two Hand Axes', 'One Hand Maces',
  'Two Hand Maces', 'One Hand Swords', 'Two Hand Swords', 'Thrusting One Hand Swords', 'Daggers', 'Rune Daggers', 'Claws', 'Sceptres',
  'Staves', 'Warstaves', 'Wands', 'Bows'])
const RARITIES: FilterRarity[] = ['Normal', 'Magic', 'Rare', 'Unique']
const AREA_LEVEL = 83

// Keyed by what the rule asks for, not the block: the filter is rebuilt (new
// block objects) on every edit, and the same rule should not scan again.
const examples = new Map<string, string | null>()
const classesOf = new WeakMap<FilterDoc, Map<string, string>>()

const kindKey = (block: FilterBlock) => JSON.stringify(block.conditions.filter(c => KIND_KEYS.has(c.key)).map(c => [c.key, c.op, c.count, c.values]))

export function exampleItem (block: FilterBlock, doc: FilterDoc): string | null {
  const key = kindKey(block)
  if (examples.has(key)) return examples.get(key)!
  const found = find(block, doc)
  // Game data still loading: try again next time rather than remember nothing.
  if (found !== undefined) examples.set(key, found)
  return found ?? null
}

function find (block: FilterBlock, doc: FilterDoc): string | null | undefined {
  const conds = block.conditions.filter(c => KIND_KEYS.has(c.key))
  if (!conds.length) return null
  const catalog = itemCatalog()
  if (!catalog.length) return undefined
  let classes = classesOf.get(doc)
  if (!classes) classesOf.set(doc, classes = filterClasses(doc))
  // A rule that names no class or base is about gear (sockets, links, size).
  const gearOnly = !conds.some(c => c.key === 'Class' || c.key === 'BaseType')
  const quick = conds.filter(c => c.key === 'Class' || c.key === 'BaseType')
  const rarityCond = conds.find(c => c.key === 'Rarity')
  const rarities = rarityCond
    ? RARITIES.filter(r => evalCondition(rarityCond, { rarity: r } as Parameters<typeof evalCondition>[1]) === true)
    : ['Rare', 'Normal'] as FilterRarity[]
  for (const rarity of rarities) {
    for (const item of catalog) {
      if ((rarity === 'Unique') !== (item.kind === 'Unique')) continue
      if (rarity !== 'Unique' && rarity !== 'Normal' && !item.gear) continue
      const wearable = item.gear || item.kind === 'Unique'
      if (gearOnly && !wearable) continue
      // Cheap checks first: most of the catalog is the wrong class or base.
      if (quick.some(c => evalCondition(c, { itemClass: item.itemClass ?? classes!.get(item.baseType), baseType: item.baseType, filterBase: item.filterBase } as Parameters<typeof evalCondition>[1]) === false)) continue
      const facts = searchFacts(item, { areaLevel: AREA_LEVEL, rarity, classes })
      // The most it could roll: every socket it fits, linked, all colours.
      const most = SOCKETED.has(facts.itemClass ?? '') ? Math.min(6, item.w * item.h) : 0
      facts.socketGroups = most ? ['RGBRGB'.slice(0, most)] : []
      if (conds.every(c => evalCondition(c, facts) === true)) return item.baseType
    }
  }
  return null
}
