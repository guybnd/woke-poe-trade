// Modules that follow Client.txt: the campaign route, farming map counts,
// league mechanic detection and the lab. Driven by the recorded logs in
// testing/fixtures/client-logs.
import { describe, it, expect } from 'vitest'
import { fixture } from '../helpers/game-data'
import { parseLogLine, actFromAreaId, isTown } from '@/web/woke/campaign/log-parse'
import { pickStage, socketRegex } from '@/web/woke/pob-builds/build-model'
import { gemData } from '@/web/woke/pob-builds/gems'
import { bundledRoute, routeData } from '@/web/woke/campaign/route-data'
import { advanceOnEnter, resyncTo, DEFAULT_ROUTE_OPTIONS, xpMultiplier } from '@/web/woke/campaign/route-parse'
import type { RouteOptions } from '@/web/woke/campaign/route-parse'
import { countNewMap, isMapArea, isMapSideArea, newSession, onZoneChange, maybeAutoPause, AUTO_PAUSE_MS } from '@/web/woke/farming/farming'
import { mechanicForSpeaker } from '@/web/woke/mechanics/zone'
import { BOSS_AREAS, bossAreaIds } from '@/web/woke/shared/boss-areas'
import { BOSS_ARENAS, arenaBosses, zoneKind } from '@/web/woke/shared/zone'
import { BOSSES } from '@/web/woke/boss-runs/bosses'
import { mechanicForZone } from '@/web/woke/mechanics/data'
import { difficultyForAreaLevel, isPlazaArea, msUntilLabReset, PLAZA_ZONE, staleLayoutDate } from '@/web/woke/lab/lab'

function logLines (name: string): string[] {
  return fixture(`client-logs/${name}`).split('\n').filter(l => l && !l.startsWith('#'))
}

