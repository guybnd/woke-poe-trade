// The family list beside a bulk price check: which items share a family.
import { describe, it, expect, beforeAll } from 'vitest'
import { ITEM_BY_REF, ITEMS_ITERATOR } from '@/assets/data'
import { familiesOf, familyOf, familyRows } from '@/web/woke/related-family/family'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData)

function fam (name: string) {
  const info = ITEM_BY_REF('ITEM', name)?.[0]
  if (!info) throw new Error(`no item ${name}`)
  return familyOf(info, needle => ITEMS_ITERATOR(needle), ref => ITEM_BY_REF('ITEM', ref)?.[0])
}
const names = (name: string) => fam(name)?.members.map(m => m.refName) ?? []

describe('related family', () => {
  it('lists every fossil for a fossil', () => {
    const f = fam('Shuddering Fossil')!
    expect(f.label).toBe('Fossils')
    expect(f.members.length).toBe(25)
    expect(names('Shuddering Fossil')).toContain('Hollow Fossil')
  })

  it('finds the other families', () => {
    expect(fam('Imbued Catalyst')?.label).toBe('Catalysts')
    expect(fam('Golden Oil')?.label).toBe('Oils')
    expect(fam("Diviner's Delirium Orb")?.label).toBe('Delirium Orbs')
    expect(fam('Powerful Chaotic Resonator')?.label).toBe('Resonators')
    expect(fam('Omen of Adrenaline')?.label).toBe('Omens')
    expect(fam('Cryptic Astrolabe')?.label).toBe('Astrolabes')
    expect(fam('Abyss Thread')?.label).toBe('Threads')
  })

  it('keeps essences to one tier', () => {
    const list = names('Deafening Essence of Greed')
    expect(fam('Deafening Essence of Greed')?.label).toBe('Deafening essences')
    expect(list.length).toBeGreaterThan(15)
    expect(list.every(n => n.startsWith('Deafening Essence of '))).toBe(true)
    expect(names('Essence of Hysteria')).toEqual(expect.arrayContaining(['Essence of Insanity', 'Essence of Horror', 'Essence of Delirium']))
  })

  it('gives each item one family, whichever member is checked', () => {
    expect(fam('Tainted Catalyst')?.label).toBe('Catalysts')
    expect(names('Tainted Chaos Orb')).not.toContain('Tainted Catalyst')
    expect(names('Tainted Chaos Orb')).not.toContain('Tainted Oil')
    expect(names('Imbued Catalyst')).toContain('Tainted Catalyst')
  })

  it('lists every exalt for an exalt, with the ones the name pattern misses', () => {
    const exalts = ['Exalted Orb', 'Eldritch Exalted Orb', 'Veiled Exalted Orb', "Hunter's Exalted Orb", "Warlord's Exalted Orb", "Crusader's Exalted Orb", "Redeemer's Exalted Orb", "Shaper's Exalted Orb", "Elder's Exalted Orb", "Awakener's Orb", 'Orb of Dominance']
    expect(fam('Exalted Orb')?.label).toBe('Exalted Orbs')
    expect(names('Exalted Orb')).toEqual(expect.arrayContaining(exalts))
    expect(names("Hunter's Exalted Orb")).toEqual(expect.arrayContaining(exalts))
    expect(names("Awakener's Orb")).toContain("Shaper's Exalted Orb")
  })

  it('puts an item in its own family and its orb kind', () => {
    const info = ITEM_BY_REF('ITEM', 'Tainted Exalted Orb')![0]
    const all = familiesOf(info, needle => ITEMS_ITERATOR(needle), ref => ITEM_BY_REF('ITEM', ref)?.[0])
    expect(all.map(f => f.label)).toEqual(['Tainted currency', 'Exalted Orbs'])
    expect(names('Chaos Orb')).toEqual(expect.arrayContaining(['Chaos Orb', 'Eldritch Chaos Orb', 'Tainted Chaos Orb']))
    expect(names('Orb of Annulment')).toEqual(expect.arrayContaining(['Orb of Annulment', 'Eldritch Orb of Annulment']))
    // A catalyst stays out of tainted currency.
    expect(names('Imbued Catalyst')).toContain('Tainted Catalyst')
    expect(names('Tainted Chaos Orb')).not.toContain('Tainted Catalyst')
  })

  it('lists each kind of tattoo', () => {
    expect(fam('Honoured Tattoo of the Oak')?.label).toBe('Honoured Tattoos')
    expect(names('Honoured Tattoo of the Oak')).toContain('Honoured Tattoo of the Flock')
    expect(names('Honoured Tattoo of the Oak')).not.toContain('Loyalty Tattoo of Kaom')
    for (const t of ['Loyalty Tattoo of Kaom', 'Journey Tattoo of the Body', 'Forbidden Tattoo of the Witch']) expect(fam(t)?.members.length, t).toBeGreaterThan(1)
    // The plain ones keep their own family.
    expect(fam('Tattoo of the Ngamahu Warmonger')?.label).toBe('Tattoos')
  })

  it('gives plain currency with no kinds no family', () => {
    expect(fam('Divine Orb')).toBeNull()
    expect(fam('Orb of Alchemy')).toBeNull()
  })

  it('sorts dearest first, unpriced last', () => {
    const f = fam('Shuddering Fossil')!
    const price: Record<string, number> = { 'Hollow Fossil': 159, 'Shuddering Fossil': 27, 'Dense Fossil': 11 }
    const rows = familyRows(f, 'Shuddering Fossil', ref => price[ref] ?? null)
    expect(rows.slice(0, 3).map(r => r.info.refName)).toEqual(['Hollow Fossil', 'Shuddering Fossil', 'Dense Fossil'])
    expect(rows.find(r => r.own)?.info.refName).toBe('Shuddering Fossil')
    expect(rows.at(-1)!.chaos).toBeNull()
  })
})
