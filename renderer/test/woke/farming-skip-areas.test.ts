// Session story's skip list (the 3.30 vaults) in Farming's map count.
import { afterEach, describe, expect, it } from 'vitest'
import { isFarmedMap, setAreaSkip } from '@/web/woke/farming/farming'
import { isSkippedArea, knownAreaName, setSkipAreas } from '@/web/woke/session-story/skip-areas'

afterEach(() => { setSkipAreas(undefined) })

describe('skipped areas in Farming', () => {
  it('knows the vaults by area id before Session story loads', () => {
    expect(isFarmedMap('MapWorldsMemoryVault2')).toBe(false)
    expect(isFarmedMap('MapWorldsStrand')).toBe(true)
    expect(isFarmedMap('MapWorldsVault')).toBe(true)
  })

  it('follows the list once Session story hands it in', () => {
    setAreaSkip((areaId) => isSkippedArea(knownAreaName(areaId)))
    expect(isFarmedMap('MapWorldsMemoryVault4')).toBe(false)
    setSkipAreas([])
    expect(isFarmedMap('MapWorldsMemoryVault4')).toBe(true)
  })
})
