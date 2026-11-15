// The editor's search box: any item in the game (bases, uniques, currency,
// cards, gems, maps), turned into the facts a filter sees on the ground, so
// it can say how your filter shows something you haven't picked up yet.
import { ITEMS_ITERATOR } from '@/assets/data'
import type { BaseType } from '@/assets/data'
import { BASE_FACTS } from './base-facts'
import type { FilterRarity, ItemFacts } from './item-facts'
import type { FilterDoc } from './parse'

export type SearchKind = 'Unique' | 'Base' | 'Currency' | 'Card' | 'Gem' | 'Map' | 'Item'

export interface SearchItem {
  name: string
  kind: SearchKind
  // What the filter sees: a unique drops unidentified, so its base.
  baseType: string
  // From the data where it says; else from the filter, else unknown.
  itemClass?: string
  // Normal, magic or rare: gear and maps, which roll a rarity.
  gear: boolean
  transfigured?: boolean
  // The base gem of a transfigured gem: its BaseType in a loot filter.
  filterBase?: string
  w: number
  h: number
}

// The trade data's gear categories, as the game's Item Class names them.
const CLASS_OF_CATEGORY: Record<string, string> = {
  'Body Armour': 'Body Armours',
  'Shield': 'Shields',
  'Helmet': 'Helmets',
  'Amulet': 'Amulets',
  'Boots': 'Boots',
  'Gloves': 'Gloves',
  'Ring': 'Rings',
  'Belt': 'Belts',
  'Quiver': 'Quivers',
  'One-Handed Sword': 'One Hand Swords',
  'One-Handed Mace': 'One Hand Maces',
  'One-Handed Axe': 'One Hand Axes',
  'Two-Handed Sword': 'Two Hand Swords',
  'Two-Handed Mace': 'Two Hand Maces',
  'Two-Handed Axe': 'Two Hand Axes',
  'Wand': 'Wands',
  'Sceptre': 'Sceptres',
  'Claw': 'Claws',
  'Bow': 'Bows',
  'Dagger': 'Daggers',
  'Rune Dagger': 'Rune Daggers',
  'Staff': 'Staves',
  'Warstaff': 'Warstaves',
  'Fishing Rod': 'Fishing Rods',
  'Jewel': 'Jewels',
  'Cluster Jewel': 'Jewels',
  'Abyss Jewel': 'Abyss Jewels',
  'Tincture': 'Tinctures',
  'Map': 'Maps',
  'Heist Tool': 'Heist Tools',
  'Heist Cloak': 'Heist Cloaks',
  'Heist Brooch': 'Heist Brooches',
  'Heist Gear': 'Heist Gear',
  'Heist Contract': 'Contracts',
  'Heist Blueprint': 'Blueprints',
  'Sanctum Relic': 'Relics',
  'Trinket': 'Trinkets',
  'Expedition Logbook': 'Expedition Logbooks',
  'Idol': 'Idols',
  'Unique Fragment': 'Pieces',
  'Chart': 'Chart',
  'Viscera': 'Viscera',
  'Invitation': 'Misc Map Items'
}

// Gear rolls a rarity; these drop as they are.
const NO_RARITY_CATEGORIES = new Set(['Heist Contract', 'Heist Blueprint', 'Expedition Logbook', 'Sanctum Relic', 'Unique Fragment', 'Invitation', 'Viscera'])

function flaskClass (name: string): string {
  if (/Life Flask$/.test(name)) return 'Life Flasks'
  if (/Mana Flask$/.test(name)) return 'Mana Flasks'
  if (/Hybrid Flask$/.test(name)) return 'Hybrid Flasks'
  return 'Utility Flasks'
}

export function classOfBase (b: Pick<BaseType, 'name' | 'craftable' | 'icon'>): string | undefined {
  const cat = b.craftable?.category
  if (!cat) return undefined
  if (cat === 'Flask') return flaskClass(b.name)
  // The data files rapiers with swords; only their art says otherwise.
  if (cat === 'One-Handed Sword' && /Rapier/.test(b.icon)) return 'Thrusting One Hand Swords'
  return CLASS_OF_CATEGORY[cat]
}

const SHOWN = ['ITEM', 'UNIQUE', 'GEM', 'DIVINATION_CARD'] as const

