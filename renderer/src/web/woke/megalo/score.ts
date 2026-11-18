// Reads a build's tags, scores Megalomaniac's notables against them and
// writes the trade search. No app imports: the tests load it on its own.
import { TAGS, TAG_BY_ID, MINION_LINE, DEFENCE_LINE, MOVEMENT_GEM } from './tags'

export const MEGALO_NAME = 'Megalomaniac'
export const MEGALO_BASE = 'Medium Cluster Jewel'
// The trade site refuses a stat group with more filters than this.
export const MAX_TRADE_FILTERS = 35

export interface Notable { name: string, stats: string[] }

// Megalomaniac rolls any cluster jewel notable (its own data lists all of
// them); cluster keystones never.
export function notablePool (named: Record<string, { stats: string[], key?: number }> | null | undefined): Notable[] {
  return Object.entries(named ?? {})
    .filter(([, n]) => !n.key)
    .map(([name, n]) => ({ name, stats: n.stats.flatMap(s => s.split('\n')).map(s => s.trim()).filter(Boolean) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Tag -> whether a line about minions lit it, and whether a line about you did.
export type NotableTags = Map<string, { minion: boolean, self: boolean }>

export function notableTags (n: Notable): NotableTags {
  const out: NotableTags = new Map()
  for (const raw of n.stats) {
    const line = raw.toLowerCase()
    const minion = MINION_LINE.test(line)
    const defence = DEFENCE_LINE.test(line)
    for (const tag of TAGS) {
      if (!tag.notable.test(line)) continue
      if (tag.self && minion) continue
      if (tag.damage && defence) continue
      const had = out.get(tag.id) ?? { minion: false, self: false }
      out.set(tag.id, { minion: had.minion || minion, self: had.self || !minion })
    }
  }
  return out
}

// What a build shows by itself. `main` is the main skill's link group.
export interface BuildSource {
  mainGems: string[]
  gems: string[]
  stats?: Partial<Record<'Life' | 'EnergyShield' | 'MinionTotalDPS' | 'TotalDPS' | 'CombinedDPS' | 'TotalDotDPS', number>>
}

export interface FoundTags { found: string[], main: string[] }

export function buildTags (src: BuildSource): FoundTags {
  const found = new Set<string>()
  const main = new Set<string>()
  for (const tag of TAGS) {
    if (!tag.gem) continue
    const use = (g: string) => tag.id === 'Movement skills' || !MOVEMENT_GEM.test(g)
    if (src.mainGems.some(g => use(g) && tag.gem!.test(g))) { main.add(tag.id); found.add(tag.id) } else if (src.gems.some(g => use(g) && tag.gem!.test(g))) found.add(tag.id)
  }
  for (const el of ['Fire', 'Cold', 'Lightning']) {
    if (main.has(el)) main.add('Elemental')
    if (found.has(el)) found.add('Elemental')
  }
  const s = src.stats ?? {}
  if ((s.MinionTotalDPS ?? 0) > Math.max(s.CombinedDPS ?? 0, s.TotalDPS ?? 0)) { main.add('Minions'); found.add('Minions') }
  if (main.has('Minions')) { found.add('Minion damage'); found.add('Minion life') }
  if ((s.TotalDotDPS ?? 0) > 0 && (s.TotalDotDPS ?? 0) >= (s.TotalDPS ?? 0)) found.add('Damage over time')
  const life = s.Life ?? 0
  const es = s.EnergyShield ?? 0
  if (life > 1 || !es) found.add('Life')
  if (es > 0 && es >= life * 0.5) found.add('Energy shield')
  if (life === 1 && es > 0) found.add('Chaos Inoculation')
  // In TAGS order, so the chips don't jump around between builds.
  const order = (ids: Set<string>) => TAGS.map(t => t.id).filter(id => ids.has(id))
  return { found: order(found), main: order(main) }
}

export interface TagEdits { add: string[], drop: string[] }

// Tag -> its weight: the main skill's tags count most.
export function tagWeights (f: FoundTags, edits: TagEdits): Map<string, number> {
  const out = new Map<string, number>()
  for (const id of f.found) if (!edits.drop.includes(id)) out.set(id, f.main.includes(id) ? 3 : 2)
  for (const id of edits.add) if (TAG_BY_ID.has(id) && !out.has(id)) out.set(id, 2)
  return out
}

export interface Scored {
  name: string
  stats: string[]
  tags: string[]
  // The build's tags it hits, strongest first.
  matched: string[]
  // Build tags that only light your own lines on a minion build.
  weak: string[]
  score: number
  // 0-100 in steps of 5: the best fit is 100.
  weight: number
}

export function scoreNotables (pool: readonly Notable[], weights: ReadonlyMap<string, number>): Scored[] {
  const minionBuild = (weights.get('Minions') ?? 0) >= 3
  const rows = pool.map(n => {
    const tags = notableTags(n)
    let score = 0
    const hits: Array<{ id: string, w: number }> = []
    const weak: string[] = []
    for (const [id, how] of tags) {
      const w = weights.get(id)
      if (!w) continue
      const off = TAG_BY_ID.get(id)?.damage && (minionBuild ? !how.minion : !how.self)
      const got = off ? w * 0.25 : w
      if (off) weak.push(id)
      score += got
      hits.push({ id, w: got })
    }
    hits.sort((a, b) => b.w - a.w)
    return { name: n.name, stats: n.stats, tags: [...tags.keys()], matched: hits.map(h => h.id), weak, score, weight: 0 }
  })
  const best = Math.max(0, ...rows.map(r => r.score))
  for (const r of rows) r.weight = best > 0 ? Math.round(r.score / best * 20) * 5 : 0
  return rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

// The notables a fresh panel ticks: decent fits, at most a trade group's worth.
export function defaultOn (rows: readonly Scored[], min = 40, max = 12): Set<string> {
  return new Set(rows.filter(r => r.weight >= min).slice(0, max).map(r => r.name))
}

export type SearchMode = 'count' | 'weight'

export interface SearchPick { statId: string, weight: number }

export function megaloQuery (picks: readonly SearchPick[], opts: { mode: SearchMode, need: number, minWeight: number, maxDiv: number | null }) {
  const filters = picks.slice(0, MAX_TRADE_FILTERS).map(p => opts.mode === 'weight'
    ? { id: p.statId, value: { weight: p.weight } }
    : { id: p.statId })
  const group = opts.mode === 'weight'
    ? { type: 'weight', value: { min: opts.minWeight }, filters }
    : { type: 'count', value: { min: Math.max(1, Math.min(3, opts.need)) }, filters }
  return {
    name: MEGALO_NAME,
    type: MEGALO_BASE,
    stats: [group],
    ...(opts.maxDiv != null && opts.maxDiv > 0
      ? { filters: { trade_filters: { filters: { price: { max: opts.maxDiv, option: 'divine' } } } } }
      : {})
  }
}

// A weighted-sum total that two good fits reach: the top two ticked weights.
export function suggestedMinWeight (weights: readonly number[]): number {
  const top = [...weights].sort((a, b) => b - a).slice(0, 2)
  return top.length ? top.reduce((a, b) => a + b, 0) : 0
}
