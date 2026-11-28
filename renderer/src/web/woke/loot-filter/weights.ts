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
import { LOOK_CHANNELS, LOOK_LABEL, LOUD_DEFAULT, MARK_ROWS, ORDERED_ROWS, WEIGHT_LABEL, WEIGHT_TYPE } from './weight-settings'
import type { LookChannel, LookKey, RankKey, WeightKey, WeightSettings } from './weight-settings'

export { WEIGHT_TYPE, WEIGHT_GROUPS, WEIGHT_ROWS, WEIGHT_LABEL, NEED_MIN, NEED_MAX, MARK_ROWS, ORDERED_ROWS, PIN_ROWS, LOUD_DEFAULT, LOOK_CHANNELS, LOOK_LABEL, LOOK_KEYS, LOOK_DEFAULT, RANK_KEYS, defaultWeights, normalizeWeights } from './weight-settings'

// Kept out of weight-settings (startup JS): only the Rare weights tab uses them.
// The steps a multiplier moves through.
export const MULT_STEPS = [0, 0.05, 0.1, 0.15, 0.25, 0.35, 0.5, 0.7, 0.85, 1, 1.2, 1.4, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 128]
// Strictness stages named like NeverSink's, at the default multipliers.
export const STAGES: Array<{ label: string, need: number }> = [
  { label: 'Soft', need: 0.25 },
  { label: 'Regular', need: 1 },
  { label: 'Semi-strict', need: 2 },
  { label: 'Strict', need: 4 },
  { label: 'Very strict', need: 8 },
  { label: 'Uber', need: 16 },
  { label: 'Uber+', need: 48 }
]
// The range one multiplier may take, given the others.
export function multRange (mult: Record<WeightKey, number>, key: WeightKey): [number, number] {
  let lo = MARK_ROWS.includes(key) ? 1 : 0
  let hi = 1000
  for (const row of ORDERED_ROWS) {
    const i = row.indexOf(key)
    if (i < 0) continue
    if (i > 0) lo = Math.max(lo, mult[row[i - 1]])
    if (i < row.length - 1) hi = Math.min(hi, mult[row[i + 1]])
  }
  return [lo, hi]
}
export type { LookChannel, LookKey, RankKey, WeightKey, WeightRow, WeightGroup, WeightSettings } from './weight-settings'

// ---- Steps (how loud) ---------------------------------------------------------

export type Step = 0 | 1 | 2 | 3 | 4
export const STEP_NAMES = ['Hidden', 'Small', 'Normal', 'Big, sound', 'Beam'] as const
// Normal, Big and Beam start at fixed weights (weight-settings LOUD_DEFAULT);
// the line only decides what hides (Small starts there).
export function stepOf (weight: number, need: number, loud: readonly number[] = LOUD_DEFAULT): Step {
  if (!(weight >= need)) return 0
  if (weight >= loud[2]) return 4
  if (weight >= loud[1]) return 3
  if (weight >= loud[0]) return 2
  return 1
}

const a = (key: string, ...args: Array<string | number>): FilterAction => ({ key, args: args.map(String) })

// How loud each step is: size, sound, beam, map icon. Colours come from the
// look channels (the score step's colours are one row there).
export function stepActions (step: Step): FilterAction[] {
  switch (step) {
    case 0: return [a('SetFontSize', 18), a('DisableDropSound', 'True')]
    case 1: return [a('SetFontSize', 32)]
    case 2: return [a('SetFontSize', 38)]
    case 3: return [a('SetFontSize', 42), a('PlayAlertSound', 3, 300), a('MinimapIcon', 1, 'Cyan', 'Hexagon')]
    // Not red: red beams are kept for sure-profit drops (Guy 2026-11-27).
    case 4: return [a('SetFontSize', 45), a('PlayAlertSound', 1, 300), a('PlayEffect', 'Blue'), a('MinimapIcon', 0, 'Blue', 'Hexagon')]
  }
}

// ---- A rare, as the weights see it ------------------------------------------

export type WeightRarity = 'Normal' | 'Magic' | 'Rare'
export const RARITY_KEY: Record<WeightRarity, WeightKey> = { Rare: 'wr', Magic: 'wm', Normal: 'wn' }

