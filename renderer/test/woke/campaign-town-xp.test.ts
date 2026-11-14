import { describe, it, expect } from 'vitest'
import { DEFAULT_ROUTE_OPTIONS, nextFightZone } from '@/web/woke/campaign/route-parse'
import { bundledRoute, routeData } from '@/web/woke/campaign/route-data'

describe('XP band in town', () => {
  const route = bundledRoute(DEFAULT_ROUTE_OPTIONS)

  it('measures against the next zone with monsters, not the town', () => {
    // Just arrived in Highgate (logged as level 40): next up is the Aqueduct.
    const i = route.steps.findIndex(s => s.areaAfter === '1_4_town' && s.areaBefore !== '1_4_town') + 1
    const next = nextFightZone(route, i, routeData)!
    expect(routeData.areas[next.areaId][3]).toBe(false)
    expect(next.level).toBeLessThan(40)
    expect(next.areaId.startsWith('1_4_')).toBe(true)
  })

  it('has nothing past the end of the route', () => {
    expect(nextFightZone(route, route.steps.length, routeData)).toBeNull()
  })
})
