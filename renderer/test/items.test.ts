// Every clipboard fixture in testing/fixtures/items must parse cleanly with
// APT's parser and the current game data: a fixture that drifts from the
// real game text would make the other tests meaningless.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, fixture, fixtureFiles, parseItem } from './helpers/game-data'

describe('item fixtures', () => {
  beforeAll(loadGameData)

  for (const file of fixtureFiles('items', '.txt')) {
    it(`${file} parses with no unknown mods`, () => {
      const item = parseItem(fixture(`items/${file}`))
      expect(item.unknownModifiers.map(m => m.text)).toEqual([])
    })
  }

  it('reads map properties and mods', () => {
    const item = parseItem(fixture('items/map-rare-t16.txt'))
    expect(item.mapTier).toBe(16)
    expect(item.mapArea?.name).toBe('Strand')
    expect(item.areaItemQuantity).toBe(87)
    expect(item.areaItemRarity).toBe(45)
    expect(item.areaPackSize).toBe(29)
    expect(item.mapMoreCurrency).toBe(12)
    expect(item.statsByType.map(s => s.stat.ref)).toContain('Players are Cursed with Temporal Chains')
  })

  it('reads a 3.30 linked skill name behind a zero-width space', () => {
    const text = fixture('items/unique-ebers-unification-zwsp.txt')
    expect(text).toContain('​')
    const item = parseItem(text)
    expect(item.unknownModifiers).toEqual([])
    expect(item.statsByType.map(s => s.stat.ref)).toContain('Trigger Level # Void Gaze when you use a Skill')
    expect(item.rawText).not.toContain('​')
  })

  it('reads stack size, gem level and rolls', () => {
    expect(parseItem(fixture('items/currency-divine.txt')).stackSize?.value).toBe(7)
    const gem = parseItem(fixture('items/gem-enlighten.txt'))
    expect(gem.gemLevel).toBe(3)
    const ring = parseItem(fixture('items/rare-ring.txt'))
    expect(ring.itemLevel).toBe(84)
    const life = ring.statsByType.find(s => s.stat.ref === '+# to maximum Life')
    expect(life?.sources[0].contributes?.value).toBe(64)
  })
})
