// The Loot tab's own lists as rules (own-lists.ts has the why), loaded with
// the tables so startup JS doesn't grow.
import type { FilterBlock, FilterCondition } from './parse'
import type { EconomyGroup, PriceLookup } from './economy'
import type { OwnTables } from './own-lists'
import { uniqueCategoryOf } from './unique-classes'

const cond = (key: string, values: string[]): FilterCondition => ({ key, op: '==', values } as FilterCondition)

// Early league (Guy's pick, 2026-11-28): a base whose uniques sold for this
// many times their usual price in last league's first days, and for at
// least EARLY_MIN chaos.
export const EARLY_RATIO = 3
export const EARLY_MIN = 5

// What last league says about a unique base: its uniques' usual price and
// their first days' price (plain averages), and whether they started well
// above it.
export function baseGuess (t: OwnTables, base: string): { chaos: number, first: number, early: boolean } | null {
  const names = t.bases?.().get(base) ?? []
  const usual = names.map(n => t.guesses.get(n)).filter((x): x is number => x != null)
  if (!usual.length) return null
  const chaos = usual.reduce((a, b) => a + b, 0) / usual.length
  const first = names.map(n => t.day1?.get(n)).filter((x): x is number => x != null)
  const day1 = first.length ? first.reduce((a, b) => a + b, 0) / first.length : 0
  return { chaos, first: day1, early: day1 >= EARLY_MIN && day1 >= chaos * EARLY_RATIO }
}

// Own unique tiers, read by uniqueCategoryOf like NeverSink's plain ones.
export const OWN_UNIQUE_TIER = { plain: 'own', variable: 'ownvar', early: 'ownearly' } as const

// The unique bases as rules, one per section, with only the bases one of
// whose uniques is priced now or was last league. `find`: a live price.
export function ownUniqueBlocks (t: OwnTables, find: (base: string) => number | null, listed: ReadonlySet<string> = new Set()): FilterBlock[] {
  const by = new Map<string, string[]>()
  for (const [base, names] of t.bases?.() ?? []) {
    const live = find(base)
    const g = baseGuess(t, base)
    if (!(live != null && live > 0) && !g && !listed.has(base)) continue
    const tier = g?.early ? OWN_UNIQUE_TIER.early : names.some(n => t.variable?.has(n)) ? OWN_UNIQUE_TIER.variable : OWN_UNIQUE_TIER.plain
    by.set(tier, [...by.get(tier) ?? [], base])
  }
  return [...by].map(([tier, names], i) => ({
    kind: 'block',
    index: -1001 - i,
    line: 0,
    visibility: 'Show',
    disabled: false,
    comment: `own list, uniques ${tier}`,
    type: 'uniques',
    tier,
    conditions: [cond('Rarity', ['Unique']), cond('BaseType', names)],
    actions: [],
    continue: false,
    section: '',
    subsection: '',
    raw: [],
    dirty: false
  }))
}

// Odd items poe.ninja doesn't price that still drop: always a row.
export const ALWAYS = new Set(["Facetor's Lens", 'Scrying Orb', 'Albino Rhoa Feather'])

