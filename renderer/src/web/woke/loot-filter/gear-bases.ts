// Facts the Gear page's base picker shows and filters on: slot, defence kind,
// drop level and art, from the app's item data and RePoE's base facts.
import { ITEM_BY_REF } from '@/assets/data'
import { BASE_FACTS } from './base-facts'

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

export interface BaseInfo {
  name: string
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
    slot: (category && CATEGORY_SLOT[category]) ?? null,
    defence,
    dropLevel: BASE_FACTS[name]?.[0] ?? null,
    icon: item?.icon ?? null
  }
  cache.set(name, info)
  return info
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
