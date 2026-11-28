// One minimap shape per class (Guy 2026-11-28: "square map icons should be
// reserved for maps, cards need a different one"): a shape on the minimap
// tells the class at a glance.
import { describe, it, expect } from 'vitest'
import { CAT_LOOK, kindOf } from '@/web/woke/loot-filter/currency-weights'
import { CARD_LOOK } from '@/web/woke/loot-filter/card-classes'
import { FRAGMENT_LOOK } from '@/web/woke/loot-filter/fragment-classes'
import { UNIQUE_LOOK } from '@/web/woke/loot-filter/unique-classes'
import { GEM_LOOK } from '@/web/woke/loot-filter/gem-classes'
import { MAP_LOOK } from '@/web/woke/loot-filter/map-classes'
import { JEWEL_LOOK } from '@/web/woke/loot-filter/jewel-classes'
import { LEAGUE_LOOK } from '@/web/woke/loot-filter/league-classes'
import { TOP_ACCENTS } from '@/web/woke/loot-filter/top-step'
import { stepActions } from '@/web/woke/loot-filter/weights'
import { SAFETY_LOOK } from '@/web/woke/loot-filter/safety'

describe('minimap shapes', () => {
  it('gives each class one shape, and no two classes the same one', () => {
    const byKind = new Map<string, Set<string>>()
    for (const t of [CAT_LOOK, CARD_LOOK, FRAGMENT_LOOK, UNIQUE_LOOK, GEM_LOOK, MAP_LOOK, JEWEL_LOOK, LEAGUE_LOOK]) {
      for (const [cat, l] of Object.entries(t)) byKind.set(kindOf(cat), new Set([...(byKind.get(kindOf(cat)) ?? []), l.shape]))
    }
    for (const [cls, a] of Object.entries(TOP_ACCENTS)) byKind.set(cls, new Set([...(byKind.get(cls) ?? []), a.shape]))
    const gear = new Set([3, 4].flatMap(s => stepActions(s as 3 | 4).filter(a => a.key === 'MinimapIcon').map(a => a.args[2])))
    byKind.set('gear', gear)
    byKind.set('safety', new Set([SAFETY_LOOK.icon!.shape]))
    for (const [cls, shapes] of byKind) expect([cls, [...shapes]]).toEqual([cls, [...shapes].slice(0, 1)])
    const shapes = [...byKind.values()].map(s => [...s][0])
    expect(new Set(shapes).size).toBe(shapes.length)
    expect([...byKind.get('maps')!]).toEqual(['Square'])
  })
})
