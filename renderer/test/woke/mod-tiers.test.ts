// A PoB or character item's mod lines matched to their tier and roll.
import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { tierClassKey, tierOfLine, tiersOfMods } from '@/web/woke/ui/tooltip/mod-tiers'
import type { TierData } from '@/web/woke/ui/tooltip/mod-tiers'

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/data/mod-tiers.json'), 'utf8')) as TierData

describe('mod tiers', () => {
  it('finds the class from category and defences', () => {
    expect(tierClassKey('Body Armour', { ar: [1, 2] })).toBe('Body_Armours_str')
    expect(tierClassKey('Gloves', { ar: [1, 2], ev: [1, 2] })).toBe('Gloves_str_dex')
    expect(tierClassKey('Belt', undefined)).toBe('Belts')
    expect(tierClassKey('Map', undefined)).toBeNull()
  })

  it('gives a belt life roll its tier and roll', () => {
    const t = tierOfLine(data, 'Belts', '+80 to maximum Life')!
    expect(t.gen).toBe('prefix')
    expect(t.tier).toBeGreaterThan(0)
    expect(t.roll).not.toBeNull()
    // The highest tier is T1.
    const best = tierOfLine(data, 'Belts', '+29% to Fire Resistance')!
    expect(best.gen).toBe('suffix')
  })

  it('gives no tier to a line no mod rolls', () => {
    expect(tierOfLine(data, 'Belts', 'Has 1 Abyssal Socket')).toBeNull()
    expect(tierOfLine(data, 'Belts', '+500 to maximum Life')).toBeNull()
  })
})

describe('tiersOfMods', () => {
  it('gives a hybrid\'s two lines on the item to the hybrid, not to two mods', () => {
    const t = tiersOfMods(data, 'Boots_str_dex', ['+40 to Evasion Rating', '+24 to maximum Life', '+30% to Fire Resistance'])
    expect(t[0]?.gen).toBe('prefix')
    expect(t[1]?.gen).toBe('prefix')
    expect(t[0]?.tier).toBe(t[1]?.tier)
    expect(t[2]?.gen).toBe('suffix')
  })
})
