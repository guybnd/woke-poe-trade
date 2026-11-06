// Reading items and notes from a PoB build for the build detail panel.
import { describe, it, expect } from 'vitest'
import { parseItemText } from '../../../main/src/woke/pob-parse'
import { buildFacts, chainGems, gearLayout, loadoutOf, noteRuns, pickStage, relevantGems, stageOf } from '@/web/woke/pob-builds/build-model'
import { nextGems } from '@/web/woke/pob-builds/gems'
import type { PobDetails, PobItemSet, PobSkillSet } from '@/web/woke/pob-builds/widget'

describe('mod ranges', () => {
  it('uses the roll PoB saved, inline or by line number, else the middle', () => {
    const item = parseItemText(`
      Rarity: RARE
      Grim March
      Warlock Boots
      Implicits: 1
      +(10-20) to Strength
      {range:1}(56-74)% increased Energy Shield
      +(41-55) to maximum Life
      Adds (6-9) to (12-16) Fire Damage
    `, new Map([[3, 0]]))
    expect(item.implicits).toEqual(['+15 to Strength'])
    expect(item.mods).toEqual(['74% increased Energy Shield', '+41 to maximum Life', 'Adds 8 to 14 Fire Damage'])
  })

  it('writes negative rolls as PoB does', () => {
    const item = parseItemText(`
      Rarity: RARE
      Agony Whorl
      Manifold Ring
      Implicits: 0
      +(-10--4) to Total Mana Cost of Skills
      -(10-20)% to Chaos Resistance
      (-20--10)% increased Mana Cost of Skills
      +(0-0)% to Fire Resistance
    `)
    expect(item.mods).toEqual(['-7 to Total Mana Cost of Skills', '-15% to Chaos Resistance', '15% reduced Mana Cost of Skills', '0% to Fire Resistance'])
  })

  it('remembers which implicits PoB marks crafted', () => {
    const item = parseItemText(`
      Rarity: RARE
      A
      Heavy Belt
      Implicits: 2
      +25 to Strength
      {crafted}Allocates Tranquility
    `)
    expect(item.implicitKinds).toEqual(['', 'crafted'])
  })
})

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

describe('bug hunt: build details', () => {
  it('keeps mods of every picked variant on an item with alt variants', () => {
    const item = parseItemText(`
      Rarity: UNIQUE
      Watcher's Eye
      Prismatic Jewel
      Has Alt Variant: true
      Has Alt Variant Two: true
      Selected Variant: 1
      Selected Alt Variant: 2
      Selected Alt Variant Two: 3
      Implicits: 0
      {variant:1}First pick
      {variant:2}Second pick
      {variant:3}Third pick
      {variant:4}Not picked
      Always there
    `)
    expect(item.mods).toEqual(['First pick', 'Second pick', 'Third pick', 'Always there'])
  })

  it.each(['20% quality', 'Cold 100%', 'Dmg 10.5', 'Full Plate', 'Template', 'Translate'])('"%s" is not a stage', (title) => {
    expect(stageOf(title)).toBeNull()
  })

  it('still reads real stage titles', () => {
    expect(stageOf('Level 28')).toEqual({ kind: 'level', at: 28 })
    expect(stageOf('Act 5')).toEqual({ kind: 'act', at: 5 })
    expect(stageOf('Late game')).toEqual({ kind: 'level', at: 70 })
    expect(stageOf('Endgame')).toEqual({ kind: 'level', at: 70 })
    for (const t of ['Lategame', 'LateGame', 'Late_game', 'Latemaps', 'late90', 'Endgame2', 'Final']) {
      expect(stageOf(t)).toEqual({ kind: 'level', at: 70 })
    }
    expect(stageOf('Latest')).toBeNull()
    expect(stageOf('Maps')).toEqual({ kind: 'level', at: 70 })
    expect(stageOf('68')).toEqual({ kind: 'level', at: 68 })
    expect(stageOf('6L')).toBeNull()
  })

  it('in the Epilogue with no level yet, picks the furthest set rather than the first', () => {
    const sets = ['Level 10', 'Level 40', 'Level 60'].map(title => ({ title, isActive: false }))
    expect(pickStage(sets, null, 11)?.item.title).toBe('Level 60')
  })

  it('lists transfigured gems among the next gems, with no campaign source', () => {
    const d = { className: 'Witch', skills: [] } as unknown as PobDetails
    const list = nextGems(d, 10, 'Witch', ['Kinetic Blast of Clustering'])
    expect(list).toEqual([expect.objectContaining({ name: 'Kinetic Blast of Clustering', requiredLevel: 28, source: null, when: 'later' })])
  })
})

