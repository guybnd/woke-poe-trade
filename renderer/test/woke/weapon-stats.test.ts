// A weapon's damage block from its base and local mods.
import { describe, expect, it } from 'vitest'
import { weaponStats } from '@/web/woke/ui/tooltip/weapon-stats'

const FOIL = { ph: [32, 60] as [number, number], at: 625, cr: 550 }

describe('weaponStats', () => {
  it('works out Dire Beak on a Jewelled Foil', () => {
    const w = weaponStats(FOIL, ['Adds 41 to 66 Cold Damage', '27% increased Attack Speed', '36% increased Critical Strike Chance', '+31% to Global Critical Strike Multiplier'])!
    expect(w.damage).toEqual({ physical: [32, 60], cold: [41, 66] })
    expect(w.aps).toBe(2.03)
    expect(w.crit).toBe(7.48)
    expect(w.pdps).toBe(93.4)
    expect(w.edps).toBe(108.6)
    expect(w.dps).toBe(202)
  })

  it('adds quality to increased physical damage and leaves global attack adds out', () => {
    const w = weaponStats(FOIL, ['Adds 10 to 20 Physical Damage', '100% increased Physical Damage', 'Adds 5 to 9 Fire Damage to Attacks'], 20)!
    expect(w.damage).toEqual({ physical: [92, 176] })
  })

  it('is null for a base that is not a weapon', () => {
    expect(weaponStats({ ar: [100, 120] }, [])).toBeNull()
    expect(weaponStats(undefined, [])).toBeNull()
  })
})

describe('weaponBaseIn', () => {
  it('finds the weapon base inside a magic item name, the longest match first', async () => {
    const { weaponBaseIn } = await import('@/web/woke/ui/tooltip/weapon-stats')
    const bases = { 'Rusted Sword': { ph: [4, 9] as [number, number], at: 690 }, 'Sword': { ph: [1, 2] as [number, number], at: 700 }, 'Iron Hat': { ar: [5, 9] as [number, number] } }
    expect(weaponBaseIn('Heavy Rusted Sword of Needling', bases)).toBe('Rusted Sword')
    expect(weaponBaseIn('Iron Hat', bases)).toBeNull()
  })

  it('rounds the base rate before scaling, as PoB does', () => {
    expect(weaponStats({ ph: [4, 9], at: 690 }, ['10% increased Attack Speed'])!.aps).toBe(1.6)
  })
})
