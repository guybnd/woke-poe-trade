import { describe, it, expect } from 'vitest'
import { parseRoute, stepFromOld, zoneCrafts, DEFAULT_ROUTE_OPTIONS } from '@/web/woke/campaign/route-parse'
import type { RouteData } from '@/web/woke/campaign/route-parse'
import { bundledRoute } from '@/web/woke/campaign/route-data'
import { migrateFoldedCrafts } from '@/web/woke/campaign/widget'
import { craftChip, craftTitle, shortRecipe } from '@/web/woke/campaign/recipes'
import type { CampaignWidget } from '@/web/woke/campaign/widget'

const data: RouteData = {
  areas: {
    '1_1_town': ['Lioneye\'s Watch', 1, 1, true, true, null, []],
    '1_1_2': ['The Coast', 1, 2, false, true, '1_1_town', []],
    '1_1_3': ['The Mud Flats', 1, 3, false, false, '1_1_town', ['Life - Rank 1']],
    '1_1_4': ['The Tidal Island', 1, 4, false, false, '1_1_town', []]
  },
  quests: {},
  killWaypoints: {}
}

const SRC = [
  '#section Act 1',
  '➞ {enter|1_1_2}',
  '➞ {enter|1_1_3}',
  'Get {crafting}',
  '    #sub Follow the river',
  'Find and kill {kill|Hillock}',
  'Get {crafting}',
  '➞ {enter|1_1_4}',
  '{logout}'
].join('\n')

describe('crafting steps fold into the step before', () => {
  const route = parseRoute([SRC], data)

  it('drops the crafting lines and keeps the recipes on the step before', () => {
    expect(route.steps.map(s => s.parts.map(p => p.text).join(''))).toEqual([
      '➞ The Coast', '➞ The Mud Flats', 'Find and kill Hillock', '➞ The Tidal Island', 'Portal scroll / logout'
    ])
    expect(route.steps[1].crafts).toEqual(['Life - Rank 1'])
    // A sub under the crafting line is for the zone: it goes to the step
    // that is current there.
    expect(route.steps[1].subs).toEqual([])
    expect(route.steps[2].subs.map(s => s.map(p => p.text).join(''))).toEqual(['Follow the river'])
    expect(route.steps[2].crafts).toEqual(['Life - Rank 1'])
    expect(route.folded).toEqual([2, 4])
  })

  it('knows the zone recipes while in that zone', () => {
    expect(zoneCrafts(route, 2)).toEqual(['Life - Rank 1'])
    // Still in the Mud Flats until the step that leaves it is done.
    expect(zoneCrafts(route, 3)).toEqual(['Life - Rank 1'])
    expect(zoneCrafts(route, 4)).toEqual([])
    expect(zoneCrafts(route, 0)).toEqual([])
  })

  it('maps saved steps to the new numbering', () => {
    // Old: 0 Coast, 1 Mud Flats, 2 craft, 3 Hillock, 4 craft, 5 Tidal Island, 6 logout
    expect([0, 1, 2, 3, 4, 5, 6].map(o => stepFromOld(route, o))).toEqual([0, 1, 2, 2, 3, 3, 4])
  })

  it('moves saved progress and step times once', () => {
    const w = {
      step: 5,
      state: { stepStarts: { 1: 100, 2: 200, 3: 300, 4: 400, 5: 500 } },
      chars: { Other: { step: 3, state: { stepStarts: { 2: 20, 3: 30 } } } }
    } as unknown as CampaignWidget
    const toNew = (o: number) => stepFromOld(route, o)
    migrateFoldedCrafts(w, toNew)
    expect(w.step).toBe(3)
    expect(w.state.stepStarts).toEqual({ 1: 100, 2: 300, 3: 500 })
    expect(w.chars!.Other.step).toBe(2)
    expect(w.chars!.Other.state.stepStarts).toEqual({ 2: 30 })
    migrateFoldedCrafts(w, toNew)
    expect(w.step).toBe(3)
  })

  it('keeps the start time when you were on a crafting step', () => {
    const w = { step: 2, state: { stepStarts: { 1: 100, 2: 200 } } } as unknown as CampaignWidget
    migrateFoldedCrafts(w, o => stepFromOld(route, o))
    expect(w.step).toBe(2)
    expect(w.state.stepStarts).toEqual({ 1: 100, 2: 200 })
  })
})

describe('bundled route', () => {
  it('has no crafting-only steps left', () => {
    const route = bundledRoute(DEFAULT_ROUTE_OPTIONS)
    const craftOnly = route.steps.filter(s => s.parts.every(p => p.kind === 'craft' || /^\s*get\s*$/i.test(p.text)))
    expect(craftOnly).toEqual([])
    expect(route.folded.length).toBeGreaterThan(30)
    expect(route.steps.filter(s => s.crafts).length).toBeGreaterThan(30)
  })

  it('never shows a lab recipe back in town', () => {
    for (const opts of [DEFAULT_ROUTE_OPTIONS, { ...DEFAULT_ROUTE_OPTIONS, leagueStart: false, library: false, bandit: 'alira' as const }]) {
      const route = bundledRoute(opts)
      const lab = route.steps.filter(s => s.craftsAt?.includes('Labyrinth'))
      if (opts.leagueStart) expect(lab.length).toBe(3)
      route.steps.forEach((_, i) => {
        for (const st of lab) for (const c of st.crafts!) expect(zoneCrafts(route, i)).not.toContain(c)
      })
    }
  })

  it('every recipe chip shows on some current step in its zone', () => {
    const route = bundledRoute(DEFAULT_ROUTE_OPTIONS)
    const seen = new Set(route.steps.flatMap((_, i) => zoneCrafts(route, i)))
    for (const st of route.steps) {
      if (!st.crafts || st.craftsAt?.includes('Labyrinth')) continue
      for (const c of st.crafts) expect(seen.has(c), c).toBe(true)
    }
  })
})

describe('recipe chip', () => {
  it('shortens recipe names', () => {
    expect(shortRecipe('Damage over Time - Rank 1')).toBe('DoT 1')
    expect(shortRecipe('Fire Damage - Rank 2')).toBe('Fire 2')
    expect(shortRecipe('Movement Speed and Flask Enchantments - Rank 3')).toBe('MS 3')
    expect(shortRecipe('Socket Links - 2 to 4 Linked Sockets')).toBe('Links')
    expect(shortRecipe('Something New - Rank 4')).toBe('Something New 4')
  })

  it('every bundled recipe gets a short name of a few letters', () => {
    const route = bundledRoute(DEFAULT_ROUTE_OPTIONS)
    for (const r of route.steps.flatMap(s => s.crafts ?? [])) {
      if (r === 'Crafting recipe') continue
      expect(shortRecipe(r).length, r).toBeLessThanOrEqual(12)
    }
  })

  it('builds the chip and its hover text', () => {
    expect(craftChip([])).toBe('')
    expect(craftChip(['Damage over Time - Rank 1', 'Cold Damage - Rank 1'])).toBe('⚒ DoT 1 · Cold 1')
    expect(craftTitle(['Cold Damage - Rank 1'])).toBe('Crafting recipe: Cold Damage - Rank 1')
  })
})
