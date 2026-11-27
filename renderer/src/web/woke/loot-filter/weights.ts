// Rare weights (beta): a second way to decide endgame rares, kept apart from
// NeverSink's tiers so it can be tuned without touching what works.
//
// Every unidentified rare of item level 68+ gets a weight: its base rank sets
// where it starts and each condition it has multiplies it (drop tier, item
// level, influence, links, corruption, size...). One line (`need`) decides:
// under it the rare hides, over it it shows, louder at ×4, ×16 and ×64 of it.
//
// The game's filter can't multiply, so compile() walks the conditions as a
// tree and writes one rule per branch whose every rare lands in the same step.
// Branches are written in order with the "none of these" branch last, and the
// rules sit above everything NeverSink has, so NeverSink never sees these rares.
// Off (the default), nothing is written and NeverSink decides as before.
// Identified rares aren't touched: NeverSink's mod rules keep them.
import type { FilterAction, FilterBlock, FilterCondition, FilterDoc } from './parse'
import { readTiered } from './gear'
import { allGearBases, baseInfo } from './gear-bases'
import { BASE_FACTS } from './base-facts'
import { WEIGHT_LABEL, WEIGHT_TYPE } from './weight-settings'
import type { WeightKey, WeightSettings } from './weight-settings'

export { WEIGHT_TYPE, WEIGHT_GROUPS, WEIGHT_ROWS, WEIGHT_LABEL, MULT_STEPS, NEED_MIN, NEED_MAX, STAGES, MARK_ROWS, ORDERED_ROWS, defaultWeights, multRange, normalizeWeights } from './weight-settings'
export type { WeightKey, WeightRow, WeightGroup, WeightSettings } from './weight-settings'

// ---- Steps (how loud) ---------------------------------------------------------

export type Step = 0 | 1 | 2 | 3 | 4
export const STEP_NAMES = ['Hidden', 'Small', 'Normal', 'Big, sound', 'Beam'] as const
// Each step starts at need × this.
export const STEP_AT = [0, 1, 4, 16, 64]

export function stepOf (weight: number, need: number): Step {
  if (!(weight >= need)) return 0
  if (weight < need * 4) return 1
  if (weight < need * 16) return 2
  if (weight < need * 64) return 3
  return 4
}

const a = (key: string, ...args: Array<string | number>): FilterAction => ({ key, args: args.map(String) })

// The look of each step. Calm at the bottom, NeverSink-like colours on top.
export function stepActions (step: Step): FilterAction[] {
  switch (step) {
    case 0: return [a('SetFontSize', 18), a('DisableDropSound', 'True')]
    case 1: return [a('SetFontSize', 32), a('SetBackgroundColor', 35, 35, 35, 230)]
    case 2: return [a('SetFontSize', 38), a('SetBorderColor', 255, 255, 119, 255), a('SetBackgroundColor', 20, 20, 0, 255)]
    case 3: return [a('SetFontSize', 42), a('SetTextColor', 0, 240, 190, 255), a('SetBorderColor', 0, 240, 190, 255), a('SetBackgroundColor', 0, 75, 30, 255), a('PlayAlertSound', 3, 300), a('MinimapIcon', 1, 'Cyan', 'Diamond')]
    case 4: return [a('SetFontSize', 45), a('SetTextColor', 255, 255, 255, 255), a('SetBorderColor', 255, 64, 64, 255), a('SetBackgroundColor', 90, 0, 0, 255), a('PlayAlertSound', 1, 300), a('PlayEffect', 'Red'), a('MinimapIcon', 0, 'Red', 'Star')]
  }
}

// ---- A rare, as the weights see it ------------------------------------------

export interface WeightItem {
  rank: 'x1' | 'x2' | 'r1' | 'r2' | 'r3' | 'r0'
  // 0: no drop tier, counted as tier 1.
  tier: number
  itemLevel: number
  influenced: boolean
  eldritch: boolean
  quality: number
  fractured: boolean
  synthesised: boolean
  fated: boolean
  mirrored: boolean
  abyssal: boolean
  strands: number
  enchanted: boolean
  crucible: boolean
  links: number
  rgb: boolean
  // 'no' | no corrupted implicit | one | two or more.
  corruption: 'no' | 'plain' | 'implicit' | 'double'
  width: number
  height: number
  // An armour base under drop level 40.
  old: boolean
}

