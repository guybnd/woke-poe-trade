import type { StatFilter, FilterOrGroup } from '@/web/price-check/filters/interfaces'

// "Low rolls" / "Current rolls" shortcuts for the price check.
// Only ticked mods with a variable roll are touched.

export type RollPreset = 'low' | 'current'

// Share of the tier range kept on each side of the item's roll by "Current rolls".
const CURRENT_WINDOW = 0.1

// Map and heist properties have no tiers: their bounds run up to a
// MAX_SAFE_INTEGER placeholder, which must never reach the trade site.
const OPEN_BOUND = Number.MAX_SAFE_INTEGER / 2

type Roll = NonNullable<StatFilter['roll']>

function rollable (filters: FilterOrGroup[]): StatFilter[] {
  const out: StatFilter[] = []
  for (const f of filters) {
    if (f.group === 'not') continue
    const list = f.group ? f.stats : [f]
    for (const s of list) {
      if (!s.disabled && s.roll && s.roll.bounds && s.roll.better) out.push(s)
    }
  }
  return out
}

function round (value: number, dp: boolean, method: (n: number) => number) {
  const k = dp ? 100 : 1
  // strip float noise (0.6 + 0.04 = 0.64000000001) before floor/ceil
  return method(Math.round(value * k * 1e6) / 1e6) / k
}

function presetRange (roll: Roll, preset: RollPreset): { min: number | undefined, max: number | undefined } {
  const bounds = roll.bounds!
  if (preset === 'low') {
    // Worst roll of the tier and up: positive mods keep only a min, "lower is better" mods only a max.
    return roll.better === 1
      ? { min: bounds.min, max: undefined }
      : { min: undefined, max: bounds.max }
  }
  if (Math.abs(bounds.min) >= OPEN_BOUND || Math.abs(bounds.max) >= OPEN_BOUND) {
    // No tier to take a window of: this roll or better.
    return roll.better === 1
      ? { min: roll.value, max: undefined }
      : { min: undefined, max: roll.value }
  }
  const step = roll.dp ? 0.01 : 1
  const delta = Math.max((bounds.max - bounds.min) * CURRENT_WINDOW, step)
  return {
    min: Math.max(bounds.min, round(roll.value - delta, roll.dp, Math.floor)),
    max: Math.min(bounds.max, round(roll.value + delta, roll.dp, Math.ceil))
  }
}

export function canUseRollPresets (filters: FilterOrGroup[]): boolean {
  return rollable(filters).length > 0
}

export function applyRollPreset (filters: FilterOrGroup[], preset: RollPreset) {
  for (const s of rollable(filters)) {
    const r = presetRange(s.roll!, preset)
    s.roll!.min = r.min
    s.roll!.max = r.max
  }
}

// Which preset the current min/max match, if any (so editing a box clears the highlight).
export function activeRollPreset (filters: FilterOrGroup[]): RollPreset | '' {
  const list = rollable(filters)
  if (!list.length) return ''
  for (const preset of ['low', 'current'] as const) {
    if (list.every(s => {
      const r = presetRange(s.roll!, preset)
      const min = (typeof s.roll!.min === 'number') ? s.roll!.min : undefined
      const max = (typeof s.roll!.max === 'number') ? s.roll!.max : undefined
      return min === r.min && max === r.max
    })) return preset
  }
  return ''
}
