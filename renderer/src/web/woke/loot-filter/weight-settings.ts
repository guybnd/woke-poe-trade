// Rare weights' settings: the multiplier table, the line and their defaults.
// Kept apart from the compiler (weights.ts) so the saved config doesn't pull
// it in at startup.

export const WEIGHT_TYPE = 'woke->weights'

export type WeightKey =
  | 'x1' | 'x2' | 'r1' | 'r2' | 'r3' | 'r0'
  | 'wr' | 'wm' | 'wn'
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
      { key: 'r0', label: 'No rank', dflt: 1 }
    ]
  },
  {
    key: 'rarity',
    label: 'Rarity',
    icon: 'fas fa-star',
    rows: [
      { key: 'wr', label: 'Rare', dflt: 1 },
      { key: 'wm', label: 'Magic', dflt: 0.7 },
      { key: 'wn', label: 'White', dflt: 0.7 }
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
      { key: 'big', label: 'Large (2×3 and up)', dflt: 0.85 },
      { key: 'tiny', label: 'Tiny (1 high)', dflt: 1.4 },
      { key: 'old', label: 'Old armour base (drop level under 40)', dflt: 0.25 }
    ]
  }
]

export const WEIGHT_ROWS: WeightRow[] = WEIGHT_GROUPS.flatMap(g => g.rows)
export const WEIGHT_LABEL = Object.fromEntries(WEIGHT_ROWS.map(r => [r.key, r.label])) as Record<WeightKey, string>

// The steps a multiplier moves through, and the line's range.
export const MULT_STEPS = [0, 0.05, 0.1, 0.15, 0.25, 0.35, 0.5, 0.7, 0.85, 1, 1.2, 1.4, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 128]
export const NEED_MIN = 1 / 16
export const NEED_MAX = 1024
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

export interface WeightSettings {
  on: boolean
  // The weight a rare needs to show.
  need: number
  mult: Record<WeightKey, number>
  // Rows whose gear always shows (at least Small), whatever its score.
  always: WeightKey[]
}

export function defaultWeights (): WeightSettings {
  return { on: false, need: 4, mult: Object.fromEntries(WEIGHT_ROWS.map(r => [r.key, r.dflt])) as Record<WeightKey, number>, always: [] }
}

// The rows a pin (always show) can go on: ones a rule can name on their own.
export const PIN_ROWS: ReadonlySet<WeightKey> = new Set<WeightKey>(['x1', 'x2', 'r1', 'r2', 'r3', 'l6', 'l5', 'l4', 'rgb', 'infl', 'eld', 'qual', 'fract', 'synth', 'fated', 'mirr', 'abyss', 'strand', 'ench', 'cruc', 'cp', 'ci', 'dc'])

// Marks only add (×1 or more): a mark under ×1 would split every rule.
export const MARK_ROWS: WeightKey[] = ['l6', 'l5', 'l4', 'infl', 'eld', 'qual', 'fract', 'synth', 'fated', 'ench', 'strand', 'cruc', 'abyss', 'rgb']
// Rows that stay in order, lowest first: a higher drop tier or item level is
// never worth less than a lower one.
export const ORDERED_ROWS: WeightKey[][] = [['t1', 't2', 't3', 't4', 't5'], ['mt1', 'mt2', 'mt3', 'mt4', 'mt5'], ['i68', 'i75', 'i83', 'i86']]

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

export function normalizeWeights (w: Partial<WeightSettings> | undefined): WeightSettings {
  const d = defaultWeights()
  const ok = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi
  const mult = { ...d.mult }
  for (const r of WEIGHT_ROWS) {
    const v = w?.mult?.[r.key]
    if (ok(v, 0, 1000)) mult[r.key] = v
  }
  for (const k of MARK_ROWS) mult[k] = Math.max(1, mult[k])
  for (const row of ORDERED_ROWS) for (let i = 1; i < row.length; i++) mult[row[i]] = Math.max(mult[row[i]], mult[row[i - 1]])
  return {
    on: typeof w?.on === 'boolean' ? w.on : false,
    need: ok(w?.need, NEED_MIN, NEED_MAX) ? w.need : d.need,
    mult,
    always: Array.isArray(w?.always) ? [...new Set(w.always.filter(k => PIN_ROWS.has(k)))] : []
  }
}
