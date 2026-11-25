// Log lines are in the real Client.txt's shape (see death-recap.test.ts).
import { afterEach, describe, expect, it } from 'vitest'
import { NightTracker, NIGHT_GAP_MS, bestDrop, bestItem, farmingProfit, hasMaps, keepNight, summarize } from '@/web/woke/session-story/story'
import { isSkippedArea, parseSkipAreas, setSkipAreas } from '@/web/woke/session-story/skip-areas'
import type { NightDraft, NightStory } from '@/web/woke/session-story/story'

const stamp = (time: string) => `2026/11/05 ${time} 18884906 1186a8a3`
const area = (time: string, id: string, seed: string, level = 83) =>
  `${stamp(time)} [DEBUG Client 34092] Generating level ${level} area "${id}" with seed ${seed}`
const info = (time: string, text: string) => `${stamp(time)} [INFO Client 34092] ${text}`
const entered = (time: string, name: string) => info(time, `: You have entered ${name}.`)
const slain = (time: string, who = 'luminyahu') => info(time, `: ${who} has been slain.`)
const at = (time: string) => new Date(`2026-11-05T${time}`).getTime()

function follow (lines: string[]) {
  const done: NightDraft[] = []
  const tracker = new NightTracker((d) => { done.push(d) })
  for (const line of lines) tracker.feed(line, 0)
  return { tracker, done }
}

const NIGHT = [
  area('21:00:00', 'HideoutChurch', '1', 68),
  entered('21:00:01', 'Ghostly Shrine'),
  area('21:02:00', 'MapWorldsStrand', '11'),
  entered('21:02:01', 'Strand'),
  slain('21:05:00'),
  area('21:08:00', 'HideoutChurch', '1', 68),
  // Back into the same Strand through a portal: still one map.
  area('21:09:00', 'MapWorldsStrand', '11'),
  area('21:10:00', 'MapSideArea1', '12'),
  area('21:11:00', 'MapWorldsStrand', '11'),
  area('21:12:00', 'HideoutChurch', '1', 68),
  area('21:14:00', 'MapWorldsCemetery', '13'),
  entered('21:14:01', 'Cemetery'),
  area('21:20:00', 'HideoutChurch', '1', 68),
  info('21:22:00', ': AFK mode is now ON.')
]

describe('AFK in a night', () => {
  const chat = (time: string) => info(time, '#Somebody: anyone selling a mirror?')
  const BASE = [
    area('21:00:00', 'HideoutChurch', '1', 68),
    area('21:02:00', 'MapWorldsStrand', '11'),
    area('21:10:00', 'HideoutChurch', '1', 68),
    info('21:12:00', ': AFK mode is now ON. Autoreply "brb"')
  ]

  it('leaves a short AFK out of the time, and chat while AFK does not count', () => {
    const { tracker, done } = follow([...BASE, chat('21:15:00'), chat('21:20:00'), info('21:22:00', ': AFK mode is now OFF.'), area('21:24:00', 'MapWorldsCemetery', '13'), area('21:30:00', 'HideoutChurch', '1', 68)])
    expect(done).toHaveLength(0)
    const s = summarize(tracker.draft!)
    expect(s.afkMs).toBe(10 * 60_000)
    // Hideout: 2 before Strand, 2 before AFK, 2 after it.
    expect(s.otherMs).toBe(6 * 60_000)
    expect(s.hubMs).toBe(6 * 60_000)
    expect(s.strip.map(p => p.afk ? 'afk' : p.map)).toEqual([null, 0, null, 'afk', null, 1])
    // AFK isn't a break: hideout 2 + 2 between the maps.
    expect(s.longestBreakMs).toBe(4 * 60_000)
    expect(s.strip.reduce((n, p) => n + p.ms, 0)).toBe(at('21:30:00') - at('21:00:00'))
  })

  it('ends the night after 15 minutes AFK, even with chat going', () => {
    const { tracker, done } = follow([...BASE, chat('21:20:00'), chat('21:26:00'), chat('21:30:00'), info('21:35:00', ': AFK mode is now OFF.'), area('21:40:00', 'MapWorldsCemetery', '13')])
    expect(done).toHaveLength(1)
    expect(summarize(done[0]).endedAt).toBe(at('21:12:00'))
    expect(summarize(done[0]).afkMs).toBe(0)
    expect(tracker.draft!.startedAt).toBe(at('21:40:00'))
  })

  it('a quiet tick ends a night that went AFK 15 minutes ago', () => {
    const { tracker, done } = follow([...BASE, chat('21:20:00')])
    tracker.tick(at('21:12:00') + NIGHT_GAP_MS)
    expect(done).toHaveLength(1)
    expect(tracker.draft).toBeNull()
  })

  it('draws AFK inside a map where it happened, and it is no break', () => {
    const lines = [area('21:00:00', 'MapWorldsStrand', '11'), info('21:02:00', ': AFK mode is now ON.'), info('21:10:00', ': AFK mode is now OFF.'),
      area('21:15:00', 'HideoutChurch', '1', 68), area('21:17:00', 'MapWorldsCemetery', '13'), area('21:20:00', 'HideoutChurch', '1', 68)]
    const s = summarize(follow(lines).tracker.draft!)
    expect(s.strip.map(p => [p.afk ? 'afk' : p.map, p.ms / 60_000])).toEqual([[0, 2], ['afk', 8], [0, 5], [null, 2], [1, 3]])
    expect(s.maps[0].mapMs).toBe(7 * 60_000)
    expect(s.longestBreakMs).toBe(2 * 60_000)
  })

  it('counts AFK still going on a live night', () => {
    const { tracker } = follow(BASE)
    expect(summarize(tracker.draft!, at('21:17:00')).afkMs).toBe(5 * 60_000)
  })
})