// Every multiplier a rare has, base rank first.
export function termsOf (it: WeightItem): WeightKey[] {
  const out: WeightKey[] = baseTerms(it)
  out.push(it.tier >= 2 && it.tier <= 5 ? `t${it.tier}` as WeightKey : 't1')
  out.push(it.itemLevel >= 86 ? 'i86' : it.itemLevel >= 83 ? 'i83' : it.itemLevel >= 75 ? 'i75' : 'i68')
  if (it.corruption === 'double') out.push('dc')
  else if (it.corruption === 'implicit') out.push('ci')
  else if (it.corruption === 'plain') out.push('cp')
  if (it.links >= 6) out.push('l6')
  else if (it.links === 5) out.push('l5')
  else if (it.links === 4) out.push('l4')
  if (it.influenced) out.push('infl')
  if (it.eldritch) out.push('eld')
  if (it.quality >= 24) out.push('qual')
  if (it.fractured) out.push('fract')
  if (it.synthesised) out.push('synth')
  if (it.fated) out.push('fated')
  if (it.enchanted) out.push('ench')
  if (it.strands >= 70) out.push('strand')
  if (it.crucible) out.push('cruc')
  if (it.abyssal) out.push('abyss')
  if (it.rgb) out.push('rgb')
  if (it.mirrored) out.push('mirr')
  return out
}

// ---- Bases ------------------------------------------------------------------

// Endgame rare gear, as NeverSink's last rare hide rule names it.
export const GEAR_CLASSES = ['Amulets', 'Belts', 'Body Armours', 'Boots', 'Bows', 'Claws', 'Daggers', 'Gloves', 'Helmets', 'One Hand Axes', 'One Hand Maces', 'One Hand Swords', 'Quivers', 'Rings', 'Rune Daggers', 'Sceptres', 'Shields', 'Staves', 'Thrusting One Hand Swords', 'Two Hand Axes', 'Two Hand Maces', 'Two Hand Swords', 'Wands', 'Warstaves']
// Old bases: armour pieces under drop level 40 (NeverSink hides them in maps).
const OLD_CLASSES = ['Body Armours', 'Boots', 'Gloves', 'Helmets']
export const OLD_DROP_LEVEL = 40
const INFLUENCES = ['Crusader', 'Elder', 'Hunter', 'Redeemer', 'Shaper', 'Warlord']

const c = (key: string, op: string, values: Array<string | number>): FilterCondition => ({ key, op, count: null, values: values.map(String) } as FilterCondition)

export type Rank = WeightItem['rank']
export interface BaseRanks { x1: string[], x2: string[], r1: string[], r2: string[], r3: string[] }

// The filter's own base lists: NeverSink's exotic bases (its top two tiers
// apart from the rest) and the three ranks of its tiered gear. A base takes
// the first list it's on.
export function baseRanks (doc: FilterDoc): BaseRanks {
  const out: BaseRanks = { x1: [], x2: [], r1: [], r2: [], r3: [] }
  const seen = new Set<string>()
  const put = (list: string[], bases: string[]) => { for (const b of bases) if (!seen.has(b)) { seen.add(b); list.push(b) } }
  const exotic = (tiers: RegExp) => doc.blocks
    .filter(b => b.type === 'exoticbases' && !b.disabled && b.visibility === 'Show' && tiers.test(b.tier ?? ''))
    .flatMap(b => b.conditions.find(x => x.key === 'BaseType' && x.op === '==')?.values ?? [])
  put(out.x1, exotic(/^t[12]$/))
  put(out.x2, exotic(/^t[345]$/))
  const src = readTiered(doc)
  if (src) {
    put(out.r1, src.ranks.r1)
    put(out.r2, src.ranks.r2)
    put(out.r3, src.ranks.r3)
  }
  return out
}

