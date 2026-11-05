import { percentRoll } from '../price-check/filters/util'

// What a click or drag on the roll bar does. Pure, so it can be tested without a DOM.

export type SliderEnd = 'min' | 'max'
export type SliderRange = Array<number | '' | undefined>

export function sliderEnd (button: number): SliderEnd | null {
  if (button === 0) return 'min'
  if (button === 2) return 'max'
  return null
}

/** The roll at `k` (0..1) along the bar, rounded so the edited end stays inclusive. */
export function sliderValueAt (
  k: number,
  bounds: { min: number, max: number },
  end: SliderEnd,
  dp: boolean
): number {
  const value = (bounds.max - bounds.min) * k + bounds.min
  const rounded = (end === 'min')
    ? percentRoll(value, -0, Math.floor, dp)
    : percentRoll(value, +0, Math.ceil, dp)
  // Rounding a fractional bound (12.5 shown as a whole number) can step past it.
  return Math.min(Math.max(rounded, bounds.min), bounds.max)
}

/** Sets one end. An opposite end the new value crosses is cleared, so the range stays valid. */
export function editRange (range: SliderRange, end: SliderEnd, value: number): SliderRange {
  const [min, max] = range
  if (end === 'min') {
    return [value, (typeof max === 'number' && max < value) ? undefined : max]
  }
  return [(typeof min === 'number' && min > value) ? undefined : min, value]
}
