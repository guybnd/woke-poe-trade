// Rare weights' settings: the multiplier table, the line and their defaults.
// Kept apart from the compiler (weights.ts) so the saved config doesn't pull
// it in at startup.

export const WEIGHT_TYPE = 'woke->weights'

export type WeightKey =
  | 'x1' | 'x2' | 'r1' | 'r2' | 'r3' | 'r0' | 'rj'
  | 'wr' | 'wm' | 'wn' | 'w86'
  | 't1' | 't2' | 't3' | 't4' | 't5'
  | 'mt1' | 'mt2' | 'mt3' | 'mt4' | 'mt5'
  | 'i68' | 'i75' | 'i83' | 'i86'
  | 'infl' | 'eld' | 'qual'
  | 'fract' | 'synth' | 'fated' | 'mirr'
  | 'abyss' | 'strand' | 'ench' | 'cruc'
  | 'l4' | 'l5' | 'l6' | 'rgb'
  | 'cp' | 'ci' | 'dc'
  | 'big' | 'tiny' | 'old'

export interface WeightRow { key: WeightKey, label: string, dflt: number }
export interface WeightGroup { key: string, label: string, icon: string, base?: boolean, rows: WeightRow[] }

// The table, in the order the tab shows it. Defaults are Guy's first pass
// (2026-11-27), to be tuned in the tab's simulator.
export const WEIGHT_GROUPS: WeightGroup[] = [
  {
    key: 'rank',
    label: 'Base rank',
    icon: 'fas fa-shield-alt',
    base: true,
    rows: [
      { key: 'x1', label: 'Exotic base, top', dflt: 64 },
      { key: 'x2', label: 'Exotic base, other', dflt: 8 },
      { key: 'r1', label: 'Rank 1', dflt: 8 },
      { key: 'r2', label: 'Rank 2', dflt: 4 },
      { key: 'r3', label: 'Rank 3', dflt: 2 },
      // A base no list ranks costs (Guy, 2026-11-28): it isn't a neutral pick.
      { key: 'r0', label: 'No rank', dflt: 0.5 },
      // Bases you moved down: under the line unless a strong mark lifts them.
      { key: 'rj', label: "Don't care", dflt: 0.1 }
    ]
  },
  {
    key: 'rarity',
    label: 'Rarity',
    icon: 'fas fa-star',
    rows: [
      { key: 'wr', label: 'Rare', dflt: 1 },
      { key: 'wm', label: 'Magic', dflt: 0.1 },
      { key: 'wn', label: 'White', dflt: 0.1 },
      // Crafting bases: raise (or pin) when hunting ilvl 86 white or magic bases.
      { key: 'w86', label: 'White or magic, ilvl 86', dflt: 1 }
    ]
  },
  {
    key: 'tier',
    label: 'Drop tier',
    icon: 'fas fa-gem',
    rows: [
      { key: 't1', label: 'Tier 1', dflt: 1 },
      { key: 't2', label: 'Tier 2', dflt: 2 },
      { key: 't3', label: 'Tier 3', dflt: 3 },
      { key: 't4', label: 'Tier 4', dflt: 6 },
      { key: 't5', label: 'Tier 5', dflt: 8 }
    ]
  },
  {
    // On a magic item a good drop tier is a crafting start, not a finished
    // item: gentler. White gear has no drop tier (counts as tier 1 here).
    key: 'mtier',
    label: 'Drop tier, magic and white',
    icon: 'fas fa-gem',
    rows: [
      { key: 'mt1', label: 'Tier 1', dflt: 1 },
      { key: 'mt2', label: 'Tier 2', dflt: 1.25 },
      { key: 'mt3', label: 'Tier 3', dflt: 1.5 },
      { key: 'mt4', label: 'Tier 4', dflt: 2 },
      { key: 'mt5', label: 'Tier 5', dflt: 3 }
    ]
  },
  {
    key: 'ilvl',
    label: 'Item level',
    icon: 'fas fa-signal',
    rows: [
      { key: 'i68', label: '68 to 74', dflt: 0.5 },
      { key: 'i75', label: '75 to 82', dflt: 0.85 },
      { key: 'i83', label: '83 to 85', dflt: 1 },
      { key: 'i86', label: '86', dflt: 3 }
    ]
  },
  {
    key: 'infl',
    label: 'Influence and quality',
    icon: 'fas fa-crown',
    rows: [
      { key: 'infl', label: 'Influenced', dflt: 2 },
      { key: 'eld', label: 'Eldritch implicit', dflt: 2 },
      { key: 'qual', label: 'Quality 24%+', dflt: 8 }
    ]
  },
  {
    key: 'special',
    label: 'Special',
    icon: 'fas fa-star',
    rows: [
      { key: 'fract', label: 'Fractured', dflt: 8 },
      { key: 'synth', label: 'Synthesised', dflt: 8 },
      { key: 'fated', label: 'Fated', dflt: 2 },
      { key: 'abyss', label: 'Abyssal socket', dflt: 4 },
      { key: 'strand', label: 'Memory strands 70+', dflt: 3 },
      { key: 'ench', label: 'Enchanted or anointed', dflt: 3 },
      { key: 'cruc', label: 'Crucible tree', dflt: 6 },
      { key: 'mirr', label: 'Mirrored', dflt: 0.5 }
    ]
  },
  {
    key: 'links',
    label: 'Sockets',
    icon: 'fas fa-link',
    rows: [
      { key: 'l4', label: '4-link', dflt: 1 },
      { key: 'l5', label: '5-link', dflt: 2 },
      { key: 'l6', label: '6-link', dflt: 32 },
      { key: 'rgb', label: 'Red, green and blue linked', dflt: 1.2 }
    ]
  },
  {
    key: 'corr',
    label: 'Corruption',
    icon: 'fas fa-tint',
    rows: [
      { key: 'cp', label: 'No corrupted implicit', dflt: 0.35 },
      { key: 'ci', label: 'Corrupted implicit', dflt: 2 },
      { key: 'dc', label: 'Double corrupted', dflt: 8 }
    ]
  },
  {
    key: 'size',
    label: 'Size and age',
    icon: 'fas fa-th-large',
    rows: [
      { key: 'big', label: 'Large (2×3 and up)', dflt: 0.7 },
      { key: 'tiny', label: 'Tiny (1 high)', dflt: 1.4 },
      { key: 'old', label: 'Old armour base (drop level under 40)', dflt: 0.25 }
    ]
  }
]

