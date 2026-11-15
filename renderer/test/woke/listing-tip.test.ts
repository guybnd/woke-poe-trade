// A trade listing shown in the shared item tooltip, from what the trade site
// sends with each listing.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { listingTipItem } from '@/web/woke/price-insight/listing-tip'
import type { ListingItem } from '@/web/woke/price-insight/listing-tip'

// Items captured from the real trade API on 2026-11-05.
const CAPTURED: ListingItem[] = JSON.parse(readFileSync(resolve(__dirname, '../../../testing/fixtures/trade/listing-items.json'), 'utf-8'))

describe('listingTipItem on real trade responses', () => {
  it('turns every mod into text, with fractured mods marked', () => {
    for (const captured of CAPTURED) {
      const item = listingTipItem(captured)!
      expect(item.mods.length).toBeGreaterThan(0)
      for (const mod of item.mods) {
        expect(typeof mod).toBe('string')
        expect(mod).not.toContain('{')
      }
      expect(item.modKinds?.[0]).toBe('fractured')
      expect(item.modKinds).toHaveLength(item.mods.length)
    }
  })

  it('reads the name, sockets and defences', () => {
    expect(listingTipItem(CAPTURED[0])).toMatchObject({
      rarity: 'RARE',
      name: 'Brimstone Veil',
      base: 'Lich\'s Circlet',
      sockets: 'B-R-B',
      energyShield: 190,
      itemLevel: 86
    })
  })
})

describe('listingTipItem', () => {
  it('keeps mods it finds in explicitMods under their own kind', () => {
    const item = listingTipItem({
      frameType: 2,
      explicitMods: [
        { description: '+20% to Cold Resistance', domain: 'crafted' },
        { description: '+40 to maximum Life', domain: 'explicit' },
        { description: 'Allocates Pain Attunement', domain: 'enchant' }
      ]
    })!
    expect(item.mods).toEqual(['+40 to maximum Life', '+20% to Cold Resistance'])
    expect(item.modKinds).toEqual(['', 'crafted'])
    expect(item.implicits).toEqual(['Allocates Pain Attunement'])
  })

  it('finds quality whatever it is called, and keeps flask utility mods', () => {
    const item = listingTipItem({
      frameType: 3,
      utilityMods: ['Grants Immunity to Bleeding'],
      properties: [{ name: 'Quality (Attack Modifiers)', type: 6, values: [['+24%', 1]] }]
    })!
    expect(item.quality).toBe(24)
    expect(item.mods).toEqual(['Grants Immunity to Bleeding'])
  })

  it('draws a corrupted unique with its mods, defences and sockets', () => {
    const item = listingTipItem({
      name: 'Kaom\'s Heart',
      typeLine: 'Glorious Plate',
      frameType: 3,
      ilvl: 86,
      corrupted: true,
      implicitMods: ['+1 to Level of Socketed Gems'],
      explicitMods: ['37% increased Fire Damage', '+500 to maximum Life'],
      sockets: [{ group: 0, sColour: 'R' }],
      properties: [{ name: 'Armour', values: [['1,013', 1]] }, { name: 'Quality', type: 6, values: [['+20%', 1]] }]
    })!
    expect(item).toMatchObject({
      rarity: 'UNIQUE',
      name: 'Kaom\'s Heart',
      base: 'Glorious Plate',
      implicits: ['+1 to Level of Socketed Gems'],
      mods: ['37% increased Fire Damage', '+500 to maximum Life'],
      sockets: 'R',
      armour: 1013,
      quality: 20,
      itemLevel: 86,
      corrupted: true
    })
  })

  it('keeps fractured and crafted mods marked, in game order', () => {
    const item = listingTipItem({
      frameType: 2,
      typeLine: 'Two-Stone Ring',
      fracturedMods: ['+60 to maximum Life'],
      explicitMods: ['+40% to Fire Resistance'],
      craftedMods: ['+20% to Cold Resistance'],
      influences: { elder: true }
    })!
    expect(item.mods).toEqual(['+60 to maximum Life', '+40% to Fire Resistance', '+20% to Cold Resistance'])
    expect(item.modKinds).toEqual(['fractured', '', 'crafted'])
    expect(item.influences).toEqual(['Elder'])
  })

  it('groups linked sockets and puts enchants with implicits', () => {
    const item = listingTipItem({
      frameType: 2,
      enchantMods: ['Added Small Passive Skills grant: 12% increased Fire Damage'],
      implicitMods: ['+10 to Strength'],
      sockets: [{ group: 0, sColour: 'R' }, { group: 0, sColour: 'G' }, { group: 1, sColour: 'B' }]
    })!
    expect(item.sockets).toBe('R-G B')
    expect(item.implicits[0]).toContain('Added Small Passive')
  })

  // Trimmed from a real Covens listing, 2026-11-15: frame type 15 is "Viscera".
  it('draws a 3.30 Viscera, which has its own frame type', () => {
    const item = listingTipItem({
      name: '',
      typeLine: 'Lesser Ancestor\'s Club',
      baseType: 'Lesser Ancestor\'s Club',
      rarity: 'Normal',
      frameType: 15,
      ilvl: 46,
      properties: [{ name: 'Upper Limb', values: [], displayMode: 0 }],
      implicitMods: [{
        description: 'Strike Skills which target additional Enemies can do so from 15% further away',
        domain: 'implicit',
        hash: 'stat.implicit.stat_2783093471',
        mods: [{ magnitudes: [{ min: '10', max: '15' }] }]
      }]
    })
    expect(item).toMatchObject({
      rarity: 'NORMAL',
      base: 'Lesser Ancestor\'s Club',
      implicits: ['Strike Skills which target additional Enemies can do so from 15% further away'],
      mods: [],
      itemLevel: 46
    })
  })

  it('shows nothing for what has no mods', () => {
    expect(listingTipItem({ frameType: 4, rarity: 'Normal', typeLine: 'Enlighten Support', explicitMods: ['x'] })).toBeNull()
    expect(listingTipItem({ frameType: 5, rarity: 'Normal', typeLine: 'Chaos Orb', explicitMods: ['x'] })).toBeNull()
    expect(listingTipItem({ frameType: 15, typeLine: 'Ghostly Claw' })).toBeNull()
    expect(listingTipItem({ frameType: 5, typeLine: 'Chaos Orb' })).toBeNull()
    expect(listingTipItem({ frameType: 0, typeLine: 'Iron Ring' })).toBeNull()
    expect(listingTipItem({})).toBeNull()
  })
})
