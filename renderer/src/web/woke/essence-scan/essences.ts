// Essence scan: essence names and turning OCR'd monolith label lines into
// essences. OCR is noisy, so lines are matched to real names by similarity.
import { similarity } from '../map-mods/tooltip-parse'

export const ESSENCE_TIERS = ['Whispering', 'Muttering', 'Weeping', 'Wailing', 'Screaming', 'Shrieking', 'Deafening'] as const

// In groups of four by the lowest tier they come in: Greed to Woe from
// Whispering, Fear to Sorrow from Muttering, … Scorn to Dread from Screaming.
export const ESSENCE_TYPES = [
  'Greed', 'Contempt', 'Hatred', 'Woe', 'Fear', 'Anger', 'Torment', 'Sorrow',
  'Rage', 'Suffering', 'Wrath', 'Doubt', 'Loathing', 'Zeal', 'Anguish', 'Spite',
  'Scorn', 'Envy', 'Misery', 'Dread'
] as const

// Only come from corrupting a monolith, and have no tier.
export const CORRUPTION_ONLY = ['Insanity', 'Horror', 'Delirium', 'Hysteria'] as const

// The usual "always corrupt" set: corrupting a monolith that holds any of
// these (at any tier) can turn them into the corruption-only essences above,
// which are the valuable ones. It's one of several random outcomes, so it's a
// chance, not a sure thing.
export const MEDS = ['Misery', 'Envy', 'Dread', 'Scorn']

export interface Essence {
  // Full item name, as poe.ninja lists it.
  name: string
  type: string
  tier: string | null
}

export const ALL_ESSENCES: Essence[] = [
  // Only the 100 that exist ("Whispering Essence of Misery" doesn't), so a
  // misread tier word can't match a name no monolith holds.
  ...ESSENCE_TYPES.flatMap((type, i) => ESSENCE_TIERS.slice(Math.floor(i / 4)).map(tier => ({ name: `${tier} Essence of ${type}`, type, tier }))),
  ...CORRUPTION_ONLY.map(type => ({ name: `Essence of ${type}`, type, tier: null }))
]

export interface ScannedMonolith {
  essences: Essence[]
  // The label says the monolith is corrupted, or it holds an essence that
  // only corrupting gives.
  corrupted: boolean
}

function simplify (s: string): string {
  return s.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
}

const SIMPLE = ALL_ESSENCES.map(e => ({ e, s: simplify(e.name) }))
const MIN_SIMILARITY = 0.78

// Best essence match for one OCR line, or null.
export function matchEssence (line: string): Essence | null {
  const s = simplify(line)
  // Cheap filter: an essence line has "ess..." or "...ence of" somewhere.
  if (!/ess|ence|of [a-z]/.test(s)) return null
  let best: Essence | null = null
  let bestScore = 0
  for (const cand of SIMPLE) {
    // Compare against a window of the line as long as the name, since OCR
    // may glue stray characters before or after it.
    const score = windowSimilarity(s, cand.s)
    if (score > bestScore) { bestScore = score; best = cand.e }
  }
  return bestScore >= MIN_SIMILARITY ? best : null
}

function windowSimilarity (line: string, name: string): number {
  if (line.length <= name.length + 2) return similarity(line, name)
  let best = 0
  for (let i = 0; i + name.length <= line.length + 2; i += 2) {
    best = Math.max(best, similarity(line.slice(i, i + name.length), name))
  }
  return best
}

export function parseMonolith (lines: string[]): ScannedMonolith | null {
  const essences: Essence[] = []
  let corruptedWord = false
  for (const line of lines) {
    if (/corrupt/i.test(line)) corruptedWord = true
    const e = matchEssence(line)
    if (e) essences.push(e)
  }
  if (!essences.length) return null
  const corrupted = corruptedWord || essences.some(e => e.tier === null)
  return { essences, corrupted }
}

export type EssenceVerdict = 'corrupt' | 'open' | 'done'

