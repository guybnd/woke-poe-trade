// The family a bulk item belongs to (fossils, catalysts, essences of one tier...),
// for the list beside the price check. Read from the item data already in
// memory; prices come from the poe.ninja rows the overlay already holds.
import type { BaseType } from '@/assets/data'

interface Rule {
  // Text that every member's data line holds, for the quick search.
  needle: (ref: string) => string
  // The family key of an English item name, or null when it isn't a member.
  key: (ref: string) => string | null
  label: (key: string) => string
}

const ESSENCE_TIERS = ['Whispering', 'Muttering', 'Weeping', 'Wailing', 'Screaming', 'Shrieking', 'Deafening']
const CORRUPT_ESSENCES = new Set(['Essence of Insanity', 'Essence of Horror', 'Essence of Delirium', 'Essence of Hysteria'])

const endsWith = (suffix: string, label: string): Rule => ({
  needle: () => `${suffix}","namespace":"ITEM"`,
  key: ref => ref.endsWith(suffix) ? suffix : null,
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
  endsWith("'s Exalted Orb", 'Influence orbs'),
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

// `search` is ITEMS_ITERATOR: every item data line holding the text.
export function familyOf (info: BaseType, search: (needle: string) => Iterable<BaseType>): Family | null {
  if (info.namespace !== 'ITEM') return null
  const ref = info.refName
  for (const rule of RULES) {
    const key = rule.key(ref)
    if (key == null) continue
    const seen = new Set<string>()
    const members: BaseType[] = []
    for (const item of search(rule.needle(ref))) {
      if (item.namespace !== 'ITEM' || !item.exchangeable || rule.key(item.refName) !== key) continue
      if (seen.has(item.refName)) continue
      seen.add(item.refName)
      members.push(item)
    }
    // A family of one says nothing.
    if (members.length < 2 || !seen.has(ref)) return null
    return { label: rule.label(key), members }
  }
  return null
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