describe('a night from Client.txt', () => {
  it('counts each map instance once, with its time, side areas and deaths', () => {
    const { tracker } = follow(NIGHT)
    const s = summarize(tracker.draft!)
    expect(s.maps.map(m => m.name)).toEqual(['Strand', 'Cemetery'])
    expect(s.maps[0].mapMs).toBe(at('21:08:00') - at('21:02:00') + at('21:12:00') - at('21:09:00'))
    expect(s.maps[0].deaths).toBe(1)
    expect(s.maps[1].mapMs).toBe(6 * 60_000)
    expect(s.otherMs).toBe(2 * 60_000 + 60_000 + 2 * 60_000 + 2 * 60_000)
    expect(s.endedAt).toBe(at('21:22:00'))
    expect(s.deathsAt).toEqual([at('21:05:00')])
    // Strip: hideout, Strand, hideout, Strand, hideout, Cemetery, hideout.
    expect(s.strip.map(p => p.map)).toEqual([null, 0, null, 0, null, 1, null])
  })

  it('ends after a quiet gap, and a later zone starts a new night', () => {
    const later = new Date(at('21:22:00') + NIGHT_GAP_MS + 60_000)
    const t = `${String(later.getHours()).padStart(2, '0')}:${String(later.getMinutes()).padStart(2, '0')}:00`
    const { tracker, done } = follow([...NIGHT, area(t, 'MapWorldsGrotto', '20')])
    expect(done).toHaveLength(1)
    expect(summarize(done[0]).maps).toHaveLength(2)
    expect(tracker.draft!.startedAt).toBe(at(t))
  })

  it('ends when the game opens a new log section and nothing comes after', () => {
    const { tracker, done } = follow([...NIGHT, `${stamp('21:23:00')} ***** LOG FILE OPENING *****`])
    expect(done).toHaveLength(0)
    tracker.tick(tracker.draft!.lastAt + NIGHT_GAP_MS)
    expect(done).toHaveLength(1)
    expect(tracker.draft).toBeNull()
  })

  it('goes on after a crash mid-map when you are back in it soon', () => {
    // Guy's Client.txt, 2026-11-20: Fortress, a crash, back into the same seed.
    const { tracker, done } = follow([
      area('23:50:00', 'MapWorldsFortress', '390826414'),
      info('23:51:40', '[SHADER] Delay: OFF'),
      `${stamp('23:51:44')} ***** LOG FILE OPENING *****`,
      area('23:52:00', 'HideoutChurch', '1', 68),
      area('23:52:10', 'MapWorldsFortress', '390826414'),
      area('23:53:40', 'HideoutChurch', '1', 68)
    ])
    expect(done).toHaveLength(0)
    const s = summarize(tracker.draft!)
    expect(s.maps).toHaveLength(1)
    // 1:40 before the crash, 1:30 after; the time closed isn't map time.
    expect(s.maps[0].mapMs).toBe(190_000)
  })

  it("counts only your own deaths, not a party member's", () => {
    const done: NightDraft[] = []
    const tracker = new NightTracker((d) => { done.push(d) }, () => 'luminyahu')
    for (const line of [area('21:00:00', 'MapWorldsStrand', '11'), slain('21:01:00', 'friend'), slain('21:02:00', 'friend'), slain('21:03:00')]) tracker.feed(line, 0)
    expect(summarize(tracker.draft!).deathsAt).toHaveLength(1)
  })

  it('keeps encounters and towers inside a map as that map', () => {
    const { tracker } = follow([
      area('22:00:00', 'MapWorldsStrand', '31'),
      area('22:03:00', 'MapAtlasEncounterBoss', '32'),
      area('22:05:00', 'MapWorldsStrand', '31'),
      area('22:06:00', 'HideoutChurch', '1', 68)
    ])
    const s = summarize(tracker.draft!)
    expect(s.maps).toHaveLength(1)
    expect(s.maps[0].mapMs).toBe(6 * 60_000)
  })

  it('counts a side area you portal back into from the hideout as its map', () => {
    const { tracker } = follow([
      area('22:00:00', 'MapWorldsStrand', '31'),
      area('22:02:00', 'MapSideArea1', '32'),
      area('22:03:00', 'HideoutChurch', '1', 68),
      area('22:05:00', 'MapSideArea1', '32'),
      area('22:06:00', 'HideoutChurch', '1', 68)
    ])
    const s = summarize(tracker.draft!, at('22:06:00'))
    expect(s.maps).toHaveLength(1)
    expect(s.maps[0].mapMs).toBe(4 * 60_000)
    expect(s.otherMs).toBe(2 * 60_000)
  })

  it('marks a night that ended because the game restarted', () => {
    const { tracker, done } = follow([...NIGHT, `${stamp('21:23:00')} ***** LOG FILE OPENING *****`])
    tracker.tick(tracker.draft!.lastAt + NIGHT_GAP_MS)
    expect(summarize(done[0]).endedByOpening).toBe(true)
    // Ended by a quiet spell after the restart's next line: not by the restart.
    const quiet = follow([...NIGHT, `${stamp('21:23:00')} ***** LOG FILE OPENING *****`, area('21:24:00', 'HideoutChurch', '1', 68)])
    quiet.tracker.tick(quiet.tracker.draft!.lastAt + NIGHT_GAP_MS)
    expect(summarize(quiet.done[0]).endedByOpening).toBeFalsy()
  })

  it('skips a night with no maps', () => {
    const { tracker, done } = follow([area('10:00:00', 'HideoutChurch', '1', 68)])
    tracker.tick(at('10:00:00') + NIGHT_GAP_MS)
    expect(done).toHaveLength(0)
    expect(tracker.draft).toBeNull()
  })
})