// One gear base, with what the weights read off it.
export interface BaseRow { name: string, cls: string | null, rank: Rank, width: number, height: number, old: boolean }

// Every rare gear base: the filter's ranked lists plus every other gear base
// the game has (rank "none"), with its size and age. `known` gives a base's
// filter Class and [drop level, width, height] when the app knows it.
export function baseTable (ranks: BaseRanks, gear: string[], known: (name: string) => { cls: string | null, facts?: readonly [number, number, number] }): BaseRow[] {
  const rankOf = new Map<string, Rank>()
  for (const r of ['x1', 'x2', 'r1', 'r2', 'r3'] as const) for (const n of ranks[r]) rankOf.set(n, r)
  const names = [...new Set([...rankOf.keys(), ...gear])].sort()
  const out: BaseRow[] = []
  for (const name of names) {
    const k = known(name)
    // Only gear the app knows: a jewel or flask on NeverSink's exotic list
    // isn't rare gear.
    if (!k.cls || !GEAR_CLASSES.includes(k.cls)) continue
    const [drop, width, height] = k.facts ?? [0, 0, 0]
    out.push({ name, cls: k.cls, rank: rankOf.get(name) ?? 'r0', width, height, old: !!k.facts && !!k.cls && OLD_CLASSES.includes(k.cls) && drop < OLD_DROP_LEVEL })
  }
  return out
}

// The multipliers a base brings (rank, size, age).
export function baseTerms (b: Pick<BaseRow, 'rank' | 'width' | 'height' | 'old'>): WeightKey[] {
  const out: WeightKey[] = [b.rank]
  if (b.width >= 2 && b.height >= 3) out.push('big')
  else if (b.height === 1) out.push('tiny')
  if (b.old) out.push('old')
  return out
}

// ---- The model's shape ------------------------------------------------------
//
// Always counted: the base (rank, size, old), drop tier, item level,
// corruption and mirrored. The rest are marks (links, influence, fractured,
// quality...): of those over ×1 only the biggest counts, so a fractured
// 6-link counts the 6-link, and only on a rare that isn't corrupted or
// mirrored. That keeps the filter to a sane number of rules, and a rare
// never shows louder than its full weight would say. Marks never go under
// ×1, and drop tiers and item levels stay in order (weight-settings.ts):
// either would multiply the rules or need rules the game can't write.

const T = (v: string) => c(v, '', ['True'])
const F = (v: string) => c(v, '', ['False'])

// The marks, each with how a rule says "has it".
interface Mark { key: WeightKey, yes: FilterCondition[] }
const MARKS: Mark[] = [
  { key: 'l6', yes: [c('LinkedSockets', '>=', [6])] },
  { key: 'l5', yes: [c('LinkedSockets', '', [5])] },
  { key: 'l4', yes: [c('LinkedSockets', '', [4])] },
  { key: 'infl', yes: [c('HasInfluence', '', INFLUENCES)] },
  { key: 'eld', yes: [c('HasSearingExarchImplicit', '>=', [1])] },
  { key: 'eld', yes: [c('HasEaterOfWorldsImplicit', '>=', [1])] },
  { key: 'qual', yes: [c('Quality', '>=', [24])] },
  { key: 'fract', yes: [T('FracturedItem')] },
  { key: 'synth', yes: [T('SynthesisedItem')] },
  { key: 'fated', yes: [T('Fated')] },
  { key: 'ench', yes: [T('AnyEnchantment')] },
  { key: 'strand', yes: [c('MemoryStrands', '>=', [70])] },
  { key: 'cruc', yes: [T('HasCruciblePassiveTree')] },
  { key: 'abyss', yes: [c('SocketGroup', '', ['A'])] },
  { key: 'rgb', yes: [c('SocketGroup', '', ['RGB'])] }
]
export const MARK_KEYS: ReadonlySet<WeightKey> = new Set(MARKS.map(x => x.key))

// The marks over ×1: of these only the biggest counts.
export function upMarks (m: Record<WeightKey, number>): WeightKey[] {
  return [...MARK_KEYS].filter(k => m[k] > 1)
}

