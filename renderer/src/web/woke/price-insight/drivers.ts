// Price drivers and the search ladder for rares. Both run extra trade searches
// on request, through APT's own request functions so its rate limiter and
// cache apply.
//
// Which mods to test comes from a hybrid: the mods APT already enabled for the
// search, ranked by an editable seed list of known valuable mods and by how
// well each one rolled. The searches then measure what each mod is worth.

import { shallowRef, watch } from 'vue'
import type { ItemFilters, FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { createTradeRequest, requestTradeResultList, requestResults } from '@/web/price-check/trade/pathofexile-trade'
import { AppConfig } from '@/web/Config'
import { RATE_LIMIT_RULES, restrictedMs } from '@/web/price-check/trade/common'
import { RateLimiter } from '@/web/price-check/trade/RateLimiter'
import { buildInsight, InsightOptions, Insight } from './insight'

// Matched case-insensitively as a substring of the stat's reference text,
// where numbers are written as '#' (e.g. '+# to maximum Life').
export const DEFAULT_SEED = [
  '+# to Level of all',
  'to Level of Socketed',
  'increased Movement Speed',
  // A rare's life usually reaches the search as its total.
  'total maximum Life',
  'to maximum Life',
  'total maximum Energy Shield',
  'to maximum Energy Shield',
  'increased maximum Energy Shield',
  'to all Elemental Resistances',
  'Resistance',
  'increased Spell Damage',
  'Critical Strike Multiplier',
  'increased Critical Strike Chance',
  'increased Attack Speed',
  'increased Cast Speed',
  'increased Physical Damage',
  'Adds # to # Physical Damage',
  'to Strength',
  'to Dexterity',
  'to Intelligence',
  'to all Attributes',
  'Suppress Spell Damage',
  'to Accuracy Rating'
]

const SEED_KEY = 'woke.priceDriverSeed'

function readSeed (): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SEED_KEY) ?? 'null')
    if (Array.isArray(v) && v.every(s => typeof s === 'string')) return v
  } catch {}
  return DEFAULT_SEED
}

export const driverSeed = shallowRef<string[]>(readSeed())
watch(driverSeed, (v) => {
  try { localStorage.setItem(SEED_KEY, JSON.stringify(v)) } catch {}
})

function seedRank (statRef: string, seed: string[]): number {
  const t = statRef.toLowerCase()
  const idx = seed.findIndex(s => s.trim() !== '' && t.includes(s.trim().toLowerCase()))
  return idx === -1 ? -1 : seed.length - idx
}

function isStat (f: FilterOrGroup): f is StatFilter {
  return !('group' in f && f.group)
}

/** The stat's text with this item's value in place of the first '#'. */
function statLabel (f: StatFilter): string {
  const text = f.text.replace(/\s+/g, ' ').trim()
  return f.roll ? text.replace('#', String(f.roll.value)) : text
}

export interface Candidate { statRef: string, text: string, score: number }

