// The Loot tab's own item lists and price guesses (NeverSink retirement M1,
// Guy's order A, 2026-11-28): which currency, fragments and divination cards
// get a row comes from the game data (item-lists.json, from RePoE by
// item-lists.yml), and an item with no solid live price is guessed from what
// it was worth over the last league read (item-guesses.json, from poe.ninja's
// history by day1-prices.yml), not from NeverSink's tiers.
//
// An item gets a row when it still drops: poe.ninja prices it this league,
// it had a price last league (a guess), or it's one of the odd items
// poe.ninja never prices (ALWAYS). The game data still holds hundreds of
// items that no longer drop (scarabs, sextants, nets, prophecies): they get
// no row. Without prices at all the Loot tab keeps NeverSink's lists, so a
// fresh install still lists everything.
//
// Unique bases (WOKEPOET-697) the same way: every base the game has a unique
// on gets a row while one of its uniques is priced (or was last league), in
// a section from our own data: boss-only and chase from the drop data
// (economy.ts), High variance when a unique on it hides its roll until
// identified (variable-uniques.ts), Early league when its uniques sold for
// 3x their usual price in last league's first days. NeverSink's special
// unique rules (links, Foulborn, corrupted implicits) stay.
//
// Both tables load on first use, so startup JS doesn't grow.
import { shallowRef } from 'vue'
import type { FilterBlock, FilterCondition } from './parse'
import type { EconomyGroup, PriceLookup } from './economy'
import { uniqueCategoryOf } from './unique-classes'

export type ListRow = [name: string, cls: string, art: string]
export interface OwnTables {
  lists: ListRow[]
  // Chaos each over the last league read, by name (plain lines only).
  guesses: Map<string, number>
  // Last league's first-days price, by name (uniques only, day1-prices.json).
  day1?: Map<string, number>
  // Every base with a unique on it, and its uniques (shared/uniques-on-base).
  bases?: () => ReadonlyMap<string, string[]>
  // Uniques whose roll is hidden until identified (variable-uniques.ts).
  variable?: ReadonlySet<string>
  // The unique lists' code (own-uniques.ts), loaded with the tables.
  uniques?: typeof import('./own-uniques')
}

export const ownTables = shallowRef<OwnTables | null>(null)
let loading: Promise<void> | null = null
export function loadOwnTables (): Promise<void> {
  loading ??= Promise.all([import('./item-lists.json'), import('./item-guesses.json'), import('./day1-prices.json'), import('../shared/uniques-on-base'), import('../shared/variable-uniques'), import('./own-uniques')]).then(([l, g, d, u, v, o]) => {
    const lists = (l.default as unknown as { items: ListRow[] }).items ?? []
    type Row = [type: string, name: string, variant: string, chaos: number]
    const read = (rows: Row[] | undefined, keep: (type: string) => boolean) => {
      const out = new Map<string, number>()
      for (const [type, name, variant, chaos] of rows ?? []) {
        if (!variant && chaos > 0 && keep(type) && !out.has(name)) out.set(name, chaos)
      }
      return out
    }
    const guesses = read((g.default as unknown as { items: Row[] }).items, () => true)
    const day1 = read((d.default as unknown as { items: Row[] }).items, type => /^Unique/.test(type))
    ownTables.value = lists.length ? { lists, guesses, day1, bases: u.uniqueBases, variable: new Set(v.VARIABLE_UNIQUE_NAMES), uniques: o } : null
  }).catch(() => { loading = null })
  return loading
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

const cond = (key: string, values: string[]): FilterCondition => ({ key, op: '==', values } as FilterCondition)

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
// (special uniques, gems, maps... still theirs). NeverSink's lists when there
// are no prices yet or no tables.
export function itemSource (blocks: FilterBlock[], t: OwnTables | null, lookup: PriceLookup | null, groupOf: (type: string) => EconomyGroup, any: EconomyGroup, uniquePage?: EconomyGroup): FilterBlock[] {
  if (!t?.lists.length || !lookup) return blocks
  const find = (type: string, name: string) => (lookup(groupOf(type), name) ?? lookup(any, name))?.chaos ?? null
  const own = (b: FilterBlock) => b.type != null && OWN_TYPES.test(b.type)
  // NeverSink's plain unique tiers, when the game's unique bases are read.
  const ownUniques = Boolean(uniquePage && t.uniques && t.bases?.().size)
  const plainUnique = (b: FilterBlock) => ownUniques && b.type === 'uniques' && uniqueCategoryOf(b.tier) != null
  // Until last league's prices are read (no guesses yet), an unpriced item
  // the base filter lists keeps its row, so nothing drops off the tab.
  const names = (keep: (b: FilterBlock) => boolean) => new Set(t.guesses.size ? [] : blocks.filter(keep).flatMap(b => b.conditions.flatMap(c => c.key === 'BaseType' ? c.values : [])))
  const uniques = ownUniques ? t.uniques!.ownUniqueBlocks(t, base => lookup(uniquePage!, base)?.chaos ?? null, names(plainUnique)) : []
  return [...ownBlocks(t, find, names(own)), ...uniques, ...blocks.filter(b => !own(b) && !plainUnique(b))]
}