// The multipliers that count for this rare, in table order.
export function countedTerms (it: WeightItem, mult: Record<WeightKey, number>): WeightKey[] {
  const all = termsOf(it)
  const up = upMarks(mult)
  const plain = it.corruption === 'no' && !it.mirrored
  const ups = plain ? all.filter(k => up.includes(k)) : []
  const best = ups.length ? ups.reduce((x, k) => mult[k] > mult[x] ? k : x) : null
  return all.filter(k => !MARK_KEYS.has(k) || k === best)
}

export function weightOf (it: WeightItem, mult: Record<WeightKey, number>): number {
  return countedTerms(it, mult).reduce((w, k) => w * mult[k], 1)
}

// ---- Compiling to filter rules ----------------------------------------------

export interface Compiled {
  blocks: FilterBlock[]
  // Rules per step, Hidden first.
  perStep: number[]
  // Roughly how many characters the rules add to the filter file.
  chars: number
}

// One way a dimension can appear in a rule: the bits of its choices it lets
// through (a looser option has more), its conditions, and the multiplier it
// counts for.
interface Option { mask: number, conds: FilterCondition[], factor: number }

// "This one or better" for choices in a fixed order: `cond(k)` writes the
// first k+1; the loosest is always no condition. A set that isn't the first
// k+1 (multipliers out of order) is left to a looser one.
function cumulative (factors: number[], cond: (k: number) => FilterCondition[]): Option[] {
  const order = factors.map((f, i) => ({ f, i })).sort((x, y) => y.f - x.f || x.i - y.i)
  const out: Option[] = []
  let mask = 0
  order.forEach((o, k) => {
    mask |= 1 << o.i
    const isPrefix = order.slice(0, k + 1).every(x => x.i <= k)
    if (k === order.length - 1) out.push({ mask, conds: [], factor: o.f })
    else if (isPrefix) out.push({ mask, conds: cond(k), factor: o.f })
  })
  return out
}

// A split of the rares into parts a rule can name exactly, each with the
// multipliers it brings. `rest`: the last part has no condition, so the parts
// before it hide what they don't show.
interface Split { parts: Array<{ conds: FilterCondition[], factor: number, note: string }>, rest?: boolean }

function splits (bases: BaseRow[], m: Record<WeightKey, number>): Split[] {
  const own = (keys: WeightKey[]) => keys.reduce((p, k) => p * m[k], 1)
  const groups = new Map<string, { keys: WeightKey[], names: string[] }>()
  for (const b of bases) {
    const keys = baseTerms(b)
    const id = keys.join('+')
    const g = groups.get(id) ?? { keys, names: [] }
    g.names.push(b.name)
    groups.set(id, g)
  }
  // Groups worth the same share one rule.
  const byFactor = new Map<number, { keys: WeightKey[], names: string[] }>()
  for (const g of groups.values()) {
    const f = own(g.keys)
    const into = byFactor.get(f)
    if (into) into.names.push(...g.names)
    else byFactor.set(f, { keys: g.keys, names: [...g.names] })
  }
  // The plain no-rank bases (most of them) are the rest: no list.
  const plain = own(['r0'])
  const gs = [...byFactor.entries()].filter(([f]) => f !== plain).map(([, g]) => g).sort((x, y) => own(y.keys) - own(x.keys))
  const name = (keys: WeightKey[]) => keys.map(k => WEIGHT_LABEL[k].toLowerCase()).join(', ')
  return [
    {
      parts: [
        { conds: [T('Mirrored')], factor: m.mirr, note: 'mirrored' },
        { conds: [F('Mirrored')], factor: 1, note: '' }
      ]
    },
    {
      parts: [
        { conds: [T('Corrupted'), c('CorruptedMods', '>=', [2])], factor: m.dc, note: 'double corrupted' },
        { conds: [T('Corrupted'), c('CorruptedMods', '', [1])], factor: m.ci, note: 'corrupted implicit' },
        { conds: [T('Corrupted'), c('CorruptedMods', '', [0])], factor: m.cp, note: 'plain corrupted' },
        { conds: [F('Corrupted')], factor: 1, note: '' }
      ]
    },
    {
      // Bases worth more than the rest come first, then the rest, then...
      // the lighter ones must come before the rest too (a rule can't say "not
      // on this list"), and hide what they don't show. A base the app doesn't
      // know counts as a plain one.
      rest: true,
      parts: [
        ...gs.map(g => ({ conds: [c('BaseType', '==', g.names)], factor: own(g.keys), note: name(g.keys) })),
        { conds: [], factor: plain, note: '' }
      ]
    }
  ]
}