// Every item once by name, from the game data. `lines` is for tests.
export function buildCatalog (lines?: Iterable<BaseType>): SearchItem[] {
  const all: BaseType[] = lines ? [...lines] : SHOWN.flatMap(ns => [...ITEMS_ITERATOR(`"namespace":"${ns}"`)])
  const bases = new Map<string, BaseType>()
  for (const b of all) if (b.namespace === 'ITEM' && !bases.has(b.refName)) bases.set(b.refName, b)
  const out: SearchItem[] = []
  const seen = new Set<string>()
  for (const b of all) {
    if (!(SHOWN as readonly string[]).includes(b.namespace)) continue
    const key = `${b.namespace}|${b.refName}`
    if (seen.has(key)) continue
    seen.add(key)
    const size = (base: BaseType | undefined) => {
      const known = base ? BASE_FACTS[base.refName] : undefined
      return { w: known?.[1] ?? base?.w ?? 1, h: known?.[2] ?? base?.h ?? 1 }
    }
    if (b.namespace === 'UNIQUE') {
      const base = b.unique ? bases.get(b.unique.base) : undefined
      out.push({ name: b.refName, kind: 'Unique', baseType: b.unique?.base ?? b.refName, itemClass: base ? classOfBase(base) : undefined, gear: false, ...size(base) })
    } else if (b.namespace === 'GEM') {
      const transfigured = Boolean(b.gem?.transfigured)
      const filterBase = transfigured ? b.gem?.normalVariant : undefined
      out.push({ name: b.refName, kind: 'Gem', baseType: b.refName, itemClass: / Support$/.test(b.refName) ? 'Support Gems' : 'Skill Gems', gear: false, transfigured, ...(filterBase ? { filterBase } : {}), w: 1, h: 1 })
    } else if (b.namespace === 'DIVINATION_CARD') {
      out.push({ name: b.refName, kind: 'Card', baseType: b.refName, itemClass: 'Divination Cards', gear: false, w: 1, h: 1 })
    } else {
      const cat = b.craftable?.category
      const itemClass = classOfBase(b)
      const isMap = cat === 'Map' || / Map$/.test(b.refName)
      const kind: SearchKind = isMap ? 'Map' : cat ? 'Base' : b.exchangeable ? 'Currency' : 'Item'
      out.push({
        name: b.refName,
        kind,
        baseType: b.refName,
        itemClass: itemClass ?? (isMap ? 'Maps' : undefined),
        gear: (!!cat && !NO_RARITY_CATEGORIES.has(cat)) || isMap,
        ...size(b)
      })
    }
  }
  return out
}

let catalog: SearchItem[] | null = null
export function itemCatalog (): SearchItem[] {
  if (!catalog) {
    const list = buildCatalog()
    // Game data still loading gives nothing: look again next time.
    if (!list.length) return []
    catalog = list
  }
  return catalog
}

// Item classes the filter itself names for a base: `Class == "X"` beside
// `BaseType == ... "Name"`. Fills in currency, fragments and the like, which
// the data gives no class.
// A block naming several classes ("Map Fragments" "Misc Map Items") only
// counts when no block names one alone; then its first class stands in.
export function filterClasses (doc: FilterDoc): Map<string, string> {
  const single = new Map<string, string>()
  const several = new Map<string, string>()
  for (const b of doc.blocks) {
    const cls = b.conditions.find(c => c.key === 'Class' && c.op === '==' && c.values.length >= 1)
    if (!cls) continue
    const into = cls.values.length === 1 ? single : several
    for (const c of b.conditions) {
      if (c.key !== 'BaseType' || c.op !== '==') continue
      for (const v of c.values) if (!into.has(v)) into.set(v, cls.values[0])
    }
  }
  for (const [k, v] of several) if (!single.has(k)) single.set(k, v)
  return single
}

