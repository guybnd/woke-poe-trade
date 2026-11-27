// Currency weights' settings (beta): the chaos line, how loud, supplies and
// pins. Kept apart from the compiler (currency-weights.ts) so the saved config
// doesn't pull it in at startup.

export const CURRENCY_TYPE = 'woke->currency'

// The line: a pile worth less than this (in chaos, after the stack bias) hides.
export const LINE_MIN = 0.1
export const LINE_MAX = 5

export interface CurrencySettings {
  on: boolean
  // Chaos a pile must count for to show.
  line: number
  // Normal and Big start at these many chaos, Beam at this many divines,
  // whatever the line.
  normal: number
  big: number
  beamDiv: number
  // Always shown (at least Small) from this stack size: crafting supplies.
  supplies: Record<string, number>
  // Always shown (at least Small), whatever the price.
  pins: string[]
}

export function defaultCurrency (): CurrencySettings {
  return { on: false, line: 1, normal: 5, big: 30, beamDiv: 1, supplies: {}, pins: [] }
}

const NAME = /^[^"\n]{1,80}$/

export function normalizeCurrency (c: Partial<CurrencySettings> | undefined): CurrencySettings {
  const d = defaultCurrency()
  const num = (v: unknown, lo: number, hi: number, dflt: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : dflt
  const normal = num(c?.normal, 0.1, 10_000, d.normal)
  const supplies: Record<string, number> = {}
  if (c?.supplies && typeof c.supplies === 'object') {
    for (const [n, k] of Object.entries(c.supplies)) {
      if (NAME.test(n) && typeof k === 'number' && Number.isInteger(k) && k >= 1 && k <= 100_000) supplies[n] = k
    }
  }
  return {
    on: typeof c?.on === 'boolean' ? c.on : false,
    line: num(c?.line, LINE_MIN, LINE_MAX, d.line),
    normal,
    big: Math.max(normal, num(c?.big, 0.1, 100_000, d.big)),
    beamDiv: num(c?.beamDiv, 0.05, 1000, d.beamDiv),
    supplies,
    pins: Array.isArray(c?.pins) ? [...new Set(c.pins.filter((n): n is string => typeof n === 'string' && NAME.test(n)))] : []
  }
}
