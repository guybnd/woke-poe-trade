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
import type { FilterBlock } from './parse'
import type { EconomyGroup, PriceLookup } from './economy'
// Both already in the startup bundle.
import { uniqueBases } from '../shared/uniques-on-base'
import { VARIABLE_UNIQUE_NAMES } from '../shared/variable-uniques'

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
  // The lists' code (own-rules.ts), loaded with the tables.
  rules?: typeof import('./own-rules')
}

// item-lists.json names each row's Class by its index in `classes`.
export function readLists (json: unknown): ListRow[] {
  const t = json as { classes?: string[], items?: Array<[string, number | string, string]> }
  return (t.items ?? []).map(([name, c, art]) => [name, typeof c === 'number' ? t.classes?.[c] ?? '' : c, art])
}

export const ownTables = shallowRef<OwnTables | null>(null)
let loading: Promise<void> | null = null
export function loadOwnTables (): Promise<void> {
  loading ??= Promise.all([import('./item-lists.json'), import('./item-guesses.json'), import('./day1-prices.json'), import('./own-rules')]).then(([l, g, d, o]) => {
    const lists = readLists(l.default)
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
    ownTables.value = lists.length ? { lists, guesses, day1, bases: uniqueBases, variable: new Set(VARIABLE_UNIQUE_NAMES), rules: o } : null
  }).catch(() => { loading = null })
  return loading
}

// The blocks to read items from (own-rules.ts): the own lists, then
// NeverSink's other rules. NeverSink's lists when there are no prices yet or
// no tables.
export function itemSource (blocks: FilterBlock[], t: OwnTables | null, lookup: PriceLookup | null, groupOf: (type: string) => EconomyGroup, any: EconomyGroup, uniquePage?: EconomyGroup): FilterBlock[] {
  return t?.rules && t.lists.length && lookup ? t.rules.itemSource(blocks, t, lookup, groupOf, any, uniquePage) : blocks
}