export interface WeightItem {
  // Rare when left out.
  rarity?: WeightRarity
  rank: RankKey
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
  out.push(RARITY_KEY[it.rarity ?? 'Rare'])
  const t = it.tier >= 2 && it.tier <= 5 ? it.tier : 1
  out.push(`${(it.rarity ?? 'Rare') === 'Rare' ? 't' : 'mt'}${t}` as WeightKey)
  out.push(it.itemLevel >= 86 ? 'i86' : it.itemLevel >= 83 ? 'i83' : it.itemLevel >= 75 ? 'i75' : 'i68')
  if ((it.rarity ?? 'Rare') !== 'Rare' && it.itemLevel >= 86) out.push('w86')
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
// was: the filter's rank, when you gave the base your own.
export interface BaseRow { name: string, cls: string | null, rank: Rank, width: number, height: number, old: boolean, was?: Rank }

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

// ---- Look channels: border, background, text colour ----------------------
// Each channel is a ranked list (settings.look): the first thing on it an
// item has paints that channel. Steps set loudness only. Written as Continue
// rules ahead of the steps, lowest rank first, so the top one's colour is the
// one that stays. 'score' is the step's own colour, so it's set by the step
// rules themselves; whatever ranks above it there is worked out per rule.
type RGBA = [number, number, number, number]
// One way an item has a look row, most general first (over-quality: brighter
// the more quality, since a filter can't thicken a border).
interface Alt { conds: FilterCondition[], rgb: RGBA, has: (it: WeightItem) => boolean }
const op = (rgb: [number, number, number]): RGBA => [...rgb, 255]
const RARITY_TEXT: Record<WeightRarity, RGBA> = { Normal: [200, 200, 200, 255], Magic: [136, 136, 255, 255], Rare: [255, 255, 119, 255] }
const RARITY_BG: Record<WeightRarity, RGBA> = { Normal: [42, 42, 42, 255], Magic: [26, 26, 64, 255], Rare: [46, 42, 8, 255] }
const rarityOf = (it: WeightItem): WeightRarity => it.rarity ?? 'Rare'
const termHas = (k: WeightKey) => (it: WeightItem) => termsOf(it).includes(k)
const mark = (k: WeightKey, yes: FilterCondition[], rgb: [number, number, number]): Alt => ({ conds: yes, rgb: op(rgb), has: termHas(k) })

// Exotic bases' text (Guy, 2026-11-28): the valuable ones (rank x1, worth
// about a divine or more) apart from the rest (x2).
export const EXOTIC_RGB: Record<'x1' | 'x2', [number, number, number]> = { x1: [255, 50, 200], x2: [255, 120, 180] }
export interface ExoticLists { x1: string[], x2: string[] }
const ANY_EXOTIC: ExoticLists = { x1: ['x'], x2: ['x'] }

function lookAlts (k: Exclude<LookKey, 'score'>, ch: LookChannel, exotic: ExoticLists): Alt[] {
  switch (k) {
    case 'qual': return ([[24, [200, 110, 175]], [26, [235, 115, 200]], [28, [255, 122, 217]], [30, [255, 60, 210]]] as Array<[number, [number, number, number]]>)
      .map(([q, rgb]) => ({ conds: [c('Quality', '>=', [q])], rgb: op(rgb), has: (it: WeightItem) => it.quality >= q }))
    case 'synth': return [mark('synth', [T('SynthesisedItem')], [110, 170, 255])]
    case 'fract': return [mark('fract', [T('FracturedItem')], [215, 180, 110])]
    case 'infl': return [mark('infl', [c('HasInfluence', '', INFLUENCES)], [190, 120, 255])]
    case 'eld': return [mark('eld', [c('HasSearingExarchImplicit', '>=', [1])], [255, 150, 40]), mark('eld', [c('HasEaterOfWorldsImplicit', '>=', [1])], [255, 150, 40])]
    case 'abyss': return [mark('abyss', [c('SocketGroup', '', ['A'])], [60, 200, 140])]
    case 'ench': return [mark('ench', [T('AnyEnchantment')], [180, 225, 255])]
    case 'l6': return [mark('l6', [c('LinkedSockets', '>=', [6])], [235, 255, 235])]
    case 'cruc': return [mark('cruc', [T('HasCruciblePassiveTree')], [255, 110, 60])]
    case 'strand': return [mark('strand', [c('MemoryStrands', '>=', [70])], [120, 230, 230])]
    case 'l5': return [mark('l5', [c('LinkedSockets', '', [5])], [130, 235, 130])]
    case 'fated': return [mark('fated', [T('Fated')], [255, 205, 130])]
    case 'mirr': return [mark('mirr', [T('Mirrored')], [160, 200, 255])]
    case 'corr': return [{ conds: [T('Corrupted')], rgb: ch === 'border' ? [210, 40, 40, 255] : [90, 0, 0, 255], has: it => it.corruption !== 'no' }]
    case 'exotic': return (['x2', 'x1'] as const).filter(r => exotic[r].length)
      .map(r => ({ conds: [c('BaseType', '==', exotic[r])], rgb: op(EXOTIC_RGB[r]), has: (it: WeightItem) => it.rank === r }))
    case 'rarity': return (['Normal', 'Magic', 'Rare'] as WeightRarity[]).map(r => ({ conds: [c('Rarity', '', [r])], rgb: ch === 'bg' ? RARITY_BG[r] : RARITY_TEXT[r], has: (it: WeightItem) => rarityOf(it) === r }))
  }
}
const LOOK_ACTION: Record<LookChannel, string> = { border: 'SetBorderColor', bg: 'SetBackgroundColor', text: 'SetTextColor' }
// The score step's colour per channel (none: the step doesn't paint it).
const STEP_PAINT: Record<LookChannel, Array<RGBA | null>> = {
  border: [null, null, null, null, null],
  bg: [null, [35, 35, 35, 230], [20, 20, 0, 255], [0, 75, 30, 255], [0, 45, 110, 255]],
  text: [null, null, null, [0, 240, 190, 255], [255, 255, 255, 255]]
}
const paint = (ch: LookChannel, rgb: RGBA) => a(LOOK_ACTION[ch], ...rgb)
// Score paints this channel at every shown step: rows after it never show,
// and rows before it are worked out in the step rules (no Continue needed).
const scoreOwns = (list: readonly LookKey[], ch: LookChannel) => list.includes('score') && STEP_PAINT[ch].slice(1).every(Boolean)

// The colour this item gets in one channel at this step, if any.
function lookOf (it: WeightItem, ch: LookChannel, list: readonly LookKey[], step: Step): RGBA | null {
  for (const k of list) {
    if (k === 'score') {
      const s = STEP_PAINT[ch][step]
      if (s) return s
      continue
    }
    const hits = lookAlts(k, ch, ANY_EXOTIC).filter(x => x.has(it))
    if (hits.length) return hits[hits.length - 1].rgb
  }
  return null
}

// The step a rare lands on: its score's, or Small at least when a pinned
// row ("always show") is one of its terms.
export function stepFor (it: WeightItem, w: Pick<WeightSettings, 'mult' | 'need' | 'always' | 'loud'>): Step {
  const step = stepOf(weightOf(it, w.mult), w.need, w.loud)
  if (step > 0 || !w.always.length) return step
  const has = new Set(termsOf(it))
  return w.always.some(k => has.has(k)) ? 1 : 0
}

// The look the filter gives this item at this step: the step's loudness and
// each channel's colour.
export function weightLook (it: WeightItem, look: Record<LookChannel, readonly LookKey[]>, step: Step): FilterAction[] {
  if (step === 0) return stepActions(0)
  const out: FilterAction[] = []
  for (const ch of ['border', 'bg', 'text'] as LookChannel[]) {
    const rgb = lookOf(it, ch, look[ch], step)
    if (rgb) out.push(paint(ch, rgb))
  }
  return [...out, ...stepActions(step)]
}

// Which look row a channel shows for this item, if any (for the tab).
export function lookKeyOf (it: WeightItem, look: Record<LookChannel, readonly LookKey[]>, ch: LookChannel, step: Step): LookKey | null {
  for (const k of look[ch]) {
    if (k === 'score') { if (STEP_PAINT[ch][step]) return k; continue }
    if (lookAlts(k, ch, ANY_EXOTIC).some(x => x.has(it))) return k
  }
  return null
}

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
// How a rule says a pinned row: one or more alternatives.
function pinConds (k: WeightKey, bases: BaseRow[]): FilterCondition[][] {
  if (k === 'x1' || k === 'x2' || k === 'r1' || k === 'r2' || k === 'r3') {
    const names = bases.filter(b => b.rank === k).map(b => b.name)
    return names.length ? [[c('BaseType', '==', names)]] : []
  }
  if (k === 'w86') return [[c('Rarity', '', ['Normal', 'Magic']), c('ItemLevel', '>=', [86])]]
  if (k === 'cp' || k === 'ci' || k === 'dc') return [[T('Corrupted'), c('CorruptedMods', k === 'dc' ? '>=' : '', [k === 'dc' ? 2 : k === 'ci' ? 1 : 0])]]
  if (k === 'mirr') return [[T('Mirrored')]]
  return MARKS.filter(x => x.key === k).map(x => x.yes)
}

// Each rarity's drop tier rows, best first.
const RARE_TIERS: readonly WeightKey[] = ['t5', 't4', 't3', 't2', 't1']
const MAGIC_TIERS: readonly WeightKey[] = ['mt5', 'mt4', 'mt3', 'mt2', 'mt1']

interface Split { parts: Array<{ conds: FilterCondition[], factor: number, note: string, tiers?: readonly WeightKey[] }>, rest?: boolean }

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
      // Rares: unidentified only (identified ones have mods the rules can't
      // see, NeverSink's lists do). Magic and white share a rule when they're
      // worth the same.
      parts: [
        { conds: [c('Rarity', '', ['Rare']), F('Identified')], factor: m.wr, note: '', tiers: RARE_TIERS },
        ...(m.wm === m.wn
          ? [{ conds: [c('Rarity', '', ['Normal', 'Magic'])], factor: m.wm, note: 'white or magic', tiers: MAGIC_TIERS }]
          : [
              { conds: [c('Rarity', '', ['Magic'])], factor: m.wm, note: 'magic', tiers: MAGIC_TIERS },
              { conds: [c('Rarity', '', ['Normal'])], factor: m.wn, note: 'white', tiers: MAGIC_TIERS }
            ])
      ]
    },
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