describe('gear layout', () => {
  const gem = (name: string, enabled = true) => ({ name, level: 20, quality: 0, enabled, support: false })
  const group = (slot: string, names: string[], extra = {}) => ({ label: '', slot, enabled: true, isMain: false, gems: names.map(n => gem(n)), ...extra })
  const item = (name: string, sockets = '') => ({ rarity: 'RARE' as const, name, base: '', sockets, implicits: [], mods: [] })

  it('puts the main skill on top and sorts other items by gem count', () => {
    const l = gearLayout(
      [{ slot: 'Weapon 1', item: item('Blade', 'R-R-R') }, { slot: 'Helmet', item: item('Cap', 'R-R-R-R') }, { slot: 'Body Armour', item: item('Robe', 'R-R-R-R-R-R') }],
      [group('Weapon 1', ['A', 'B']), group('Helmet', ['C', 'D', 'E']), group('Body Armour', ['Main', 'F'], { isMain: true })]
    )
    expect(l.main?.item?.name).toBe('Robe')
    expect(l.linked.map(r => r.item?.name)).toEqual(['Cap', 'Blade'])
  })

  it('keeps two groups on one item, the main one first', () => {
    const second = group('Gloves', ['Main', 'X'], { isMain: true })
    const l = gearLayout([{ slot: 'Gloves', item: item('Mitts', 'R-R-R') }], [group('Gloves', ['A', 'B']), second])
    expect(l.main?.groups).toHaveLength(2)
    expect(l.main?.groups[0]).toBe(second)
  })

  it('lists groups with no slot apart, without the ones nothing socketed grants', () => {
    const free = group('', ['Free'])
    const l = gearLayout([], [free, group('', ['Explosion'], { source: 'Explode' })])
    expect(l.loose).toEqual([free])
  })

  it('keeps a granted group with no slot when it is the main skill', () => {
    const main = group('', ['Granted'], { source: 'Tree:1', isMain: true })
    expect(gearLayout([], [main]).loose).toEqual([main])
  })

  it('draws a slot with gems when this item set leaves it empty', () => {
    const l = gearLayout([], [group('Boots', ['A', 'B'], { isMain: true }), group('Helmet', ['C'])])
    expect(l.main).toMatchObject({ slot: 'Boots', item: null })
    expect(l.linked[0]).toMatchObject({ slot: 'Helmet', item: null })
  })

  it('shows weapon swap only when it holds gems', () => {
    const slots = [{ slot: 'Weapon 1 Swap', item: item('Horn', 'B-B-B') }, { slot: 'Weapon 2 Swap', item: item('Wand', 'B-B') }]
    const l = gearLayout(slots, [group('Weapon 1 Swap', ['Enlighten', 'Empower'])])
    expect([l.main, ...l.linked, ...l.plain].filter(Boolean).map(r => r!.slot)).toEqual(['Weapon 1 Swap'])
  })

  it('leaves out abyssal jewels, and keeps socketless items in the plain list', () => {
    const l = gearLayout(
      [{ slot: 'Boots Abyssal Socket 1', item: item('Eye') }, { slot: 'Belt', item: item('Vise', 'A') }, { slot: 'Gloves', item: item('Mitts', 'R-R') }],
      []
    )
    expect(l.plain.map(r => r.item?.name)).toEqual(['Vise'])
    expect(l.linked.map(r => r.item?.name)).toEqual(['Mitts'])
  })

  it('chains socketed gems first and switched-off gems last', () => {
    const g = { ...group('Body Armour', []), gems: [gem('Off', false), gem('On'), gem('')] }
    expect(chainGems(g).map(x => x.name)).toEqual(['On', 'Off'])
  })

  it('does not show a group with no named gems', () => {
    const l = gearLayout([], [{ ...group('Helmet', []), gems: [gem('')] }])
    expect(l.main).toBeNull()
    expect(l.linked).toEqual([])
  })
})
