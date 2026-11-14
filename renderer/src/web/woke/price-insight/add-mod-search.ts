// "Add a mod" search: finds any trade stat by its text, one kind at a time.
// Pure functions over a list of stats, so tests can pass their own.
import type { Stat } from '@/assets/data'
import type { AddedMod, AddedModKind } from '@/web/price-check/filters/interfaces'

export const ADD_KINDS: ReadonlyArray<{ kind: AddedModKind, label: string, title: string }> = [
  { kind: 'pseudo', label: 'Total', title: 'The trade site\'s total: counts the mod wherever it is on the item' },
  { kind: 'explicit', label: 'Explicit', title: 'Prefix or suffix' },
  { kind: 'implicit', label: 'Implicit', title: 'Implicit modifier' },
  { kind: 'crafted', label: 'Crafted', title: 'Bench craft' },
  { kind: 'fractured', label: 'Fractured', title: 'Fractured modifier' },
  { kind: 'enchant', label: 'Enchant', title: 'Enchantment' }
]

export interface AddEntry {
  ref: string
  // Lower case ref and the stat's other wordings, to match typed words against.
  hay: string
  ids: Partial<Record<AddedModKind, string[]>>
  inverted: boolean
}

export function buildAddIndex (stats: Iterable<Stat>): AddEntry[] {
  const byRef = new Map<string, AddEntry>()
  for (const stat of stats) {
    const ids: AddEntry['ids'] = {}
    for (const { kind } of ADD_KINDS) {
      const list = stat.trade.ids[kind]
      if (list?.length) ids[kind] = list
    }
    // A stat searched by an option (a passive, a temple room) needs a picker this has not got.
    if (!Object.keys(ids).length || stat.trade.option) continue
    // A ref can be listed twice (stat groups): one entry, the first id per kind.
    const had = byRef.get(stat.ref)
    if (had) {
      // Only ids searched the same way round.
      if (had.inverted !== Boolean(stat.trade.inverted)) continue
      for (const k of Object.keys(ids) as AddedModKind[]) had.ids[k] ??= ids[k]
      continue
    }
    const words = [stat.ref, ...stat.matchers.filter(m => !m.negate).map(m => m.string)]
    byRef.set(stat.ref, {
      ref: stat.ref,
      hay: Array.from(new Set(words)).join('\n').toLowerCase(),
      ids,
      inverted: Boolean(stat.trade.inverted)
    })
  }
  return Array.from(byRef.values())
}

let shared: { src: unknown, index: AddEntry[] } | null = null
// One index per stats data: the source is a new function after a data reload.
export function sharedAddIndex (src: (includes: string) => Iterable<Stat>): AddEntry[] {
  if (shared?.src !== src) shared = { src, index: buildAddIndex(src('')) }
  return shared.index
}

function words (query: string): string[] {
  return query.toLowerCase().split(/[\s#%+]+/).filter(Boolean)
}

// Every typed word must appear. Words matched at a word start rank first,
// then the shorter text (the plain mod before its rarer variants).
export function searchAddIndex (index: readonly AddEntry[], query: string, kind: AddedModKind, limit = 8): AddEntry[] {
  const ws = words(query)
  if (!ws.length) return []
  const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const starts = ws.map(w => new RegExp(`(^|[^a-z0-9])${esc(w)}`))
  const hits: Array<{ e: AddEntry, score: number }> = []
  for (const e of index) {
    if (!e.ids[kind]) continue
    if (!ws.every(w => e.hay.includes(w))) continue
    let score = 0
    for (const re of starts) if (!re.test(e.hay)) score += 1
    hits.push({ e, score })
  }
  // A mod the trade site lists under several kinds before one with a single kind
  // and the same words, like a map's "Quality (Rarity): #%".
  const reach = (e: AddEntry) => Math.min(2, Object.keys(e.ids).length)
  hits.sort((a, b) => a.score - b.score || reach(b.e) - reach(a.e) ||
    a.e.ref.length - b.e.ref.length || a.e.ref.localeCompare(b.e.ref))
  return hits.slice(0, limit).map(h => h.e)
}

// How many matches each kind has, for the chips.
export function kindCounts (index: readonly AddEntry[], query: string): Record<AddedModKind, number> {
  const out = { pseudo: 0, explicit: 0, implicit: 0, crafted: 0, fractured: 0, enchant: 0 }
  const ws = words(query)
  if (!ws.length) return out
  for (const e of index) {
    if (!ws.every(w => e.hay.includes(w))) continue
    for (const k of Object.keys(e.ids) as AddedModKind[]) out[k]++
  }
  return out
}

export function addedModFrom (entry: AddEntry, kind: AddedModKind): AddedMod {
  return {
    statRef: entry.ref,
    kind,
    tradeId: entry.ids[kind]!,
    tradeInvert: entry.inverted || undefined,
    min: '',
    max: '',
    disabled: false
  }
}
