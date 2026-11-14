import { describe, it, expect } from 'vitest'
import { advanceOnEnter, DEFAULT_ROUTE_OPTIONS } from '@/web/woke/campaign/route-parse'
import { bundledRoute, routeData } from '@/web/woke/campaign/route-data'

const route = bundledRoute(DEFAULT_ROUTE_OPTIONS)
const text = (i: number) => route.steps[i].parts.map(p => p.text).join('')
const walk = (from: number, areas: string[]) => areas.reduce((step, a) => advanceOnEnter(route, step, a, routeData), from)
const after = (areaId: string) => route.steps.findIndex(s => s.areaAfter === areaId && s.areaBefore !== areaId) + 1

describe('town visits never skip zones', () => {
  it('follows act 4 played in another order (Guy\'s log, 2026-11-14)', () => {
    // Daresso before Kaom, home in between; the route used to jump from
    // Highgate to "Hand in The Eternal Nightmare" and stay there in the Belly.
    const start = after('1_4_3_3')
    const step = walk(start, ['1_4_5_1', '1_4_5_2', '1_4_town', '1_4_3_3', '1_4_4_1', '1_4_4_3', '1_4_town', '1_4_3_3', '1_4_6_1'])
    expect(text(step)).toBe('➞ The Belly of the Beast Level 2')
  })

  it('stays put on a portal home from the middle of a zone', () => {
    const inMines1 = after('1_4_3_1')
    expect(advanceOnEnter(route, inMines1, '1_4_town', routeData)).toBe(inMines1)
  })

  it('still moves along when the town is the next stop', () => {
    // Dried Lake done, logout to Highgate: on to "Break Deshret's Seal".
    const inLake = after('1_4_2')
    expect(text(advanceOnEnter(route, inLake, '1_4_town', routeData))).toBe('Break Deshret\'s Seal')
  })
})
