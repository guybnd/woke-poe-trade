// Flasks on the Equipment tab (Guy's F1, 2026-11-27): a utility flask's
// score is its base rank × quality × item level, on Rare weights' line and
// steps. Ranks are yours (saved with the rare base ranks); quality matters
// because 20% is worth crafting on, item level because 85+ rolls the top
// mods. Life and mana flasks, tinctures and levelling stay NeverSink's.
import type { FilterBlock, FilterCondition, FilterDoc } from './parse'
import { stepActions, stepOf } from './weights'
import type { Step } from './weights'
import { WEIGHT_TYPE } from './weight-settings'
import type { RankKey, WeightSettings } from './weight-settings'

export const FLASK_BASES = ['Amethyst Flask', 'Basalt Flask', 'Bismuth Flask', 'Diamond Flask', 'Gold Flask', 'Granite Flask', 'Iron Flask', 'Jade Flask', 'Quartz Flask', 'Quicksilver Flask', 'Ruby Flask', 'Sapphire Flask', 'Silver Flask', 'Stibnite Flask', 'Sulphur Flask', 'Topaz Flask'] as const
// A first guess at what players run most; yours replace it.
const DEFAULT_RANK: Record<string, RankKey> = {
  'Quicksilver Flask': 'r1',
  'Diamond Flask': 'r1',
  'Gold Flask': 'r1',
  'Silver Flask': 'r1',
  'Jade Flask': 'r2',
  'Granite Flask': 'r2',
  'Basalt Flask': 'r2',
  'Quartz Flask': 'r2',
  'Sulphur Flask': 'r2',
  'Amethyst Flask': 'r2',
  'Ruby Flask': 'r3',
  'Sapphire Flask': 'r3',
  'Topaz Flask': 'r3',
  'Bismuth Flask': 'r3',
  'Stibnite Flask': 'r3',
  'Iron Flask': 'r3'
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

export function flaskStep (w: Pick<WeightSettings, 'mult' | 'ranks' | 'need' | 'loud'>, base: string, quality: number, ilvl: number): Step {
  return stepOf(flaskWeight(w, base, quality, ilvl), w.need, w.loud)
}

const c = (key: string, op: string, values: Array<string | number>): FilterCondition => ({ key, op, count: null, values: values.map(String) } as FilterCondition)

// One rule per (step, quality band, item level band) for the bases that land
// there, loudest band first; then the rest hide. Maps only.
export function compileFlasks (w: WeightSettings): FilterBlock[] {
  const out: FilterBlock[] = []
  const base = [c('AreaLevel', '>=', [68]), c('Class', '==', ['Utility Flasks']), c('Rarity', '', ['Normal', 'Magic'])]
  const bands = FLASK_QUALITY.flatMap(q => FLASK_ILVL.map(i => ({ q: q.at, i: i.at, x: q.x * i.x }))).sort((a, b) => b.x - a.x || b.q - a.q)
  for (const band of bands) {
    const by = new Map<Step, string[]>()
    for (const name of FLASK_BASES) {
      const s = flaskStep(w, name, band.q, band.i)
      if (s > 0) by.set(s, [...(by.get(s) ?? []), name])
    }
    for (const [s, names] of [...by].sort((a, b) => b[0] - a[0])) {
      const conds = [...base, c('BaseType', '==', names)]
      if (band.q) conds.push(c('Quality', '>=', [band.q]))
      if (band.i) conds.push(c('ItemLevel', '>=', [band.i]))
      out.push(block(s, conds, `flasks, quality ${band.q}+, item level ${band.i || 'any'}`))
    }
  }
  out.push(block(0, [...base, c('BaseType', '==', [...FLASK_BASES])], 'flasks under the line'))
  return out
}

function block (step: Step, conds: FilterCondition[], note: string): FilterBlock {
  return {
    kind: 'block',
    index: -1,
    line: 1,
    visibility: step === 0 ? 'Hide' : 'Show',
    disabled: false,
    comment: `$type->${WEIGHT_TYPE} $tier->flask${step} woke: rare weights, ${note}`,
    type: WEIGHT_TYPE,
    tier: `flask${step}`,
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
