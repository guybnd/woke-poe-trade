// "valdo <reward>" in the search palette, and the item text it price checks.
import { describe, it, expect, beforeAll } from 'vitest'
import { valdoLookup, valdoMapText } from '@/web/woke/search/lookups/valdo'
import type { LookupContext } from '@/web/woke/search/lookups/types'
import { loadGameData, parseItem } from '../helpers/game-data'

const row = (name: string, type: string) => ({ name, type, variant: '', chaos: 1 })
const ctx: LookupContext = {
  price: n => n === 'Headhunter' ? 9000 : null,
  items: [row('Headhunter', 'UniqueArmour'), row('Headhunter', 'UniqueArmour'), row('Mageblood', 'UniqueArmour'), row('Headhunter Map', 'UniqueMap'), row('Hrimsorrow', 'UniqueArmour')],
  tools: new Set(),
  divine: 200,
  now: 0,
  league: null
}
const lookup = valdoLookup(n => n !== 'Hrimsorrow')

describe('valdo lookup', () => {
  it('answers only queries that start with valdo', () => {
    expect(lookup('headhunter', ctx)).toEqual([])
    expect(lookup('valdonna', ctx)).toEqual([])
  })
  it('asks for a reward when none is typed', () => {
    const cards = lookup('valdo', ctx)
    expect(cards).toHaveLength(1)
    expect(cards[0].actions[0]).toEqual({ label: 'Type a reward', search: 'valdo ' })
    expect(lookup('valdo map ', ctx)[0].id).toBe('valdo-help')
  })
  it('finds a reward once, with its tooltip and price, and opens a check on a Valdo map', () => {
    const cards = lookup('valdo head', ctx)
    expect(cards.map(c => c.name)).toEqual(['Valdo map: Headhunter'])
    expect(cards[0].sections[0].rows![0]).toMatchObject({ chaos: 9000, item: { name: 'Headhunter' } })
    expect(cards[0].actions[0]).toEqual({ label: 'Price check', priceCheck: valdoMapText('Headhunter') })
  })
  it('leaves out uniques the price check could not read', () => {
    expect(lookup('valdo hrim', ctx)).toEqual([])
  })
})

describe('valdo map text', () => {
  beforeAll(loadGameData)
  it('parses as a Valdo map with that reward and no Void mod', () => {
    const item = parseItem(valdoMapText('Headhunter'))
    expect(item.mapCompletionReward?.refName).toBe('Headhunter')
    expect(item.newMods).toHaveLength(0)
  })
})
