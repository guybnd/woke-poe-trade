// Log lines are in the real Client.txt's shape (see death-recap.test.ts).
import { describe, expect, it } from 'vitest'
import { NightTracker, NIGHT_GAP_MS, bestDrop, keepNight, summarize } from '@/web/woke/session-story/story'
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

  it('ends when the game opens a new log section', () => {
    const { tracker, done } = follow([...NIGHT, `${stamp('21:23:00')} ***** LOG FILE OPENING *****`])
    expect(done).toHaveLength(1)
    expect(tracker.draft).toBeNull()
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

  it('marks a night that ended because the game restarted', () => {
    const { done } = follow([...NIGHT, `${stamp('21:23:00')} ***** LOG FILE OPENING *****`])
    expect(summarize(done[0]).endedByOpening).toBe(true)
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
    expect(bestDrop(diffs, 0, 20)).toEqual({ name: 'Forbidden Flame', chaos: 800 })
    expect(bestDrop(diffs, 0, 6)).toEqual({ name: '3 × Divine Orb', chaos: 600 })
    expect(bestDrop([], 0, 20)).toBeNull()
  })

  it('keeps nights newest first, one copy each', () => {
    const n = (id: number) => ({ id: String(id), startedAt: id } as unknown as NightStory)
    const kept = keepNight(keepNight([n(1), n(3)], n(2)), n(3))
    expect(kept.map(k => k.id)).toEqual(['3', '2', '1'])
  })
})
