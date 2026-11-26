// One reader for league variant names, so every tool tells a Foulborn unique,
// a Replica, a Fated base or a transfigured gem from its original the same way.
//
// `plain` is the original item's name. A Foulborn unique and a Fated base are
// not in the item data under their own names, so tools look them up by
// `plain`. A Replica unique and a transfigured gem are in the data under their
// own names: look those up by `name`, and use `plain` for the original.
// Pure: no item data is loaded here, so pure modules can use it.
import type { BaseType } from '@/assets/data/interfaces'

export type ItemVariant = 'foulborn' | 'replica' | 'fated' | 'transfigured'

export interface ItemName {
  name: string
  plain: string
  variant: ItemVariant | null
}

const PREFIX: Array<[ItemVariant, string]> = [
  ['foulborn', 'Foulborn '],
  ['replica', 'Replica '],
  ['fated', 'Fated ']
]

type Lookup = (ns: BaseType['namespace'], name: string) => BaseType[] | undefined

// "Foulborn Headhunter" -> { plain: "Headhunter", variant: "foulborn" }.
// "Ice Nova of Frostbolts" -> { plain: "Ice Nova", variant: "transfigured" }.
// A name only counts as transfigured when the item data says so: pass
// `lookup` (ITEM_BY_REF) for that, or gems read as plain names.
export function readItemName (name: string, lookup?: Lookup): ItemName {
  for (const [variant, prefix] of PREFIX) {
    if (variant === 'foulborn' && FOULBORN_ITEMS.has(name)) continue
    if (name.startsWith(prefix)) return { name, plain: name.slice(prefix.length), variant }
  }
  const gem = lookup?.('GEM', name)?.[0]?.gem
  if (gem?.transfigured && gem.normalVariant) return { name, plain: gem.normalVariant, variant: 'transfigured' }
  return { name, plain: name, variant: null }
}

// Currency the game itself names "Foulborn ..." (the orbs that make Foulborn
// uniques). They are items of their own, not Foulborn copies of a unique. A
// test checks this list against the item data.
export const FOULBORN_ITEMS: ReadonlySet<string> = new Set([
  'Foulborn Exalted Orb',
  'Foulborn Orb of Augmentation',
  'Foulborn Regal Orb'
])

export function isFoulborn (name: string): boolean {
  return name.startsWith('Foulborn ') && !FOULBORN_ITEMS.has(name)
}

export function isReplica (name: string): boolean {
  return name.startsWith('Replica ')
}

// The name the item data knows a unique by: Foulborn copies share their
// unique's entry (the data has no Foulborn names). Other names are kept.
export function dataUniqueName (name: string): string {
  return isFoulborn(name) ? name.slice('Foulborn '.length) : name
}

// A Fated item's base ("Fated Lathi" -> "Lathi"), as filters' BaseType names it.
export function unfatedBase (base: string): string {
  return isFated(base) ? base.slice('Fated '.length) : base
}

export function isFated (name: string): boolean {
  return name.startsWith('Fated ')
}
