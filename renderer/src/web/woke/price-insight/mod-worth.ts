// How much each mod on a rare is worth, and the "By value" roll ranges built
// from it. Pure functions, no Vue or IO.
//
// Worth comes from the best source available per mod:
//   measured  - the price drivers search (exact, one trade search per mod)
//   poeprices - poeprices.info's breakdown of its estimate (free, rares only)
//   guess     - the known-valuable mod list plus how well the mod rolled

import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { isOpenBound } from './roll-presets'

export type WorthSource = 'measured' | 'poeprices' | 'guess'

export interface ModWorth {
  statRef: string
  /** Share of the item's price this mod explains, 0..1. */
  share: number
  /** share × the item's price, when the price is known. */
  chaos: number | null
  source: WorthSource
}

export type WorthBand = 'carry' | 'adds' | 'nothing'

// Thresholds on share.
export const CARRY_SHARE = 0.25
export const NOTHING_SHARE = 0.05

export const WORTH_SOURCE_LABEL: Record<WorthSource, string> = {
  measured: 'measured with trade searches',
  poeprices: 'from poeprices.info',
  guess: 'rough guess from the mod and its roll'
}

export function worthBand (w: ModWorth): WorthBand {
  if (w.share >= CARRY_SHARE) return 'carry'
  // A guess is never confident enough to drop a mod from the search.
  if (w.share < NOTHING_SHARE && w.source !== 'guess') return 'nothing'
  return 'adds'
}

function statList (stats: FilterOrGroup[]): StatFilter[] {
  // A local mod in a property total is worth what the total is: count it once.
  return stats.filter((f): f is StatFilter => !f.group && !f.hidden && !f.not && !f.inTotal)
}

const STOP_WORDS = new Set(['to', 'total', 'pseudo', 'implicit', 'crafted', 'fractured', 'enchant', 'explicit', 'of', 'a', 'an', 'the'])