// Unidentified rares, and white or magic gear: the two kinds a rule can name.
const SCOPES = (): FilterCondition[][] => [
  [c('Rarity', '', ['Rare']), F('Identified')],
  [c('Rarity', '', ['Normal', 'Magic'])]
]

// The gear the rules cover (with one of SCOPES, or the rarity split).
const BASE_CONDS = (): FilterCondition[] => [
  c('Rarity', '', ['Normal', 'Magic', 'Rare']),
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
// Whether a rule's conditions settle an item having these: 'yes' (always),
// 'no' (never) or '?' (can't tell).
const eqOp = (o: string) => o === '' || o === '=' || o === '=='
function implies (r: FilterCondition, x: FilterCondition): boolean {
  if (eqOp(r.op) && eqOp(x.op)) return r.values.every(v => x.values.includes(v))
  if (x.op === '>=') {
    const n = Number(x.values[0])
    if (r.op === '>=') return Number(r.values[0]) >= n
    if (eqOp(r.op)) return r.values.every(v => Number(v) >= n)
  }
  return false
}
function clashes (r: FilterCondition, x: FilterCondition): boolean {
  if (eqOp(r.op) && eqOp(x.op)) return !r.values.some(v => x.values.includes(v))
  if (x.op === '>=' && eqOp(r.op)) return r.values.every(v => Number(v) < Number(x.values[0]))
  if (eqOp(x.op) && r.op === '>=') return x.values.every(v => Number(v) < Number(r.values[0]))
  return false
}
function know (rule: FilterCondition[], alt: FilterCondition[]): 'yes' | 'no' | '?' {
  let all = true
  for (const x of alt) {
    const same = rule.filter(r => r.key === x.key)
    if (same.some(r => clashes(r, x))) return 'no'
    if (!same.some(r => implies(r, x))) all = false
  }
  return all ? 'yes' : '?'
}

export function compileWeights (w: WeightSettings, bases: BaseRow[]): Compiled {
  const m = w.mult
  const up = upMarks(m)
  const ILVL: Array<[number, WeightKey]> = [[86, 'i86'], [83, 'i83'], [75, 'i75'], [68, 'i68']]
  // Drop tier and item level, for one rarity's tier rows (best first).
  // On white and magic gear ilvl 86 also counts the crafting-base row.
  const dimsFor = (tiers: readonly WeightKey[]) => {
    const craft = tiers === MAGIC_TIERS ? m.w86 : 1
    const opts: Option[][] = [
      cumulative(tiers.map(t => m[t]), k => [c('UnidentifiedItemTier', '>=', [5 - k])]),
      cumulative(ILVL.map(x => m[x[1]] * (x[1] === 'i86' ? craft : 1)), k => [c('ItemLevel', '>=', [ILVL[k][0]])])
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
    return { opts, full, lo, hi }
  }
  type Dims = ReturnType<typeof dimsFor>

  const blocks: FilterBlock[] = []
  const perStep = [0, 0, 0, 0, 0]
  let chars = 0
  const look = w.look
  const exotic: ExoticLists = { x1: bases.filter(b => b.rank === 'x1').map(b => b.name), x2: bases.filter(b => b.rank === 'x2').map(b => b.name) }
  // Where the step rules paint a channel themselves ('score' on its list),
  // rows ranked above it: an item that has one gets that colour instead. A
  // rule that can't tell is split: first the ones that have it, then the rest.
  const variants = (conds: FilterCondition[], step: Step, chans: LookChannel[]): Array<{ conds: FilterCondition[], acts: FilterAction[] }> => {
    if (!chans.length) return [{ conds, acts: [] }]
    const [ch, ...more] = chans
    const list = look[ch]
    const out: Array<{ conds: FilterCondition[], acts: FilterAction[] }> = []
    const tail = (cs: FilterCondition[], rgb: RGBA) => variants(cs, step, more).map(v => ({ conds: v.conds, acts: [paint(ch, rgb), ...v.acts] }))
    const rule = [...BASE_CONDS(), ...conds]
    for (const k of list.slice(0, list.indexOf('score'))) {
      if (k === 'score') break
      for (const alt of [...lookAlts(k, ch, exotic)].reverse()) {
        const got = know(rule, alt.conds)
        if (got === 'no') continue
        if (got === 'yes') return [...out, ...tail(conds, alt.rgb)]
        out.push(...tail([...conds, ...alt.conds], alt.rgb))
      }
    }
    return [...out, ...tail(conds, STEP_PAINT[ch][step]!)]
  }
  const emit = (conds: FilterCondition[], step: Step, note: string) => {
    const chans = LOOK_CHANNELS.map(x => x.key).filter(ch => look[ch].includes('score') && STEP_PAINT[ch][step])
    for (const v of step === 0 ? [{ conds, acts: [] as FilterAction[] }] : variants(conds, step, chans)) push(v.conds, step, note, v.acts)
  }
  const push = (conds: FilterCondition[], step: Step, note: string, paints: FilterAction[]) => {
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
      actions: [...paints, ...stepActions(step)],
      continue: false,
      section: '[[0050]] Rare weights (woke)',
      subsection: '',
      raw: [],
      dirty: true,
      added: true
    } as FilterBlock)
  }

  // Where each step starts: Small at the line, the louder ones at their own
  // weight (never under the line).
  const atOf = (step: Step) => step === 1 ? w.need : Math.max(w.need, w.loud[step - 2])
  // The rules for one part.
  const part = (prefix: FilterCondition[], start: number, note: string, { opts, full, lo, hi }: Dims) => {
    if (start * hi[0] < w.need) return
    for (const step of [4, 3, 2, 1] as Step[]) {
      const at = atOf(step)
      if (step < 4 && at === atOf((step + 1) as Step)) continue
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

  // The look channels' Continue rules, lowest rank first (the last one an
  // item meets is the colour it keeps).
  for (const ch of LOOK_CHANNELS.map(x => x.key)) {
    const list = look[ch]
    if (scoreOwns(list, ch)) continue
    for (const k of [...list].reverse()) {
      if (k === 'score') continue
      for (const alt of lookAlts(k, ch, exotic)) {
        for (const scope of SCOPES()) {
          if (know([...BASE_CONDS(), ...scope], alt.conds) === 'no') continue
          const conds = [...BASE_CONDS(), ...scope, ...alt.conds].map(x => ({ ...x, values: [...x.values] }))
          chars += 160 + alt.conds.reduce((n, x) => n + x.values.reduce((q, v) => q + v.length + 3, 0), 0)
          blocks.push({
            kind: 'block',
            index: -1,
            line: 1,
            visibility: 'Show',
            disabled: false,
            comment: `$type->${WEIGHT_TYPE} $tier->deco woke: rare weights, ${ch === 'bg' ? 'background' : ch} for ${LOOK_LABEL[k].toLowerCase()}`,
            type: WEIGHT_TYPE,
            tier: 'deco',
            conditions: conds,
            actions: [paint(ch, alt.rgb)],
            continue: true,
            section: '[[0050]] Rare weights (woke)',
            subsection: '',
            raw: [],
            dirty: true,
            added: true
          } as FilterBlock)
        }
      }
    }
  }

  const ss = splits(bases, m)
  // Pinned rows ("always show"): what reaches a Hide with one of them shows
  // Small instead (louder ones were shown above already).
  const pins = w.always.flatMap(k => pinConds(k, bases).map(conds => ({ k, conds })))
  const hide = (pre: FilterCondition[], note: string) => {
    for (const p of pins) emit([...pre, ...p.conds], 1, `${note ? `${note}, ` : ''}always: ${WEIGHT_LABEL[p.k].toLowerCase()}`)
    emit(pre, 0, note)
  }
  const rareDims = dimsFor(RARE_TIERS)
  const walkSplits = (list: Split[], i: number, prefix: FilterCondition[], start: number, notes: string[], dims = rareDims) => {
    if (i === list.length) { part(prefix, start, notes.filter(Boolean).join(', '), dims); return }
    const sp = list[i]
    const rest = sp.parts[sp.parts.length - 1].factor
    sp.parts.forEach((p, k) => {
      const pre = [...prefix, ...p.conds]
      walkSplits(list, i + 1, pre, start * p.factor, [...notes, p.note], p.tiers ? dimsFor(p.tiers) : dims)
      // A part before a "rest" that's lighter than the rest hides what it
      // didn't show, so the rest doesn't count it heavier than it is.
      if (sp.rest && k < sp.parts.length - 1 && p.factor < rest) hide(pre, [...notes, p.note].filter(Boolean).join(', '))
    })
  }
  // Rares with a mark over ×1 (not corrupted or mirrored), biggest mark
  // first. One that doesn't show here is never heavier further down.
  const ups = MARKS.filter(x => up.includes(x.key)).sort((p, q) => m[q.key] - m[p.key])
  for (const x of ups) {
    walkSplits([ss[0], ...ss.slice(3)], 0, [...x.yes, F('Corrupted'), F('Mirrored')], m[x.key], [WEIGHT_LABEL[x.key].toLowerCase()])
  }
  walkSplits(ss, 0, [], 1, [])
  for (const scope of SCOPES()) hide(scope, 'the rest')
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
export function filterBases (doc: FilterDoc, own: Record<string, Rank> = {}): BaseRow[] {
  // Before the item data loads nothing is known (and baseInfo would remember
  // that): every base counts as a plain one until then.
  if (!allGearBases().length) return []
  return withRanks(baseTable(baseRanks(doc), allGearBases(), n => ({ cls: baseInfo(n).cls, facts: BASE_FACTS[n] })), own)
}

// Your own ranks over the filter's.
export function withRanks (rows: BaseRow[], own: Record<string, Rank>): BaseRow[] {
  return rows.map(b => own[b.name] && own[b.name] !== b.rank ? { ...b, rank: own[b.name], was: b.rank } : b)
}

export function applyWeights (doc: FilterDoc, w: WeightSettings, bases = filterBases(doc, w.ranks)): Compiled | null {
  // Without the item data every base would count as plain (exotic white
  // bases hidden): leave it all to NeverSink until the data is in.
  if (!w.on || !bases.length) return null
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