export const WEIGHT_ROWS: WeightRow[] = WEIGHT_GROUPS.flatMap(g => g.rows)
export const WEIGHT_LABEL = Object.fromEntries(WEIGHT_ROWS.map(r => [r.key, r.label])) as Record<WeightKey, string>

// The line's range.
export const NEED_MIN = 1 / 16
export const NEED_MAX = 1024

export interface WeightSettings {
  on: boolean
  // The weight a rare needs to show.
  need: number
  mult: Record<WeightKey, number>
  // Rows whose gear always shows (at least Small), whatever its score.
  always: WeightKey[]
  // Where Normal, Big and Beam start (weights, rising): fixed, so moving the
  // line only hides or shows the low end.
  loud: number[]
  // Look channels: each a ranked list; the first thing on it an item has
  // paints that channel. 'score' is the score step's colour.
  look: Record<LookChannel, LookKey[]>
  // Your own rank for a base (by name), over the filter's.
  ranks: Record<string, RankKey>
  // The score a utility flask needs to show (Guy's flasks A, 2026-11-28):
  // its own, since rares' line is set for scores in the hundreds.
  flaskLine: number
  // Settings version: 1 moved No rank and Large to their penalties once.
  v: number
}

export type RankKey = 'x1' | 'x2' | 'r1' | 'r2' | 'r3' | 'r0' | 'rj'
// Best first.
export const RANK_KEYS: readonly RankKey[] = ['x1', 'x2', 'r1', 'r2', 'r3', 'r0', 'rj']

export type LookChannel = 'border' | 'bg' | 'text'
export type LookKey =
  | 'qual' | 'synth' | 'fract' | 'infl' | 'eld' | 'abyss' | 'ench' | 'l6' | 'cruc' | 'strand' | 'l5' | 'fated' | 'mirr'
  | 'corr' | 'exotic' | 'rarity' | 'score'
export const LOOK_CHANNELS: Array<{ key: LookChannel, label: string, job: string }> = [
  { key: 'border', label: 'Border', job: 'The best special mark' },
  { key: 'bg', label: 'Background', job: 'How good it is, at a glance' },
  { key: 'text', label: 'Text colour', job: 'What kind of item it is' }
]
export const LOOK_LABEL: Record<LookKey, string> = {
  qual: 'Over-quality',
  synth: 'Synthesised',
  fract: 'Fractured',
  infl: 'Influenced',
  eld: 'Eldritch implicit',
  abyss: 'Abyssal socket',
  ench: 'Enchanted',
  l6: '6-link',
  cruc: 'Crucible tree',
  strand: 'Memory strands 70+',
  l5: '5-link',
  fated: 'Fated',
  mirr: 'Mirrored',
  corr: 'Corrupted',
  exotic: 'Exotic base',
  rarity: 'Rarity',
  score: 'Score step'
}
export const LOOK_KEYS = Object.keys(LOOK_LABEL) as LookKey[]
// Guy's order (look channels page, 2026-11-27).
export const LOOK_DEFAULT: Readonly<Record<LookChannel, readonly LookKey[]>> = {
  border: ['qual', 'synth', 'fract', 'infl', 'eld', 'abyss', 'ench', 'l6', 'cruc', 'strand', 'l5', 'fated', 'mirr'],
  bg: ['corr', 'score'],
  text: ['exotic', 'rarity']
}
const lookDefault = (): Record<LookChannel, LookKey[]> => ({ border: [...LOOK_DEFAULT.border], bg: [...LOOK_DEFAULT.bg], text: [...LOOK_DEFAULT.text] })

