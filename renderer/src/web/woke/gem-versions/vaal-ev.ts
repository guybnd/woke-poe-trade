// What a Vaal Orb on a 20/20 gem is worth on average (Guy, 2026-11-21: always
// from a 20/20). Odds are the community's, GGG has published none: four
// results at 25% each, no change, the Vaal form, level +1 or -1, quality
// +1 to +10 or -1 to -10 (cap 23). Prices come from the poe.ninja versions.
import type { GemVersion } from './versions'

export const VAAL_START = { level: 20, quality: 20 } as const
const QUALITY_CAP = 23
const QUALITY_STEP = 10

export interface VaalOutcome {
  id: string
  label: string
  chance: number
  // The corrupted gem's price, null when poe.ninja has nothing close.
  chaos: number | null
  // How the price was found when it isn't the version's own row.
  est?: string
  // chaos minus the 20/20's price; null with no price.
  delta: number | null
}

export interface VaalEv {
  // The clean 20/20's price: selling it as is.
  now: number
  cost: number
  outcomes: VaalOutcome[]
  // Average result, minus the Vaal Orb.
  ev: number
  profit: number
  gain: number
  same: number
  lose: number
  // The chance of outcomes with no price, counted as 0.
  unpriced: number
}

interface Priced { chaos: number | null, est?: string }

/**
 * A corrupted version's price: its own row, else the corrupted row at that
 * level with the most quality under it (it can't be worth less than that).
 * A Vaal gem is always corrupted, whatever its variant says.
 */
export function corruptedPrice (rows: GemVersion[], vaal: boolean, level: number, quality: number): Priced {
  const at = rows.filter(r => r.vaal === vaal && (r.corrupted || r.vaal) && r.level === level)
  const exact = at.find(r => r.quality === quality)
  if (exact) return { chaos: exact.chaos }
  const below = at.filter(r => r.quality < quality).sort((a, b) => b.quality - a.quality)[0]
  if (below) return { chaos: below.chaos, est: `priced as ${level}/${below.quality}` }
  return { chaos: null, est: 'no price, counted as 0' }
}

export function vaalEv (rows: GemVersion[], vaalOrb: number | null, hasVaalForm: boolean): VaalEv | null {
  const { level, quality } = VAAL_START
  const now = rows.find(r => !r.vaal && !r.corrupted && r.level === level && r.quality === quality)?.chaos
  const same = corruptedPrice(rows, false, level, quality)
  if (now == null || same.chaos == null || same.est) return null
  const cost = vaalOrb != null && vaalOrb > 0 ? vaalOrb : 1
  const out: VaalOutcome[] = []
  const add = (id: string, label: string, chance: number, p: Priced) => {
    if (chance <= 0) return
    const prev = out.find(o => o.id === id)
    if (prev) { prev.chance += chance; return }
    out.push({ id, label, chance, chaos: p.chaos, est: p.est, delta: p.chaos == null ? null : p.chaos - now })
  }

  add('same', 'No change', 0.25, same)
  if (hasVaalForm) {
    add('vaal', 'Vaal form', 0.25, corruptedPrice(rows, true, level, quality))
  } else {
    // No Vaal form: that result changes nothing either.
    add('same', 'No change', 0.25, same)
    out[0].label = 'No change · no Vaal form'
  }
  add('level-up', `Level ${level + 1}`, 0.125, corruptedPrice(rows, false, level + 1, quality))
  // A corrupted gem still gains experience: a 19 levels back to 20.
  add('level-down', `Level ${level - 1}`, 0.125, { chaos: same.chaos, est: `levels back to ${level}` })

  // Quality: each of the 20 steps (+1..+10, -1..-10) equally likely.
  const steps = new Map<number, number>()
  for (let d = -QUALITY_STEP; d <= QUALITY_STEP; d++) {
    if (d === 0) continue
    const q = Math.max(0, Math.min(QUALITY_CAP, quality + d))
    steps.set(q, (steps.get(q) ?? 0) + 0.25 / (2 * QUALITY_STEP))
  }
  const up = [...steps].filter(([q]) => q > quality)
  const down = [...steps].filter(([q]) => q < quality)
  for (const [q, chance] of up.filter(([q]) => q === QUALITY_CAP)) {
    add('q-cap', `Quality ${q}`, chance, corruptedPrice(rows, false, level, q))
  }
  const upMid = up.filter(([q]) => q < QUALITY_CAP)
  if (upMid.length) {
    const lo = Math.min(...upMid.map(([q]) => q))
    const hi = Math.max(...upMid.map(([q]) => q))
    // Priced at the lowest of the range: no row says what 21 is worth over 20.
    add('q-up', `Quality ${lo === hi ? lo : `${lo}–${hi}`}`, upMid.reduce((s, [, c]) => s + c, 0), corruptedPrice(rows, false, level, lo))
  }
  if (down.length) {
    const lo = Math.min(...down.map(([q]) => q))
    const hi = Math.max(...down.map(([q]) => q))
    add('q-down', `Quality ${lo}–${hi}`, down.reduce((s, [, c]) => s + c, 0), corruptedPrice(rows, false, level, hi))
  }

  const ev = out.reduce((s, o) => s + o.chance * (o.chaos ?? 0), 0) - cost
  const band = Math.max(2, now * 0.05)
  const sum = (f: (o: VaalOutcome) => boolean) => out.filter(f).reduce((s, o) => s + o.chance, 0)
  const gain = sum(o => o.delta != null && o.delta > band)
  const lose = sum(o => o.delta == null || o.delta < -band)
  return {
    now,
    cost,
    outcomes: out,
    ev,
    profit: ev - now,
    gain,
    lose,
    same: Math.max(0, 1 - gain - lose),
    unpriced: sum(o => o.chaos == null)
  }
}
