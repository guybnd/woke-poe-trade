// Currency weights' settings (beta): the line, where each louder step starts,
// per-category nudges and per-item edits. Kept apart from the compiler
// (currency-weights.ts) so the saved config doesn't pull it in at startup.
import { isPatch } from './edits'
import type { StylePatch } from './edits'

export const CURRENCY_TYPE = 'woke->currency'

// The line: a pile worth less than this (in chaos, after the stack bias) hides.
export const LINE_MIN = 0.1
export const LINE_MAX = 10
// A category's strictness: each notch ×1.25 (stricter) or ÷1.25 on every step's price.
export const NUDGE_MAX = 4
// The strictness multiplier on every step's price (Guy 2026-11-27): it
// follows NeverSink's strictness, ×1.25 a level, until set by hand in 0.05s.
export const MULT_MIN = 0.25
export const MULT_MAX = 4

// The steps, quiet to loud (Guy's pick S2, 2026-11-27). 0 is hidden.
export type CStep = 0 | 1 | 2 | 3 | 4 | 5
export const CSTEP_NAMES = ['Hidden', 'Small', 'Normal', 'Decent', 'Big', 'Tink'] as const

// One item, set by hand. Any field left out: the price decides.
export interface ItemEdit {
  // Every pile of it gets this step.
  step?: CStep
  // Chaos each, instead of poe.ninja's.
  price?: number
  // Always shown (at least Small) from this stack: crafting supplies.
  supply?: number
  // Worth ×: a bonus or penalty on its price (MULT_MIN to MULT_MAX).
  mult?: number
  // Its own look, on top of its step's.
  look?: StylePatch
  // Shows at least this step at any stack: a card you collect (Guy's star,
  // 2026-11-27: Collecting shows at least Normal).
  min?: CStep
}

export interface CurrencySettings {
  on: boolean
  // Chaos a pile must count for to show (Small).
  line: number
  // Normal, Decent, Big and Tink start at these many chaos, whatever the line.
  from: [number, number, number, number]
  // Category id → notches: +1 sees less (line ×2), −1 sees more (line ÷2).
  nudge: Record<string, number>
  items: Record<string, ItemEdit>
  // A step's look changed by hand ('1'..'5'), on top of the built-in one.
  steps: Record<string, StylePatch>
  // A category's look changed by hand (text colour, map icon), on Small to Big.
  cats: Record<string, StylePatch>
  // Steps turned off (1..4): piles that would get one hide instead (Guy
  // 2026-11-27: "turn an entire section off like small off"). Keyed by a
  // class page (its ruler: 'currency', 'uniques'...) or a section that sets
  // its own (Guy 2026-11-28: Normal off on Currency hid it on every page).
  offBy: Record<string, number[]>
  // A section's own ruler (Guy's pick A, 2026-11-28): where Small, Normal,
  // Decent, Big and Tink start in it, before Strictness. It leaves the main
  // ruler and the section's Price bias; Strictness still moves it.
  rulers: Record<string, number[]>
  // Every step's price × this; null follows the filter's strictness.
  mult: number | null
  // A whole category set by hand (Guy 2026-11-27, Loot tab: Off / Weighted /
  // Always on every section). Off hides it; Always shows every pile at least
  // Small. An item's own Off or Always wins over its category's.
  catMode: Record<string, SectionMode>
  // The Faint step (Guy's T1 and X1): piles under the line show small and
  // see-through in the category colour instead of hiding, while the
  // Strictness multiplier is under `until`.
  faint: FaintSettings
  // Maps: normal maps under this tier hide (Guy's M1 slider); 1 shows all.
  mapFrom: number
  // Gold: the pile size where Small, Normal, Decent, Big and Tink start
  // (Guy 2026-11-28: its own sections to slide).
  gold: number[]
  // The Chase uniques look, a CHASE_LOOKS id (unique-classes.ts); unset is
  // the default one (Guy 2026-11-28: a picker on the section's header).
  chaseLook?: string
  // Uniques left out of their base's average drop (Guy 2026-11-28: a special
  // drop like Precursor's Emblem); toggleNotAvg flips one.
  notAvg?: string[]
  // Size cut on big uniques (Guy's picks S2, Z1, W2, E1, 2026-11-28): 'on',
  // 'off', or unset for Auto (on from Strict, ×1.25, up).
  sizeCut?: 'on' | 'off'
  // Worked out by scaled() from sizeCut and the strictness; never saved.
  sizeOn?: boolean
}

export type SectionMode = 'off' | 'auto' | 'always'
export interface FaintSettings { on: boolean, until: number }
// Faint shows below Strict (×1.25) unless set otherwise. Off by default:
// the rules are maps-only, and T1 said off in maps until you turn it on.
export const FAINT_UNTIL = 1.25

// Leave a unique out of its base's average drop, or count it again.
export function toggleNotAvg (c: Pick<CurrencySettings, 'notAvg'>, name: string): string[] {
  const now = new Set(c.notAvg ?? [])
  if (now.has(name)) now.delete(name)
  else now.add(name)
  return [...now].sort()
}

export function defaultCurrency (): CurrencySettings {
  return { on: false, line: 0.2, from: [1, 3, 10, 60], nudge: {}, items: {}, steps: {}, cats: {}, offBy: {}, rulers: {}, mult: null, catMode: {}, faint: { on: false, until: FAINT_UNTIL }, mapFrom: 1, gold: [1, 500, 3000, 10000, 50000] }
}

