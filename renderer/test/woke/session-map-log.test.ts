// Log lines are in the real Client.txt's shape (see death-recap.test.ts).
import { describe, expect, it } from 'vitest'
import { MapLog, keepMap, npcOf, tierText, usualMapMs } from '@/web/woke/session-story/map-log'
import { chipLines, compareMap } from '@/web/woke/session-story/chip'
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

  it('ends a map at its last line when the game restarts or goes quiet', () => {
    const { done } = follow([
      area('21:02:00', 'MapWorldsStrand', '11'),
      slain('21:04:00'),
      `${stamp('21:05:00')} ***** LOG FILE OPENING *****`,
      area('23:00:00', 'MapWorldsCemetery', '13'),
      area('23:01:00', 'HideoutChurch', '1', 68),
      area('23:40:00', 'HideoutChurch', '2', 68)
    ])
    expect(done.map(r => [r.name, r.mapMs])).toEqual([['Strand', 2 * 60_000], ['Cemetery', 60_000]])
  })

  it('follows a character switch outside maps, not a party member inside one', () => {
    const { log } = follow([
      level('20:00:00', 94),
      area('21:00:00', 'MapWorldsStrand', '11'),
      level('21:01:00', 41, 'friend'),
      area('21:02:00', 'HideoutChurch', '1', 68),
      level('21:30:00', 70, 'alt'),
      area('21:31:00', 'MapWorldsCemetery', '13')
    ])
    expect(log.current).toMatchObject({ name: 'Cemetery', char: 'alt', charLevel: 70 })
  })

  it("doesn't take a side area's name for the map", () => {
    const { log } = follow([
      area('21:00:00', 'MapWorldsStrand', '11'),
      area('21:01:00', 'MapSideArea1', '12'),
      entered('21:01:01', 'Vaal Temple')
    ])
    expect(log.current?.name).toBe('Strand')
  })

  it('adds a second visit to a map already saved', () => {
    const r = (enteredAt: number, mapMs: number, deaths: number) => ({ key: 'a:1', name: 'Strand', enteredAt, leftAt: enteredAt + mapMs, mapMs, deaths, npcs: ['Niko'], levelsGained: 0 } as unknown as MapRecord)
    const kept = keepMap(keepMap([], r(1000, 60_000, 1)), r(5_000_000, 30_000, 0))
    expect(kept).toHaveLength(1)
    expect(kept[0]).toMatchObject({ enteredAt: 1000, mapMs: 90_000, deaths: 1 })
  })

  it("compares a map with the same map's last hour and with the run before", () => {
    const M = 60_000
    const rec = (name: string, at: number, ms: number, extra: Partial<MapRecord> = {}) =>
      ({ key: `${name}:${at}`, name, areaLevel: 83, enteredAt: at, mapMs: ms, deaths: 0, npcs: [], levelsGained: 0, charLevel: null, ...extra } as unknown as MapRecord)
    const now = 100 * M
    const recent = [rec('Strand', now - 5 * M, 3 * M), rec('Fortress', now - 10 * M, 2 * M), rec('Fortress', now - 30 * M, 2.5 * M), rec('Fortress', now - 90 * M, 9 * M), rec('Fortress', now - 40 * M, 0.2 * M)]
    const done = rec('Fortress', now, 1.5 * M, { deaths: 1, npcs: ['Einhar'] })
    const cmp = compareMap(done, recent)
    expect(cmp).toMatchObject({ hourAvg: 2.25 * M, hourRuns: 2, prev: { name: 'Strand', mapMs: 3 * M }, usual: null })
    // Oldest first, ending with this run; the 90-minute-old run and the quick look are out.
    expect(cmp.runs).toEqual([2.5 * M, 2 * M, 1.5 * M])
    expect(cmp.best).toBe(1.5 * M)
    const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`
    expect(chipLines(done, cmp, clock)).toEqual(['Fortress T16 · 1:30', '1h avg 2:15 (2) ▼0:45 · Last (Strand) 3:00 ▼1:30 · 1 death · Einhar'])
    // First run of a map this hour: against your usual.
    const first = compareMap(rec('Grotto', now, M), recent)
    expect(first.hourAvg).toBeNull()
    expect(first.usual).toBeCloseTo((3 + 2 + 2.5 + 9) / 4 * M)
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