// Best first: whole name, name start, word start, anywhere. Uniques and
// currency before bases of the same rank, since they're asked about more.
export function searchItems (list: SearchItem[], query: string, limit = 12): SearchItem[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const KIND_ORDER: SearchKind[] = ['Currency', 'Unique', 'Card', 'Base', 'Map', 'Gem', 'Item']
  const ranked: Array<{ item: SearchItem, rank: number }> = []
  for (const item of list) {
    const n = item.name.toLowerCase()
    const at = n.indexOf(q)
    if (at < 0) continue
    const rank = n === q ? 0 : at === 0 ? 1 : /[\s'-]/.test(n[at - 1]) ? 2 : 3
    ranked.push({ item, rank })
  }
  ranked.sort((a, b) => a.rank - b.rank ||
    KIND_ORDER.indexOf(a.item.kind) - KIND_ORDER.indexOf(b.item.kind) ||
    a.item.name.length - b.item.name.length ||
    a.item.name.localeCompare(b.item.name))
  // A rare's title, "Doom Nails, Spike-Point Arrow Quiver": its random name
  // is in no data, but the base inside it is. Those go first, unless a name
  // is or starts with the query ("vaal grace" stays Vaal Grace, not Grace).
  const inside = ranked.some(r => r.rank <= 1) ? [] : namesInside(list, q)
  const seen = new Set(inside)
  return [...inside, ...ranked.map(r => r.item).filter(i => !seen.has(i))].slice(0, limit)
}

// Items whose whole name sits in the query as words, longest first, leaving
// out names that only appear inside a longer one ("Arrow Quiver" in
// "Spike-Point Arrow Quiver").
function namesInside (list: SearchItem[], q: string): SearchItem[] {
  if (!/[\s,]/.test(q)) return []
  const hits: SearchItem[] = []
  for (const item of list) {
    const n = item.name.toLowerCase()
    if (n.length < 5 || n.length >= q.length) continue
    let at = q.indexOf(n)
    while (at >= 0) {
      const before = at === 0 || /[\s,]/.test(q[at - 1])
      const after = at + n.length === q.length || /[\s,]/.test(q[at + n.length])
      if (before && after) { hits.push(item); break }
      at = q.indexOf(n, at + 1)
    }
  }
  hits.sort((a, b) => b.name.length - a.name.length || a.name.localeCompare(b.name))
  return hits.filter(h => !hits.some(o => o.name.length > h.name.length && o.name.toLowerCase().includes(h.name.toLowerCase())))
}

// The item as it lies on the ground in an area of this level.
export function searchFacts (item: SearchItem, opts: { areaLevel: number, rarity?: FilterRarity, classes?: Map<string, string> }): ItemFacts {
  const { areaLevel } = opts
  const known = BASE_FACTS[item.baseType]
  const itemClass = item.itemClass ?? opts.classes?.get(item.baseType) ?? guessClass(item)
  const facts: ItemFacts = {
    name: item.name,
    itemClass,
    baseType: item.baseType,
    rarity: item.kind === 'Unique' ? 'Unique' : item.gear ? (opts.rarity ?? 'Rare') : 'Normal',
    itemLevel: areaLevel,
    dropLevel: known?.[0],
    width: item.w,
    height: item.h,
    quality: 0,
    memoryStrands: 0,
    identified: false,
    corrupted: false,
    // A fresh drop: none of the special states a copy could show.
    mirrored: false,
    fractured: false,
    synthesised: false,
    replica: item.kind === 'Unique' && item.name.startsWith('Replica '),
    foulborn: false,
    vestigial: false,
    transfigured: item.kind === 'Gem' ? !!item.transfigured : false,
    filterBase: item.filterBase,
    zanaMemory: false,
    exceptional: false,
    imbued: false,
    crucibleTree: false,
    blightedMap: false,
    uberBlightedMap: false,
    anyEnchantment: false,
    corruptedMods: 0,
    exarchTier: 0,
    eaterTier: 0,
    enchantments: [],
    influences: [],
    explicitModNames: [],
    areaLevel
  }
  if (item.kind === 'Currency' || item.kind === 'Card' || itemClass === 'Stackable Currency') facts.stackSize = 1
  if (item.kind === 'Gem') facts.gemLevel = 1
  // Unique maps sit on the plain "Map" base, so they get a tier too.
  if (item.kind === 'Map' || itemClass === 'Maps') {
    // A map's tier follows the area it drops in.
    facts.mapTier = Math.max(1, Math.min(16, areaLevel - 67))
    facts.dropLevel = 67 + facts.mapTier
    // Plain maps go by tier on the ground: "Map (Tier 16)", as item-facts reads a copy.
    const plain = /^(Blighted |Blight-ravaged )?Map$/.exec(item.baseType)
    if (plain) {
      facts.baseType = `Map (Tier ${facts.mapTier})`
      facts.blightedMap = plain[1] === 'Blighted '
      facts.uberBlightedMap = plain[1] === 'Blight-ravaged '
    }
  }
  return facts
}

function guessClass (item: SearchItem): string | undefined {
  if (/Scarab\b/.test(item.name)) return 'Map Fragments'
  if (item.kind === 'Currency') return 'Stackable Currency'
  return undefined
}