/** Enabled mods worth testing, best guess first. */
export function pickCandidates (stats: FilterOrGroup[], seed: string[], limit = 3): Candidate[] {
  const out: Candidate[] = []
  for (const f of stats) {
    if (!isStat(f) || f.disabled || f.hidden || f.not || f.mapKind) continue
    const rank = seedRank(f.statRef, seed)
    const roll = f.roll?.goodness ?? 0.5
    // A seed match outweighs roll quality; within each, better rolls first.
    out.push({ statRef: f.statRef, text: statLabel(f), score: (rank >= 0 ? 10 + rank / seed.length : 0) + roll })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

function cloneStats (stats: FilterOrGroup[]): FilterOrGroup[] {
  return JSON.parse(JSON.stringify(stats)) as FilterOrGroup[]
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const CANCELLED = 'Cancelled'

export interface PricedSearch { total: number, insight: Insight }

// Search budget right now: how many searches APT's limiter would allow
// without queueing, and how long `count` more would have to wait.
// `_tick` only lets a caller re-run this on a timer (the limiter's state
// changes with time, not through Vue reactivity).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function searchBudget (count: number, _tick?: number): { left: number, waitMs: number } {
  const limiters = Array.from(RATE_LIMIT_RULES.SEARCH)
  const penalty = restrictedMs(RATE_LIMIT_RULES.SEARCH)
  const left = (limiters.length && !penalty) ? Math.min(...limiters.map(l => l.available)) : 0
  const waitMs = Math.max(RateLimiter.estimateTime(count, limiters), penalty)
  return { left, waitMs }
}

// Measured drivers per search, for this session, so measuring the same
// item twice costs nothing.
const driverCache = new Map<string, DriverResult[]>()
const ladderCache = new Map<string, LadderResult[]>()

export function searchKey (filters: ItemFilters, stats: FilterOrGroup[], extra: unknown): string {
  return JSON.stringify([filters.trade.league, createTradeRequest(filters, stats), extra])
}

export function cachedDrivers (key: string) { return driverCache.get(key) }
export function cacheDrivers (key: string, v: DriverResult[]) { driverCache.set(key, v); trim(driverCache) }
export function cachedLadder (key: string) { return ladderCache.get(key) }
export function cacheLadder (key: string, v: LadderResult[]) { ladderCache.set(key, v); trim(ladderCache) }

/** For a fresh search: measured results from before it no longer apply. */
export function clearDriverCaches () {
  driverCache.clear()
  ladderCache.clear()
}

function trim (m: Map<string, unknown>) {
  while (m.size > 50) m.delete(m.keys().next().value as string)
}

/**
 * One search plus one page of listings, turned into an insight. Waits and
 * retries when APT's limiter says a request would have to queue.
 */
export async function pricedSearch (
  filters: ItemFilters,
  stats: FilterOrGroup[],
  opts: InsightOptions,
  onWait?: (seconds: number) => void,
  isCancelled?: () => boolean
): Promise<PricedSearch> {
  const request = createTradeRequest(filters, stats)
  for (let attempt = 0; ; attempt++) {
    // A wait can outlast the panel that asked: don't spend searches for it.
    if (isCancelled?.()) throw new Error(CANCELLED)
    try {
      const list = await requestTradeResultList(request, filters.trade.league)
      const ids = list.result.slice(0, 10)
      const results = ids.length
        ? await requestResults(list.id, ids, { accountName: AppConfig().accountName })
        : []
      const insight = buildInsight(results.map(r => ({ ...r, listedTimes: 1 })), opts)
      return { total: list.total, insight }
    } catch (err) {
      const m = /Retry after (\d+) seconds/.exec((err as Error).message)
      if (!m || attempt >= 3) throw err
      const seconds = Number(m[1]) + 1
      onWait?.(seconds)
      await sleep(seconds * 1000)
    }
  }
}

export interface DriverResult {
  statRef: string
  text: string
  /** Fair price with this mod removed from the search, or null when nothing listed. */
  without: number | null
  /** Chaos the mod adds: fair price with it minus without it (never below 0). */
  adds: number | null
  /** Share of the item's fair price explained by the mod, 0..1. */
  share: number | null
}

export function driverFrom (c: Candidate, base: number, without: PricedSearch): DriverResult {
  const w = without.insight.range?.fair ?? null
  if (w == null) return { statRef: c.statRef, text: c.text, without: null, adds: null, share: null }
  const adds = Math.max(base - w, 0)
  return { statRef: c.statRef, text: c.text, without: w, adds, share: base > 0 ? adds / base : null }
}

/** Search again with one mod switched off, for each candidate. */
export async function measureDrivers (
  filters: ItemFilters,
  stats: FilterOrGroup[],
  base: number,
  candidates: Candidate[],
  opts: InsightOptions,
  onProgress: (done: DriverResult[], waiting: number | null) => void,
  isCancelled?: () => boolean
): Promise<DriverResult[]> {
  const done: DriverResult[] = []
  for (const c of candidates) {
    const s = cloneStats(stats)
    for (const f of s) {
      if (isStat(f) && f.statRef === c.statRef) f.disabled = true
    }
    const r = await pricedSearch(filters, s, opts, sec => onProgress(done, sec), isCancelled)
    done.push(driverFrom(c, base, r))
    onProgress([...done], null)
  }
  return done.sort((a, b) => (b.adds ?? -1) - (a.adds ?? -1))
}

export type LadderStep = 'core' | 'loose'

export const LADDER_LABEL: Record<LadderStep, string> = {
  core: 'Only the key mods',
  loose: 'Key mods, rolls 15% lower'
}

/** The stats for a ladder step: only the candidate mods, optionally with lower minimum rolls. */
export function ladderStats (stats: FilterOrGroup[], keep: Candidate[], step: LadderStep): FilterOrGroup[] {
  const keepRefs = new Set(keep.map(c => c.statRef))
  const s = cloneStats(stats)
  for (const f of s) {
    if (!isStat(f)) continue
    if (!keepRefs.has(f.statRef)) { f.disabled = true; continue }
    if (step === 'loose' && f.roll && !f.roll.tradeInvert && !f.roll.isNegated && typeof f.roll.min === 'number' && f.roll.min > 0) {
      const lowered = f.roll.min * 0.85
      f.roll.min = f.roll.dp ? Math.round(lowered * 100) / 100 : Math.floor(lowered)
    }
  }
  return s
}

export interface LadderResult { step: LadderStep, total: number, insight: Insight }

/**
 * Widens a search that found too few listings: first only the key mods, then
 * the key mods with lower rolls. Stops as soon as a step has enough listings.
 */
export async function runLadder (
  filters: ItemFilters,
  stats: FilterOrGroup[],
  keep: Candidate[],
  opts: InsightOptions,
  onProgress: (steps: LadderResult[], waiting: number | null) => void,
  isCancelled?: () => boolean
): Promise<LadderResult[]> {
  const steps: LadderResult[] = []
  for (const step of ['core', 'loose'] as LadderStep[]) {
    const r = await pricedSearch(filters, ladderStats(stats, keep, step), opts, sec => onProgress(steps, sec), isCancelled)
    steps.push({ step, total: r.total, insight: r.insight })
    onProgress([...steps], null)
    if (r.insight.kept.length >= 5) break
  }
  return steps
}