/** Words of a mod text with numbers as '#', for loose matching across sites. */
export function modTokens (text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\((pseudo|total|implicit|crafted|fractured|enchant|explicit|scourge|crucible)\)/g, ' ')
    .replace(/[+-]?\d+(\.\d+)?/g, '#')
    .replace(/[^a-z#]+/g, ' ')
    .split(' ')
    .filter(w => w && !STOP_WORDS.has(w))
}

function similarity (a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const sb = new Set(b)
  const common = new Set(a.filter(w => sb.has(w))).size
  return common / Math.max(new Set(a).size, sb.size)
}

const MATCH_MIN = 0.75

/** Best-matching stat for a mod text from another site, or null. */
export function matchStat (text: string, stats: StatFilter[]): StatFilter | null {
  const t = modTokens(text)
  let best: StatFilter | null = null
  let bestScore = MATCH_MIN
  for (const s of stats) {
    const score = similarity(t, modTokens(s.text))
    if (score >= bestScore) { best = s; bestScore = score }
  }
  return best
}

function seedRank (statRef: string, seed: string[]): number {
  const t = statRef.toLowerCase()
  const idx = seed.findIndex(s => s.trim() !== '' && t.includes(s.trim().toLowerCase()))
  return idx === -1 ? -1 : seed.length - idx
}

export interface WorthInput {
  measured?: Array<{ statRef: string, share: number | null }>
  /** poeprices.info's explanation: mod text and contribution in percent. */
  explanation?: Array<{ name: string, contrib: number }>
  seed: string[]
  /** The item's price in chaos, to turn shares into chaos. */
  fair?: number | null
}

export function estimateWorth (stats: FilterOrGroup[], input: WorthInput): Map<string, ModWorth> {
  const list = statList(stats)
  const out = new Map<string, ModWorth>()
  const fair = input.fair ?? null
  const put = (statRef: string, share: number, source: WorthSource) => {
    const s = Math.min(Math.max(share, 0), 1)
    out.set(statRef, { statRef, share: s, chaos: fair != null ? s * fair : null, source })
  }

  for (const m of input.measured ?? []) {
    if (m.share != null && list.some(s => s.statRef === m.statRef)) put(m.statRef, m.share, 'measured')
  }

  if (input.explanation?.length) {
    const fromPp = new Map<string, number>()
    for (const e of input.explanation) {
      const s = matchStat(e.name, list)
      if (!s) continue
      fromPp.set(s.statRef, (fromPp.get(s.statRef) ?? 0) + e.contrib / 100)
    }
    // Nothing matched: the texts differ too much to trust, fall back to a guess.
    for (const s of fromPp.size ? list : []) {
      if (out.has(s.statRef)) continue
      // poeprices explains every mod it weighs; one it never names adds nothing.
      put(s.statRef, fromPp.get(s.statRef) ?? 0, 'poeprices')
    }
  }

  const rest = list.filter(s => !out.has(s.statRef))
  if (rest.length) {
    const used = Array.from(out.values()).reduce((a, w) => a + w.share, 0)
    const left = Math.max(1 - used, 0)
    const scores = rest.map(s => {
      const rank = seedRank(s.statRef, input.seed)
      const roll = s.roll?.goodness ?? 0.5
      return rank >= 0 ? (1 + rank / input.seed.length) * (0.5 + roll) : 0.15 * (0.5 + roll)
    })
    const total = scores.reduce((a, b) => a + b, 0) || 1
    rest.forEach((s, i) => put(s.statRef, left * scores[i] / total, 'guess'))
  }
  return out
}

// How far "carry" mods drop the min below the item's roll, as a share of the
// distance down to the bottom of its tier.
const CARRY_SLACK = 0.3

function round (value: number, dp: boolean, method: (n: number) => number) {
  const k = dp ? 100 : 1
  return method(Math.round(value * k * 1e6) / 1e6) / k
}

export interface ValueChange {
  statRef: string
  band: WorthBand
  disabled: boolean
  min: number | undefined
  max: number | undefined
}

/** What "By value" would do to each ticked mod. */
export function valueChanges (stats: FilterOrGroup[], worth: Map<string, ModWorth>): ValueChange[] {
  const out: ValueChange[] = []
  for (const s of statList(stats)) {
    if (s.disabled) continue
    const w = worth.get(s.statRef)
    if (!w) continue
    const band = worthBand(w)
    const roll = s.roll
    let min = roll && typeof roll.min === 'number' ? roll.min : undefined
    let max = roll && typeof roll.max === 'number' ? roll.max : undefined
    if (band === 'nothing') {
      out.push({ statRef: s.statRef, band, disabled: true, min, max })
      continue
    }
    if (roll?.bounds && roll.better) {
      const b = roll.bounds
      if (band === 'carry' && (isOpenBound(b.min) || isOpenBound(b.max))) {
        // No tier to take slack from: this roll or better.
        if (roll.better === 1) { min = roll.value; max = undefined } else { min = undefined; max = roll.value }
      } else if (band === 'carry') {
        if (roll.better === 1) {
          min = Math.max(b.min, round(roll.value - (roll.value - b.min) * CARRY_SLACK, roll.dp, Math.floor))
          max = undefined
        } else {
          max = Math.min(b.max, round(roll.value + (b.max - roll.value) * CARRY_SLACK, roll.dp, Math.ceil))
          min = undefined
        }
      } else if (roll.better === 1) {
        min = isOpenBound(b.min) ? undefined : b.min; max = undefined
      } else {
        min = undefined; max = isOpenBound(b.max) ? undefined : b.max
      }
    }
    out.push({ statRef: s.statRef, band, disabled: false, min, max })
  }
  return out
}

export function applyValueChanges (stats: FilterOrGroup[], changes: ValueChange[]) {
  const byRef = new Map(changes.map(c => [c.statRef, c]))
  for (const s of statList(stats)) {
    const c = byRef.get(s.statRef)
    if (!c) continue
    if (c.disabled) { s.disabled = true; continue }
    if (s.roll) {
      s.roll.min = c.min
      s.roll.max = c.max
    }
  }
}
