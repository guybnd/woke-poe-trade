// The launch-day data patch (scripts/trade-data-patch.mjs): only what changed
// between two trade-site snapshots reaches our data.
import { describe, it, expect } from 'vitest'
import { diff, matcherText } from '../../../scripts/trade-data-patch.mjs'

const stat = (id: string, text: string, type = 'explicit') => ({ id, text, type })

describe('trade data patch', () => {
  it('adds a reworded text as another matcher of the same stat', () => {
    const ours = [{ ref: 'Inflict Barnacles on nearby Enemies', better: 1, matchers: [{ string: 'Inflict Barnacles on nearby Enemies' }], trade: { ids: { explicit: ['explicit.stat_1'] } } }]
    const r = diff(
      { stats: [stat('explicit.stat_1', 'Inflict Barnacles on nearby Enemies')], items: [], static: [] },
      { stats: [stat('explicit.stat_1', 'Inflict Barnacles on Enemies within 5 metres')], items: [], static: [] },
      ours, [])
    expect(ours[0].matchers.map(m => m.string)).toEqual(['Inflict Barnacles on nearby Enemies', 'Inflict Barnacles on Enemies within 5 metres'])
    expect(r.reworded).toHaveLength(1)
  })

  it('ignores an id that already had the text under another of its lines', () => {
    const before = [stat('explicit.stat_2', 'Strongboxes in your Maps are Corrupted'), stat('explicit.stat_2', 'Strongboxes in Area are Corrupted')]
    const r = diff({ stats: before, items: [], static: [] }, { stats: [...before].reverse(), items: [], static: [] },
      [{ ref: 'x', better: 1, matchers: [{ string: 'Strongboxes in Area are Corrupted' }], trade: { ids: { explicit: ['explicit.stat_2'] } } }], [])
    expect(r.reworded).toEqual([])
  })

  it('gives a new id with a known text to that stat instead of a second stat', () => {
    const ours = [{ ref: '+# to maximum Life', better: 1, matchers: [{ string: '+# to maximum Life' }], trade: { ids: { explicit: ['explicit.stat_3'] } as Record<string, string[]> } }]
    const r = diff({ stats: [], items: [], static: [] }, { stats: [stat('scourge.stat_3', '+# to maximum Life', 'scourge')], items: [], static: [] }, ours, [])
    expect(r.newStats).toEqual([])
    expect(ours[0].trade.ids.scourge).toEqual(['scourge.stat_3'])
  })

  it('adds new stats once per text, new uniques, bases and exchange items', () => {
    const r = diff(
      { stats: [], items: [{ group: 'jewel', name: null, type: 'Cobalt Jewel' }], static: [] },
      {
        stats: [stat('explicit.stat_9', '#% increased Thread Effect (Local)'), stat('fractured.stat_9', '#% increased Thread Effect', 'fractured'), stat('pseudo.x', 'Pseudo thing', 'pseudo')],
        items: [{ group: 'jewel', name: null, type: 'Cobalt Jewel' }, { group: 'jewel', name: null, type: 'Mycelium Core' }, { group: 'accessory', name: 'New Ring', type: 'Gold Ring' }, { group: 'armour', name: null, type: 'Odd Plate' }, { group: 'trophy', name: null, type: "Sirus' Head" }],
        static: [{ group: 'Currency', id: 'abyss-thread', text: 'Abyss Thread', image: '/gen/x.png' }]
      },
      [], [{ refName: 'Cobalt Jewel' }])
    expect(r.newStats).toEqual([{ ref: '#% increased Thread Effect', better: 1, matchers: [{ string: '#% increased Thread Effect' }], trade: { ids: { explicit: ['explicit.stat_9'], fractured: ['fractured.stat_9'] } } }])
    expect(r.newItems.map((i: { name: string }) => i.name)).toEqual(['Mycelium Core', 'New Ring', "Sirus' Head", 'Abyss Thread'])
    expect(r.skipped).toEqual(['armour: Odd Plate (no category)'])
    expect(matcherText('Adds # to # Physical Damage (Local)')).toBe('Adds # to # Physical Damage')
  })
})
