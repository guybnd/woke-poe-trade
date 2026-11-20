// Search palette: Nightmare (T17) map cards and fragments' "where it drops".
import { describe, it, expect } from 'vitest'
import { nightmareLookup } from '@/web/woke/search/lookups/nightmare'
import { dropLookup, dropLookupWith } from '@/web/woke/search/lookups/bosses'
import type { BossPrefs } from '@/web/woke/boss-runs/calc'
import { BOSS_RUNS_TYPE } from '@/web/woke/boss-runs/widget'
import type { PriceItem } from '@/web/woke/market/types'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const row = (type: string, name: string, chaos: number) => ({ type, name, variant: '', chaos }) as unknown as PriceItem
// poe.ninja Covens, 2026-11-20.
const ITEMS = [
  row('Map', 'Nightmare Map', 65),
  row('Fragment', 'Reality Fragment', 143), row('Fragment', 'Awakening Fragment', 20), row('Fragment', 'Decaying Fragment', 79),
  row('Fragment', 'Blazing Fragment', 19), row('Fragment', 'Devouring Fragment', 177), row('Fragment', 'Cosmic Fragment', 131),
  row('Fragment', 'Synthesising Fragment', 13), row('Fragment', 'Lonely Fragment', 12), row('Fragment', 'Traumatic Fragment', 8),
  row('Fragment', 'Reverent Fragment', 126), row('UniqueWeapon', 'The Dark Seer', 646)
]
const ctx: LookupContext = {
  price: n => ITEMS.find(i => i.name === n)?.chaos ?? null,
  items: ITEMS,
  tools: new Set([BOSS_RUNS_TYPE]),
  divine: 200,
  now: 0,
  league: null
}
const lookup = nightmareLookup({} as BossPrefs)

describe('nightmareLookup', () => {
  it('lists all five maps for "nightmare" or "t17", best first', () => {
    for (const q of ['nightmare', 'T17', 'tier 17 maps']) {
      const [card] = lookup(q, ctx)
      expect(card.name).toBe('Nightmare (T17) maps')
      const table = card.sections.find(s => s.table)!.table!
      expect(table.rows).toHaveLength(5)
      expect((table.rows[0].cells[0] as { text: string }).text).toBe('Ziggurat')
      expect((table.rows[0].cells[0] as { sub: string }).sub).toContain('Devouring ~80%')
    }
  })

  it('finds one map by its name or its boss', () => {
    expect(lookup('ziggurat', ctx).map(c => c.id)).toEqual(['nightmare:nightmare-ziggurat'])
    const [lycia] = lookup('lycia', ctx)
    expect(lycia.id).toBe('nightmare:nightmare-sanctuary')
    const drops = lycia.sections.find(s => s.label === 'Drops')!.rows!
    expect(drops.find(r => r.label.startsWith('The Dark Seer'))!.label).toContain('~5% · its unique')
  })

  it('stays quiet with the Boss runs module off, and for short queries', () => {
    expect(nightmareLookup(null)('nightmare', ctx)).toEqual([])
    expect(lookup('nm', ctx)).toEqual([])
    expect(lookup('mageblood', ctx)).toEqual([])
  })

  it('uses the Boss runs fragments-a-kill setting', () => {
    const [card] = nightmareLookup({ nightmareFrags: 3 } as BossPrefs)('nightmare', ctx)
    expect(card.sections.at(-1)!.text![0]).toContain('3 fragments a kill')
  })
})

describe('dropLookup for fragments', () => {
  it('lists the Nightmare maps a fragment drops in, likeliest first, as estimates', () => {
    const [card] = dropLookupWith({} as BossPrefs)('reality fragment', ctx)
    const rows = card.sections.find(s => s.label === 'Dropped by')!.rows!
    expect(rows[0].label).toBe('Abomination Map · ~80% a kill (est.)')
    expect(rows).toHaveLength(5)
    // More than one copy a kill reads as copies.
    const [many] = dropLookupWith({ nightmareFrags: 4 } as BossPrefs)('reality fragment', ctx)
    expect(many.sections.find(s => s.label === 'Dropped by')!.rows![0].label).toBe('Abomination Map · ~1.6 a kill (est.)')
  })

  it('leaves Nightmare maps out with the Boss runs module off', () => {
    expect(dropLookup('wraithlord', ctx)).toEqual([])
    expect(dropLookupWith({} as BossPrefs)('wraithlord', ctx)[0].name).toBe('Wraithlord drops from Ziggurat Map')
  })

  it('shows the overview when a query names every boss', () => {
    expect(lookup('nightmare of', ctx).map(c => c.id)).toEqual(['nightmare:all'])
  })
})