// What a corrupt can do, best case. GGG doesn't publish the odds, and an
// average over guessed odds read like advice (veteran critique, Guy
// 2026-11-25), so only the best result is priced and the verdict follows the
// rule of thumb (a Misery, Envy, Dread or Scorn is there):
// - upgrade: every tiered essence goes up one tier
// - special: one Misery/Envy/Dread/Scorn turns into a corruption-only essence,
//   the dearest of the four (without one of those, nothing changes)

export interface CorruptEstimate {
  now: number
  // The better of the two outcomes above.
  best: number
  // best - now - cost of the corruption item
  bestGain: number
  // False when some prices were missing, so the numbers are partial.
  complete: boolean
}

function nextTierName (e: Essence): string | null {
  if (!e.tier) return null
  const i = ESSENCE_TIERS.indexOf(e.tier as typeof ESSENCE_TIERS[number])
  if (i < 0 || i === ESSENCE_TIERS.length - 1) return e.name
  return `${ESSENCE_TIERS[i + 1]} Essence of ${e.type}`
}

export function estimateCorrupt (essences: Essence[], price: (name: string) => number | null, corruptCost: number): CorruptEstimate {
  let complete = true
  const p = (name: string | null) => {
    if (!name) return 0
    const v = price(name)
    if (v == null) { complete = false; return 0 }
    return v
  }
  const values = essences.map(e => p(e.name))
  const now = values.reduce((a, b) => a + b, 0)

  const upgraded = essences.reduce((sum, e, i) => sum + (e.tier ? p(nextTierName(e)) : values[i]), 0)

  // Only priced when the Misery/Envy/Dread/Scorn it replaces has a price:
  // counting an unpriced one as 0 would make the gain look bigger than it is.
  const medsIdx = essences
    .map((e, i) => ({ e, i }))
    .filter(x => MEDS.includes(x.e.type) && price(x.e.name) != null)
    .sort((a, b) => values[a.i] - values[b.i])[0]
  const special = medsIdx ? now - values[medsIdx.i] + Math.max(...CORRUPTION_ONLY.map(t => p(`Essence of ${t}`))) : now

  const best = Math.max(upgraded, special)
  return { now, best, bestGain: best - now - corruptCost, complete }
}

export interface PricedMonolith {
  verdict: EssenceVerdict
  // Flagged essence types found, e.g. ['Misery'].
  flagged: string[]
  rows: Array<{ essence: Essence, chaos: number | null, flagged: boolean }>
  totalChaos: number
  // What a corrupt can turn flagged essences into, priced, best first.
  specials: Array<{ name: string, chaos: number | null }>
  estimate: CorruptEstimate | null
}

// Corrupt when a flagged type (any tier) is present: the rule of thumb. The
// best case is shown beside it, never used as the call.
// `price` looks up an essence's chaos price by full name.
export function rateMonolith (m: ScannedMonolith, flagTypes: string[], price: (name: string) => number | null, corruptCost = 1): PricedMonolith {
  const flagSet = new Set(flagTypes.map(t => t.toLowerCase()))
  const rows = m.essences.map(essence => ({
    essence,
    chaos: price(essence.name),
    flagged: flagSet.has(essence.type.toLowerCase())
  }))
  const flagged = [...new Set(rows.filter(r => r.flagged).map(r => r.essence.type))]
  const totalChaos = rows.reduce((sum, r) => sum + (r.chaos ?? 0), 0)
  const estimate = m.corrupted ? null : estimateCorrupt(m.essences, price, corruptCost)
  const verdict: EssenceVerdict = m.corrupted ? 'done' : flagged.length > 0 ? 'corrupt' : 'open'
  const specials = !m.corrupted && flagged.length
    ? CORRUPTION_ONLY.map(t => ({ name: `Essence of ${t}`, chaos: price(`Essence of ${t}`) }))
        .sort((a, b) => (b.chaos ?? -1) - (a.chaos ?? -1))
    : []
  return { verdict, flagged, rows, totalChaos, specials, estimate }
}

export function shortEssenceName (e: Essence): string {
  return e.tier ? `${e.tier.slice(0, 3)}. ${e.type}` : e.type
}
