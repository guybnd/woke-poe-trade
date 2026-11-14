// The run timeline: what each Client.txt line adds, and the review sums.
// Area ids, zone names and the town trips come from a real campaign run.
import { describe, it, expect } from 'vitest'
import { slainName } from '@/web/woke/campaign/log-parse'
import { HISTORY_LIMIT, endRun, newRun, startRun } from '@/web/woke/campaign/run-timer'
import type { CampaignRun, RunTimerWidget } from '@/web/woke/campaign/run-timer'
import {
  asTimeline, deathCount, levelSteps, newTimeline, recordStep, townSec, zoneVisits, zonesByAct
} from '@/web/woke/campaign/run-timeline'
import type { RunTimeline } from '@/web/woke/campaign/run-timeline'

const S = 1000

// Feeds [sec, step] pairs, using the run time as the log time too.
function feed (tl: RunTimeline, steps: Array<[number, Parameters<typeof recordStep>[1]]>) {
  for (const [sec, input] of steps) recordStep(tl, input, sec * S, sec * S)
}
const area = (areaId: string) => ({ kind: 'area' as const, areaId })
const zone = (name: string) => ({ kind: 'zone' as const, name })
const level = (n: number) => ({ kind: 'level' as const, level: n })
const death = { kind: 'death' as const }

// The start of a real act 1 (obama_prism, Jan 2025), in run seconds.
function act1 (): RunTimeline {
  const tl = newTimeline(1)
  feed(tl, [
    [0, area('1_1_1')], [2, zone('The Twilight Strand')], [70, level(2)],
    [80, area('1_1_town')], [81, zone("Lioneye's Watch")],
    [128, area('1_1_2')], [129, zone('The Coast')],
    [187, area('1_1_2a')], [188, zone('The Tidal Island')], [245, level(3)], [275, death],
    [324, area('1_1_town')], [325, zone("Lioneye's Watch")],
    [407, area('1_1_2')], [408, zone('The Coast')],
    [413, area('1_1_3')], [414, zone('The Mud Flats')]
  ])
  return tl
}

function run (id: number, splitsSec: number[], finished = true): CampaignRun {
  const r = newRun(id)
  r.splits = splitsSec.map((s, i) => ({ act: i + 1, totalMs: s * S, level: null }))
  r.finished = finished
  r.elapsedMs = (splitsSec[splitsSec.length - 1] ?? 0) * S
  return r
}

describe('recording', () => {
  it('keeps one entry per zone and names it from the next line', () => {
    const tl = act1()
    expect(tl.zones).toEqual([
      ['1_1_1', 'The Twilight Strand'], ['1_1_town', "Lioneye's Watch"], ['1_1_2', 'The Coast'],
      ['1_1_2a', 'The Tidal Island'], ['1_1_3', 'The Mud Flats']
    ])
    expect(tl.ev.filter(e => e[1] === 'z')).toHaveLength(7)
    expect(levelSteps(tl)).toEqual([[70, 2], [245, 3]])
    expect(deathCount(tl)).toBe(1)
  })

  it('skips lines replayed after a restart', () => {
    const tl = act1()
    const before = JSON.stringify(tl)
    // The log replays from an older config save.
    feed(tl, [[324, area('1_1_town')], [325, zone("Lioneye's Watch")], [407, area('1_1_2')], [408, zone('The Coast')], [413, area('1_1_3')]])
    expect(JSON.stringify(tl)).toBe(before)
    feed(tl, [[565, area('1_1_4_1')]])
    expect(tl.ev[tl.ev.length - 1]).toEqual([565, 'z', 5])
  })

  it('keeps steps logged in the same second', () => {
    const tl = newTimeline(1)
    feed(tl, [[10, area('1_1_1')], [20, death]])
    recordStep(tl, death, 21 * S, 21 * S)
    recordStep(tl, { kind: 'level', level: 2 }, 21 * S, 21 * S)
    expect(deathCount(tl)).toBe(2)
    expect(levelSteps(tl)).toEqual([[21, 2]])
  })

  it('reads back only its own run', () => {
    const tl = act1()
    expect(asTimeline(JSON.parse(JSON.stringify(tl)), 1)).not.toBeNull()
    expect(asTimeline(tl, 2)).toBeNull()
    expect(asTimeline(null, 1)).toBeNull()
    expect(asTimeline({ v: 2 }, 1)).toBeNull()
  })

  it('reads deaths from the game line', () => {
    expect(slainName('2025/01/31 22:13:18 1 abc [INFO Client 1] : obama_prism has been slain.')).toBe('obama_prism')
    expect(slainName('2025/01/31 22:13:18 1 abc [INFO Client 1] #obama_prism: has been slain.')).toBeNull()
  })
})

