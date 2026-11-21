// Session story's skip list (the 3.30 vaults) in Farming's map count and map time.
import { afterEach, describe, expect, it } from 'vitest'
import { isFarmedMap, nameRun, newSession, onZoneChange, startRun } from '@/web/woke/farming/farming'
import { setSkipAreas } from '@/web/woke/session-story/skip-areas'

afterEach(() => { setSkipAreas(undefined) })

describe('skipped areas in Farming', () => {
  it('knows the vaults by area id, unless taken off the list', () => {
    expect(isFarmedMap('MapWorldsMemoryVault2')).toBe(false)
    expect(isFarmedMap('MapWorldsStrand')).toBe(true)
    expect(isFarmedMap('MapWorldsVault')).toBe(true)
    setSkipAreas([])
    expect(isFarmedMap('MapWorldsMemoryVault2')).toBe(true)
  })

  it('takes back a map counted for an area skipped by name, and books its time as out of maps', () => {
    setSkipAreas(['Strand'])
    const s = newSession('test', 0)
    s.runningSince = 0
    onZoneChange(s, true, 1000)
    s.maps++
    startRun(s, 'MapWorldsStrand', 83, 1000)
    nameRun(s, 'Strand')
    expect(s.maps).toBe(0)
    expect(s.runs).toHaveLength(0)
    onZoneChange(s, false, 61_000)
    expect(s.mapMs ?? 0).toBe(0)
  })

  it('names a farmed map as before', () => {
    const s = newSession('test', 0)
    s.runningSince = 0
    onZoneChange(s, true, 1000)
    s.maps++
    startRun(s, 'MapWorldsStrand', 83, 1000)
    nameRun(s, 'Strand')
    expect(s.maps).toBe(1)
    expect(s.runs![0]).toMatchObject({ name: 'Strand', named: true })
  })
})
