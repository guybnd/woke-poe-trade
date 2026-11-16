// The family list beside a bulk price check: which items share a family.
import { describe, it, expect, beforeAll } from 'vitest'
import { ITEM_BY_REF, ITEMS_ITERATOR } from '@/assets/data'
import { familyOf, familyRows } from '@/web/woke/related-family/family'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData)

function fam (name: string) {
  const info = ITEM_BY_REF('ITEM', name)?.[0]
  if (!info) throw new Error(`no item ${name}`)
  return familyOf(info, needle => ITEMS_ITERATOR(needle))
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

  it('gives plain currency no family', () => {
    expect(fam('Chaos Orb')).toBeNull()
    expect(fam('Divine Orb')).toBeNull()
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
