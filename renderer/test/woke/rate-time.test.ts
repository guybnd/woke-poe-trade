// The Per hour setting (shared/rate-time.ts): one rule for what time every
// per hour counts, read the same way by the night card, strategy runs,
// Session analytics and their Ctrl+Space answers.
import { describe, it, expect } from 'vitest'
import { countedMs, leftOutText, rateTimeOf } from '@/web/woke/shared/rate-time'
import { nightRateMs, nightUpTo, playedMs } from '@/web/woke/session-story/night-rate'
import { sessionUnits, perHour } from '@/web/woke/analytics/stats'
import type { SessionRecord } from '@/web/woke/analytics/types'
import { runsLookup } from '@/web/woke/search/lookups/runs'
import type { RunGlance } from '@/web/woke/net-worth/runs'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const M = 60_000
const H = 60 * M

describe('the setting', () => {
  it('defaults to play only, and carries Net worth\'s unticked "Leave out hideout" over once', () => {
    expect(rateTimeOf({})).toBe('play')
    expect(rateTimeOf({ widgets: [{ wmType: 'woke-net-worth', rateWithHub: true }] })).toBe('hub')
    expect(rateTimeOf({ widgets: [{ wmType: 'woke-net-worth', rateWithHub: false }] })).toBe('play')
    // Once set, the setting wins.
    expect(rateTimeOf({ woke: { rateTime: 'all' }, widgets: [{ wmType: 'woke-net-worth', rateWithHub: true }] })).toBe('all')
    expect(rateTimeOf({ woke: { rateTime: 'play' }, widgets: [{ wmType: 'woke-net-worth', rateWithHub: true }] })).toBe('play')
  })

  it('counts more time with each step', () => {
    const split = { map: 30 * M, play: 10 * M, hub: 15 * M, off: 5 * M }
    expect(countedMs(split, 'play')).toBe(40 * M)
    expect(countedMs(split, 'hub')).toBe(55 * M)
    expect(countedMs(split, 'all')).toBe(60 * M)
    expect(leftOutText('play')).toContain('AFK')
    expect(leftOutText('hub')).not.toContain('hideout')
  })
})

describe('a night\'s per hour time', () => {
  const night = { startedAt: 0, endedAt: 3 * H, afkMs: 20 * M, hubMs: 40 * M }
  it('leaves out AFK, and hideout unless counted; all time is the clock', () => {
    expect(playedMs(night)).toBe(160 * M)
    expect(nightRateMs(night, 'play')).toBe(120 * M)
    expect(nightRateMs(night, 'hub')).toBe(160 * M)
    expect(nightRateMs(night, 'all')).toBe(3 * H)
  })

  it('carries a live night on to now: hideout time out of maps, AFK time while AFK', () => {
    expect(playedMs(nightUpTo(night, 3 * H + 10 * M, false))).toBe(170 * M)
    expect(nightUpTo(night, 3 * H + 10 * M, false).hubMs).toBe(50 * M)
    expect(nightUpTo(night, 3 * H + 10 * M, true).hubMs).toBe(40 * M)
    // AFK since the last line: the time played stands still.
    const afk = nightUpTo({ ...night, afkSince: 3 * H }, 3 * H + 10 * M, false)
    expect(playedMs(afk)).toBe(160 * M)
    expect(afk.hubMs).toBe(40 * M)
    expect(nightRateMs(afk, 'all')).toBe(3 * H + 10 * M)
  })
})

describe('Session analytics with play only', () => {
  const run = { areaId: 'MapWorldsStrand', name: 'Strand', level: 83, enteredAt: 1, mapMs: 10 * M, otherMs: 5 * M, loot: [] }
  const s: SessionRecord = { id: 's', league: 'L', strategy: 'Boxes', startedAt: 0, endedAt: 1, durationMs: 40 * M, maps: 2, costPerMapChaos: 0, loot: [], extraChaos: 600, divine: 100, runs: [run, run] }
  it('counts time inside maps only; the others count the whole session', () => {
    expect(perHour(sessionUnits(s, 'chaos', null, 'play'))).toBeCloseTo(600 / (20 / 60))
    expect(perHour(sessionUnits(s, 'chaos', null, 'hub'))).toBeCloseTo(600 / (40 / 60))
    expect(perHour(sessionUnits(s, 'chaos', null, 'all'))).toBeCloseTo(600 / (40 / 60))
  })
})

describe('Ctrl+Space strategy run', () => {
  const g: RunGlance = { league: 'L', name: 'Strand', startAt: 0, at: H, profitChaos: 600, maps: 4, perHourChaos: 600, costPerMapChaos: null, divine: null, time: { map: 30 * M, play: 0, hub: 15 * M, off: 15 * M } }
  const ctx = { price: () => null, items: [], tools: new Set<string>(), divine: null, now: H, league: null } as unknown as LookupContext
  const perHourRow = (time: 'play' | 'hub' | 'all', glance = g) => runsLookup(glance, time)('run', ctx)[0].sections![0].rows!.find(r => r.label === 'Per hour')!.value
  it('per hour follows the setting, from the time saved with the run', () => {
    expect(perHourRow('play')).toBe('+1200 c/h')
    expect(perHourRow('hub')).toBe('+800 c/h')
    expect(perHourRow('all')).toBe('+600 c/h')
    // Saved without Client.txt: the clock.
    expect(perHourRow('play', { ...g, time: undefined })).toBe('+600 c/h')
  })
})
