// Resistances and attributes summed from gear, tree and aura lines.
import { describe, expect, it } from 'vitest'
import { sumDefences } from '@/web/woke/pob-builds/char-defences'

describe('sumDefences', () => {
  it('starts from the class and the acts\' penalty, then adds every source', () => {
    const d = sumDefences('Gladiator', [
      '+19% to all Elemental Resistances',
      '+30% to Fire Resistance',
      '+10% to Cold and Lightning Resistances',
      '+17% to Chaos Resistance',
      'You and nearby allies gain +24% to all Elemental Resistances',
      '+1% to maximum Fire Resistance',
      '+31 to all Attributes',
      '+30 to Strength',
      '+10 to Dexterity and Intelligence',
      '10% increased Strength'
    ])
    expect(d.res).toEqual({ Fire: 13, Cold: -7, Lightning: -7, Chaos: -43 })
    expect(d.max.Fire).toBe(76)
    expect(d.attr).toEqual({ Strength: Math.floor((23 + 31 + 30) * 1.1), Dexterity: 23 + 31 + 10, Intelligence: 14 + 31 + 10 })
  })

  it('reads all maximum resistances, chaos included or not', () => {
    const d = sumDefences('Duelist', ['+2% to all maximum Resistances', '+1% to all maximum Elemental Resistances'])
    expect(d.max).toEqual({ Fire: 78, Cold: 78, Lightning: 78, Chaos: 77 })
  })
})

describe('sumDefences wordings', () => {
  it('reads single-element purities, chaos pairs and the act penalty', async () => {
    const { resPenalty } = await import('@/web/woke/pob-builds/char-defences')
    const d = sumDefences('Witch', [
      'You and nearby allies gain 41% additional Fire Resistance',
      'You and nearby allies gain 4% additional maximum Fire Resistance',
      '+20% to Cold and Chaos Resistances'
    ], resPenalty(6, 40))
    expect(d.res).toEqual({ Fire: 11, Cold: -10, Lightning: -30, Chaos: -10 })
    expect(d.max.Fire).toBe(79)
    expect(resPenalty(1, 81)).toBe(-60)
    expect(resPenalty(3, 20)).toBe(0)
  })
})
