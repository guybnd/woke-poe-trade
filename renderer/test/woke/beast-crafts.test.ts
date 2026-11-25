// What a captured beast's tooltip says it does: its Bestiary recipes.
import { describe, it, expect, beforeAll } from 'vitest'
import { ITEM_BY_REF } from '@/assets/data'
import { BEAST_CRAFTS } from '@/web/woke/ui/tooltip/beast-crafts'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData)

describe('beast crafts', () => {
  it('names only beasts the item data knows', () => {
    expect(Object.keys(BEAST_CRAFTS).filter(name => !ITEM_BY_REF('CAPTURED_BEAST', name)?.length)).toEqual([])
  })

  it('says what the Farric Alphas beside Exalted Orb do', () => {
    expect(BEAST_CRAFTS['Farric Lynx Alpha']).toEqual(['Modify Mods on an Item: Add a Suffix, Remove a Random Prefix', 'Only works on rare items'])
    expect(BEAST_CRAFTS['Farric Wolf Alpha'][0]).toBe('Modify Mods on an Item: Add a Prefix, Remove a Random Suffix')
  })

  it('starts every beast with a recipe, not a condition', () => {
    for (const lines of Object.values(BEAST_CRAFTS)) expect(lines[0]).toContain(':')
  })
})