const NAME = /^[^"\n]{1,80}$/
const num = (v: unknown, lo: number, hi: number): number | null => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null
const int = (v: unknown, lo: number, hi: number): number | null => Number.isInteger(v) ? num(v, lo, hi) : null

function patches (v: unknown, key: RegExp): Record<string, StylePatch> {
  const out: Record<string, StylePatch> = {}
  if (v && typeof v === 'object') {
    for (const [k, p] of Object.entries(v)) if (key.test(k) && isPatch(p) && Object.keys(p as object).length) out[k] = p as StylePatch
  }
  return out
}

export function normalizeItemEdit (e: unknown): ItemEdit | null {
  if (!e || typeof e !== 'object') return null
  const x = e as Record<string, unknown>
  const out: ItemEdit = {}
  const step = int(x.step, 0, 5)
  if (step != null) out.step = step as CStep
  const price = num(x.price, 0.0001, 1e7)
  if (price != null) out.price = price
  const supply = int(x.supply, 1, 100_000)
  if (supply != null) out.supply = supply
  const mult = num(x.mult, MULT_MIN, MULT_MAX)
  if (mult) out.mult = mult
  if (x.look && isPatch(x.look)) out.look = x.look as StylePatch
  const min = int(x.min, 1, 5)
  if (min) out.min = min as CStep
  return Object.keys(out).length ? out : null
}

// The old one list for every page was set on the Currency page: it stays there.
function offOf (c: Partial<CurrencySettings> & { off?: unknown } | undefined): Record<string, number[]> {
  const src = c?.offBy && typeof c.offBy === 'object' ? c.offBy : { currency: c?.off }
  const out: Record<string, number[]> = {}
  for (const [k, v] of Object.entries(src)) if (/^[a-z]{1,20}$/.test(k) && Array.isArray(v)) out[k] = [1, 2, 3, 4].filter(n => v.includes(n))
  return out
}

function rulersOf (v: unknown): Record<string, number[]> {
  const out: Record<string, number[]> = {}
  if (v && typeof v === 'object') {
    for (const [k, r] of Object.entries(v)) {
      if (/^[a-z]{1,20}$/.test(k) && Array.isArray(r) && r.length === 5 && r.every((x, i) => num(x, 0.01, 1e6) != null && (!i || x >= r[i - 1]))) out[k] = [...r]
    }
  }
  return out
}

export function normalizeCurrency (c: Partial<CurrencySettings> | undefined): CurrencySettings {
  const d = defaultCurrency()
  const from = [...d.from] as CurrencySettings['from']
  if (Array.isArray(c?.from) && c.from.length === 4) {
    c.from.forEach((v, i) => { const n = num(v, 0.01, 1e6); if (n != null) from[i] = n })
  }
  // Each step starts at or above the one below it.
  for (let i = 1; i < 4; i++) from[i] = Math.max(from[i], from[i - 1])
  const nudge: Record<string, number> = {}
  if (c?.nudge && typeof c.nudge === 'object') {
    for (const [k, v] of Object.entries(c.nudge)) {
      if (/^[a-z]{1,20}$/.test(k) && v && int(v, -NUDGE_MAX, NUDGE_MAX) != null) nudge[k] = v as number
    }
  }
  const items: Record<string, ItemEdit> = {}
  if (c?.items && typeof c.items === 'object') {
    for (const [n, e] of Object.entries(c.items)) {
      const ok = NAME.test(n) ? normalizeItemEdit(e) : null
      if (ok) items[n] = ok
    }
  }
  return {
    on: typeof c?.on === 'boolean' ? c.on : false,
    line: num(c?.line, LINE_MIN, LINE_MAX) ?? d.line,
    from,
    nudge,
    items,
    steps: patches(c?.steps, /^[1-5]$/),
    cats: patches(c?.cats, /^[a-z]{1,20}$/),
    mult: num(c?.mult, MULT_MIN, MULT_MAX) ?? null,
    offBy: offOf(c),
    rulers: rulersOf(c?.rulers),
    // Kept light (this runs at startup): what reads them takes only 'off',
    // 'always', true and a number (currency-weights.ts).
    catMode: { ...c?.catMode },
    faint: { on: c?.faint?.on === true, until: Number(c?.faint?.until) || FAINT_UNTIL },
    mapFrom: int(c?.mapFrom, 1, 17) ?? 1,
    ...(Array.isArray(c?.notAvg) && c.notAvg.length ? { notAvg: [...new Set(c.notAvg.filter(n => typeof n === 'string' && NAME.test(n)))].sort() } : {}),
    ...(c?.sizeCut === 'on' || c?.sizeCut === 'off' ? { sizeCut: c.sizeCut } : {}),
    ...(typeof c?.chaseLook === 'string' && /^[A-Z][0-9]$/.test(c.chaseLook) ? { chaseLook: c.chaseLook } : {}),
    gold: Array.isArray(c?.gold) && c.gold.length === 5 && c.gold.every((g, i) => int(g, 1, 1e7) != null && (!i || g >= c.gold![i - 1])) ? [...c.gold] : d.gold
  }
}
