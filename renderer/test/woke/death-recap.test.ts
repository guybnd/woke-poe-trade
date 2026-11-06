// Log lines are in the real Client.txt's shape, checked against Guy's log.
import { describe, expect, it } from 'vitest'
import { DeathTracker, areaName, deathGroup, levelFits, matchCheck, modDeathStats, ordinal, shortTime, slainName } from '@/web/woke/death-recap/death-log'
import { parseAreaModLines } from '@/web/woke/death-recap/area-list'
import { TooltipMatcher } from '@/web/woke/map-mods/tooltip-parse'
import type { DeathRecord, MapCheck, MapEntry, RunRecord } from '@/web/woke/death-recap/death-log'

const stamp = (time: string) => `2026/11/05 ${time} 18884906 1186a8a3`
const area = (time: string, id: string, seed: string, level = 83) =>
  `${stamp(time)} [DEBUG Client 34092] Generating level ${level} area "${id}" with seed ${seed}`
const info = (time: string, text: string) => `${stamp(time)} [INFO Client 34092] ${text}`
const entered = (time: string, name: string) => info(time, `: You have entered ${name}.`)
const slain = (time: string, who = 'luminyahu') => info(time, `: ${who} has been slain.`)

function follow (lines: string[]) {
  const maps: MapEntry[] = []
  const deaths: Array<Omit<DeathRecord, 'nth'>> = []
  const tracker = new DeathTracker({
    onMap: (m) => { maps.push(m) },
    onDeath: (d) => { deaths.push(d) }
  })
  for (const line of lines) tracker.feed(line, 0)
  return { maps, deaths }
}

describe('reading deaths from Client.txt', () => {
  it('only takes the system line, never chat', () => {
    expect(slainName(slain('15:27:12'))).toBe('luminyahu')
    expect(slainName(info('15:27:12', 'luminyahu: has been slain.'))).toBeNull()
    expect(slainName(info('15:27:12', '#luminyahu: bob has been slain.'))).toBeNull()
    expect(slainName(info('15:27:12', '&<GUILD> bob: alice has been slain.'))).toBeNull()
    expect(slainName(info('15:27:12', ': You have died 28 times.'))).toBeNull()
  })

  it('knows the map, the visit and the last voice, on the Nov 5 double death', () => {
    const { maps, deaths } = follow([
      area('15:25:13', 'MapWorldsBeach', '3173804991', 85),
      entered('15:25:15', 'Beach'),
      info('15:26:58', 'The Maven: Show me.'),
      slain('15:27:12'),
      area('15:27:14', 'HideoutArenaSearingExarch', '1', 60),
      entered('15:27:16', 'Searing Hideout'),
      area('15:27:18', 'MapWorldsBeach', '3173804991', 85),
      entered('15:27:19', 'Beach'),
      info('15:27:21', 'The Searing Exarch: Burn.'),
      slain('15:27:24')
    ])
    expect(maps.map(m => m.returned)).toEqual([false, true])
    expect(deaths).toHaveLength(2)
    expect(deaths[0]).toMatchObject({
      character: 'luminyahu',
      name: 'Beach',
      level: 85,
      key: 'MapWorldsBeach:3173804991',
      runKey: 'MapWorldsBeach:3173804991',
      returned: false,
      sinceEnterMs: 119_000,
      voice: { name: 'The Maven', msBefore: 14_000 }
    })
    expect(deaths[1]).toMatchObject({ returned: true, sinceEnterMs: 6000, voice: { name: 'The Searing Exarch', msBefore: 3000 } })
  })

  it('keeps out log lines that look like speech, your own speech and old voices', () => {
    const { deaths } = follow([
      area('15:00:00', 'MapWorldsBeach', '7'),
      entered('15:00:01', 'Beach'),
      info('15:00:02', 'Vraxa, the Detached: Rot.'),
      info('15:00:05', 'luminyahu: Your death is a mercy.'),
      info('15:00:06', '[LOADING SCREEN] (Beach) Duration: 300ms'),
      info('15:00:06', 'Successfully allocated passive skill id: atlas_path_1'),
      `${stamp('15:00:06')} [DEBUG Client 34092] ALTERNATE TREE JEWEL: Applying modifications`,
      `${stamp('15:00:06')} [CRIT Client 34092] [Art/Models/Pet/WhiteTiger/rig.ast] Bone: phys_skinned`,
      slain('15:00:07'),
      area('15:01:00', 'HideoutArenaSearingExarch', '1', 60),
      area('15:01:10', 'MapWorldsBeach', '7'),
      info('15:01:11', 'Vraxa, the Detached: Rot.'),
      slain('15:03:00')
    ])
    expect(deaths[0].voice).toEqual({ name: 'Vraxa, the Detached', msBefore: 5000 })
    expect(deaths[1].voice).toBeNull()
  })

  it('counts a Vaal side area as the map, and a hideout or campaign zone as no map', () => {
    const { deaths } = follow([
      area('15:00:00', 'MapWorldsBeach', '7'),
      entered('15:00:01', 'Beach'),
      area('15:01:00', 'MapSideArea_Vaal', '9'),
      slain('15:01:30'),
      area('15:02:00', 'HideoutArenaSearingExarch', '1', 60),
      slain('15:02:30'),
      area('15:03:00', '1_2_3', '5', 20),
      slain('15:03:30')
    ])
    expect(deaths.map(d => d.runKey)).toEqual(['MapWorldsBeach:7', null, null])
  })

  it('keeps the run through map-launched encounter and tower areas, without counting a new map', () => {
    const { maps, deaths } = follow([
      area('15:00:00', 'MapWorldsBeach', '7'),
      entered('15:00:01', 'Beach'),
      area('15:01:00', 'MapAtlasEncounter_Foo', '8'),
      entered('15:01:01', 'Foo'),
      slain('15:01:30'),
      area('15:02:00', 'ChayulaLeagueTowerBoss', '9'),
      slain('15:02:30')
    ])
    expect(maps).toHaveLength(1)
    expect(deaths.map(d => d.runKey)).toEqual(['MapWorldsBeach:7', 'MapWorldsBeach:7'])
    expect(deathGroup(deaths[0])).toBe(deathGroup(deaths[1]))
    expect(deathGroup({ ...deaths[0], character: 'friend' })).not.toBe(deathGroup(deaths[0]))
  })

  it('ignores a death before any area is known', () => {
    expect(follow([slain('15:00:00')]).deaths).toHaveLength(0)
  })
})

