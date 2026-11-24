// The glance bar is on unless turned off, and takes the map line while it is.
import { describe, it, expect } from 'vitest'
import { chipPlaceOf, glanceOn } from '@/web/woke/session-story/glance'

describe('glance bar default', () => {
  it('is on unless turned off', () => {
    expect(glanceOn({})).toBe(true)
    expect(glanceOn({ glance: true })).toBe(true)
    expect(glanceOn({ glance: false })).toBe(false)
  })

  it('takes the map line when nothing was picked, the dock with the bar off', () => {
    expect(chipPlaceOf({})).toBe('bar')
    expect(chipPlaceOf({ glance: false })).toBe('dock')
  })

  it('keeps a picked place, but the bar falls back to the dock once it is off', () => {
    expect(chipPlaceOf({ chipPlace: 'center' })).toBe('center')
    expect(chipPlaceOf({ chipPlace: 'dock' })).toBe('dock')
    expect(chipPlaceOf({ chipPlace: 'off', glance: false })).toBe('off')
    expect(chipPlaceOf({ chipPlace: 'bar', glance: false })).toBe('dock')
  })
})
