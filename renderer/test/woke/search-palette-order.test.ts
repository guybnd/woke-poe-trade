// Search palette: the order of result groups. A tool named like the query
// wins over lookup cards that happen to match it.
import { describe, it, expect } from 'vitest'
import { arrangeSections } from '@/web/woke/search/search'
import { zoneFacts, zoneLookup } from '@/web/woke/search/lookups/zones'
import { routeData, routeSources } from '@/web/woke/campaign/route-data'
import { EXAMPLES } from '@/web/woke/search/lookups/examples'
import type { LookupContext } from '@/web/woke/search/lookups/types'

interface E { id: string, name: string }
const zones = zoneFacts(routeSources, routeData)
const tools: E[] = [{ id: 't:market', name: 'Market' }, { id: 't:atlas', name: 'Atlas strategies' }]

function first (query: string, toolHits: E[]): E | undefined {
  const cards = zoneLookup(zones)(query, {} as LookupContext).map(c => ({ id: c.id, name: c.name }))
  const sections = arrangeSections<E>(query, {
    answer: [],
    items: [],
    cards: [{ label: 'Zones', entries: cards }],
    tools: toolHits,
    rest: [],
    web: []
  })
  return sections[0]?.entries[0]
}

describe('arrangeSections', () => {
  it('selects the Market tool for "market", ahead of The Marketplace', () => {
    expect(zoneLookup(zones)('market', {} as LookupContext).map(c => c.name)).toEqual(['The Marketplace'])
    expect(first('market', [tools[0]])).toEqual(tools[0])
    expect(EXAMPLES.find(e => e.query === 'market')!.shows).toBe('Opens Market')
  })
  it('keeps cards first when no tool name starts with the query', () => {
    expect(first('marketplace', [])!.name).toBe('The Marketplace')
    expect(first('the coast', [])!.name).toBe('The Coast')
  })
  it('leaves out empty groups', () => {
    expect(arrangeSections<E>('x', { answer: [], items: [{ label: 'Prices', entries: [] }], cards: [], tools: [], rest: [], web: [] })).toEqual([])
  })
})
