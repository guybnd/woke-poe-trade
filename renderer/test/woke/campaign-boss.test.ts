import { describe, it, expect } from 'vitest'
import { BOSS_DONE_LINES, bossKilled } from '@/web/woke/campaign/boss-lines'
import { advanceOnKill, DEFAULT_ROUTE_OPTIONS } from '@/web/woke/campaign/route-parse'
import type { Route, RouteOptions } from '@/web/woke/campaign/route-parse'
import { bundledRoute } from '@/web/woke/campaign/route-data'

const say = (who: string, text: string) => `2024/11/09 19:52:50 247333140 cff94598 [INFO Client 6096] ${who}: ${text}`

const ALL_OPTIONS: RouteOptions[] = []
for (const leagueStart of [true, false]) {
  for (const library of [true, false]) {
    for (const bandit of ['kill', 'oak', 'kraityn', 'alira'] as const) ALL_OPTIONS.push({ leagueStart, library, bandit })
  }
}

function killStep (route: Route, area: string, kill: string): number {
  return route.steps.findIndex(s => s.areaBefore === area && s.parts.some(p => p.kind === 'kill' && p.text === kill))
}

describe('boss-dead lines', () => {
  it('reads the speaker, text and zone', () => {
    expect(bossKilled(say('Sin', 'Abberath!'), '2_6_8')).toBe('Abberath')
    expect(bossKilled(say('Sin', 'Abberath!') + '\r', '2_6_8')).toBe('Abberath')
    expect(bossKilled(say('Maligaro, the Inquisitor', 'You have murdered... an artist...'), '1_4_6_3')).toBe('Maligaro')
  })

  it('needs the zone it is said in', () => {
    expect(bossKilled(say('Sin', 'Abberath!'), '2_6_9')).toBeNull()
    // Kitava's act 10 line is also said in a map.
    expect(bossKilled(say('Sin', 'May a new dawn arise!'), 'MapWorldsLavaLake')).toBeNull()
    expect(bossKilled(say('Sin', 'May a new dawn arise!'), '2_10_6')).toBe('Kitava')
  })

  it('ignores fight-start lines, other speakers and player chat', () => {
    expect(bossKilled(say('Sin', 'I shall strike you down!'), '2_10_6')).toBeNull()
    expect(bossKilled(say('Piety', 'Kill me!'), '1_4_6_3')).toBeNull()
    expect(bossKilled(say('Bannon', 'Abberath!'), '2_6_8')).toBeNull()
    expect(bossKilled(say('#Sin', 'Abberath!'), '2_6_8')).toBeNull()
    expect(bossKilled(say('@From Sin', 'Abberath!'), '2_6_8')).toBeNull()
    expect(bossKilled(say('%Sin', 'Abberath!'), '2_6_8')).toBeNull()
    expect(bossKilled(say('Sin', 'Abberath! lol'), '2_6_8')).toBeNull()
    expect(bossKilled('2024/11/09 19:52:50 247333140 cff94598 [DEBUG Client 6096] Sin: Abberath!', '2_6_8')).toBeNull()
  })

  it('every line points at a kill step in its zone, on every route', () => {
    for (const opts of ALL_OPTIONS) {
      const route = bundledRoute(opts)
      for (const b of BOSS_DONE_LINES) {
        expect(killStep(route, b.area, b.kill), `${b.speaker}: ${b.text}`).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('advanceOnKill', () => {
  const route = bundledRoute(DEFAULT_ROUTE_OPTIONS)

  it('ticks off the kill step the route is on', () => {
    for (const b of BOSS_DONE_LINES) {
      const i = killStep(route, b.area, b.kill)
      expect(advanceOnKill(route, i, b.area, b.kill), b.kill).toBe(i + 1)
    }
  })

  it('needs the zone to match the step', () => {
    const i = killStep(route, '2_6_8', 'Abberath')
    expect(advanceOnKill(route, i, '2_6_9', 'Abberath')).toBe(i)
  })

  it('does nothing once ticked, or when the route is in an earlier zone', () => {
    const i = killStep(route, '2_6_8', 'Abberath')
    expect(advanceOnKill(route, i + 1, '2_6_8', 'Abberath')).toBe(i + 1)
    expect(advanceOnKill(route, i - 3, '2_6_8', 'Abberath')).toBe(i - 3)
  })

  it('never skips another boss in the same zone', () => {
    // The Harvest: Doedre, Maligaro, Shavronne, then Malachai.
    const doedre = killStep(route, '1_4_6_3', 'Doedre Darktongue')
    const maligaro = killStep(route, '1_4_6_3', 'Maligaro')
    expect(advanceOnKill(route, doedre, '1_4_6_3', 'Maligaro')).toBe(doedre)
    expect(advanceOnKill(route, maligaro, '1_4_6_3', 'Maligaro')).toBe(maligaro + 1)
    expect(advanceOnKill(route, doedre, '1_4_6_3', 'Malachai')).toBe(doedre)
  })

  it('passes over a step with no kill in between', () => {
    const i = killStep(route, '2_6_5', 'Tukohama')
    const before = route.steps.slice(0, i).reverse().findIndex(s => s.areaBefore !== '2_6_5')
    const start = i - before
    expect(route.steps.slice(start, i).every(s => !s.parts.some(p => p.kind === 'kill'))).toBe(true)
    expect(advanceOnKill(route, start, '2_6_5', 'Tukohama')).toBe(i + 1)
  })
})

describe('short boss names', () => {
  it('drops the title after the comma', () => {
    const route = bundledRoute(DEFAULT_ROUTE_OPTIONS)
    const kills = route.steps.flatMap(s => s.parts.filter(p => p.kind === 'kill').map(p => p.text))
    expect(kills).toContain('Ryslatha')
    expect(kills).toContain('Avarius')
    expect(kills).toContain('The Dweller of the Deep')
    expect(kills.some(k => k.includes(','))).toBe(false)
  })
})
