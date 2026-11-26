// Search palette Betrayal member cards.
import { describe, it, expect } from 'vitest'
import { betrayalLookup } from '@/web/woke/search/lookups/betrayal'
import { MECHANICS_TYPE } from '@/web/woke/mechanics/widget'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const ctx: LookupContext = {
  price: () => null,
  items: [{ type: 'AllflameEmber', name: 'Allflame Ember of Toads', variant: '', chaos: 12 }],
  tools: new Set([MECHANICS_TYPE]),
  divine: 200,
  now: 0,
  league: null
}

describe('betrayalLookup', () => {
  it('shows a member with a reward per division', () => {
    const [card] = betrayalLookup()('cameria', ctx)
    expect(card.name).toBe('Cameria')
    const rows = card.sections[0].rows!
    expect(rows.map(r => r.label)).toEqual([
      'Transportation: Toads Embers',
      'Fortification: Trapped chest: jewels',
      'Research: Crafting bench: jewel',
      'Intervention: Trapped chest: unique axes'
    ])
    expect(rows[0].chaos).toBe(12)
    expect(card.actions[0]).toEqual({ label: 'Open League mechanics', tool: MECHANICS_TYPE })
  })
  it('finds members by a reward, and follows edited slots', () => {
    expect(betrayalLookup()('veiled', ctx).map(c => c.name)).toEqual(['Aisling'])
    const edited = betrayalLookup(() => ({ 'Tora|2': 'Crafting bench: veiled orb' }))
    expect(edited('veiled', ctx).map(c => c.name)).toEqual(['Aisling', 'Tora'])
  })
  it('stays out of short or unrelated searches', () => {
    expect(betrayalLookup()('ai', ctx)).toEqual([])
    expect(betrayalLookup()('mageblood', ctx)).toEqual([])
    expect(betrayalLookup()('scarab', ctx)).toEqual([])
    expect(betrayalLookup()('embers', ctx)).toEqual([])
    expect(betrayalLookup()('crafting bench', ctx)).toEqual([])
  })
})