describe('matching a check to the map', () => {
  const at = 1_000_000_000
  const check = (name: string, ago: number, tier: number | undefined = 16): MapCheck =>
    ({ at: at - ago, name, tier, mods: [{ matcher: 'A' }], unknown: [] })
  const map = { name: 'Beach', level: 83, at }

  it('calls a single recent check exact', () => {
    expect(matchCheck([check('Beach', 60_000)], map)).toMatchObject({ match: 'exact', candidates: 1 })
  })

  it('calls several, or an old one, likely, and takes the last checked', () => {
    const newest = check('Beach', 60_000)
    expect(matchCheck([check('Beach', 120_000), newest], map)).toMatchObject({ check: newest, match: 'likely', candidates: 2 })
    expect(matchCheck([check('Beach', 40 * 60_000)], map)).toMatchObject({ match: 'likely', candidates: 1 })
  })

  it('refuses another name, a wrong level, a check after entering, and a very old check', () => {
    expect(matchCheck([check('Strand', 1000)], map)).toBeNull()
    expect(matchCheck([check('Beach', 1000, 10)], map)).toBeNull()
    expect(matchCheck([check('Beach', -60_000)], map)).toBeNull()
    expect(matchCheck([check('Beach', 13 * 60 * 60_000)], map)).toBeNull()
  })

  it('reads the same area from item and log names', () => {
    expect(areaName('Blighted Beach Map')).toBe(areaName('Beach'))
    expect(levelFits(10, 77)).toBe(true)
    expect(levelFits(10, 83)).toBe(false)
    expect(levelFits(16, 83)).toBe(true)
    expect(levelFits(17, 85)).toBe(true)
    expect(levelFits(16, 77)).toBe(false)
  })
})

describe('mods you die to', () => {
  const run = (key: string, ...mods: string[]): RunRecord =>
    ({ key, name: 'Beach', level: 83, at: 0, match: 'exact', mods: mods.map(matcher => ({ matcher })) })
  const death = (runKey: string | null, i: number): DeathRecord => ({
    id: `${runKey}:${i}`,
    at: i,
    character: 'a',
    areaId: 'x',
    key: runKey ?? 'x',
    runKey,
    name: 'Beach',
    level: 83,
    nth: 1,
    sinceEnterMs: 0,
    returned: false,
    voice: null
  })

  it('shows only mods above the usual rate with at least 2 deaths', () => {
    const stats = modDeathStats(
      [run('r1', 'bad', 'mild'), run('r2', 'bad', 'mild'), run('r3', 'mild'), run('r4', 'once'), run('r5', 'safe')],
      [death('r1', 1), death('r1', 2), death('r2', 3), death('r4', 4), death(null, 5), death('gone', 6)]
    )
    expect(stats).toMatchObject({ maps: 5, deaths: 4, usual: 0.8 })
    expect(stats.rows.map(r => r.matcher)).toEqual(['bad', 'mild'])
    expect(stats.rows[0]).toMatchObject({ deaths: 3, maps: 2, rate: 1.5 })
  })

  it('ignores maps with no check', () => {
    const noMods: RunRecord = { key: 'r', name: 'Beach', level: 83, at: 0 }
    expect(modDeathStats([noMods], [death('r', 1)])).toMatchObject({ maps: 0, deaths: 0, rows: [] })
  })
})

it('formats', () => {
  expect([1, 2, 3, 4, 11, 12, 13, 21].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st'])
  expect([5000, 117_000, 3_720_000].map(shortTime)).toEqual(['5s', '1:57', '1h 02m'])
})

describe('the game mod list', () => {
  const matcher = new TooltipMatcher(['Area contains many Totems', 'Players are Cursed with Elemental Weakness'])

  it('keeps the mods and leaves out the totals and Area is corrupted', () => {
    const { mods, weak } = parseAreaModLines([
      'Area contains many Totems',
      'Players are Cursed with Elemental Weakness',
      '179% increased Quantity of Items found in this Area',
      '82% increased Rarity of Items found in this Area',
      '54% increased Pack size',
      'Area is corrupted'
    ], matcher)
    expect(mods.map(m => m.matcher)).toEqual(['Area contains many Totems', 'Players are Cursed with Elemental Weakness'])
    expect(weak).toEqual([])
  })

  it('drops a misread total that matched a mod, and keeps other quantity mods', () => {
    const data = new TooltipMatcher(['#% increased Pack size', '#% increased quantity of Artifacts dropped by Monsters'])
    const { mods } = parseAreaModLines(['547% increasfh Pack sive', '20% increased quantity of Artifacts dropped by Monsters'], data)
    expect(mods.map(m => m.matcher)).toEqual(['#% increased quantity of Artifacts dropped by Monsters'])
  })

  it('finds nothing in text that is no mod list', () => {
    expect(parseAreaModLines(['Area is corrupted', ''], matcher)).toEqual({ mods: [], weak: [] })
  })
})
