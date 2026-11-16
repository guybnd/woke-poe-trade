// The family a bulk item belongs to (fossils, catalysts, essences of one tier...),
// for the list beside the price check. Read from the item data already in
// memory; prices come from the poe.ninja rows the overlay already holds.
import type { BaseType } from '@/assets/data'

interface Rule {
  // Members the name pattern misses.
  extra?: string[]
  // Text that every member's data line holds, for the quick search.
  needle: (ref: string) => string
  // The family key of an English item name, or null when it isn't a member.
  key: (ref: string) => string | null
  label: (key: string) => string
}

const ESSENCE_TIERS = ['Whispering', 'Muttering', 'Weeping', 'Wailing', 'Screaming', 'Shrieking', 'Deafening']
const CORRUPT_ESSENCES = new Set(['Essence of Insanity', 'Essence of Horror', 'Essence of Delirium', 'Essence of Hysteria'])

const endsWith = (suffix: string, label: string, extra?: string[]): Rule => ({
  extra,
  needle: () => `${suffix}","namespace":"ITEM"`,
  key: ref => (ref.endsWith(suffix) || extra?.includes(ref)) ? suffix : null,
  label: () => label
})
const startsWith = (prefix: string, label: string): Rule => ({
  needle: () => `"refName":"${prefix}`,
  key: ref => ref.startsWith(prefix) ? prefix : null,
  label: () => label
})

const RULES: Rule[] = [
  endsWith(' Fossil', 'Fossils'),
  endsWith(' Resonator', 'Resonators'),
  endsWith(' Catalyst', 'Catalysts'),
  endsWith(' Oil', 'Oils'),
  endsWith(' Delirium Orb', 'Delirium Orbs'),
  endsWith(' Astrolabe', 'Astrolabes'),
  endsWith(' Thread', 'Threads'),
  endsWith(' Enshrouding Crystal', 'Enshrouding Crystals'),
  endsWith(' Crystallised Lifeforce', 'Lifeforce'),
  endsWith("'s Ducat", 'Ducats'),
  endsWith("'s Exalted Orb", 'Influence orbs', ["Awakener's Orb", 'Orb of Dominance']),
  startsWith('Omen of ', 'Omens'),
  startsWith('Runegraft of ', 'Runegrafts'),
  startsWith('Allflame Ember of ', 'Allflame Embers'),
  startsWith('Soul Core of ', 'Soul Cores'),
  startsWith("Maven's Chisel of ", "Maven's Chisels"),
  startsWith('Tainted ', 'Tainted currency'),
  {
    // One tier of every essence: what a stack of them is sold beside.
    needle: ref => `"refName":"${ref.split(' ')[0]} Essence of `,
    key: ref => {
      const tier = ref.split(' ')[0]
      return ESSENCE_TIERS.includes(tier) && ref.startsWith(`${tier} Essence of `) ? tier : null
    },
    label: tier => `${tier} essences`
  },
  {
    needle: () => '"refName":"Essence of ',
    key: ref => CORRUPT_ESSENCES.has(ref) ? 'corrupt' : null,
    label: () => 'Corruption essences'
  },
  {
    needle: () => 'Eldritch ',
    key: ref => /^(Lesser|Greater|Grand|Exceptional) Eldritch (Ember|Ichor)$/.test(ref) ? 'eldritch' : null,
    label: () => 'Eldritch currency'
  },
  {
    // Scarabs by league mechanic: "Abyss Scarab", "Abyss Scarab of Crystals"...
    needle: ref => `"refName":"${ref.split(' Scarab')[0]} Scarab`,
    key: ref => /^[A-Z][\w' -]* Scarab( of .+)?$/.test(ref) ? ref.split(' Scarab')[0] : null,
    label: kind => `${kind} Scarabs`
  },
  {
    needle: () => '"refName":"Timeless ',
    key: ref => /^Timeless .+ (Splinter|Emblem)$/.test(ref) ? ref.split(' ').pop()! : null,
    label: kind => `Timeless ${kind.toLowerCase()}s`
  },
  startsWith('Tattoo of ', 'Tattoos')
]

export interface Family {
  label: string
  members: BaseType[]
}

// The first rule that takes a name decides its family, for the checked item
// and for every member alike (Tainted Catalyst is a catalyst, not tainted currency).
function ruleOf (ref: string): { rule: Rule, key: string } | null {
  for (const rule of RULES) {
    const key = rule.key(ref)
    if (key != null) return { rule, key }
  }
  return null
}

// `search` is ITEMS_ITERATOR (every item data line holding the text); `byRef`
// finds a rule's extra members, which no search text covers.
export function familyOf (
  info: BaseType,
  search: (needle: string) => Iterable<BaseType>,
  byRef: (ref: string) => BaseType | undefined
): Family | null {
  if (info.namespace !== 'ITEM') return null
  const ref = info.refName
  const found = ruleOf(ref)
  if (!found) return null
  const { rule, key } = found
  const seen = new Set<string>()
  const members: BaseType[] = []
  const add = (item: BaseType | undefined) => {
    if (!item || item.namespace !== 'ITEM' || !item.exchangeable || seen.has(item.refName)) return
    const own = ruleOf(item.refName)
    if (own?.rule !== rule || own.key !== key) return
    seen.add(item.refName)
    members.push(item)
  }
  for (const item of search(rule.needle(ref))) add(item)
  for (const name of rule.extra ?? []) add(byRef(name))
  // A family of one says nothing.
  if (members.length < 2 || !seen.has(ref)) return null
  return { label: rule.label(key), members }
}

export interface FamilyRow {
  info: BaseType
  chaos: number | null
  own: boolean
}

// Dearest first; no poe.ninja price goes last, by name.
export function familyRows (fam: Family, own: string, priceOf: (refName: string) => number | null): FamilyRow[] {
  return fam.members
    .map(info => ({ info, chaos: priceOf(info.refName), own: info.refName === own }))
    .sort((a, b) => (b.chaos ?? -1) - (a.chaos ?? -1) || a.info.name.localeCompare(b.info.name))
}