describe('review', () => {
  it('times each visit until the next zone', () => {
    const v = zoneVisits(act1(), 500)
    expect(v.map(x => [x.name, x.dur, x.town])).toEqual([
      ['The Twilight Strand', 80, false], ["Lioneye's Watch", 48, true], ['The Coast', 59, false],
      ['The Tidal Island', 137, false], ["Lioneye's Watch", 83, true], ['The Coast', 6, false], ['The Mud Flats', 87, false]
    ])
    expect(v[3]).toMatchObject({ level: 2, levelsUp: 1, deaths: 1 })
    expect(townSec(v)).toBe(131)
    // An unfinished run's last zone has no end yet.
    expect(zoneVisits(act1(), null).pop()!.dur).toBeNull()
  })

  it('sums zones per act and compares with the other run', () => {
    const mine = act1()
    feed(mine, [[600, area('1_2_1')], [601, zone('The Southern Forest')], [650, area('1_1_town')], [700, area('1_2_town')], [701, zone('The Forest Encampment')]])
    const other = newTimeline(2)
    feed(other, [[0, area('1_1_1')], [60, area('1_1_town')], [100, area('1_1_2')], [300, area('1_2_1')], [400, area('1_2_2')]])
    const acts = zonesByAct(run(1, [600, 800]), mine, run(2, [300, 500]), other)
    expect(acts.map(a => a.act)).toEqual([1, 2])
    const coast = acts[0].zones.find(z => z.areaId === '1_1_2')!
    expect(coast).toMatchObject({ visits: 2, sec: 65, cmpSec: 200 })
    expect(acts[0].zones.find(z => z.areaId === '1_1_2a')!.cmpSec).toBeNull()
    // A trip back to Lioneye's Watch during act 2 counts toward act 2.
    expect(acts[1].zones.map(z => [z.areaId, z.sec])).toEqual([['1_2_1', 50], ['1_1_town', 50], ['1_2_town', 100]])
    expect(acts[1].zones[0].cmpSec).toBe(100)
  })
})

describe('timeline files of dropped runs', () => {
  type W = Pick<RunTimerWidget, 'run' | 'history'> & { timelineTrash?: number[] }
  it('lists runs pushed out of history', () => {
    const w: W = { run: null, history: [], timelineTrash: [] }
    for (let i = 0; i < HISTORY_LIMIT; i++) w.history.push(run(1000 - i, [10 * 60]))
    startRun(w, 5000)
    w.run!.splits.push({ act: 1, totalMs: 120 * S, level: 5 })
    endRun(w, 5200 * S)
    expect(w.history).toHaveLength(HISTORY_LIMIT)
    expect(w.timelineTrash).toEqual([1000 - HISTORY_LIMIT + 1])
  })

  it('lists a run too short to keep', () => {
    const w: W = { run: null, history: [], timelineTrash: [] }
    startRun(w, 5000)
    endRun(w, 5000 + 10 * S)
    expect(w.run).toBeNull()
    expect(w.timelineTrash).toEqual([5000])
  })
})

describe('act of a zone', () => {
  it('puts the zone that starts an act in that act, whatever the split rounds to', () => {
    const tl = newTimeline(1)
    // The split and the area line share one run time, 1234.4 s.
    recordStep(tl, area('1_1_3'), 1000 * S, 1)
    recordStep(tl, area('1_2_1'), 1_234_400, 2)
    recordStep(tl, area('1_2_2'), 1300 * S, 3)
    const acts = zonesByAct(run(1, [1234.4, 1400]), tl, null, null)
    expect(acts.map(a => [a.act, a.zones.map(z => z.areaId)])).toEqual([[1, ['1_1_3']], [2, ['1_2_1', '1_2_2']]])
  })
})

