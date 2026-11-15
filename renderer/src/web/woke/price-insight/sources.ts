// Blends every price source we have for an item into one estimate and says
// how much they agree. Pure functions, no Vue or IO.
//
// Listings are the strongest source when there are enough of them; the other
// sources matter more as listings get thin, and fill in when there are none.

import type { Insight } from './insight'

export type SourceKey = 'listings' | 'ninja' | 'poeprices' | 'mine'

export interface SourcePoint {
  key: SourceKey
  label: string
  /** Chaos range this source gives; low === high for a single price. */
  low: number
  high: number
  mid: number
  /** How much it counts in the blend (0 = shown but ignored). */
  weight: number
  note: string
}

export type Agreement = 'single' | 'agree' | 'mixed' | 'disagree'

export interface Blend {
  points: SourcePoint[]
  /** Weighted price across sources, or null with nothing to go on. */
  fair: number | null
  agreement: Agreement
  /** poe.ninja and listings far apart while poe.ninja's market is thin. */
  ninjaSuspect: boolean
}

export interface BlendInput {
  insight: Insight
  /** `fits` false: the search looks for something poe.ninja's price doesn't cover. */
  ninja?: { chaos: number, gaps: number, fits?: boolean } | null
  poeprices?: { min: number, max: number, confidence: number } | null
  /** Your last check of the same search, made before this session's checks. */
  mine?: { chaos: number, ts: number } | null
  now?: number
}

const LISTING_WEIGHT = { high: 3, medium: 1.5, low: 0.5, none: 0 }
const NINJA_WEIGHT = 1
const NINJA_THIN_WEIGHT = 0.25
const NINJA_THIN_GAPS = 2
const NINJA_GAP_NOTE = 0.25
const POEPRICES_WEIGHT = 0.6
const MINE_WEIGHT = 0.4
const MINE_HALF_LIFE_DAYS = 7
const MINE_MAX_DAYS = 14
const MIN_LISTINGS_FOR_FLOOR = 3
const DAY_MS = 24 * 60 * 60 * 1000

function ageText (ms: number): string {
  const h = ms / 3600_000
  if (h < 1) return 'just now'
  if (h < 24) return `${Math.round(h)}h ago`
  return `${Math.round(h / 24)}d ago`
}

export function buildBlend (input: BlendInput): Blend {
  const now = input.now ?? Date.now()
  const points: SourcePoint[] = []
  const { insight } = input
  let ninjaSuspect = false

  if (insight.range) {
    points.push({
      key: 'listings',
      label: 'Listings',
      low: insight.range.low,
      high: insight.range.high,
      mid: insight.range.fair,
      weight: LISTING_WEIGHT[insight.confidence],
      note: `${insight.kept.length} trusted listings, ${insight.confidence} confidence`
    })
  }

  if (input.ninja && input.ninja.chaos > 0) {
    const thin = input.ninja.gaps >= NINJA_THIN_GAPS
    const fair = insight.range?.fair
    if (thin && fair != null) {
      const ratio = fair / input.ninja.chaos
      ninjaSuspect = ratio >= 2 || ratio <= 0.5
    }
    const unfit = input.ninja.fits === false
    // With few or no listings it's still a useful check against a lone bad one.
    const offTarget = unfit && fair != null && insight.confidence !== 'low'
    points.push({
      key: 'ninja',
      label: 'poe.ninja',
      low: input.ninja.chaos,
      high: input.ninja.chaos,
      mid: input.ninja.chaos,
      weight: (ninjaSuspect || offTarget) ? 0 : (thin || (unfit && fair != null)) ? NINJA_THIN_WEIGHT : NINJA_WEIGHT,
      note: offTarget
        ? 'Its price is for any roll, uncorrupted and without a Foulborn mod, so it can\'t speak for this search: not counted'
        : ninjaSuspect
          ? `No price on about ${input.ninja.gaps} of every 7 days and far from the listings: may be faked, not counted`
          : thin
            ? `No price on about ${input.ninja.gaps} of every 7 days: counted lightly`
            : (unfit && fair != null)
                ? 'Its price is for any roll, uncorrupted and without a Foulborn mod: counted lightly because listings are few'
                : 'Average of recent listings across the league'
    })
  }

  if (input.poeprices && input.poeprices.max > 0) {
    const { min, max, confidence } = input.poeprices
    const lo = Math.min(min, max)
    const hi = Math.max(min, max)
    points.push({
      key: 'poeprices',
      label: 'poeprices',
      low: lo,
      high: hi,
      mid: lo > 0 ? Math.sqrt(lo * hi) : hi / 2,
      weight: POEPRICES_WEIGHT * Math.min(Math.max(confidence, 0), 100) / 100,
      note: `Machine-learned guess from mods, ${Math.round(confidence)}% confident`
    })
  }

  if (input.mine && input.mine.chaos > 0) {
    const age = Math.max(now - input.mine.ts, 0)
    const days = age / DAY_MS
    points.push({
      key: 'mine',
      label: `You, ${ageText(age)}`,
      low: input.mine.chaos,
      high: input.mine.chaos,
      mid: input.mine.chaos,
      weight: days > MINE_MAX_DAYS ? 0 : MINE_WEIGHT * Math.pow(0.5, days / MINE_HALF_LIFE_DAYS),
      note: 'Your earlier check of the same search'
    })
  }

  const counted = points.filter(p => p.weight > 0 && p.mid > 0)
  if (!counted.length) {
    return { points, fair: null, agreement: 'single', ninjaSuspect }
  }

  // Prices spread multiplicatively, so blend in log space.
  const total = counted.reduce((s, p) => s + p.weight, 0)
  const fair = counted.length === 1
    ? counted[0].mid
    : Math.exp(counted.reduce((s, p) => s + p.weight * Math.log(p.mid), 0) / total)

  let agreement: Agreement = 'single'
  if (counted.length >= 2) {
    const mids = counted.map(p => p.mid)
    const spread = Math.max(...mids) / Math.min(...mids)
    agreement = spread <= 1.35 ? 'agree' : spread <= 2 ? 'mixed' : 'disagree'
  }
  return { points, fair, agreement, ninjaSuspect }
}

