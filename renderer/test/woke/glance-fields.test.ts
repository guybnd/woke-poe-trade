import { describe, expect, it } from 'vitest'
import { DEFAULT_GLANCE_FIELDS, avgMapMs, glanceFields, glanceOutside, glanceShow, hoursText, lastMapOf, perHourOf } from '@/web/woke/session-story/glance-fields'

describe('glance bar fields', () => {
  it('unset means the defaults (today\'s bar plus the last map); an empty list stays empty', () => {
    expect([...glanceFields(undefined)]).toEqual([...DEFAULT_GLANCE_FIELDS])
    expect(glanceFields([]).size).toBe(0)
  })

  it('drops unknown fields from a saved list', () => {
    expect([...glanceFields(['map', 'nope', 3, 'perHour'])]).toEqual(['map', 'perHour'])
  })

  it('shows in maps unless set otherwise', () => {
    expect(glanceShow(undefined)).toBe('map')
    expect(glanceShow('run')).toBe('run')
    expect(glanceShow('bogus')).toBe('map')
  })

  it('stays out of maps only while a run goes, or all night when set to', () => {
    expect(glanceOutside('map', true, true)).toBe(false)
    expect(glanceOutside('run', true, false)).toBe(true)
    expect(glanceOutside('run', false, true)).toBe(false)
    expect(glanceOutside('game', false, true)).toBe(true)
    expect(glanceOutside('game', false, false)).toBe(false)
  })

  it('compares the last map with the hour\'s average, else your usual map', () => {
    expect(lastMapOf({ name: 'Abomination', mapMs: 220_000 }, { hourAvg: 185_000, usual: null }).diff).toBe(35_000)
    expect(lastMapOf({ name: 'Abomination', mapMs: 220_000 }, { hourAvg: null, usual: 240_000 }).diff).toBe(-20_000)
    expect(lastMapOf({ name: 'Abomination', mapMs: 220_000 }, { hourAvg: null, usual: null }).diff).toBeNull()
  })

  it('averages maps past quick looks, two at least', () => {
    expect(avgMapMs([{ mapMs: 120_000 }])).toBeNull()
    expect(avgMapMs([{ mapMs: 120_000 }, { mapMs: 180_000 }, { mapMs: 5_000 }])).toBe(150_000)
  })

  it('per hour waits for 10 minutes of counted time', () => {
    expect(perHourOf(100, 5 * 60_000)).toBeNull()
    expect(perHourOf(100, 30 * 60_000)).toBe(200)
    expect(perHourOf(null, 3_600_000)).toBeNull()
  })

  it('writes hours and minutes', () => {
    expect(hoursText(45 * 60_000)).toBe('45m')
    expect(hoursText((2 * 60 + 31) * 60_000)).toBe('2:31')
  })
})
