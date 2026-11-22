// Map mods' Planner tab: pick a bonus, tick the T17 mods that give it, say how
// many a map needs (and how many of them prefixes or suffixes), and get a stash
// search and a trade search for such maps.
//
// The stash search can't count, but "at least k of n" is the same as: every
// group of n-k+1 of the mods holds one of them. Each group becomes one quoted
// term (`|` is OR inside a term, terms must all match), so k-of-n needs
// C(n, n-k+1) terms, which only fits for a handful of mods. The trade site
// counts by itself.
import { STATS_ITERATOR } from '@/assets/data'
import { bonusOf } from './bonuses'
import type { BonusKey, MapBonusData, MapBonusMod } from './bonuses'
import { MAX_SEARCH_LENGTH, MIN_PREFIX, TOOLTIP_LINES, atLeast, uniqueToken } from './regex'
import type { MinStat } from './regex'
import type { ModRating } from './rules'

export type PlanGoal = 'currency' | 'maps' | 'threads' | 'd' | 'r' | 'p'
export const PLAN_GOALS: PlanGoal[] = ['currency', 'maps', 'threads', 'd', 'r', 'p']

export interface PlannerState {
  goal: PlanGoal
  // Mods (by affix name) ticked or unticked by hand; the rest follow your
  // ratings: a mod with a line rated avoid starts unticked.
  on?: string[]
  off?: string[]
  // A map needs at least this many ticked mods, of which at least `pre`
  // prefixes and `suf` suffixes.
  need: number
  pre: number
  suf: number
  // The map's own total for the goal ("More Currency: +100%"), 0 for none.
  total: number
}

export const DEFAULT_PLANNER: PlannerState = { goal: 'currency', need: 2, pre: 0, suf: 0, total: 0 }

// The map property line each goal's total is on.
export const GOAL_MIN: Record<PlanGoal, MinStat> = { currency: 'currency', maps: 'maps', threads: 'scarabs', d: 'quantity', r: 'rarity', p: 'packSize' }
// The trade site's filter for that total.
const GOAL_TRADE: Record<PlanGoal, string> = {
  currency: 'pseudo.pseudo_map_more_currency_drops',
  maps: 'pseudo.pseudo_map_more_map_drops',
  threads: 'pseudo.pseudo_map_more_scarab_drops',
  d: 'item.map_atlas_drops',
  r: 'item.map_item_rarity',
  p: 'item.map_pack_size'
}

export interface PlanRow {
  mod: MapBonusMod
  key: string
  // The mod's lines as Map mods lists them (this language), one per stat.
  matchers: string[]
  // The trade site's stat for its first line.
  tradeId: string | null
  value: number
  prefix: boolean
}

let byRef: Map<string, { matchers: string[], tradeId: string | null }> | null = null
function statsOf (ref: string) {
  // Built once the stat data is in (an empty map would stick).
  if (!byRef?.size) {
    byRef = new Map()
    for (const stat of STATS_ITERATOR('AreaMods')) {
      if (!stat.fromAreaMods) continue
      byRef.set(stat.ref, {
        matchers: stat.matchers.filter(m => !m.negate).map(m => m.string),
        tradeId: stat.trade?.ids?.explicit?.[0] ?? null
      })
    }
  }
  return byRef.get(ref)
}

// T17 mods that give the goal, best first.
export function planRows (data: MapBonusData | null, goal: PlanGoal): PlanRow[] {
  if (!data) return []
  const rows: PlanRow[] = []
  for (const mod of data.mods) {
    if (!mod.t.includes('t17')) continue
    const value = bonusOf(mod, goal as BonusKey)
    if (value <= 0) continue
    const stats = mod.refs.map(statsOf)
    const matchers = stats.map(s => s?.matchers[0]).filter((m): m is string => !!m)
    if (!matchers.length) continue
    rows.push({ mod, key: mod.n, matchers, tradeId: stats[0]?.tradeId ?? null, value, prefix: mod.g === 1 })
  }
  return rows.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key))
}

export function isTicked (row: PlanRow, state: PlannerState, ratings: Record<string, ModRating>): boolean {
  if (state.on?.includes(row.key)) return true
  if (state.off?.includes(row.key)) return false
  return !row.matchers.some(m => ratings[m] === 'deadly')
}

export function toggled (state: PlannerState, key: string, ticked: boolean): PlannerState {
  const on = (state.on ?? []).filter(k => k !== key)
  const off = (state.off ?? []).filter(k => k !== key)
  return { ...state, on: ticked ? on : [...on, key], off: ticked ? [...off, key] : off }
}

function combos<T> (arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [head, ...rest] = arr
  return [...combos(rest, k - 1).map(c => [head, ...c]), ...combos(rest, k)]
}