// The rares the rules cover.
const BASE_CONDS = (): FilterCondition[] => [
  c('Rarity', '', ['Rare']),
  c('Identified', '', ['False']),
  c('ItemLevel', '>=', [68]),
  c('Class', '==', GEAR_CLASSES)
]

// The rares are split into parts a rule can name exactly (mirrored or not,
// corruption, base group). In each part, a step's rules are the rares heavy
// enough for it, loudest step first (louder ones are already taken above).
// Drop tier, item level and the biggest mark are tried best first ("this
// one", "this one or better"...), each counted at its lowest multiplier, so a
// rule never shows a rare that's too light. A rule another kept rule covers
// is dropped.
export function compileWeights (w: WeightSettings, bases: BaseRow[]): Compiled {
  const m = w.mult
  const up = upMarks(m)
  const TIERS = ['t5', 't4', 't3', 't2', 't1'] as const
  const ILVL: Array<[number, WeightKey]> = [[86, 'i86'], [83, 'i83'], [75, 'i75'], [68, 'i68']]
  const opts: Option[][] = [
    cumulative(TIERS.map(t => m[t]), k => [c('UnidentifiedItemTier', '>=', [5 - k])]),
    cumulative(ILVL.map(x => m[x[1]]), k => [c('ItemLevel', '>=', [ILVL[k][0]])])
  ]
  const full = opts.map(o => o[o.length - 1].mask)
  const lo: number[] = []
  const hi: number[] = []
  lo[opts.length] = 1
  hi[opts.length] = 1
  for (let i = opts.length - 1; i >= 0; i--) {
    const fs = opts[i].map(o => o.factor)
    lo[i] = lo[i + 1] * Math.min(...fs)
    hi[i] = hi[i + 1] * Math.max(...fs)
  }

  const blocks: FilterBlock[] = []
  const perStep = [0, 0, 0, 0, 0]
  let chars = 0
  const emit = (conds: FilterCondition[], step: Step, note: string) => {
    perStep[step]++
    // A rule with a base list doesn't need the class list.
    const listed = conds.some(x => x.key === 'BaseType')
    const all = [...BASE_CONDS().filter(x => !(listed && x.key === 'Class')), ...conds].map(x => ({ ...x, values: [...x.values] }))
    chars += all.reduce((n, x) => n + x.key.length + 12 + x.values.reduce((k, v) => k + v.length + 3, 0), 120)
    blocks.push({
      kind: 'block',
      index: -1,
      line: 1,
      visibility: step === 0 ? 'Hide' : 'Show',
      disabled: false,
      comment: `$type->${WEIGHT_TYPE} $tier->s${step} woke: rare weights, ${STEP_NAMES[step].toLowerCase()}${note ? `: ${note}` : ''}`,
      type: WEIGHT_TYPE,
      tier: `s${step}`,
      conditions: all,
      actions: stepActions(step),
      continue: false,
      section: '[[0050]] Rare weights (woke)',
      subsection: '',
      raw: [],
      dirty: true,
      added: true
    } as FilterBlock)
  }

  // The rules for one part.
  const part = (prefix: FilterCondition[], start: number, note: string) => {
    if (start * hi[0] < w.need) return
    for (const step of [4, 3, 2, 1] as Step[]) {
      const at = w.need * STEP_AT[step]
      const rules: Array<{ masks: number[], conds: FilterCondition[] }> = []
      const picked: number[] = []
      const walk = (i: number, weight: number) => {
        if (weight * hi[i] < at) return
        if (weight * lo[i] >= at) {
          // Only rules that can't be loosened on any dimension and stay over.
          for (let d = 0; d < i; d++) {
            const o = opts[d][picked[d]]
            const looser = opts[d].slice(picked[d] + 1).find(x => (x.mask & o.mask) === o.mask)
            if (looser && weight / o.factor * looser.factor * lo[i] >= at) return
          }
          rules.push({ masks: [...picked.map((k, d) => opts[d][k].mask), ...full.slice(i)], conds: picked.flatMap((k, d) => opts[d][k].conds) })
          return
        }
        for (let k = opts[i].length - 1; k >= 0; k--) {
          const o = opts[i][k]
          if (weight * o.factor * hi[i + 1] < at) continue
          picked.push(k)
          walk(i + 1, weight * o.factor)
          picked.pop()
        }
      }
      walk(0, start)
      const loose = (r: { masks: number[] }) => r.masks.reduce((n, x) => n + popcount(x), 0)
      rules.sort((p, q) => loose(q) - loose(p))
      const kept: typeof rules = []
      for (const r of rules) {
        if (kept.some(k => k.masks.every((x, d) => (x & r.masks[d]) === r.masks[d]))) continue
        kept.push(r)
      }
      for (const r of kept) emit([...prefix, ...r.conds], step, note)
    }
  }

  const ss = splits(bases, m)
  const walkSplits = (list: Split[], i: number, prefix: FilterCondition[], start: number, notes: string[]) => {
    if (i === list.length) { part(prefix, start, notes.filter(Boolean).join(', ')); return }
    const sp = list[i]
    const rest = sp.parts[sp.parts.length - 1].factor
    sp.parts.forEach((p, k) => {
      const pre = [...prefix, ...p.conds]
      walkSplits(list, i + 1, pre, start * p.factor, [...notes, p.note])
      // A part before a "rest" that's lighter than the rest hides what it
      // didn't show, so the rest doesn't count it heavier than it is.
      if (sp.rest && k < sp.parts.length - 1 && p.factor < rest) emit(pre, 0, [...notes, p.note].filter(Boolean).join(', '))
    })
  }
  // Rares with a mark over ×1 (not corrupted or mirrored), biggest mark
  // first. One that doesn't show here is never heavier further down.
  const ups = MARKS.filter(x => up.includes(x.key)).sort((p, q) => m[q.key] - m[p.key])
  for (const x of ups) {
    walkSplits(ss.slice(2), 0, [...x.yes, F('Corrupted'), F('Mirrored')], m[x.key], [WEIGHT_LABEL[x.key].toLowerCase()])
  }
  walkSplits(ss, 0, [], 1, [])
  emit([], 0, 'the rest')
  return { blocks, perStep, chars }
}

function popcount (x: number): number {
  let n = 0
  while (x) { n += x & 1; x >>>= 1 }
  return n
}

// Writes the rules above everything else in the filter (applied before the
// build rules, presets and your own rules, which then go on top of them).
// The base table for this filter, from the app's item data.
export function filterBases (doc: FilterDoc): BaseRow[] {
  // Before the item data loads nothing is known (and baseInfo would remember
  // that): every base counts as a plain one until then.
  if (!allGearBases().length) return []
  return baseTable(baseRanks(doc), allGearBases(), n => ({ cls: baseInfo(n).cls, facts: BASE_FACTS[n] }))
}

export function applyWeights (doc: FilterDoc, w: WeightSettings, bases = filterBases(doc)): Compiled | null {
  if (!w.on) return null
  const compiled = compileWeights(w, bases)
  const first = doc.chunks.findIndex(ch => ch.kind === 'block')
  const at = first < 0 ? doc.chunks.length : first
  doc.chunks.splice(at, 0, ...compiled.blocks)
  const line = doc.blocks[0]?.line ?? 1
  compiled.blocks.forEach(b => { b.line = line })
  doc.blocks.unshift(...compiled.blocks)
  doc.blocks.forEach((b, i) => { b.index = i })
  return compiled
}
