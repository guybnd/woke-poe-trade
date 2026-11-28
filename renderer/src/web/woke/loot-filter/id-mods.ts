// Identified gear in Rare weights (NeverSink retirement M6, Guy's picks A,
// W1 and M1, 2026-11-28): each mod from the price check's list of valuable
// mods adds to the item's score by its tier, the top of the list most.
//
// A filter sees a mod only by its name (HasExplicitMod "Merciless"), and the
// name tells the stat and the tier on that kind of item (affix-tiers.json,
// from the game data by affix-tiers.yml). It can't add points either: it can
// only count how many of a list of names an item has. So the mods are put in
// nested lists by what they're worth (the best, the best two kinds...) and a
// score is written as the fewest counts that reach it: "1 of the best and 2
// more of the good ones". Rolled values, totals (total resistance) and open
// affixes can't be seen, so they don't count.
//
// The table (public/data/affix-tiers.json) loads on first use.
import { shallowRef } from 'vue'
import type { FilterCondition } from './parse'
import type { WeightKey } from './weight-settings'
import { DEFAULT_SEED } from '../price-insight/seed'
import { dataFileUrl } from '../app/live-data'

export type AffixRow = [name: string, text: number, tier: number]
export interface AffixTable { texts: string[], classes: Record<string, AffixRow[]> }

export const affixTable = shallowRef<AffixTable | null>(null)
let loading: Promise<void> | null = null
export function loadAffixTable (): Promise<void> {
  loading ??= fetch(dataFileUrl('affix-tiers.json'))
    .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<AffixTable> })
    .then((t) => { affixTable.value = t?.texts && t.classes ? { texts: t.texts, classes: t.classes } : null })
    // A failed read is tried again on the next ask.
    .catch(() => { loading = null })
  return loading
}

// The first five of the list count most ('Top 5 mod' rows).
export const TOP_N = 5
// Prefixes and suffixes: three of each on a rare, one of each on magic.
export const MAX_MODS = { Rare: 6, Magic: 2 } as const
export type IdRarity = keyof typeof MAX_MODS

// Where a mod's text sits on the list (first line only: a hybrid counts as
// its first stat, so "+# to Armour, +# to maximum Life" isn't a life mod), or
// -1. A minion line only counts for an entry that names minions.
export function seedIndex (text: string, seed: readonly string[]): number {
  const line = (text.split('\n')[0] ?? '').toLowerCase()
  const minion = /^minions? /.test(line)
  return seed.findIndex((s) => {
    const t = s.trim().toLowerCase()
    return t !== '' && line.includes(t) && (!minion || t.includes('minion'))
  })
}

// The list as one class sees it: only entries a mod on that class can match,
// so a bow's top 5 are bow mods (% physical, attack speed...), not life and
// movement speed it can't roll (M8: magic bows with top % physical graded Good).
export function classSeed (table: AffixTable, cls: string, seed: readonly string[]): string[] {
  const texts = [...new Set((table.classes[cls] ?? []).map(r => table.texts[r[1]] ?? ''))]
  return seed.filter(s => texts.some(t => seedIndex(t, [s]) === 0))
}

// The row a mod counts for, or null: Great is a top 5 mod at tier 1, Good
// tier 2 (or another listed mod at tier 1), Fair one tier lower again.
export function modKey (text: string, tier: number, seed: readonly string[]): WeightKey | null {
  const i = seedIndex(text, seed)
  if (i < 0 || tier < 1) return null
  const grade = tier + (i < TOP_N ? 0 : 1)
  return grade <= 3 ? `ig${grade}` as WeightKey : null
}

const points = (mult: number) => mult > 0 ? 10 * Math.log2(mult) : 0

export interface CountedMod { name: string, text: string, tier: number, key: WeightKey | null, pts: number }

// One item's mods, as the card shows them.
export function itemMods (table: AffixTable, cls: string, names: readonly string[], seed: readonly string[], mult: Record<WeightKey, number>): CountedMod[] {
  const rows = new Map((table.classes[cls] ?? []).map(r => [r[0], r]))
  seed = classSeed(table, cls, seed)
  return names.map((name) => {
    const r = rows.get(name)
    if (!r) return { name, text: '', tier: 0, key: null, pts: 0 }
    const text = table.texts[r[1]] ?? ''
    const key = modKey(text, r[2], seed)
    return { name, text, tier: r[2], key, pts: key ? points(mult[key]) : 0 }
  })
}

