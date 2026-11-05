// Reading items and notes from a PoB build for the build detail panel.
import { describe, it, expect } from 'vitest'
import { parseItemText } from '../../../main/src/woke/pob-parse'
import { buildFacts, loadoutOf, noteRuns, relevantGems } from '@/web/woke/pob-builds/build-model'
import type { PobDetails, PobItemSet, PobSkillSet } from '@/web/woke/pob-builds/widget'

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

describe('loadouts', () => {
  const set = (title: string, gem: string, isActive = false): PobSkillSet => ({
    title,
    isActive,
    groups: [{ label: '', slot: '', enabled: true, isMain: true, gems: [{ name: gem, level: 1, quality: 0, enabled: true }] }]
  })
  const items = (title: string, base: string): PobItemSet => ({
    title,
    isActive: false,
    slots: [{ slot: 'Body Armour', item: { rarity: 'RARE', name: 'X', base, sockets: '', implicits: [], mods: [] } }]
  })
  // Guy's kind of build: same-named sets, and only "Day 1" reads as a stage.
  const day1 = 'Leap Slam Day 1 No Cluster'
  const day2 = 'Leap Slam Day 1.5 Clusters'
  const d: PobDetails = {
    className: 'Marauder',
    ascendClassName: '',
    level: 90,
    mainSkill: '',
    notes: '',
    skills: [],
    skillSets: [set(day1, 'Leap Slam'), set(day2, 'Cyclone')],
    itemSets: [items(day1, 'Plate Vest'), items(day2, 'Vaal Regalia'), items('Swap', 'Simple Robe')],
    trees: [{ title: day1, url: 'a', isActive: true }, { title: day2, url: 'b', isActive: false }]
  }

  it('follows your level with nothing picked', () => {
    const l = loadoutOf(d, 90, null)
    expect(l.skillSet?.item.title).toBe(day1)
    expect(l.itemSet?.item.title).toBe(day1)
  })

  it('takes the same-named sets along with a pick', () => {
    const l = loadoutOf(d, 90, null, { skillSet: day2 })
    expect(l.skillSet?.item.title).toBe(day2)
    expect(l.itemSet?.item.title).toBe(day2)
    expect(l.tree?.title).toBe(day2)
  })

  it('lets the item set differ from the skill set', () => {
    const l = loadoutOf(d, 90, null, { skillSet: day2, itemSet: 'Swap' })
    expect(l.skillSet?.item.title).toBe(day2)
    expect(l.itemSet?.item.title).toBe('Swap')
    expect(l.tree?.title).toBe(day2)
  })

  it('an item set pick changes only the gear', () => {
    const l = loadoutOf(d, 90, null, { itemSet: day2 })
    expect(l.skillSet?.item.title).toBe(day1)
    expect(l.itemSet?.item.title).toBe(day2)
    expect(l.tree?.title).toBe(day1)
  })

  it('feeds the helpers from the pick', () => {
    expect(relevantGems(d, 90, null, { skillSet: day2 })).toEqual(['Cyclone'])
    expect(buildFacts(d, 90, null).bases.map(b => b.base)).toEqual(['Plate Vest'])
    expect(buildFacts(d, 90, null, { skillSet: day2 }).bases.map(b => b.base)).toEqual(['Vaal Regalia'])
  })

  it('goes back to your level when PoB no longer has the set', () => {
    expect(loadoutOf(d, 90, null, { skillSet: 'Renamed' }).skillSet?.item.title).toBe(day1)
  })

  it('keeps later stages in the gem list for a staged pick', () => {
    const staged: PobDetails = { ...d, skillSets: [set('Level 12', 'Arc'), set('Level 30', 'Spark'), set('Level 50', 'Ball Lightning')] }
    expect(relevantGems(staged, 60, null, { skillSet: 'Level 30' })).toEqual(['Spark', 'Ball Lightning'])
  })
})