/**
 * Whether listing the sources says more than the verdict's own line, which
 * already shows the cheapest listing and poe.ninja's price.
 */
export function sourcesAddAnything (blend: Blend, headlineFrom?: 'listings' | 'blend'): boolean {
  // The list is what explains a blended headline.
  if (headlineFrom === 'blend') return true
  if (blend.agreement === 'mixed' || blend.agreement === 'disagree') return true
  if (blend.points.some(p => p.weight === 0 || (p.key !== 'listings' && p.key !== 'ninja'))) return true

  const ninja = blend.points.find(p => p.key === 'ninja')
  if (!ninja) return false
  // poe.ninja counted lightly, with its caveat in the list.
  if (ninja.weight < NINJA_WEIGHT) return true
  // The list notes a gap from a quarter apart, inside what counts as agreeing.
  const listings = blend.points.find(p => p.key === 'listings')
  return listings != null && Math.abs(listings.mid / ninja.mid - 1) >= NINJA_GAP_NOTE
}

/**
 * The price to headline. Plenty of agreeing listings already say what this
 * exact search sells for, and other sources can't see its rolls, so they only
 * move the headline when listings are thin or missing.
 */
export function headlinePrice (blend: Blend, insight: Insight): { chaos: number, from: 'listings' | 'blend' } | null {
  if (insight.range && insight.confidence === 'high') return { chaos: insight.range.fair, from: 'listings' }
  if (blend.fair != null) {
    // Nobody pays more than an instant buyout that's sitting there, whatever other sources say.
    if (insight.ceiling != null && blend.fair > insight.ceiling) return { chaos: insight.ceiling, from: 'listings' }
    // Nor for less than the cheapest listing, when enough current listings back it up.
    const backed = insight.kept.length >= MIN_LISTINGS_FOR_FLOOR && !insight.signals.some(s => s.kind === 'old')
    const floor = insight.floor ?? insight.range?.low
    if (floor != null && backed && blend.fair < floor) return { chaos: floor, from: 'listings' }
    const onlyListings = blend.points.filter(p => p.weight > 0).every(p => p.key === 'listings')
    return { chaos: blend.fair, from: onlyListings ? 'listings' : 'blend' }
  }
  if (insight.range) return { chaos: insight.range.fair, from: 'listings' }
  return null
}