describe('night extras', () => {
  it('picks the biggest stash gain inside the night', () => {
    const diffs = [
      { at: 5, added: [{ name: 'Divine Orb', count: 3, chaos: 600 }] },
      { at: 50, added: [{ name: 'Mirror Shard', count: 1, chaos: 9000 }] },
      { at: 10, added: [{ name: 'Forbidden Flame', count: 1, chaos: 800 }, { name: 'Chaos Orb', count: 40, chaos: 40 }] }
    ]
    expect(bestDrop(diffs, 0, 20)).toEqual({ name: 'Forbidden Flame', chaos: 800, item: 'Forbidden Flame' })
    // The item's own name too, for its tooltip.
    expect(bestDrop(diffs, 0, 6)).toEqual({ name: '3 × Divine Orb', chaos: 600, item: 'Divine Orb' })
    expect(bestItem({ name: '3 × Divine Orb' })).toBe('Divine Orb')
    // The item's tooltip name, not its stash label.
    expect(bestDrop([{ at: 1, added: [{ name: 'Headhunter 6L', tip: 'Headhunter', count: 1, chaos: 9000 }] }], 0, 2)?.item).toBe('Headhunter')
    expect(bestDrop([], 0, 20)).toBeNull()
  })

  it('reads level-ups and the longest break between maps', () => {
    const level = (time: string, n: number) => info(time, `: whekq (Gladiator) is now level ${n}`)
    const { tracker } = follow([...NIGHT.slice(0, 5), level('21:06:00', 94), ...NIGHT.slice(5), level('21:21:00', 95), info('21:21:30', ': friend (Witch) is now level 40')])
    const s = summarize(tracker.draft!)
    expect(s.levelUps).toEqual([{ char: 'whekq', from: 93, to: 95 }])
    // Gaps between maps: 1 min, 1 min, 2 min; not the 2 min before the first or after the last.
    expect(s.longestBreakMs).toBe(2 * 60_000)
  })

  it('adds up Farming sessions inside the night', () => {
    const H = 3_600_000
    const night = { startedAt: 10 * H, endedAt: 14 * H }
    const list = [{ startedAt: 10.5 * H, endedAt: 12 * H, profit: 300 }, { startedAt: 13 * H, endedAt: 16 * H, profit: -50 }, { startedAt: 2 * H, endedAt: 11 * H, profit: 99 }]
    expect(farmingProfit(night, null, list)).toEqual({ chaos: 250, sessions: 2 })
    // A session that started in the next night is that night's only.
    expect(farmingProfit(night, 12.9 * H, list)).toEqual({ chaos: 300, sessions: 1 })
    expect(farmingProfit(night, null, [])).toBeNull()
  })

  it('keeps nights newest first, one copy each', () => {
    const n = (id: number) => ({ id: String(id), startedAt: id } as unknown as NightStory)
    const kept = keepNight(keepNight([n(1), n(3)], n(2)), n(3))
    expect(kept.map(k => k.id)).toEqual(['3', '2', '1'])
  })
})

