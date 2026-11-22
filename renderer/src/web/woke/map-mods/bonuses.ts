// What each map mod adds to a map: Atlas Drops, rarity, pack size, and on T17
// mods a "more Currency / Maps / Threads" bonus. From public/data/map-bonuses.json
// (scripts/build-map-bonuses.mjs: poedb's map mod pages, 3.30), fetched when
// Map mods or the search palette first needs it. The same line can come from
// several mods (a tier's Fecund, T17 Fecund), each with its own numbers.
import { shallowRef } from 'vue'
import { STATS_ITERATOR } from '@/assets/data'
import { dataFileUrl, onSharedDataChange } from '../app/live-data'

export type MoreKind = 'currency' | 'maps' | 'threads' | 'divCards' | 'scarabs'
export type MapTier = 'low' | 'mid' | 'top' | 't17'

export interface MapBonusMod {
  // poedb's affix name ("Fecund", "of Venom").
  n: string
  // 1 prefix, 2 suffix.
  g: number
  t: MapTier[]
  // The mod's own lines, as poedb writes them.
  lines: string[]
  // The stat refs those lines are.
  refs: string[]
  // Atlas Drops (quantity), rarity, pack size, in %.
  d: number
  r: number
  p: number
  m?: Partial<Record<MoreKind, number>>
}

export interface MapBonusData {
  v: number
  built: string
  mods: MapBonusMod[]
}

// What a list can sort by.
export type BonusKey = 'd' | 'r' | 'p' | MoreKind

export const BONUS_LABEL: Record<BonusKey, string> = {
  d: 'Atlas Drops',
  r: 'Rarity',
  p: 'Pack size',
  currency: 'More currency',
  maps: 'More maps',
  threads: 'More threads',
  divCards: 'More div cards',
  scarabs: 'More scarabs'
}
export const MORE_LABEL: Record<MoreKind, string> = { currency: 'Currency', maps: 'Maps', threads: 'Threads', divCards: 'Div Cards', scarabs: 'Scarabs' }
export const TIER_LABEL: Record<MapTier, string> = { low: 'low tier', mid: 'mid tier', top: 'top tier', t17: 'T17' }

export const mapBonusData = shallowRef<MapBonusData | null>(null)

let job: Promise<MapBonusData | null> | null = null
onSharedDataChange(() => {
  job = null
  if (mapBonusData.value) loadMapBonuses().catch(() => {})
})
export function loadMapBonuses (): Promise<MapBonusData | null> {
  if (!job) {
    const mine = fetch(dataFileUrl('map-bonuses.json'))
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<MapBonusData> })
      .then(d => { if (job === mine) mapBonusData.value = d; return d })
      // A failed read is tried again on the next ask.
      .catch(() => { if (job === mine) job = null; return null })
    job = mine
  }
  return job
}

// Every map mod wording (the language's own) -> its stat ref.
let refByMatcher: Map<string, string> | null = null
function refOf (matcher: string): string | undefined {
  // Built once the stat data is in (an empty map would stick).
  if (!refByMatcher?.size) {
    refByMatcher = new Map()
    for (const stat of STATS_ITERATOR('AreaMods')) {
      if (!stat.fromAreaMods) continue
      for (const m of stat.matchers) if (!refByMatcher.has(m.string)) refByMatcher.set(m.string, stat.ref)
    }
  }
  return refByMatcher.get(matcher) ?? matcher
}

const byRefCache = new WeakMap<MapBonusData, Map<string, MapBonusMod[]>>()
function byRef (data: MapBonusData): Map<string, MapBonusMod[]> {
  let index = byRefCache.get(data)
  if (!index) {
    index = new Map()
    for (const mod of data.mods) {
      for (const ref of mod.refs) {
        const list = index.get(ref)
        if (list) list.push(mod)
        else index.set(ref, [mod])
      }
    }
    byRefCache.set(data, index)
  }
  return index
}

// The mods a Map mods row (one wording) comes from. Without T17 mods when the
// list hides them.
export function modsOfLine (data: MapBonusData | null, matcher: string, withT17 = true): MapBonusMod[] {
  if (!data) return []
  const ref = refOf(matcher)
  const mods = (ref && byRef(data).get(ref)) || []
  return withT17 ? mods : mods.filter(m => !m.t.includes('t17'))
}

export function bonusOf (mod: MapBonusMod, key: BonusKey): number {
  return key === 'd' || key === 'r' || key === 'p' ? mod[key] : mod.m?.[key] ?? 0
}

// The most a line's mods give of one bonus.
export function bestBonus (mods: MapBonusMod[], key: BonusKey): number {
  let best = 0
  for (const m of mods) best = Math.max(best, bonusOf(m, key))
  return best
}

// The numbers a row shows: the T17 mod's on a T17-only line, otherwise the
// best regular one, plus the T17 mod's more-X bonus when a T17 mod shares the
// line.
export interface RowBonus {
  d: number
  r: number
  p: number
  more: Array<{ kind: MoreKind, pct: number, t17: boolean }>
}
export function rowBonus (mods: MapBonusMod[]): RowBonus | null {
  if (!mods.length) return null
  const regular = mods.filter(m => !m.t.includes('t17'))
  const shown = (regular.length ? regular : mods).reduce((a, b) => (b.d + b.r + b.p > a.d + a.r + a.p ? b : a))
  const more = new Map<MoreKind, { pct: number, t17: boolean }>()
  for (const m of mods) {
    for (const [kind, pct] of Object.entries(m.m ?? {}) as Array<[MoreKind, number]>) {
      const have = more.get(kind)
      if (!have || pct > have.pct) more.set(kind, { pct, t17: m.t.includes('t17') && regular.length > 0 })
    }
  }
  return { d: shown.d, r: shown.r, p: shown.p, more: [...more].map(([kind, v]) => ({ kind, ...v })) }
}

// What a row sorts by: the numbers it shows for Atlas Drops / rarity / pack
// size, the best more-X tag for the rest.
export function sortValue (mods: MapBonusMod[], key: BonusKey): number {
  if (key === 'd' || key === 'r' || key === 'p') return rowBonus(mods)?.[key] ?? 0
  return bestBonus(mods, key)
}

// Whether "want all" may take a line for a more-X bonus: only when a mod that
// gives it is the line's own. A line a T17 mod shares with a regular one would
// light up regular maps that give nothing.
export function wantsFor (mods: MapBonusMod[], kind: MoreKind): boolean {
  return mods.some(m => (m.m?.[kind] ?? 0) > 0) && mods.every(m => m.t.includes('t17'))
}

export function bonusWords (mod: MapBonusMod): string {
  const parts = [`${mod.d}% Atlas Drops`, `${mod.r}% rarity`, `${mod.p}% pack size`]
  for (const [kind, pct] of Object.entries(mod.m ?? {}) as Array<[MoreKind, number]>) parts.push(`${pct}% more ${MORE_LABEL[kind]}`)
  return parts.join(' · ')
}

// Tooltip text for a row: each mod the line comes from, its lines and bonuses.
export function bonusTip (mods: MapBonusMod[], built?: string): string {
  const blocks = mods.map(m => `${m.n} (${m.t.map(t => TIER_LABEL[t]).join(', ')})\n${m.lines.join('\n')}\n${bonusWords(m)}`)
  return [...blocks, `Bonuses from poedb${built ? `, ${built}` : ''}`].join('\n\n')
}
