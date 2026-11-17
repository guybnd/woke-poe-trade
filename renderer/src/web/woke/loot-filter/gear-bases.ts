// Facts the Gear page's base picker shows and filters on: slot, defence kind,
// drop level and art, from the app's item data and RePoE's base facts.
import { ITEM_BY_REF } from '@/assets/data'
import { BASE_FACTS } from './base-facts'
import { CATEGORY_CLASSES } from './build-rules'

export type Slot = 'Helmet' | 'Body' | 'Gloves' | 'Boots' | 'Shield' | 'Quiver' | 'Ring' | 'Amulet' | 'Belt' | '1H' | '2H' | 'Caster' | 'Bow'
export type Defence = 'AR' | 'EV' | 'ES' | 'AR/EV' | 'AR/ES' | 'EV/ES' | 'Ward' | 'All'

export const SLOTS: Slot[] = ['Helmet', 'Body', 'Gloves', 'Boots', 'Shield', 'Quiver', 'Ring', 'Amulet', 'Belt', '1H', '2H', 'Caster', 'Bow']
export const DEFENCES: Defence[] = ['AR', 'EV', 'ES', 'AR/EV', 'AR/ES', 'EV/ES', 'Ward']
// What each defence asks of you, to match a build's main attribute.
export const DEFENCE_ATTR: Record<Defence, string> = { 'AR': 'Str', 'EV': 'Dex', 'ES': 'Int', 'AR/EV': 'Str/Dex', 'AR/ES': 'Str/Int', 'EV/ES': 'Dex/Int', 'Ward': 'Dex/Int', 'All': 'All' }

const CATEGORY_SLOT: Record<string, Slot> = {
  'Helmet': 'Helmet',
  'Body Armour': 'Body',
  'Gloves': 'Gloves',
  'Boots': 'Boots',
  'Shield': 'Shield',
  'Quiver': 'Quiver',
  'Ring': 'Ring',
  'Amulet': 'Amulet',
  'Belt': 'Belt',
  'Claw': '1H',
  'Dagger': '1H',
  'Rune Dagger': 'Caster',
  'One-Handed Axe': '1H',
  'One-Handed Mace': '1H',
  'One-Handed Sword': '1H',
  'Sceptre': 'Caster',
  'Wand': 'Caster',
  'Staff': '2H',
  'Warstaff': '2H',
  'Two-Handed Axe': '2H',
  'Two-Handed Mace': '2H',
  'Two-Handed Sword': '2H',
  'Bow': 'Bow'
}

const ARMOUR_CLASS: Record<string, string> = {
  'Helmet': 'Helmets',
  'Body Armour': 'Body Armours',
  'Gloves': 'Gloves',
  'Boots': 'Boots',
  'Shield': 'Shields',
  'Quiver': 'Quivers',
  'Ring': 'Rings',
  'Amulet': 'Amulets',
  'Belt': 'Belts'
}

// The picker's kinds, grouped, with the game's category names.
export const KIND_GROUPS: Array<{ label: string, kinds: Array<{ category: string, label: string }> }> = [
  { label: 'Armour', kinds: [{ category: 'Helmet', label: 'Helmets' }, { category: 'Body Armour', label: 'Body' }, { category: 'Gloves', label: 'Gloves' }, { category: 'Boots', label: 'Boots' }, { category: 'Shield', label: 'Shields' }] },
  { label: 'Jewellery', kinds: [{ category: 'Ring', label: 'Rings' }, { category: 'Amulet', label: 'Amulets' }, { category: 'Belt', label: 'Belts' }, { category: 'Quiver', label: 'Quivers' }] },
  { label: 'One hand', kinds: [{ category: 'Claw', label: 'Claws' }, { category: 'Dagger', label: 'Daggers' }, { category: 'Rune Dagger', label: 'Rune daggers' }, { category: 'One-Handed Sword', label: 'Swords' }, { category: 'One-Handed Axe', label: 'Axes' }, { category: 'One-Handed Mace', label: 'Maces' }, { category: 'Sceptre', label: 'Sceptres' }, { category: 'Wand', label: 'Wands' }] },
  { label: 'Two hand', kinds: [{ category: 'Bow', label: 'Bows' }, { category: 'Staff', label: 'Staves' }, { category: 'Warstaff', label: 'Warstaves' }, { category: 'Two-Handed Sword', label: 'Swords' }, { category: 'Two-Handed Axe', label: 'Axes' }, { category: 'Two-Handed Mace', label: 'Maces' }] }
]
// Defence colours, as the game draws armour, evasion and energy shield.
export const DEFENCE_COLOURS: Record<string, string> = { AR: '#d0503c', EV: '#4caf50', ES: '#5a8cff', Ward: '#c8a050' }

export interface BaseInfo {
  name: string
  // The game's item category ("One-Handed Sword").
  category: string | null
  // The loot filter's Class for it ("Body Armours").
  cls: string | null
  slot: Slot | null
  defence: Defence | null
  dropLevel: number | null
  icon: string | null
}

const cache = new Map<string, BaseInfo>()

export function baseInfo (name: string): BaseInfo {
  let info = cache.get(name)
  if (info) return info
  const item = ITEM_BY_REF('ITEM', name)?.[0]
  const category = item?.craftable?.category
  const a = item?.armour
  let defence: Defence | null = null
  if (a) {
    if (a.ward) defence = 'Ward'
    else {
      const parts = [a.ar ? 'AR' : '', a.ev ? 'EV' : '', a.es ? 'ES' : ''].filter(Boolean)
      defence = parts.length === 3 ? 'All' : parts.length ? parts.join('/') as Defence : null
    }
  }
  info = {
    name,
    category: category ?? null,
    cls: category ? ARMOUR_CLASS[category] ?? CATEGORY_CLASSES[category]?.[0] ?? null : null,
    slot: (category && CATEGORY_SLOT[category]) ?? null,
    defence,
    dropLevel: BASE_FACTS[name]?.[0] ?? null,
    icon: item?.icon ?? null
  }
  cache.set(name, info)
  return info
}

// The art for a kind: its highest drop level base that has art.
const kindIcons = new Map<string, string | null>()
export function kindIcon (category: string): string | null {
  if (kindIcons.has(category)) return kindIcons.get(category)!
  let best: BaseInfo | null = null
  for (const n of allGearBases()) {
    const i = baseInfo(n)
    if (i.category === category && i.icon && (!best || (i.dropLevel ?? 0) > (best.dropLevel ?? 0))) best = i
  }
  const icon = best?.icon ?? null
  if (allGearBases().length) kindIcons.set(category, icon)
  return icon
}

// Every gear base the game drops, for the "Unranked" lane and search.
let all: string[] | null = null
export function allGearBases (): string[] {
  if (all) return all
  all = Object.keys(BASE_FACTS).filter(n => baseInfo(n).slot != null).sort()
  // Item data may not be loaded yet (tests, first frame): try again later.
  if (!all.length) { all = null; return [] }
  return all
}