describe('campaign card steps', () => {
  it('keeps one time per step and drops steps undone by stepping back', async () => {
    const { recordRouteStep, dropRouteStepsFrom, stepRows } = await import('@/web/woke/campaign/run-timeline')
    const tl = newTimeline(1)
    recordRouteStep(tl, 0, 'Enter The Twilight Strand', 10 * S)
    recordRouteStep(tl, 1, 'Kill Hillock', 70 * S)
    recordRouteStep(tl, 3, 'Take the waypoint', 200 * S)
    expect(recordRouteStep(tl, 1, 'Kill Hillock', 70 * S)).toBe(false)
    const rows = stepRows(run(1, [1000]), tl, null, null)
    // Step 3 came after a skipped step 2: no time of its own.
    expect(rows.map(r => [r.index, r.took])).toEqual([[0, null], [1, 60], [3, null]])
    expect(dropRouteStepsFrom(tl, 1)).toBe(true)
    expect(tl.steps!.map(s => s[1])).toEqual([0])
    recordRouteStep(tl, 1, 'Kill Hillock', 90 * S)
    expect(tl.steps).toEqual([[10, 0, 'Enter The Twilight Strand'], [90, 1, 'Kill Hillock']])
  })

  it('compares a step with the same step in the other run', async () => {
    const { recordRouteStep, stepRows } = await import('@/web/woke/campaign/run-timeline')
    const mine = newTimeline(1)
    recordRouteStep(mine, 0, 'A', 10 * S)
    recordRouteStep(mine, 1, 'B', 50 * S)
    const other = newTimeline(2)
    recordRouteStep(other, 4, 'A', 5 * S)
    recordRouteStep(other, 5, 'B', 35 * S)
    const rows = stepRows(run(1, [1000]), mine, run(2, [1000]), other)
    expect(rows[1]).toMatchObject({ took: 40, cmpTook: 30 })
  })
})

describe('rebuilding a run from Client.txt', () => {
  it('times zones between the act splits and keeps only its own character', async () => {
    const { rebuildTimeline } = await import('@/web/woke/campaign/run-timeline')
    const { lineTime } = await import('@/web/woke/campaign/log-tail')
    const t0 = new Date(2026, 10, 4, 18, 0, 0).getTime()
    const at = (sec: number) => {
      const d = new Date(t0 + sec * 1000)
      const p = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} 1 abc`
    }
    const raw = [
      `${at(0)} [DEBUG Client 1] Generating level 1 area "1_1_1" with seed 1`,
      `${at(1)} [INFO Client 1] : You have entered The Twilight Strand.`,
      `${at(60)} [INFO Client 1] : Tester (Witch) is now level 2`,
      `${at(61)} [INFO Client 1] : Someone (Duelist) is now level 40`,
      `${at(100)} [INFO Client 1] : Tester has been slain.`,
      `${at(101)} [INFO Client 1] : Someone has been slain.`,
      `${at(200)} [DEBUG Client 1] Generating level 13 area "1_2_1" with seed 1`,
      // A break of an hour: the run timer was paused, the log clock wasn't.
      `${at(4000)} [DEBUG Client 1] Generating level 14 area "1_2_2" with seed 1`,
      `${at(4100)} [DEBUG Client 1] Generating level 15 area "1_3_1" with seed 1`,
      `${at(9000)} [DEBUG Client 1] Generating level 1 area "1_1_1" with seed 2`
    ].map(line => ({ line, at: lineTime(line)! }))
    const r = run(t0, [180, 600])
    r.startedAt = t0 + 400 // a live start lands a moment after its line
    r.endedAt = t0 + 4100 * S
    r.charName = 'Tester'
    const tl = rebuildTimeline(r, raw)
    expect(tl.rebuilt).toBe(true)
    expect(tl.zones.map(z => z[0])).toEqual(['1_1_1', '1_2_1', '1_2_2', '1_3_1'])
    expect(levelSteps(tl)).toEqual([[54, 2]])
    expect(deathCount(tl)).toBe(1)
    // Exact at the splits: act 2 entered at 180 s, act 3 at 600 s.
    expect(tl.ev.filter(e => e[1] === 'z').map(e => e[0])).toEqual([0, 180, 589, 600])
  })
})