// "At least k of these" as stash terms; null when there aren't k of them.
// Too many terms to ever fit come back as Infinity-long.
export function atLeastTerms (tokens: string[], k: number): string[] | null {
  if (k <= 0) return []
  if (k > tokens.length) return null
  const size = tokens.length - k + 1
  if (size === tokens.length) return [`"${tokens.join('|')}"`]
  // Past ~40 terms it's far over 250 characters anyway.
  if (binomial(tokens.length, size) > 40) return ['…'.repeat(MAX_SEARCH_LENGTH + 1)]
  return combos(tokens, size).map(c => `"${c.join('|')}"`)
}

function binomial (n: number, k: number): number {
  let r = 1
  for (let i = 1; i <= k; i++) r = r * (n - k + i) / i
  return r
}

export interface PlanSearch {
  text: string
  length: number
  tooLong: boolean
  // Why there's no search.
  problem?: string
  tokens: Record<string, string>
}

// `universe`: every map mod line, `extra`: other tooltip text (map names).
export function planStashSearch (rows: PlanRow[], ticked: Set<string>, state: PlannerState, universe: string[], extra: string[]): PlanSearch {
  const tokens: Record<string, string> = {}
  const own = new Map<string, string[]>()
  for (const r of rows) own.set(r.key, r.matchers)
  const tokenOf = (r: PlanRow): string | null => {
    const mine = new Set(r.matchers.map(m => m.toLowerCase()))
    const others = [...universe.filter(u => !mine.has(u.toLowerCase())), ...TOOLTIP_LINES, ...extra]
    // The first line that has a token of its own stands for the mod.
    for (const m of r.matchers) {
      const t = uniqueToken(m, others)
      if (t) { tokens[r.key] = t; return t }
    }
    return null
  }
  const on = rows.filter(r => ticked.has(r.key))
  const offRows = rows.filter(r => !ticked.has(r.key))
  const onTok = on.map(r => ({ r, t: tokenOf(r) })).filter((x): x is { r: PlanRow, t: string } => !!x.t)
  const terms: string[] = []
  const groups: Array<[string[] | null, string]> = [
    [atLeastTerms(onTok.map(x => x.t), state.need), `Tick at least ${state.need} mods.`],
    [atLeastTerms(onTok.filter(x => x.r.prefix).map(x => x.t), state.pre), `Tick at least ${state.pre} prefixes.`],
    [atLeastTerms(onTok.filter(x => !x.r.prefix).map(x => x.t), state.suf), `Tick at least ${state.suf} suffixes.`]
  ]
  for (const [g, why] of groups) {
    if (!g) return { text: '', length: 0, tooLong: false, problem: why, tokens }
    terms.push(...g)
  }
  const avoid = offRows.map(tokenOf).filter((t): t is string => !!t)
  if (avoid.length) terms.push(`"!${[...new Set(avoid)].join('|')}"`)
  if (state.total > 0) terms.push(`"${MIN_PREFIX[GOAL_MIN[state.goal]]}${atLeast(state.total)}%"`)
  const text = [...new Set(terms)].join(' ')
  return { text, length: text.length, tooLong: text.length > MAX_SEARCH_LENGTH, tokens }
}

// MAX filters the trade site takes in one search.
const MAX_TRADE_FILTERS = 35

export function planTradeQuery (rows: PlanRow[], ticked: Set<string>, state: PlannerState) {
  const ids = (list: PlanRow[]) => [...new Set(list.map(r => r.tradeId).filter((id): id is string => !!id))]
  const on = rows.filter(r => ticked.has(r.key))
  const stats: Array<{ type: string, value?: { min: number }, filters: Array<{ id: string, value?: { min: number } }> }> = []
  const count = (list: PlanRow[], min: number) => {
    const f = ids(list)
    if (min > 0 && f.length) stats.push({ type: 'count', value: { min: Math.min(min, f.length) }, filters: f.map(id => ({ id })) })
  }
  count(on, state.need)
  count(on.filter(r => r.prefix), state.pre)
  count(on.filter(r => !r.prefix), state.suf)
  const off = ids(rows.filter(r => !ticked.has(r.key)))
  if (off.length) stats.push({ type: 'not', filters: off.map(id => ({ id })) })
  if (state.total > 0) stats.push({ type: 'and', filters: [{ id: GOAL_TRADE[state.goal], value: { min: state.total } }] })
  // Keep within the site's filter limit: drop from the end of the last groups.
  let used = 0
  for (const s of stats) {
    s.filters = s.filters.slice(0, Math.max(0, MAX_TRADE_FILTERS - used))
    used += s.filters.length
  }
  return {
    filters: {
      type_filters: { filters: { category: { option: 'map' } } },
      map_filters: { filters: { map_tier: { min: 17, max: 17 } } }
    },
    stats: stats.filter(s => s.filters.length)
  }
}