// The Loot tab's types (the names NeverSink's rules use, which pick the
// tab's category and poe.ninja's page), from the item's class, art and name.
export function ownType (name: string, cls: string, art: string): string | null {
  if (/Scarabs\//.test(art) || /Scarab( of |$)/.test(name)) return null // gone in 3.30
  if (cls === 'Divination Cards') return 'divination'
  if (cls === 'Map Fragments' || cls === 'Misc Map Items') return 'fragments'
  if (cls !== 'Stackable Currency' && cls !== 'Delve Stackable Socketable Currency') return null
  if (/^Currency\/Essence\//.test(art) || / Essence of /.test(name)) return 'currency->essence'
  if (/^Currency\/Delve\//.test(art) || / (Fossil|Resonator)$/.test(name)) return 'currency->fossil'
  if (/ Oil$/.test(name)) return 'currency->oil'
  if (/Delirium Orb$/.test(name)) return 'currency->deliriumorbs'
  if (/^Omen of /.test(name)) return 'currency->trial->omen'
  if (/(^| )Tattoo of /.test(name)) return 'currency->trial->tattoo'
  if (name === "Dead Man's Sulphur") return 'currency->deadmansulphur'
  if (/'s Ducat$/.test(name)) return 'currency->ducats'
  if (/Crystallised Lifeforce$/.test(name)) return 'currency->harvest'
  // NeverSink lists the Royal Visage with the Allflame Embers.
  if (/^Allflame Ember of /.test(name) || name === 'Royal Visage') return 'mapenchantments'
  if (/^Runegraft of /.test(name)) return 'runesgrafts'
  if (name === 'Simulacrum Splinter') return 'currency->splinter->simulacrum'
  if (/^Splinter of |^Timeless .+ Splinter$|^Ritual Splinter$/.test(name)) return 'currency->splinter'
  if (name === "Rogue's Marker") return 'currency->heist'
  // Odd orbs NeverSink keeps apart from the orbs: the Other section.
  if (name === 'Scrying Orb' || name === 'Unshaping Orb') return 'currency->others'
  return 'currency'
}

// The lists as rules the Loot tab reads in place of NeverSink's, one per type
// and class, with only the items that still drop. `find`: a live price.
// `listed`: names that also count as still dropping (see itemSource).
export function ownBlocks (t: OwnTables, find: (type: string, name: string) => number | null, listed: ReadonlySet<string> = new Set()): FilterBlock[] {
  const by = new Map<string, { type: string, cls: string, names: string[] }>()
  for (const [name, cls, art] of t.lists) {
    const type = ownType(name, cls, art)
    if (!type) continue
    const live = name === 'Chaos Orb' ? 1 : find(type, name)
    if (!(live != null && live > 0) && !t.guesses.has(name) && !ALWAYS.has(name) && !listed.has(name)) continue
    const key = `${type}|${cls}`
    const g = by.get(key) ?? { type, cls, names: [] }
    g.names.push(name)
    by.set(key, g)
  }
  return [...by.values()].map((g, i) => ({
    kind: 'block',
    index: -1 - i,
    line: 0,
    visibility: 'Show',
    disabled: false,
    comment: `own list, ${g.type}`,
    type: g.type,
    tier: null,
    conditions: [cond('Class', [g.cls]), cond('BaseType', g.names)],
    actions: [],
    continue: false,
    section: '',
    subsection: '',
    raw: [],
    dirty: false
  }))
}

// NeverSink's types the own lists stand in for.
export const OWN_TYPES = /^(currency(->(essence|fossil|oil|deliriumorbs|trial->omen|trial->tattoo|ducats|others|deadmansulphur|harvest|heist|splinter|splinter->simulacrum))?|mapenchantments|runesgrafts|fragments|divination)$/

// The blocks to read items from: the own lists, then NeverSink's other rules
// (special uniques, gems, maps... still theirs).
export function itemSource (blocks: FilterBlock[], t: OwnTables, lookup: PriceLookup, groupOf: (type: string) => EconomyGroup, any: EconomyGroup, uniquePage?: EconomyGroup): FilterBlock[] {
  const find = (type: string, name: string) => (lookup(groupOf(type), name) ?? lookup(any, name))?.chaos ?? null
  const own = (b: FilterBlock) => b.type != null && OWN_TYPES.test(b.type)
  // NeverSink's plain unique tiers, when the game's unique bases are read.
  const ownUniques = Boolean(uniquePage && t.bases?.().size)
  const plainUnique = (b: FilterBlock) => ownUniques && b.type === 'uniques' && uniqueCategoryOf(b.tier) != null
  // Until last league's prices are read (no guesses yet), an unpriced item
  // the base filter lists keeps its row, so nothing drops off the tab.
  const names = (keep: (b: FilterBlock) => boolean) => new Set(t.guesses.size ? [] : blocks.filter(keep).flatMap(b => b.conditions.flatMap(c => c.key === 'BaseType' ? c.values : [])))
  const uniques = ownUniques ? ownUniqueBlocks(t, base => lookup(uniquePage!, base)?.chaos ?? null, names(plainUnique)) : []
  return [...ownBlocks(t, find, names(own)), ...uniques, ...blocks.filter(b => !own(b) && !plainUnique(b))]
}
