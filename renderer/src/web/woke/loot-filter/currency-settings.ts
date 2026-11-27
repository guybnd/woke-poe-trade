// Currency weights' settings (beta): the line, where each louder step starts,
// per-category nudges and per-item edits. Kept apart from the compiler
// (currency-weights.ts) so the saved config doesn't pull it in at startup.
import { isPatch } from './edits'
import type { StylePatch } from './edits'

export const CURRENCY_TYPE = 'woke->currency'

// The line: a pile worth less than this (in chaos, after the stack bias) hides.
export const LINE_MIN = 0.1
export const LINE_MAX = 10
// A category's nudge: each notch doubles (see less) or halves (see more) the line.
export const NUDGE_MAX = 3
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
  // Its own look, on top of its step's.
  look?: StylePatch
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
  // 2026-11-27: "turn an entire section off like small off").
  off: number[]
  // Every step's price × this; null follows the filter's strictness.
  mult: number | null
}

export function defaultCurrency (): CurrencySettings {
  return { on: false, line: 0.2, from: [1, 4, 10, 60], nudge: {}, items: {}, steps: {}, cats: {}, off: [], mult: null }
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
  if (x.look && isPatch(x.look)) out.look = x.look as StylePatch
  return Object.keys(out).length ? out : null
}

// Older saves (the first beta): normal/big/beamDiv, supplies and pins.
interface OldCurrency { normal?: unknown, big?: unknown, supplies?: unknown, pins?: unknown }

export function normalizeCurrency (c: (Partial<CurrencySettings> & OldCurrency) | undefined): CurrencySettings {
  const d = defaultCurrency()
  const from = [...d.from] as CurrencySettings['from']
  if (Array.isArray(c?.from) && c.from.length === 4) {
    c.from.forEach((v, i) => { const n = num(v, 0.01, 1e6); if (n != null) from[i] = n })
  } else {
    const normal = num(c?.normal, 0.1, 10_000)
    const big = num(c?.big, 0.1, 100_000)
    if (normal != null) from[0] = normal
    if (big != null) from[2] = big
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
  if (c?.supplies && typeof c.supplies === 'object') {
    for (const [n, k] of Object.entries(c.supplies as Record<string, unknown>)) {
      const supply = int(k, 1, 100_000)
      if (NAME.test(n) && supply != null) items[n] = { ...items[n], supply }
    }
  }
  if (Array.isArray(c?.pins)) {
    // A pin meant "always show it": every stack shows, and the price still decides the louder steps.
    for (const n of c.pins) if (typeof n === 'string' && NAME.test(n)) items[n] = { ...items[n], supply: 1 }
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
    off: [1, 2, 3, 4].filter(n => Array.isArray(c?.off) && c.off.includes(n))
  }
}
