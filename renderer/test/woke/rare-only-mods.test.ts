// 3.30 rare-only mods: the advanced copy writes "Rare-only Prefix Modifier" or
// "Rare-only Suffix Modifier" (GGG fixed the English text in 3.30.0.3).
import { beforeAll, describe, expect, it } from 'vitest'
import { parseModInfoLine } from '@/parser/advanced-mod-desc'
import { ModifierMechanic } from '@/parser/modifiers'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData)

describe('rare-only mods', () => {
  it('reads a rare-only prefix', () => {
    const info = parseModInfoLine('{ Rare-only Prefix Modifier "Tyrannical" (Tier: 1) }')
    expect(info.generation).toBe('prefix')
    expect(info.mechanic).toBe(ModifierMechanic.RareOnly)
    expect(info.tier).toBe(1)
  })

  it('reads a rare-only suffix', () => {
    const info = parseModInfoLine('{ Rare-only Suffix Modifier "of the Ages" (Tier: 2) }')
    expect(info.generation).toBe('suffix')
    expect(info.mechanic).toBe(ModifierMechanic.RareOnly)
  })

  it('reads a rare-only heading with no name', () => {
    const info = parseModInfoLine('{ Rare-only Prefix Modifier (Tier: 1) }')
    expect(info.generation).toBe('prefix')
    expect(info.tier).toBe(1)
  })

  it('still reads a normal prefix', () => {
    const info = parseModInfoLine('{ Prefix Modifier "Tyrannical" (Tier: 1) }')
    expect(info.generation).toBe('prefix')
    expect(info.mechanic).not.toBe(ModifierMechanic.RareOnly)
  })
})
