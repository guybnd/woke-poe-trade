// Reading items and notes from a PoB build for the build detail panel.
import { describe, it, expect } from 'vitest'
import { parseItemText } from '../../../main/src/woke/pob-parse'
import { noteRuns } from '@/web/woke/pob-builds/build-model'

describe('parseItemText', () => {
  const item = parseItemText(`
    Rarity: RARE
    Dread Shell
    Vaal Regalia
    Crusader Item
    Unique ID: abc
    Item Level: 86
    Quality: 20
    Energy Shield: 412
    EnergyShieldBasePercentile: 0.5
    Sockets: B-B-R G
    LevelReq: 68
    Implicits: 1
    +12% to Lightning Resistance
    {crafted}+40 to maximum Energy Shield
    {fractured}{range:0.5}82% increased Energy Shield
    +62 to maximum Life
    Corrupted
  `)

  it('reads what the tooltip shows', () => {
    expect(item).toMatchObject({
      rarity: 'RARE',
      name: 'Dread Shell',
      base: 'Vaal Regalia',
      sockets: 'B-B-R G',
      itemLevel: 86,
      quality: 20,
      energyShield: 412,
      levelReq: 68,
      influences: ['Crusader'],
      corrupted: true
    })
    expect(item.armour).toBeUndefined()
  })

  it('keeps mods apart from flags, and knows crafted and fractured ones', () => {
    expect(item.implicits).toEqual(['+12% to Lightning Resistance'])
    expect(item.mods).toEqual(['+40 to maximum Energy Shield', '82% increased Energy Shield', '+62 to maximum Life'])
    expect(item.modKinds).toEqual(['crafted', 'fractured', ''])
  })

  it('leaves modKinds out when no mod needs it', () => {
    expect(parseItemText('Rarity: NORMAL\nSapphire Ring\nImplicits: 0\n+10 to Life').modKinds).toBeUndefined()
  })
})

describe('noteRuns', () => {
  it('splits PoB colour codes into runs', () => {
    expect(noteRuns('plain ^xFF5555red^7 white')).toEqual([
      { text: 'plain ', colour: null },
      { text: 'red', colour: '#FF5555' },
      { text: ' white', colour: '#ffffff' }
    ])
  })

  it('drops colours too dark to read on the panel', () => {
    expect(noteRuns('^0a^x101010b')).toEqual([{ text: 'a', colour: null }, { text: 'b', colour: null }])
  })
})