// Each key once, in one channel at most.
export function normalizeLook (v: unknown): Record<LookChannel, LookKey[]> {
  const raw = v as Partial<Record<LookChannel, unknown>> | undefined
  if (!raw || typeof raw !== 'object' || !LOOK_CHANNELS.every(c => Array.isArray(raw[c.key]))) return lookDefault()
  const seen = new Set<LookKey>()
  const out = { border: [], bg: [], text: [] } as Record<LookChannel, LookKey[]>
  for (const c of LOOK_CHANNELS) {
    for (const k of raw[c.key] as unknown[]) {
      if (typeof k !== 'string' || !(k in LOOK_LABEL) || seen.has(k as LookKey)) continue
      seen.add(k as LookKey)
      out[c.key].push(k as LookKey)
    }
  }
  return out
}

// +40, +60, +80.
export const LOUD_DEFAULT: readonly number[] = [16, 64, 256]

export function defaultWeights (): WeightSettings {
  return { on: false, need: 4, mult: Object.fromEntries(WEIGHT_ROWS.map(r => [r.key, r.dflt])) as Record<WeightKey, number>, always: [], loud: [...LOUD_DEFAULT], look: lookDefault(), ranks: {}, flaskLine: 8, v: WEIGHTS_V }
}

// Bumped when a saved setting is moved once on load.
export const WEIGHTS_V = 1

// The rows a pin (always show) can go on: ones a rule can name on their own.
export const PIN_ROWS: ReadonlySet<WeightKey> = new Set<WeightKey>(['w86', 'x1', 'x2', 'r1', 'r2', 'r3', 'l6', 'l5', 'l4', 'rgb', 'infl', 'eld', 'qual', 'fract', 'synth', 'fated', 'mirr', 'abyss', 'strand', 'ench', 'cruc', 'cp', 'ci', 'dc'])

// Marks only add (×1 or more): a mark under ×1 would split every rule.
export const MARK_ROWS: WeightKey[] = ['w86', 'l6', 'l5', 'l4', 'infl', 'eld', 'qual', 'fract', 'synth', 'fated', 'ench', 'strand', 'cruc', 'abyss', 'rgb']
// Rows that stay in order, lowest first: a higher drop tier or item level is
// never worth less than a lower one.
export const ORDERED_ROWS: WeightKey[][] = [['t1', 't2', 't3', 't4', 't5'], ['mt1', 'mt2', 'mt3', 'mt4', 'mt5'], ['i68', 'i75', 'i83', 'i86']]

export function normalizeWeights (w: Partial<WeightSettings> | undefined): WeightSettings {
  const d = defaultWeights()
  const ok = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi
  const mult = { ...d.mult }
  for (const r of WEIGHT_ROWS) {
    const v = w?.mult?.[r.key]
    if (ok(v, 0, 1000)) mult[r.key] = v
  }
  // v1 (Guy's penalty X, 2026-11-28): No rank still at 0 points and Large
  // at 0 or the old -2 take the new penalties, once.
  if (w?.mult && !((w.v ?? 0) >= 1)) {
    if (mult.r0 === 1) mult.r0 = 0.5
    if (mult.big === 1 || mult.big === 0.85) mult.big = 0.7
  }
  for (const k of MARK_ROWS) mult[k] = Math.max(1, mult[k])
  for (const row of ORDERED_ROWS) for (let i = 1; i < row.length; i++) mult[row[i]] = Math.max(mult[row[i]], mult[row[i - 1]])
  return {
    on: typeof w?.on === 'boolean' ? w.on : false,
    need: ok(w?.need, NEED_MIN, NEED_MAX) ? w.need : d.need,
    mult,
    loud: Array.isArray(w?.loud) && w.loud.length === 3 && w.loud.every((v, i) => ok(v, NEED_MIN, NEED_MAX * 64) && (i === 0 || v >= w.loud![i - 1])) ? [...w.loud] : [...LOUD_DEFAULT],
    always: Array.isArray(w?.always) ? [...new Set(w.always.filter(k => PIN_ROWS.has(k)))] : [],
    look: normalizeLook(w?.look),
    flaskLine: ok(w?.flaskLine, NEED_MIN, NEED_MAX) ? w.flaskLine : d.flaskLine,
    v: WEIGHTS_V,
    ranks: w?.ranks && typeof w.ranks === 'object'
      ? Object.fromEntries(Object.entries(w.ranks).filter(([n, r]) => typeof n === 'string' && n.length < 80 && RANK_KEYS.includes(r)))
      : {}
  }
}
