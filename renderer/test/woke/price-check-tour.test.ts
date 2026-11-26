import { describe, expect, it } from 'vitest'
import { TOUR_STEPS, nextStep } from '@/web/woke/price-insight/tour-steps'

describe('price check tour', () => {
  it('goes mods, price, listing, skipping what this check hasn\'t got', () => {
    expect(TOUR_STEPS.map(s => s.id)).toEqual(['mods', 'price', 'listing'])
    const has = (ids: string[]) => (s: { id: string }) => ids.includes(s.id)
    expect(nextStep(0, has(['mods', 'price', 'listing']))).toBe(0)
    expect(nextStep(1, has(['mods', 'listing']))).toBe(2)
    expect(nextStep(0, has(['price']))).toBe(1)
    expect(nextStep(2, has(['mods']))).toBe(-1)
  })
})