function logTime (line: string): number {
  return new Date(line.slice(0, 19).replace(/\//g, '-').replace(' ', 'T') + 'Z').getTime()
}

describe('Client.txt lines', () => {
  it('reads area, zone and level lines, and ignores chat and noise', () => {
    const events = logLines('campaign-act1.txt').map(parseLogLine).filter(Boolean)
    expect(events.some(e => e!.kind === 'area')).toBe(true)
    expect(events.some(e => e!.kind === 'zone')).toBe(true)
    const levels = events.filter(e => e!.kind === 'level')
    expect(levels.at(-1)).toMatchObject({ charName: 'WokeTester', className: 'Witch', level: 13 })
    expect(parseLogLine('2026/11/04 20:04:10 300250000 cff94598 [INFO Client 21088] @From TradeBot: Hi, is now level 99')).toBeNull()
  })

  it('area ids', () => {
    expect(actFromAreaId('1_1_7_1')).toBe(1)
    expect(actFromAreaId('2_6_town')).toBe(6)
    expect(actFromAreaId('MapWorldsStrand')).toBeNull()
    expect(isTown('1_1_town')).toBe(true)
    expect(pickStage([{ title: 'Level 12', isActive: false }, { title: 'Level 30', isActive: true }], 20, null)?.item.title).toBe('Level 12')
  })
})

describe('campaign route', () => {
  const OPTIONS: RouteOptions[] = [
    DEFAULT_ROUTE_OPTIONS,
    { leagueStart: false, library: false, bandit: 'alira' },
    { leagueStart: true, library: true, bandit: 'oak' }
  ]

  for (const opts of OPTIONS) {
    it(`covers acts 1-10 (${JSON.stringify(opts)})`, () => {
      const route = bundledRoute(opts)
      expect(route.steps.length).toBeGreaterThan(300)
      for (let act = 1; act <= 10; act++) expect(route.actStarts.has(act), `act ${act}`).toBe(true)
      // Every area the route names exists in the area data.
      const unknown = new Set<string>()
      for (const s of route.steps) for (const a of [s.areaBefore, s.areaAfter]) if (!routeData.areas[a]) unknown.add(a)
      expect([...unknown]).toEqual([])
    })

    // Walking the route as written (entering each next area) must take the
    // tracker from the first step to the last, never getting stuck.
    it(`following the route reaches the end (${JSON.stringify(opts)})`, () => {
      const route = bundledRoute(opts)
      let current = 0
      let stuck = 0
      for (const step of route.steps) {
        if (step.areaAfter !== step.areaBefore) {
          const next = advanceOnEnter(route, current, step.areaAfter, routeData)
          if (next <= current) stuck++
          current = Math.max(current, next)
        } else if (current === step.index) {
          current++ // a step done in place (talk to an NPC): ticked by hand
        }
      }
      expect(stuck).toBe(0)
      expect(current).toBeGreaterThanOrEqual(route.steps.length - 2)
    })
  }

  it('the recorded act 1 log moves the tracker into act 2', () => {
    const route = bundledRoute(DEFAULT_ROUTE_OPTIONS)
    let current = 0
    for (const line of logLines('campaign-act1.txt')) {
      const e = parseLogLine(line)
      if (e?.kind === 'area') current = advanceOnEnter(route, current, e.areaId, routeData)
    }
    expect(route.steps[current].act).toBe(2)
    // Re-syncing on the last area lands at the same place.
    expect(resyncTo(route, route.steps[current - 1].areaAfter)).toBeLessThanOrEqual(current)
  })

  it('XP penalty only past the safe range', () => {
    expect(xpMultiplier(30, 32)).toBe(1)
    expect(xpMultiplier(30, 45)).toBeLessThan(0.7)
  })
})

describe('farming', () => {
  it('counts each map instance once, not each portal back in', () => {
    const s = newSession('Strand alch', logTime(logLines('mapping-session.txt')[0]))
    let maps = 0
    for (const line of logLines('mapping-session.txt')) {
      const e = parseLogLine(line)
      if (e?.kind !== 'area') continue
      const inMap = isMapArea(e.areaId)
      onZoneChange(s, inMap, logTime(line))
      if (inMap && countNewMap(s, e.areaId, e.seed)) maps++
    }
    // Strand (twice, same seed) + Cemetery. Azurite Mine and the hideout aren't maps.
    expect(maps).toBe(2)
    expect(s.mapMs).toBeGreaterThan(0)
    expect(s.otherMs).toBeGreaterThan(0)
  })

  it('a Vaal side area is part of the map, not a new one', () => {
    const s = newSession('x', 0)
    let maps = 0
    const enter = (areaId: string, seed: string, at: number) => {
      const inMap = isMapArea(areaId)
      onZoneChange(s, inMap || isMapSideArea(areaId), at)
      if (inMap && countNewMap(s, areaId, seed)) maps++
    }
    enter('MapWorldsStrand', '11', 1000)
    enter('MapSideArea_VaalTemple', '22', 2000)
    enter('MapWorldsStrand', '11', 3000)
    enter('HideoutFelled', '33', 4000)
    expect(maps).toBe(1)
    // The side area's time is map time.
    expect(s.mapMs).toBe(3000)
  })

  it('a pinnacle boss fight is not a map', () => {
    expect(isMapArea('MapWorldsShapersRealm')).toBe(false)
    expect(isMapArea('MapWorldsPrimordialBoss3')).toBe(false)
    expect(isMapArea('MapWorldsElderArenaUber')).toBe(false)
    expect(isMapArea('MapWorldsCemetery')).toBe(true)
    expect(bossAreaIds('MapWorldsPrimordialBoss4')).toEqual(['eater', 'uber-eater'])
    expect(zoneKind('MapWorldsPrimordialBoss4', '')).toBe('boss')
    expect(arenaBosses('MapWorldsShapersRealm', "The Shaper's Realm")).toEqual(['shaper', 'uber-shaper'])
    // Area id and name pairs from real Client.txt logs.
    expect(arenaBosses('MapWorldsPrimordialBoss3', 'Absence of Patience and Wisdom')).toEqual(['exarch', 'uber-exarch'])
    expect(arenaBosses('MapWorldsPrimordialBoss4', 'Absence of Symmetry and Harmony')).toEqual(['eater', 'uber-eater'])
    expect(arenaBosses('MapWorldsPrimordialBoss1', 'Seething Chyme')).toEqual([])
    expect(arenaBosses('MapWorldsPrimordialBoss2', 'Polaric Void')).toEqual([])
    expect(zoneKind('MapWorldsPrimordialBoss2', 'Polaric Void')).toBe('boss')
    expect(arenaBosses('MavenHub', "The Maven's Crucible")).toEqual(['feared'])
    expect(Object.values(BOSS_ARENAS).flat().filter(id => !BOSSES.some(b => b.id === id))).toEqual([])
    // Every boss named exists in the boss list.
    const known = new Set(BOSSES.map(b => b.id))
    expect(Object.values(BOSS_AREAS).flat().filter(id => !known.has(id))).toEqual([])
  })

  it('knows a boss arena by area id first, since names can be shared', () => {
    // Pairs from real Client.txt logs.
    expect(arenaBosses('MapAtziri2', 'The Alluring Abyss')).toEqual(['uber-atziri'])
    expect(zoneKind('MapAtziri2', '')).toBe('boss')
    expect(zoneKind('', 'The Alluring Abyss')).toBe('boss')
    expect(isMapArea('MapAtziri2')).toBe(false)
    expect(arenaBosses('MapAtziri1', 'The Apex of Sacrifice')).toEqual(['atziri'])
    // The Shaper's Realm is also the Uber Elder's arena.
    expect(arenaBosses('MapWorldsElderArenaUber', "The Shaper's Realm")).toEqual(['uber-elder', 'uber-uber-elder'])
    expect(arenaBosses('MapWorldsShapersRealm', "The Shaper's Realm")).toEqual(['shaper', 'uber-shaper'])
    // Name only, before the area id is known.
    expect(arenaBosses('', 'The Alluring Abyss')).toEqual(['uber-atziri'])
    expect(arenaBosses('Unknown', 'The Alluring Abyss')).toEqual(['uber-atziri'])
    expect(arenaBosses('MapWorldsCemetery', 'Cemetery')).toEqual([])
    // Exarch and Eater arenas have something to show on the icon's card.
    for (const id of [...arenaBosses('MapWorldsPrimordialBoss3', ''), ...arenaBosses('MapWorldsPrimordialBoss4', '')]) {
      expect(BOSSES.find(b => b.id === id)!.drops.length).toBeGreaterThan(0)
    }
  })

  it('auto-pauses after idling, counting time only up to the limit', () => {
    const s = newSession('x', 0)
    onZoneChange(s, true, 1000)
    expect(maybeAutoPause(s, 1000 + AUTO_PAUSE_MS - 1)).toBe(false)
    expect(maybeAutoPause(s, 1000 + AUTO_PAUSE_MS + 60_000)).toBe(true)
    expect(s.elapsedMs).toBe(1000 + AUTO_PAUSE_MS)
    // The next zone change resumes it.
    onZoneChange(s, false, 2_000_000)
    expect(s.runningSince).toBe(2_000_000)
  })
})

describe('league mechanics', () => {
  it('knows the mechanic from the zone or an NPC talking', () => {
    const found: string[] = []
    for (const line of logLines('mapping-session.txt')) {
      const npc = mechanicForSpeaker(line)
      if (npc) { found.push(`npc:${npc}`); continue }
      const e = parseLogLine(line)
      if (e?.kind === 'area') {
        const m = mechanicForZone(e.areaId)
        if (m) found.push(`zone:${m.id}`)
      }
    }
    expect(found).toEqual(['npc:bestiary', 'zone:delve', 'npc:delve'])
  })

  it('knows the league NPCs by the names the game logs', () => {
    const say = (who: string) => mechanicForSpeaker(`2026/11/04 20:04:10 1 2 [INFO Client 1] ${who}: Exile!`)
    expect(say('Alva, Master Explorer')).toBe('incursion')
    expect(say('Jun, Veiled Master')).toBe('betrayal')
    expect(say('Niko, Master of the Depths')).toBe('delve')
    expect(say('Rog')).toBe('expedition')
  })

  it('player chat is never an NPC', () => {
    expect(mechanicForSpeaker('2026/11/04 20:04:10 1 2 [INFO Client 1] @From Einhar, Beastmaster: wtb')).toBeUndefined()
    expect(mechanicForSpeaker('2026/11/04 20:04:10 1 2 [INFO Client 1] #Einhar, Beastmaster: hi')).toBeUndefined()
  })
})

describe('lab', () => {
  it('picks the difficulty from the area level and spots the plaza', () => {
    const lines = logLines('lab-merciless.txt')
    const area = lines.map(parseLogLine).find(e => e?.kind === 'area')
    expect(area && area.kind === 'area' && difficultyForAreaLevel(area.areaLevel)).toBe('merciless')
    expect(lines.map(parseLogLine).some(e => e?.kind === 'zone' && e.name === PLAZA_ZONE)).toBe(true)
    // Recognised by area id, whatever the client language calls it.
    expect(area && area.kind === 'area' && isPlazaArea(area.areaId)).toBe(true)
    expect(isPlazaArea('EndGame_Labyrinth_Airlock')).toBe(true)
    expect(isPlazaArea('3_Labyrinth_boss_3')).toBe(false)
    expect(difficultyForAreaLevel(33)).toBe('normal')
    expect(difficultyForAreaLevel(55)).toBe('cruel')
    expect(difficultyForAreaLevel(75)).toBe('uber')
  })

  it('a Trial of Ascendancy in a map is not the lab', () => {
    expect(zoneKind('1_Labyrinth_Airlock', '')).toBe('lab')
    expect(zoneKind('EndGame_Labyrinth_trials_spikes', '')).not.toBe('lab')
    // Hubs that work like a town (Exile-UI's town check).
    expect(zoneKind('HeistHub', '')).toBe('town')
    expect(zoneKind('Menagerie', '')).toBe('town')
    expect(zoneKind('SanctumFoyer_1_1', '')).toBe('town')
    expect(zoneKind('HeistDungeon1', '')).not.toBe('town')
  })

  it('counts down to the daily reset (midnight UTC)', () => {
    expect(msUntilLabReset(Date.UTC(2026, 10, 4, 23, 0, 0))).toBe(3_600_000)
  })

  it("knows yesterday's layout by the lab day (UTC)", () => {
    const url = 'https://www.poelab.com/wp-content/labfiles/2026-11-04_uber.jpg'
    expect(staleLayoutDate(url, Date.UTC(2026, 10, 4, 23, 59))).toBeNull()
    expect(staleLayoutDate(url, Date.UTC(2026, 10, 5, 0, 1))).toBe('2026-11-04')
    expect(staleLayoutDate(null, Date.UTC(2026, 10, 5))).toBeNull()
  })
})

describe('build gems', () => {
  it('knows transfigured gems by their base gem', () => {
    expect(gemData('Kinetic Blast of Clustering')).toMatchObject({ name: 'Kinetic Blast of Clustering', colour: 'b', requiredLevel: 28, sources: [] })
    expect(gemData('Combustion')?.name).toBe('Combustion Support')
    expect(gemData('Not A Gem of Anything')).toBeNull()
  })

  it('searches for the 4-link when its colour orderings fit the 250-character box', () => {
    const s = socketRegex(['r', 'r', 'g', 'b'])
    expect(s).toMatchObject({ size: 4, exact: true })
    expect(s!.regex.split('|')).toHaveLength(12)
    expect(s!.regex).toContain('b-g-r-r')
  })
})
