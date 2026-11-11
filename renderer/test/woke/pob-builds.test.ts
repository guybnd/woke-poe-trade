// Reading items and notes from a PoB build for the build detail panel.
import { describe, it, expect } from 'vitest'
import { parseBuild, parseItemText } from '../../../main/src/woke/pob-parse'
import { buildDps, buildFacts, chainGems, gearChange, gearLayout, gemChange, nextSet, loadoutOf, noteRuns, pickStage, relevantGems, shortNumber, stageOf, statLine } from '@/web/woke/pob-builds/build-model'
import { gemWhere, nextGems } from '@/web/woke/pob-builds/gems'
import { PINNED_GROUP, groupBuilds } from '@/web/woke/pob-builds/widget'
import type { PobBuildEntry, PobDetails, PobItemSet, PobSkillSet } from '@/web/woke/pob-builds/widget'

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

  it.each(['20% quality', 'Cold 100%', 'Dmg 10.5', 'Full Plate', 'Template', 'Translate', 'Midgame {3}', 'Early Game {4}', '2 Stone', '4 Stone', 'Leap Slam Day 3', 'Pre-T16', '5-link', '6-linked'])('"%s" is not a stage', (title) => {
    expect(stageOf(title)).toBeNull()
  })

  it('still reads real stage titles', () => {
    expect(stageOf('Level 28')).toEqual({ kind: 'level', at: 28 })
    expect(stageOf('Act 5')).toEqual({ kind: 'act', at: 5 })
    expect(stageOf('Late game')).toEqual({ kind: 'end', at: 70 })
    expect(stageOf('Endgame')).toEqual({ kind: 'end', at: 70 })
    for (const t of ['Lategame', 'LateGame', 'Late_game', 'Latemaps', 'late90', 'Endgame2', 'Final', 'Endgame {1,2}']) {
      expect(stageOf(t)).toEqual({ kind: 'end', at: 70 })
    }
    expect(stageOf('Level 80 - Uber Lab {4}')).toEqual({ kind: 'level', at: 80 })
    expect(stageOf('1-12')).toEqual({ kind: 'level', at: 1 })
    expect(stageOf('13-Pre-Cyclone')).toEqual({ kind: 'level', at: 13 })
    expect(stageOf('12 to 28')).toEqual({ kind: 'level', at: 12 })
    expect(stageOf('(12-28)')).toEqual({ kind: 'level', at: 12 })
    expect(stageOf('Cyclone Swap-Maps')).toEqual({ kind: 'level', at: 70 })
    expect(stageOf('Latest')).toBeNull()
    expect(stageOf('Maps')).toEqual({ kind: 'level', at: 70 })
    expect(stageOf('68')).toEqual({ kind: 'level', at: 68 })
    expect(stageOf('6L')).toBeNull()
  })

  it('takes the endgame set over a Level 80 one at level 95, and skips headings', () => {
    const sets = [
      { title: 'Level 80 - Uber Lab {4}', isActive: false },
      { title: '~~~ ENDGAME ~~~', isActive: false, divider: true },
      { title: 'Midgame {3}', isActive: false },
      { title: 'Endgame - Cluster {1}', isActive: false }
    ]
    expect(pickStage(sets, 95, null)?.item.title).toBe('Endgame - Cluster {1}')
    expect(pickStage(sets, 72, null)?.item.title).toBe('Level 80 - Uber Lab {4}')
    expect(pickStage(sets, 95, null, '~~~ ENDGAME ~~~')?.item.title).toBe('Endgame - Cluster {1}')
  })

  it('reaches endgame at 70 when the levelling sets stop before that', () => {
    const sets = ['Level 16', 'Level 67', 'Endgame'].map(title => ({ title, isActive: false }))
    expect(pickStage(sets, 60, null)?.item.title).toBe('Level 16')
    expect(pickStage(sets, 75, null)?.item.title).toBe('Endgame')
  })

  it('stays on an untitled first set until the first titled stage', () => {
    const sets = ['Early Game {4}', 'Midgame {3}', 'Endgame {1,2}'].map(title => ({ title, isActive: false }))
    const early = pickStage(sets, 20, null)
    expect(early?.item.title).toBe('Early Game {4}')
    expect(early?.byStage).toBe(false)
    expect(pickStage(sets, 80, null)?.item.title).toBe('Endgame {1,2}')
  })

  it('still finds a pick saved with colour codes', () => {
    const sets = ['Level 12', 'Level 16'].map(title => ({ title, isActive: false }))
    expect(pickStage(sets, 20, null, '^2Level 12')?.item.title).toBe('Level 12')
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

describe('parseBuild set titles', () => {
  const d = parseBuild(`<PathOfBuilding><Build level="95"></Build>
    <Skills activeSkillSet="2"><SkillSet id="1" title="^2~~~ LEVELING ~~~"></SkillSet><SkillSet id="2" title="^xFAA4BDLevel 31+ - Siphon"><Skill><Gem nameSpec="Spark"/></Skill></SkillSet></Skills>
    <Tree activeSpec="2"><Spec title="^2Heading" nodes="1,2"></Spec><Spec title="^1Endgame" nodes="1,2,3,4"></Spec></Tree>
    </PathOfBuilding>`)

  it('drops colour codes, so a title reads as its real stage', () => {
    expect(d.skillSets[1].title).toBe('Level 31+ - Siphon')
    expect(stageOf(d.skillSets[1].title)).toEqual({ kind: 'level', at: 31 })
    expect(stageOf(d.trees[1].title)).toEqual({ kind: 'end', at: 70 })
  })

  it('marks empty sets as headings', () => {
    expect(d.skillSets[0].divider).toBe(true)
    expect(d.skillSets[1].divider).toBeUndefined()
    expect(d.trees[0].divider).toBe(true)
    expect(d.trees[1].divider).toBeUndefined()
  })
})

describe('saved stats', () => {
  it('reads PlayerStat in either attribute order, and the first value of each', () => {
    const d = parseBuild(`<PathOfBuilding><Build level="95" className="Witch">
      <PlayerStat stat="Life" value="4145"/>
      <PlayerStat value="5604073.8" stat="FullDPS"/>
      <PlayerStat stat="Life" value="1"/>
      <PlayerStat stat="NotOurs" value="3"/>
      <MinionStat stat="EnergyShield" value="99"/>
      <MinionStat stat="TotalDPS" value="24000000"/>
    </Build></PathOfBuilding>`)
    expect(d.stats).toEqual({ Life: 4145, FullDPS: 5604073.8, MinionTotalDPS: 24000000 })
  })

  it('says damage and EHP on one line', () => {
    expect(statLine({ FullDPS: 5604073.8, CombinedDPS: 1120814.8, TotalEHP: 63487 })).toBe('5.6M · 63k EHP')
    expect(statLine({ CombinedDPS: 0, TotalEHP: 433761 })).toBe('434k EHP')
    expect(statLine({})).toBe('')
    expect(statLine(undefined)).toBe('')
    expect(buildDps({ FullDPS: 0, CombinedDPS: 65000000 })).toBe(65000000)
    expect(buildDps({ TotalDPS: 12100, TotalDotDPS: 6200 })).toBe(12100)
    expect(buildDps({ CombinedDPS: 0, MinionTotalDPS: 24000000 })).toBe(24000000)
    expect(shortNumber(863627895)).toBe('863.6M')
    expect(shortNumber(4145)).toBe('4,145')
  })
})

describe('groupBuilds', () => {
  const b = (relPath: string, folder: string, mtime: number) => ({ relPath, folder, mtime, name: relPath } as PobBuildEntry)

  it('puts folders by latest save, pinned first, and nothing twice', () => {
    const groups = groupBuilds([b('a', '328', 5), b('c', '329', 9), b('d', '', 1), b('e', '329', 7)], ['a'])
    expect(groups.map(g => g.folder)).toEqual([PINNED_GROUP, '329', ''])
    expect(groups[1].builds.map(x => x.relPath)).toEqual(['c', 'e'])
    expect(groups[2].label).toBe('Other')
  })

  it('keeps a subfolder with its top folder', () => {
    const groups = groupBuilds([b('a', '3.27/phys dot', 5), b('c', '3.27', 9)], [])
    expect(groups.map(g => g.folder)).toEqual(['3.27'])
    expect(groups[0].builds).toHaveLength(2)
  })
})

describe('next step', () => {
  const gem = (name: string) => ({ name, level: 1, quality: 0, enabled: true })
  const set = (title: string, gems: string[]) => ({ title, isActive: false, groups: [{ label: '', slot: '', enabled: true, isMain: false, gems: gems.map(gem) }] })

  it('finds the next set in the file, past headings', () => {
    const list = [{ title: 'A' }, { title: 'heading', divider: true }, { title: 'B' }]
    expect(nextSet(list, list[0])?.title).toBe('B')
    expect(nextSet(list, list[2])).toBeNull()
    expect(nextSet(list, null)).toBeNull()
  })

  it('goes by stage past a side set, and by file order without stages', () => {
    const list = ['25 - 32', 'PS Swap', '32 - 40', 'Endgame', 'Mageblood'].map(title => ({ title }))
    expect(nextSet(list, list[0])?.title).toBe('32 - 40')
    expect(nextSet(list, list[2])?.title).toBe('Endgame')
    expect(nextSet(list, list[1])?.title).toBe('32 - 40')
    expect(nextSet(list, list[3])?.title).toBe('Mageblood')
  })

  it('says which gems come and go', () => {
    expect(gemChange(set('A', ['Arc', 'Frostbite']), set('B', ['Arc', 'Spark']))).toEqual({ add: ['Spark'], drop: ['Frostbite'] })
  })

  it('lists gear slots that change, in inventory order, and tells rares apart by mods', () => {
    const item = (name: string, mods: string[]) => ({ rarity: 'RARE', name, base: 'Heavy Belt', sockets: '', implicits: [], mods }) as never
    const from = { title: 'A', isActive: false, slots: [{ slot: 'Belt', item: item('New Item', ['+10 to Life']) }, { slot: 'Weapon 1', item: item('X', []) }, { slot: 'Helmet', item: item('H', []) }] }
    const to = { title: 'B', isActive: false, slots: [{ slot: 'Belt', item: item('New Item', ['+50 to Life']) }, { slot: 'Weapon 1', item: item('Y', []) }, { slot: 'Helmet', item: item('H', []) }] }
    expect(gearChange(from, to).map(c => c.slot)).toEqual(['Weapon 1', 'Belt'])
  })

  it('leaves out items changing slot, and sees sockets changing', () => {
    const item = (name: string, sockets = '') => ({ rarity: 'UNIQUE', name, base: 'B', sockets, implicits: [], mods: [] }) as never
    const moved = gearChange(
      { title: 'A', isActive: false, slots: [{ slot: 'Ring 1', item: item('X') }, { slot: 'Ring 2', item: item('Y') }] },
      { title: 'B', isActive: false, slots: [{ slot: 'Ring 1', item: item('Y') }, { slot: 'Ring 2', item: item('X') }] }
    )
    expect(moved).toEqual([])
    const relinked = gearChange(
      { title: 'A', isActive: false, slots: [{ slot: 'Helmet', item: item('X', 'R-G') }] },
      { title: 'B', isActive: false, slots: [{ slot: 'Helmet', item: item('X', 'R-R') }] }
    )
    expect(relinked.map(c => c.slot)).toEqual(['Helmet'])
  })
})

describe('tree jewels', () => {
  it('reads the jewels socketed in each tree', () => {
    const d = parseBuild(`<PathOfBuilding><Build level="95"></Build>
      <Tree activeSpec="1"><Spec title="A" nodes="1,2,3"><Sockets><Socket nodeId="5" itemId="7"/><Socket nodeId="6" itemId="0"/></Sockets></Spec></Tree>
      <Items><Item id="7">Rarity: UNIQUE
Watcher's Eye
Prismatic Jewel
Implicits: 0
+1 to Strength</Item></Items>
    </PathOfBuilding>`)
    expect(d.trees[0].jewels.map(j => j.name)).toEqual(["Watcher's Eye"])
  })
})

describe('where a gem comes from, for a gem tooltip', () => {
  it('names the quest reward and the first vendor for the build class', () => {
    expect(gemWhere('Ruthless', 'Slayer')).toBe('Reward: Mercy Mission (Act 1)\nBuy from Nessa: Mercy Mission (Act 1)')
  })
  it('leaves out a reward the class does not get', () => {
    expect(gemWhere('Frostblink', 'Slayer')).toBe('Buy from Nessa: Breaking Some Eggs (Act 1)')
  })
  it('says when the campaign does not hand it out', () => {
    expect(gemWhere('Kinetic Blast of Clustering', 'Witch')).toBe('Not in the campaign: buy or drop')
    expect(gemWhere('Not A Gem', 'Witch')).toBe('')
  })
})
