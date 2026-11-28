// Flasks on the Equipment tab (Guy's F1, 2026-11-27): a utility flask's
// score is its base rank × quality × item level, on its own line (Guy's
// flasks A, 2026-11-28) and Rare weights' steps. Ranks are yours (saved with the rare base ranks); quality matters
// because 20% is worth crafting on, item level because 85+ rolls the top
// mods. Tinctures score the same way (Guy 2026-11-28), on the same line.
// Life and mana flasks are Loot's; levelling stays the levelling rules'.
import type { FilterBlock, FilterCondition, FilterDoc } from './parse'
import { stepActions, stepOf } from './weights'
import type { Step } from './weights'
import { WEIGHT_TYPE } from './weight-settings'
import type { RankKey, WeightSettings } from './weight-settings'

export const FLASK_BASES = ['Amethyst Flask', 'Basalt Flask', 'Bismuth Flask', 'Diamond Flask', 'Gold Flask', 'Granite Flask', 'Iron Flask', 'Jade Flask', 'Quartz Flask', 'Quicksilver Flask', 'Ruby Flask', 'Sapphire Flask', 'Silver Flask', 'Stibnite Flask', 'Sulphur Flask', 'Topaz Flask'] as const
// Every tincture base (base-facts.ts; flask-weights.test checks the list).
export const TINCTURE_BASES = ['Ashbark Tincture', 'Blood Sap Tincture', 'Borealwood Tincture', 'Fulgurite Tincture', 'Ironwood Tincture', 'Oakbranch Tincture', 'Poisonberry Tincture', 'Prismatic Tincture', 'Rosethorn Tincture', 'Sporebloom Tincture'] as const
// The two sets, each a page on Equipment: its rules' class and name.
export const FLASK_SETS = [
  { id: 'flasks', cls: 'Utility Flasks', bases: FLASK_BASES as readonly string[], what: 'flasks', tier: 'flask' },
  { id: 'tinctures', cls: 'Tinctures', bases: TINCTURE_BASES as readonly string[], what: 'tinctures', tier: 'flasktinc' }
] as const
export type FlaskSetId = (typeof FLASK_SETS)[number]['id']
// A first guess at what players run most; yours replace it. A tincture is
// Good until you rank it.
const DEFAULT_RANK: Record<string, RankKey> = {
  ...Object.fromEntries(TINCTURE_BASES.map(b => [b, 'r2' as RankKey])),
  'Quicksilver Flask': 'r1',
  'Diamond Flask': 'r1',
  'Gold Flask': 'r1',
  'Silver Flask': 'r1',
  // On NeverSink's exotic list (M8): Top.
  'Iron Flask': 'r1',
  'Jade Flask': 'r2',
  'Granite Flask': 'r2',
  'Basalt Flask': 'r2',
  'Quartz Flask': 'r2',
  'Sulphur Flask': 'r2',
  'Amethyst Flask': 'r2',
  // Resist flasks are Good by default (Guy, 2026-11-28).
  'Ruby Flask': 'r2',
  'Sapphire Flask': 'r2',
  'Topaz Flask': 'r2',
  'Bismuth Flask': 'r3',
  'Stibnite Flask': 'r3'
}
export const FLASK_RANKS: RankKey[] = ['r1', 'r2', 'r3', 'rj']
export const flaskRank = (w: Pick<WeightSettings, 'ranks'>, base: string): RankKey => {
  const r = w.ranks[base]
  return r && FLASK_RANKS.includes(r) ? r : DEFAULT_RANK[base] ?? 'r3'
}

// Quality and item level bands, best first, with their multiplier.
export const FLASK_QUALITY = [{ at: 26, x: 4 }, { at: 20, x: 2 }, { at: 0, x: 1 }] as const
export const FLASK_ILVL = [{ at: 85, x: 2 }, { at: 0, x: 1 }] as const

export function flaskWeight (w: Pick<WeightSettings, 'mult' | 'ranks'>, base: string, quality: number, ilvl: number): number {
  const q = FLASK_QUALITY.find(b => quality >= b.at)!.x
  const i = FLASK_ILVL.find(b => ilvl >= b.at)!.x
  return w.mult[flaskRank(w, base)] * q * i
}

// Flasks have their own line; Normal, Big and Beam start at 2, 4 and 8 times it.
export const flaskLoud = (line: number): number[] => [line * 2, line * 4, line * 8]
export function flaskStep (w: Pick<WeightSettings, 'mult' | 'ranks' | 'flaskLine'>, base: string, quality: number, ilvl: number): Step {
  return stepOf(flaskWeight(w, base, quality, ilvl), w.flaskLine, flaskLoud(w.flaskLine))
}

const c = (key: string, op: string, values: Array<string | number>): FilterCondition => ({ key, op, count: null, values: values.map(String) } as FilterCondition)

// One rule per (step, quality band, item level band) for the bases that land
// there, loudest band first; then the rest hide. Maps only.
export function compileFlasks (w: WeightSettings): FilterBlock[] {
  const out: FilterBlock[] = []
  const bands = FLASK_QUALITY.flatMap(q => FLASK_ILVL.map(i => ({ q: q.at, i: i.at, x: q.x * i.x }))).sort((a, b) => b.x - a.x || b.q - a.q)
  for (const set of FLASK_SETS) {
    const base = [c('AreaLevel', '>=', [68]), c('Class', '==', [set.cls]), c('Rarity', '', ['Normal', 'Magic'])]
    for (const band of bands) {
      const by = new Map<Step, string[]>()
      for (const name of set.bases) {
        const s = flaskStep(w, name, band.q, band.i)
        if (s > 0) by.set(s, [...(by.get(s) ?? []), name])
      }
      for (const [s, names] of [...by].sort((a, b) => b[0] - a[0])) {
        const conds = [...base, c('BaseType', '==', names)]
        if (band.q) conds.push(c('Quality', '>=', [band.q]))
        if (band.i) conds.push(c('ItemLevel', '>=', [band.i]))
        out.push(block(set.tier, s, conds, `${set.what}, quality ${band.q}+, item level ${band.i || 'any'}`))
      }
    }
    out.push(block(set.tier, 0, [...base, c('BaseType', '==', [...set.bases])], `${set.what} under the line`))
  }
  return out
}

function block (tier: string, step: Step, conds: FilterCondition[], note: string): FilterBlock {
  return {
    kind: 'block',
    index: -1,
    line: 1,
    visibility: step === 0 ? 'Hide' : 'Show',
    disabled: false,
    comment: `$type->${WEIGHT_TYPE} $tier->${tier}${step} woke: rare weights, ${note}`,
    type: WEIGHT_TYPE,
    tier: `${tier}${step}`,
    conditions: conds,
    actions: stepActions(step),
    continue: false,
    section: '[[0050]] Rare weights (woke)',
    subsection: '',
    raw: [],
    dirty: true,
    added: true
  } as FilterBlock
}

// Above everything NeverSink has, with the rare weights; only while they're on.
export function applyFlasks (doc: FilterDoc, w: WeightSettings): FilterBlock[] {
  if (!w.on) return []
  const blocks = compileFlasks(w)
  const first = doc.chunks.findIndex(ch => ch.kind === 'block')
  doc.chunks.splice(first < 0 ? doc.chunks.length : first, 0, ...blocks)
  const line = doc.blocks[0]?.line ?? 1
  blocks.forEach(b => { b.line = line })
  doc.blocks.unshift(...blocks)
  doc.blocks.forEach((b, i) => { b.index = i })
  return blocks
}