describe('areas on the skip list', () => {
  // Zealot's Vault is MapWorldsMemoryVault2 in a real Client.txt.
  const VAULT_NIGHT = [
    area('21:00:00', 'HideoutChurch', '1', 68),
    area('21:02:00', 'MapWorldsStrand', '11'),
    entered('21:02:01', 'Strand'),
    area('21:08:00', 'HideoutChurch', '1', 68),
    area('21:10:00', 'MapWorldsMemoryVault2', '21', 84),
    entered('21:10:01', "Zealot's Vault"),
    slain('21:11:00'),
    area('21:12:00', 'HideoutChurch', '1', 68),
    area('21:14:00', 'MapWorldsCemetery', '13'),
    entered('21:14:01', 'Cemetery'),
    area('21:20:00', 'HideoutChurch', '1', 68),
    info('21:22:00', ': AFK mode is now ON.')
  ]
  afterEach(() => { setSkipAreas(undefined) })

  it('leaves a vault out of the maps and its deaths, and counts its time as out of maps', () => {
    const s = summarize(follow(VAULT_NIGHT).tracker.draft!)
    expect(s.maps.map(m => m.name)).toEqual(['Strand', 'Cemetery'])
    expect(s.mapMs).toBe(12 * 60_000)
    // Out of maps: 2 before Strand, 2 + 2 around the vault, the vault's 2, 2 at the end.
    expect(s.otherMs).toBe(10 * 60_000)
    // Hideout, Strand, hideout, vault, hideout, Cemetery, hideout: the strip still adds up to the clock.
    expect(s.strip.map(p => p.skipped ? 'vault' : p.map)).toEqual([null, 0, null, 'vault', null, 1, null])
    expect(s.strip.reduce((n, p) => n + p.ms, 0)).toBe(at('21:22:00') - at('21:00:00'))
    // Hideout, vault, hideout between the two maps: one 6-minute break.
    expect(s.longestBreakMs).toBe(6 * 60_000)
    expect(s.deathsAt).toEqual([])
  })

  it('knows a vault by its area id, without the English entry line', () => {
    const s = summarize(follow(VAULT_NIGHT.filter(l => !l.includes("Zealot's Vault"))).tracker.draft!)
    expect(s.maps.map(m => m.name)).toEqual(['Strand', 'Cemetery'])
  })

  it('counts it again once taken off the list, and takes any area added by name', () => {
    setSkipAreas([])
    expect(summarize(follow(VAULT_NIGHT).tracker.draft!).maps).toHaveLength(3)
    setSkipAreas(['  cemetery '])
    expect(summarize(follow(VAULT_NIGHT).tracker.draft!).maps.map(m => m.name)).toEqual(['Strand', "Zealot's Vault"])
  })

  it('has no maps when the night was only vaults', () => {
    const d = follow(VAULT_NIGHT.slice(3, 8)).tracker.draft!
    expect(hasMaps(d)).toBe(false)
  })

  it('reads the list as typed', () => {
    expect(parseSkipAreas("Zealot's Vault, scholar's vault\n\n zealot's vault \nArkhon’s Vault")).toEqual(["Zealot's Vault", "scholar's vault", 'Arkhon’s Vault'])
    expect(isSkippedArea('Arkhon’s Vault')).toBe(true)
    expect(isSkippedArea('Vault')).toBe(false)
  })
})
