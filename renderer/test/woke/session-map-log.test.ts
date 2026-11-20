// Log lines are in the real Client.txt's shape (see death-recap.test.ts).
import { describe, expect, it } from 'vitest'
import { MapLog, keepMap, npcOf, tierText, usualMapMs } from '@/web/woke/session-story/map-log'
import type { MapRecord } from '@/web/woke/session-story/map-log'

const stamp = (time: string) => `2026/11/05 ${time} 18884906 1186a8a3`
const area = (time: string, id: string, seed: string, level = 83) =>
  `${stamp(time)} [DEBUG Client 34092] Generating level ${level} area "${id}" with seed ${seed}`
const info = (time: string, text: string) => `${stamp(time)} [INFO Client 34092] ${text}`
const entered = (time: string, name: string) => info(time, `: You have entered ${name}.`)
const slain = (time: string, who = 'whekq') => info(time, `: ${who} has been slain.`)
const level = (time: string, n: number, who = 'whekq') => info(time, `: ${who} (Gladiator) is now level ${n}`)
const say = (time: string, who: string) => info(time, `${who}: Hello there.`)

function follow (lines: string[]) {
  const left: MapRecord[] = []
  const done: MapRecord[] = []
  const log = new MapLog({ onLeave: r => { left.push({ ...r, npcs: [...r.npcs] }) }, onDone: r => { done.push(r) } })
  for (const line of lines) log.feed(line, 0)
  return { log, left, done }
}

describe('maps from Client.txt', () => {
  it('reads time, deaths, NPCs and level-ups for one map, across a portal and a side area', () => {
    const { log, left, done } = follow([
      level('20:59:00', 94),
      area('21:00:00', 'HideoutChurch', '1', 68),
      area('21:02:00', 'MapWorldsStrand', '11'),
      entered('21:02:01', 'Strand'),
      say('21:03:00', 'Einhar, Beastmaster'),
      say('21:03:10', 'Strange Voice'),
      slain('21:04:00'),
      slain('21:04:30', 'friend'),
      level('21:05:00', 95),
      level('21:05:10', 40, 'friend'),
      area('21:06:00', 'HideoutChurch', '1', 68),
      area('21:07:00', 'MapWorldsStrand', '11'),
      area('21:08:00', 'MapSideArea1', '12'),
      area('21:09:00', 'MapWorldsStrand', '11'),
      area('21:10:00', 'HideoutChurch', '1', 68),
      area('21:11:00', 'MapWorldsCemetery', '13')
    ])
    expect(left.map(r => r.mapMs)).toEqual([4 * 60_000, 7 * 60_000])
    expect(done).toHaveLength(1)
    expect(done[0]).toMatchObject({ name: 'Strand', areaLevel: 83, deaths: 1, npcs: ['Einhar', 'Delirium'], char: 'whekq', charLevel: 94, levelsGained: 1 })
    expect(log.current?.name).toBe('Cemetery')
    expect(log.current?.charLevel).toBe(95)
  })

  it('learns the character from a level-up inside the first map', () => {
    const { log } = follow([area('21:02:00', 'MapWorldsStrand', '11'), level('21:03:00', 90)])
    expect(log.current).toMatchObject({ char: 'whekq', charLevel: 89, levelsGained: 1 })
  })

  it('names NPCs and tiers', () => {
    expect(npcOf('Niko, Master of the Depths')).toBe('Niko')
    expect(npcOf('Tujen, the Haggler')).toBe('Expedition')
    expect(npcOf('Merveil')).toBeNull()
    expect(tierText(83)).toBe('T16')
    expect(tierText(84)).toBe('Level 84')
  })

  it('averages recent maps and keeps one copy each', () => {
    const m = (ms: number, at: number) => ({ key: `k${at}`, enteredAt: at, mapMs: ms } as MapRecord)
    expect(usualMapMs([m(60_000, 3), m(120_000, 2)])).toBeNull()
    expect(usualMapMs([m(60_000, 3), m(120_000, 2), m(180_000, 1)])).toBe(120_000)
    expect(keepMap(keepMap([m(1, 1)], m(2, 2)), m(3, 2)).map(x => x.mapMs)).toEqual([3, 1])
  })
})
