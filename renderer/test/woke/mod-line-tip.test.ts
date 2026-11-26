// A mod row's hover tooltip outside the price check (ui/tooltip/mod-line-tip.ts).
import { describe, expect, it } from 'vitest'
import { modLineTip } from '@/web/woke/ui/tooltip/mod-line-tip'

describe('modLineTip', () => {
  it('puts the whole mod in one section and the notes in a dim one under it', () => {
    const tip = modLineTip({ head: 'Map mod', text: 'Monsters reflect 18% of Elemental Damage', notes: ["Your build can't run this", null, false, 'Click to cycle Has, Not, Any'] })
    expect(tip.kind).toBe('lookup')
    expect(tip.market).toBeNull()
    expect(tip.model.name).toBe('Map mod')
    expect(tip.model.sections).toEqual([
      [[{ text: 'Monsters reflect 18% of Elemental Damage', tone: 'mod' }]],
      [[{ text: "Your build can't run this", tone: 'dim' }], [{ text: 'Click to cycle Has, Not, Any', tone: 'dim' }]]
    ])
  })

  it('splits a mod over two lines and leaves out an empty notes section', () => {
    const tip = modLineTip({ text: 'Players have 20% less Armour\nPlayers have 20% less Evasion' })
    expect(tip.model.name).toBe('Mod')
    expect(tip.model.sections).toEqual([[
      [{ text: 'Players have 20% less Armour', tone: 'mod' }],
      [{ text: 'Players have 20% less Evasion', tone: 'mod' }]
    ]])
  })
})