// ---- Rules ------------------------------------------------------------------

// Classes whose names all mean the same points share rules. `levels`: the
// points a name can bring, best first, with the names worth exactly that.
export interface IdGroup { classes: string[], levels: Array<{ pts: number, names: string[] }> }

export function idGroups (table: AffixTable, seed: readonly string[], mult: Record<WeightKey, number>): IdGroup[] {
  // Each class: every name it can roll and its points (0 for most).
  const maps = Object.entries(table.classes).map(([cls, rows]) => {
    const m = new Map<string, number>()
    const own = classSeed(table, cls, seed)
    for (const [name, ti, tier] of rows) {
      const key = modKey(table.texts[ti] ?? '', tier, own)
      // A name twice (two kinds share it): the lower, so it never counts high.
      const p = key ? points(mult[key]) : 0
      m.set(name, m.has(name) ? Math.min(m.get(name)!, p) : p)
    }
    return { classes: [cls], m }
  })
  // Merge classes that agree on every name both have (a name one lacks can't
  // roll there, so its list entry does nothing).
  const merged: typeof maps = []
  for (const x of maps) {
    const into = merged.find(g => [...x.m].every(([n, p]) => !g.m.has(n) || g.m.get(n) === p))
    if (!into) { merged.push({ classes: [...x.classes], m: new Map(x.m) }); continue }
    into.classes.push(...x.classes)
    for (const [n, p] of x.m) into.m.set(n, p)
  }
  return merged.map((g) => {
    const all = [...g.m]
    // The game matches a name anywhere in a mod's name ("Tacati" is in
    // "Tacati's"): a name inside a name worth less would count that one too.
    // Such a name is left out (the item counts a little lower, never higher).
    const safe = all.filter(([n, p]) => p > 0 && !all.some(([o, q]) => o !== n && q < p && o.includes(n)))
    const pts = [...new Set(safe.map(([, p]) => p))].sort((a, b) => b - a)
    return { classes: g.classes.sort(), levels: pts.map(p => ({ pts: p, names: safe.filter(([, q]) => q === p).map(([n]) => n).sort() })) }
  }).filter(g => g.levels.length)
}

// The fewest counts that reach `need` points: each a list of how many of the
// nested lists (best only, best two kinds, ...) an item must have, at most
// `max` mods in all. An item reaches `need` exactly when it has one of them.
export function minimalCounts (levels: readonly number[], need: number, max: number): number[][] {
  const k = levels.length
  if (need <= 1e-9) return [new Array(k).fill(0)]
  // Points of nested counts n1 <= n2 <= ... : each step down the list adds
  // what the next kind is worth less.
  const worth = (n: number[]) => n.reduce((s, x, j) => s + x * (levels[j] - (levels[j + 1] ?? 0)), 0)
  const all: number[][] = []
  const walk = (j: number, lo: number, cur: number[]) => {
    if (j === k) { all.push([...cur]); return }
    for (let x = lo; x <= max; x++) { cur.push(x); walk(j + 1, x, cur); cur.pop() }
  }
  walk(0, 0, [])
  const ok = all.filter(n => worth(n) >= need - 1e-6)
  return ok.filter(n => !ok.some(o => o !== n && o.every((x, j) => x <= n[j]) && o.some((x, j) => x < n[j])))
}

// A count's conditions: one per nested list it needs more of.
export function countConds (group: IdGroup, counts: readonly number[]): FilterCondition[] {
  const out: FilterCondition[] = []
  const names: string[] = []
  counts.forEach((n, j) => {
    names.push(...group.levels[j].names)
    if (n > 0 && n > (counts[j - 1] ?? 0)) out.push({ key: 'HasExplicitMod', op: '>=', count: n, values: [...names] } as FilterCondition)
  })
  return out
}

// The list the rules use when the price check's own was never changed.
export { DEFAULT_SEED }
