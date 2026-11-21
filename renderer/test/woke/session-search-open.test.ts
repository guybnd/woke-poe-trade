import { describe, expect, it } from 'vitest'
import { mapsLookup } from '@/web/woke/search/lookups/session-story'
import type { MapRecord } from '@/web/woke/session-story/map-log'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const ctx = { price: () => null, items: [], tools: new Set<string>(), divine: 200, now: 0, league: null } as LookupContext
const map = (name: string, enteredAt: number): MapRecord => ({
  key: `${name}:${enteredAt}`,
  name,
  areaLevel: 83,
  enteredAt,
  leftAt: enteredAt + 120_000,
  mapMs: 120_000,
  deaths: 0,
  npcs: [],
  char: null,
  className: null,
  charLevel: null,
  levelsGained: 0
})

describe('Ctrl+Space maps card', () => {
  it('opens Map history, and each map at its own row', () => {
    const [card] = mapsLookup([map('Fortress', 2000), map('Strand', 1000)])('maps', ctx)
    expect(card.actions[0]).toEqual({ label: 'Open Map history', open: { tool: 'woke-session-analytics', id: 'history' } })
    expect(card.sections[0].rows!.map(r => r.action)).toEqual([
      { label: 'Show', open: { tool: 'woke-session-analytics', id: 'map:2000' } },
      { label: 'Show', open: { tool: 'woke-session-analytics', id: 'map:1000' } }
    ])
  })
})
