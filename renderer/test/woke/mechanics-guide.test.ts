import { describe, it, expect } from 'vitest'
import { MECHANICS, mechanicForZone } from '@/web/woke/mechanics/data'
import { GUIDE, GUIDE_GROUPS } from '@/web/woke/mechanics/guide'
import { NPC_MECHANIC, mechanicForSpeaker } from '@/web/woke/mechanics/zone'

const npcMechanics = new Set(Object.values(NPC_MECHANIC))

describe('league mechanics guide', () => {
  it('covers every mechanic and nothing else', () => {
    expect(Object.keys(GUIDE).sort()).toEqual(MECHANICS.map(m => m.id).sort())
  })

  it('lists every kind of guide in a group of the settings list', () => {
    const grouped = new Set(GUIDE_GROUPS.flatMap(g => g.kinds))
    for (const m of MECHANICS) expect(grouped, m.id).toContain(GUIDE[m.id].kind)
  })

  // The page tells the reader a mechanic is "not detected", so that has to be true.
  it('says "not detected" exactly for mechanics with no zone rule and no NPC', () => {
    for (const m of MECHANICS) {
      const detectable = m.zone != null || npcMechanics.has(m.id)
      expect(GUIDE[m.id].kind === 'none', m.id).toBe(!detectable)
    }
  })

  it('says "when an NPC speaks" only for mechanics an NPC triggers', () => {
    for (const m of MECHANICS) {
      if (GUIDE[m.id].kind === 'npc') expect(npcMechanics.has(m.id), m.id).toBe(true)
    }
  })

  // Area ids and zone names as Guy's real Client.txt logs them.
  it.each([
    ['Delve_Main', 'delve'],
    ['Azurite Mine', 'delve'],
    ['ExpeditionDesertRuins', 'expedition'],
    ['HarvestLeagueBoss', 'harvest'],
    ['The Sacred Grove', 'harvest'],
    ['BreachBossChaos', 'breach'],
    ['LegionLeague4', 'legion'],
    ['AfflictionTown8', 'delirium'],
    ['SanctumFoyer_Fellshrine', 'sanctum'],
    ['HeistHub', 'heist'],
    ['HeistMines9', 'heist'],
    ['Incursion_Temple10', 'incursion'],
    ['BetrayalSafeHouseFortress', 'betrayal'],
    ['BetrayalMastermindFight', 'betrayal']
  ])('a real log area %s comes up as %s', (area, id) => {
    expect(mechanicForZone(area)?.id).toBe(id)
  })

  it.each([
    ['Sister Cassia', 'blight'],
    ['The Trialmaster', 'ultimatum'],
    ['Einhar, Beastmaster', 'bestiary'],
    ['Alva, Master Explorer', 'incursion'],
    ['Niko, Master of the Depths', 'delve'],
    ['Jun, Veiled Master', 'betrayal'],
    ['Oshabi', 'harvest'],
    ['Strange Voice', 'delirium']
  ])('%s speaking brings up %s', (speaker, id) => {
    expect(mechanicForSpeaker(`2026/11/05 10:00:00 1 2 [INFO Client 3] ${speaker}: Hello.`)).toBe(id)
  })
})

describe('Covens trophies', () => {
  it('sorts every trophy into one slot, with poedb slots first', async () => {
    const { TROPHIES, TROPHY_SLOTS, trophySlot, slotMatcher } = await import('@/web/woke/mechanics/covens')
    expect(new Set(TROPHIES).size).toBe(TROPHIES.length)
    expect(trophySlot("Sirus' Head")).toBe('Head')
    expect(trophySlot("Incarnation of Neglect's Cube")).toBe('Upper Limb')
    expect(trophySlot("Warden's Arm")).toBe('Upper Limb')
    expect(trophySlot('Skeletal Tail')).toBe('Lower Limb')
    expect(trophySlot('Golden Ankh')).toBe('Other')
    for (const name of TROPHIES) {
      expect(TROPHY_SLOTS.filter(s => slotMatcher(s).test(name)), name).toEqual([trophySlot(name)])
    }
  })
})
