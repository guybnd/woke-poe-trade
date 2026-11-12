import { describe, it, expect } from 'vitest'
import { nextBoss, pinnedReadouts, pinsTick } from '@/web/woke/campaign/pins'
import type { PinInputs } from '@/web/woke/campaign/pins'
import type { CampaignRun } from '@/web/woke/campaign/run-timer'

const NOW = 1_000_000_000

function run (over: Partial<CampaignRun> = {}): CampaignRun {
  return {
    id: 1, startedAt: 0, elapsedMs: 600_000, runningSince: null, act: 4, zone: 'Highgate', zoneSinceMs: 540_000,
    charName: 'A', className: 'Witch', level: 34, splits: [], finished: false, marks: [], ...over
  } as CampaignRun
}

function inputs (over: Partial<PinInputs>): PinInputs {
  return { pins: [], run: run(), cmp: null, bosses: true, now: NOW, delta: null, actMs: null, level: null, xp: null, step: null, ...over }
}

describe('campaign pinned readouts', () => {
  it('shows nothing unless pinned', () => {
    expect(pinnedReadouts(inputs({ delta: -5000, level: 34, step: 'x' }))).toEqual([])
  })

  it('keeps a fixed order, whatever order they were pinned in', () => {
    const out = pinnedReadouts(inputs({ pins: ['step', 'zone', 'run'], step: 'Go' }))
    expect(out.map(r => r.id)).toEqual(['run', 'zone', 'step'])
    expect(out[1].text).toBe('zone 1:00')
  })

  it('leaves out times with no run or a finished one, and keeps the rest', () => {
    for (const r of [null, run({ finished: true })]) {
      const out = pinnedReadouts(inputs({ pins: ['run', 'act', 'delta', 'boss', 'zone', 'level'], run: r, level: 34, delta: 1, actMs: 1 }))
      expect(out.map(x => x.id)).toEqual(['level'])
    }
  })

  it('colours the delta and the XP penalty', () => {
    expect(pinnedReadouts(inputs({ pins: ['delta'], delta: -65_000 }))[0].tone).toBe('up')
    expect(pinnedReadouts(inputs({ pins: ['delta'], delta: 65_000 }))[0].tone).toBe('down')
    const low = pinnedReadouts(inputs({ pins: ['level'], level: 30, xp: { diff: -9, band: 'penalty' } }))[0]
    expect(low.text).toBe('Lv 30 −9')
    expect(low.tone).toBe('down')
  })

  it('only ticks for time pins', () => {
    expect(pinsTick(['level', 'step'])).toBe(false)
    expect(pinsTick(['level', 'run'])).toBe(true)
  })
})

describe('campaign next boss', () => {
  it('is the first boss of the act not reached yet', () => {
    expect(nextBoss(run(), null, NOW)).toEqual({ label: 'Kaom', leftMs: null })
    expect(nextBoss(run({ marks: [{ id: 'kaom', totalMs: 1 }] }), null, NOW)?.label).toBe('Daresso')
  })

  it('counts down to your best run reaching it, and goes negative past it', () => {
    const cmp = run({ marks: [{ id: 'kaom', totalMs: 700_000 }] })
    expect(nextBoss(run(), cmp, NOW)?.leftMs).toBe(100_000)
    const out = pinnedReadouts(inputs({ pins: ['boss'], run: run({ elapsedMs: 760_000 }), cmp }))[0]
    expect(out.text).toBe('Kaom +1:00')
    expect(out.tone).toBe('down')
  })

  it('leaves the pin out when boss times are switched off', () => {
    expect(pinnedReadouts(inputs({ pins: ['boss'], bosses: false }))).toEqual([])
  })

  it('has none once the act has no bosses left', () => {
    expect(nextBoss(run({ act: 8, marks: [{ id: 'doedre8', totalMs: 1 }] }), null, NOW)).toBeNull()
  })
})
