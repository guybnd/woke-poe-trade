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

// Only T17 mods give the more-X bonuses. Pack size comes with every mod, but a
// few T17 mods give 17-20% against the usual 5%, so it's a goal too; Atlas Drops
// and rarity barely differ, so they're columns only.
export type PlanGoal = 'currency' | 'maps' | 'threads' | 'p'
export const PLAN_GOALS: PlanGoal[] = ['currency', 'maps', 'threads', 'p']

export interface PlannerState {
  goal: PlanGoal
  // Picked on the Planner; until then the goal follows the farming goal (goal.ts).
  goalPicked?: boolean
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
export const GOAL_MIN: Record<PlanGoal, MinStat> = { currency: 'currency', maps: 'maps', threads: 'scarabs', p: 'packSize' }
// The trade site's filter for that total.
const GOAL_TRADE: Record<Exclude<PlanGoal, 'p'>, string> = {
  currency: 'pseudo.pseudo_map_more_currency_drops',
  maps: 'pseudo.pseudo_map_more_map_drops',
  threads: 'pseudo.pseudo_map_more_scarab_drops'
}

export interface PlanRow {
  mod: MapBonusMod
  key: string
  // The mod's lines as Map mods lists them (this language), one per stat.
  matchers: string[]
  // Every wording of those stats ("reduced" for "increased" too).
  wordings: string[]
  // The trade site's stat for its first line.
  tradeId: string | null
  value: number
  prefix: boolean
}

let byRef: Map<string, { matchers: string[], all: string[], tradeId: string | null }> | null = null
function statsOf (ref: string) {
  // Built once the stat data is in (an empty map would stick).
  if (!byRef?.size) {
    byRef = new Map()
    for (const stat of STATS_ITERATOR('AreaMods')) {
      if (!stat.fromAreaMods) continue
      byRef.set(stat.ref, {
        matchers: stat.matchers.filter(m => !m.negate).map(m => m.string),
        all: stat.matchers.map(m => m.string),
        tradeId: stat.trade?.ids?.explicit?.[0] ?? null
      })
    }
  }
  return byRef.get(ref)
}

// T17 mods that give a real share of the goal (half the best one's or more:
// for pack size, the 17-20% ones, not the 5% every mod gives), best first.
export function planRows (data: MapBonusData | null, goal: PlanGoal): PlanRow[] {
  const rows = t17Rows(data, goal).filter(r => r.value > 0)
  const best = Math.max(0, ...rows.map(r => r.value))
  return rows.filter(r => r.value * 2 >= best).sort((a, b) => b.value - a.value || a.key.localeCompare(b.key))
}

// T17 mods the list leaves out that you rated avoid in Maps: the searches
// still avoid them.
export function ratedAvoid (data: MapBonusData | null, listed: PlanRow[], ratings: Record<string, ModRating>): PlanRow[] {
  const shown = new Set(listed.map(r => r.key))
  return t17Rows(data, 'currency').filter(r => !shown.has(r.key) && r.wordings.some(m => ratings[m] === 'deadly'))
}

function t17Rows (data: MapBonusData | null, goal: PlanGoal): PlanRow[] {
  if (!data) return []
  const rows: PlanRow[] = []
  for (const mod of data.mods) {
    if (!mod.t.includes('t17')) continue
    const value = bonusOf(mod, goal as BonusKey)
    const stats = mod.refs.map(statsOf)
    // The wording the mod rolls: Diluted is "less effect of Flasks", not "more".
    const matchers = stats.map(s => s?.all.find(w => mod.lines.some(l => sameWording(w, l))) ?? s?.matchers[0]).filter((m): m is string => !!m)
    if (!matchers.length) continue
    rows.push({ mod, key: mod.n, matchers, wordings: stats.flatMap(s => s?.all ?? []), tradeId: stats[0]?.tradeId ?? null, value, prefix: mod.g === 1 })
  }
  return rows
}

// "Players have (25-30)% less Defences" reads as "Players have #% less Defences".
export function sameWording (wording: string, line: string): boolean {
  const canon = (t: string) => t.toLowerCase().replace(/[+-]?\([0-9.]+-[0-9.]+\)|[+-]?[0-9.#]+/g, '#')
  return canon(wording) === canon(line)
}

// Other lines a T17 map's tooltip can show besides its T17 mods: its
// corruption implicits (poedb, 3.30).
const T17_OTHER_LINES = [
  'Area contains # additional guarded Exquisite Vaal Vessels',
  'Unique Monsters drop Corrupted Items',
  "Players' Vaal Skills do not apply Soul Gain Prevention",
  'Atlas Passives have #% increased Effect on Area',
  'Area is affected by # additional random Unallocated Notable Atlas Passives'
]

// What a T17 map's search must not match by mistake. Only T17 mods roll on T17
// maps (poedb: regular map mods have spawn weight 0 for uber_tier_map), so the
// tokens need only differ from those, which makes them much shorter than
// tokens unique among every map mod.
export function planUniverse (data: MapBonusData | null): string[] {
  if (!data) return []
  const out = new Set<string>(T17_OTHER_LINES)
  for (const mod of data.mods) {
    if (!mod.t.includes('t17')) continue
    for (const ref of mod.refs) for (const m of statsOf(ref)?.all ?? []) out.add(m)
  }
  return [...out]
}

export function isTicked (row: PlanRow, state: PlannerState, ratings: Record<string, ModRating>): boolean {
  if (state.on?.includes(row.key)) return true
  if (state.off?.includes(row.key)) return false
  return !row.wordings.some(m => ratings[m] === 'deadly')
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

// "At least k of these" as stash terms; null when there aren't k of them,
// 'too-many' when it would take more terms than could ever fit.
export function atLeastTerms (tokens: string[], k: number): string[] | null | 'too-many' {
  if (k <= 0) return []
  if (k > tokens.length) return null
  const size = tokens.length - k + 1
  if (size === tokens.length) return [`"${tokens.join('|')}"`]
  // Even 3-letter tokens: 20 terms of 3 are over 250 characters.
  if (binomial(tokens.length, size) > 20) return 'too-many'
  return combos(tokens, size).map(c => `"${c.join('|')}"`)
}

function binomial (n: number, k: number): number {
  let r = 1
  for (let i = 1; i <= k; i++) r = r * (n - k + i) / i
  return r
}

// Why the counts can't be met by the ticked mods, for both searches.
export function planProblem (rows: PlanRow[], ticked: Set<string>, state: PlannerState): string | null {
  const on = rows.filter(r => ticked.has(r.key))
  if (state.need > on.length) return `Tick at least ${state.need} mods.`
  const pre = on.filter(r => r.prefix).length
  if (state.pre > pre) return `Tick at least ${state.pre} prefixes (${pre} ticked).`
  const suf = on.length - pre
  if (state.suf > suf) return `Tick at least ${state.suf} suffixes (${suf} ticked).`
  return null
}

export interface PlanSearch {
  text: string
  length: number
  tooLong: boolean
  // Why there's no search.
  problem?: string
  tokens: Record<string, string>
  // The shortest text each mod was allowed: above 3 when there was room for
  // longer, safer text (less chance to hit a rare map's random name).
  minToken: number
}

// Longest-first: the safest text that still fits.
const TOKEN_LENGTHS = [6, 5, 4, 3]

// `universe`: every line a T17 map can show, `extra`: other tooltip text (map names).
export function planStashSearch (rows: PlanRow[], ticked: Set<string>, state: PlannerState, universe: string[], extra: string[], alsoAvoid: PlanRow[] = []): PlanSearch {
  let res: PlanSearch | null = null
  for (const len of TOKEN_LENGTHS) {
    res = stashSearchAt(len, rows, ticked, state, universe, extra, alsoAvoid)
    if (res.problem || !res.tooLong) return res
  }
  return res!
}

function stashSearchAt (minToken: number, rows: PlanRow[], ticked: Set<string>, state: PlannerState, universe: string[], extra: string[], alsoAvoid: PlanRow[]): PlanSearch {
  const tokens: Record<string, string> = {}
  const none = (problem: string, tooLong = false): PlanSearch => ({ text: '', length: 0, tooLong, problem, tokens, minToken })
  const problem = planProblem(rows, ticked, state)
  if (problem) return none(problem)
  const tokenOf = (r: PlanRow): string | null => {
    const mine = new Set([...r.matchers, ...r.wordings].map(m => m.toLowerCase()))
    const others = [...universe.filter(u => !mine.has(u.toLowerCase())), ...TOOLTIP_LINES, ...extra]
    // The first line that has a token of its own stands for the mod.
    for (const m of r.matchers) {
      const t = uniqueToken(m, others, minToken)
      if (t) { tokens[r.key] = t; return t }
    }
    return null
  }
  const on = rows.filter(r => ticked.has(r.key)).map(r => ({ r, t: tokenOf(r) }))
  const lost = on.filter(x => !x.t).map(x => x.r.key)
  if (lost.length) return none(`No stash search text for ${lost.join(', ')}. Untick it or use the trade search.`)
  const onTok = on as Array<{ r: PlanRow, t: string }>
  const terms: string[] = []
  for (const g of [
    atLeastTerms(onTok.map(x => x.t), state.need),
    atLeastTerms(onTok.filter(x => x.r.prefix).map(x => x.t), state.pre),
    atLeastTerms(onTok.filter(x => !x.r.prefix).map(x => x.t), state.suf)
  ]) {
    if (g === 'too-many') return none('Too many combinations for a stash search.', true)
    if (g) terms.push(...g)
  }
  const avoid = [...rows.filter(r => !ticked.has(r.key)), ...alsoAvoid].map(tokenOf).filter((t): t is string => !!t)
  if (avoid.length) terms.push(`"!${[...new Set(avoid)].join('|')}"`)
  if (state.total > 0) terms.push(`"${MIN_PREFIX[GOAL_MIN[state.goal]]}${atLeast(state.total)}%"`)
  const text = [...new Set(terms)].join(' ')
  return { text, length: text.length, tooLong: text.length > MAX_SEARCH_LENGTH, tokens, minToken }
}

// MAX filters the trade site takes in one search.
const MAX_TRADE_FILTERS = 35

// null when the counts can't be met (planProblem says why).
export function planTradeQuery (rows: PlanRow[], ticked: Set<string>, state: PlannerState, alsoAvoid: PlanRow[] = []) {
  if (planProblem(rows, ticked, state)) return null
  const ids = (list: PlanRow[]) => [...new Set(list.map(r => r.tradeId).filter((id): id is string => !!id))]
  const on = rows.filter(r => ticked.has(r.key))
  const stats: Array<{ type: string, value?: { min: number }, filters: Array<{ id: string, value?: { min: number } }> }> = []
  // The total and the avoided mods first, so the counts are what a long list cuts.
  // Pack size is a map filter on the site, the more-X totals are stats.
  const goalStat = state.goal === 'p' ? null : GOAL_TRADE[state.goal]
  if (state.total > 0 && goalStat) stats.push({ type: 'and', filters: [{ id: goalStat, value: { min: state.total } }] })
  const off = ids([...rows.filter(r => !ticked.has(r.key)), ...alsoAvoid])
  if (off.length) stats.push({ type: 'not', filters: off.map(id => ({ id })) })
  const count = (list: PlanRow[], min: number) => {
    const f = ids(list)
    if (min > 0 && f.length) stats.push({ type: 'count', value: { min }, filters: f.map(id => ({ id })) })
  }
  count(on, state.need)
  count(on.filter(r => r.prefix), state.pre)
  count(on.filter(r => !r.prefix), state.suf)
  let used = 0
  for (const s of stats) {
    s.filters = s.filters.slice(0, Math.max(0, MAX_TRADE_FILTERS - used))
    used += s.filters.length
    if (s.value) s.value.min = Math.min(s.value.min, s.filters.length)
  }
  return {
    filters: {
      type_filters: { filters: { category: { option: 'map' } } },
      map_filters: {
        filters: {
          map_tier: { min: 17, max: 17 },
          ...(state.goal === 'p' && state.total > 0 ? { map_packsize: { min: state.total } } : {})
        }
      }
    },
    stats: stats.filter(s => s.filters.length)
  }
}
