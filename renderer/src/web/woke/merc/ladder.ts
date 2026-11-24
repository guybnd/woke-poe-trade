// Mercenary Warrant support ladder (Guy's merc thread, 2026-11-24, option A1).
// A warrant's price rides on a few of its supports. This ranks each skill's
// supports by what the market paid for them when measured, remembers those
// answers per skill, and builds the searches that measure them. Pure apart
// from localStorage, so it's testable without Vue.

import type { FilterOrGroup, FilterGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { FilterTag } from '@/web/price-check/filters/interfaces'
import { SearchMode } from '@/web/price-check/filters/pseudo/mercenary'

export interface SupportRow {
  statRef: string
  text: string
  tier: number | undefined
  maxTier: boolean
  filter: StatFilter
}

export interface SkillLadder {
  skillRef: string
  skillText: string
  group: FilterGroup
  supports: SupportRow[]
}

/** The skill groups of a warrant's filters, with the supports it actually has (not the "not linked" rows). */
export function skillLadders (stats: FilterOrGroup[]): SkillLadder[] {
  const out: SkillLadder[] = []
  for (const f of stats) {
    if (!('group' in f) || f.group !== 'mercenary') continue
    const supports: SupportRow[] = []
    for (const s of f.stats) {
      if (s.tag !== FilterTag.MercenarySupport || s.not) continue
      supports.push({
        statRef: s.statRef,
        text: s.text,
        tier: s.mercenary?.tier,
        maxTier: Boolean(s.mercenary?.maxTier),
        filter: s
      })
    }
    if (supports.length) {
      out.push({ skillRef: f.meta.statRef, skillText: f.meta.text, group: f, supports })
    }
  }
  return out
}

// ---- what a support was worth, remembered per skill ----

export interface Worth {
  /** Fair price of warrants with this skill and this support linked to it, chaos. */
  with: number | null
  /** Fair price of warrants with this skill, any supports, chaos (same search for every support). */
  base: number | null
  /** Listings with this support. */
  count: number
  at: number
}

const KEY = 'woke.mercSupportWorth'
// Measured prices age out: a league's market moves.
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000
const MAX_ROWS = 300

type Store = Record<string, Worth>

/** A support and its tier: a Greater one searches only Greater, so it has its own worth. */
export function supportKey (row: SupportRow) {
  return row.tier != null ? `${row.statRef}#${row.tier}` : row.statRef
}

export function worthKey (league: string, skillRef: string, supportRef: string) {
  return `${league}|${skillRef}|${supportRef}`
}

function read (): Store {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (v && typeof v === 'object') return v as Store
  } catch {}
  return {}
}

export function loadWorth (league: string, skillRef: string, supportRef: string, now = Date.now()): Worth | undefined {
  const w = read()[worthKey(league, skillRef, supportRef)]
  if (!w || now - w.at > MAX_AGE_MS) return undefined
  return w
}

export function saveWorth (entries: Array<[string, Worth]>) {
  const store = read()
  for (const [k, w] of entries) store[k] = w
  // Keep the newest rows.
  const kept = Object.entries(store).sort((a, b) => b[1].at - a[1].at).slice(0, MAX_ROWS)
  try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(kept))) } catch {}
}

/** Chaos a support adds over the bare skill, never below 0; null until measured or when nothing listed. */
export function adds (w: Worth | undefined): number | null {
  if (!w || w.with == null || w.base == null) return null
  return Math.max(w.with - w.base, 0)
}

/** Measured worth first, then top tier, then higher tier. Stable for ties. */
export function rankSupports (rows: SupportRow[], worth: (row: SupportRow) => Worth | undefined): SupportRow[] {
  return rows
    .map((row, i) => ({ row, i, a: adds(worth(row)) }))
    .sort((x, y) =>
      ((y.a ?? -1) - (x.a ?? -1)) ||
      (Number(y.row.maxTier) - Number(x.row.maxTier)) ||
      ((y.row.tier ?? 0) - (x.row.tier ?? 0)) ||
      (x.i - y.i))
    .map(x => x.row)
}

// ---- searches ----

function clone (stats: FilterOrGroup[]): FilterOrGroup[] {
  return JSON.parse(JSON.stringify(stats)) as FilterOrGroup[]
}

/**
 * The search for warrants with this skill and, when given, this support
 * linked to it. Only the skill and that support are searched: every other
 * skill group, support, "not linked" row and the 6-link row are switched off,
 * so the answer is the same whatever else the player ticked and can be kept
 * per skill. Item filters (league, level...) stay as they are.
 */
export function measureStats (stats: FilterOrGroup[], skillRef: string, onlySupport: string | null): FilterOrGroup[] {
  const out = clone(stats)
  for (const f of out) {
    if (!('group' in f) || !f.group) {
      f.disabled = true
      continue
    }
    const mine = f.group === 'mercenary' && f.meta.statRef === skillRef
    f.meta.disabled = !mine
    for (const s of f.stats) {
      const on = mine && onlySupport != null && s.statRef === onlySupport && !s.not &&
        s.tag === FilterTag.MercenarySupport
      s.disabled = !on
      // An optional gem alone is dropped from the search: make it required.
      if (on) s.option = { value: SearchMode.Required }
    }
  }
  return out
}

export type Narrowness = 'ok' | 'narrow' | 'empty'

/** Too few listings means the price is one seller's ask. */
export function narrowness (total: number | null | undefined): Narrowness {
  if (total == null) return 'ok'
  if (total === 0) return 'empty'
  if (total < 4) return 'narrow'
  return 'ok'
}
