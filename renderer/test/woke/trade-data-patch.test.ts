// The launch-day data patch (scripts/trade-data-patch.mjs): only what changed
// between two trade-site snapshots reaches our data.
import { describe, it, expect } from 'vitest'
import { diff, matcherText, remap, remapIds, scope } from '../../../scripts/trade-data-patch.mjs'

const stat = (id: string, text: string, type = 'explicit') => ({ id, text, type })
type Line = { ref: string, better: number, matchers: Array<{ string: string }>, trade: { ids: Record<string, string[]> } }
const line = (ref: string, ids: Record<string, string[]>, matchers = [ref]): Line =>
  ({ ref, better: 1, matchers: matchers.map(string => ({ string })), trade: { ids } })

describe('items the hourly run must not add', () => {
  it('skips variant keys, nameless types and gems', () => {
    const r = diff({ stats: [], items: [], static: [] }, {
      stats: [],
      items: [
        { group: 'map', name: null, type: '43432', disc: 'blighted' },
        { group: 'sentinel', name: null, type: 'AbyssalTemplar', disc: 'warrant' },
        { group: 'currency', name: null, type: '12345' },
        { group: 'gem', name: null, type: 'Arcane Link' },
        { group: 'jewel', name: null, type: 'Mycelium Core' }
      ],
      static: []
    }, [], [])
    expect(r.newItems.map((i: { name: string }) => i.name)).toEqual(['Mycelium Core'])
    expect(r.skipped).toEqual(['gem: Arcane Link (no gem data)'])
  })
})

describe('moved trade stat ids', () => {
  it('moves a granted skill to its new id and new words, folding the stand-in stat', () => {
    const anger = line('Grants Level # Anger Skill', { explicit: ['explicit.stat_1'], implicit: ['implicit.stat_1'], fractured: ['fractured.stat_1'] })
    const heist = line('Grants Level # Anger Skill', { explicit: ['explicit.stat_2'] })
    const standIn = line('Grants Level # Anger', { explicit: ['explicit.effect_9'] })
    const lines: Array<Line | { stats: Line[] }> = [{ stats: [heist, anger] }, standIn]
    const before = [stat('explicit.stat_1', 'Grants Level # Anger Skill'), stat('implicit.stat_1', 'Grants Level # Anger Skill', 'implicit'), stat('explicit.stat_2', 'Grants Level # Anger Skill')]
    const after = [stat('explicit.stat_2', 'Grants Level # Anger Skill'), stat('explicit.effect_9', 'Grants Level # Anger'), stat('implicit.effect_9', 'Grants Level # Anger', 'implicit')]
    const r = remap({ stats: before }, { stats: after }, lines)
    expect(anger.trade.ids).toEqual({ explicit: ['explicit.effect_9'], implicit: ['implicit.effect_9'] })
    expect(anger.matchers.map(m => m.string)).toEqual(['Grants Level # Anger Skill', 'Grants Level # Anger'])
    // Heist's older stat with the same words keeps its own live id.
    expect(heist.trade.ids).toEqual({ explicit: ['explicit.stat_2'] })
    expect(lines).toEqual([{ stats: [heist, anger] }])
    expect(r.dropped.map((d: { id: string }) => d.id)).toEqual(['fractured.stat_1'])
    expect(r.folded).toHaveLength(1)
  })

  it('reads "Support", a fixed level and a renamed support as the same stat', () => {
    const lines = [
      line('Socketed Gems are supported by Level # Chance to Bleed', { explicit: ['explicit.stat_3'] }),
      line('Socketed Gems are Supported by Level # Chance To Bleed', { explicit: ['explicit.stat_4'] }),
      line('Grants Level 20 Summon Bestial Rhoa Skill', { explicit: ['explicit.stat_5|1'] }),
      line('Socketed Gems are Supported by Level # Cluster Trap', { explicit: ['explicit.stat_6'] })
    ]
    const after = [
      stat('explicit.effect_3', 'Socketed Gems are Supported by Level # Chance to Bleed Support'),
      stat('explicit.effect_5', 'Grants Level # Summon Bestial Rhoa'),
      stat('explicit.effect_6', 'Socketed Gems are Supported by Level # Cluster Traps Support')
    ]
    remap({ stats: [] }, { stats: after }, lines)
    expect(lines.map(l => l.trade.ids.explicit)).toEqual([['explicit.effect_3'], ['explicit.effect_3'], ['explicit.effect_5'], ['explicit.effect_6']])
    // Only one of the two stats that moved to one id takes its words.
    expect(lines[0].matchers).toHaveLength(2)
    expect(lines[1].matchers).toHaveLength(1)
    expect(lines[2].matchers.map(m => m.string)).toContain('Grants Level # Summon Bestial Rhoa')
  })

  it('never takes an id the snapshot already had, and drops a dead id with no new one', () => {
    const lines = [line('Socketed Gems are Supported by Level # Added Fire Damage', { explicit: ['explicit.stat_7'] }), line('Scarabs dropped in your Maps are odd', { explicit: ['explicit.stat_8'] })]
    const old = stat('explicit.indexable_support_1', 'Socketed Gems are Supported by Level # Added Fire Damage')
    const r = remap({ stats: [old] }, { stats: [old] }, lines)
    expect(lines.map(l => l.trade.ids)).toEqual([{}, {}])
    expect(r.moved).toEqual([])
    expect(r.dropped).toHaveLength(2)
  })

  it('gives a renumbered option id to the stat that now owns it', () => {
    const fresh = line('Helmet supported by level # Fresh Meat', { explicit: ['explicit.stat_1|1|149'] })
    const freshOld = line('Helmet supported by level # Fresh Meat', { explicit: ['explicit.stat_1|1|150'] },
      ['Helmet supported by level # Fresh Meat', 'Helmet supported by level # Greater Multiple Projectiles'])
    const gmp = line('Helmet supported by level # Greater Multiple Projectiles', { explicit: ['explicit.stat_1|1|1'] })
    const lines: Array<Line | { stats: Line[] }> = [{ stats: [fresh, freshOld] }, gmp]
    const r = remap(
      { stats: [stat('explicit.stat_1|1|150', 'Helmet supported by level # Fresh Meat'), stat('explicit.stat_1|1|1', 'Helmet supported by level # Greater Multiple Projectiles')] },
      { stats: [stat('explicit.stat_1|1|149', 'Helmet supported by level # Fresh Meat'), stat('explicit.stat_1|1|150', 'Helmet supported by level # Greater Multiple Projectiles')] },
      lines)
    expect(gmp.trade.ids).toEqual({ explicit: ['explicit.stat_1|1|150'] })
    expect(lines[0]).toEqual({ stats: [fresh] })
    expect(r.renumbered).toHaveLength(1)
  })

  it('moves or drops dead ids in other languages the way English did', () => {
    const ru = [line('Даёт Гнев', { explicit: ['explicit.stat_1', 'explicit.stat_2'], fractured: ['fractured.stat_1'] })]
    const n = remapIds(ru, new Set(['explicit.effect_1', 'explicit.stat_2']), new Map([['explicit.stat_1', 'explicit.effect_1']]))
    expect(ru[0].trade.ids).toEqual({ explicit: ['explicit.effect_1', 'explicit.stat_2'] })
    expect(n).toBe(1)
  })

  it('changes nothing on a second run', () => {
    const lines = [line('Grants Level # Haste Skill', { explicit: ['explicit.stat_9'] })]
    const after = { stats: [stat('explicit.effect_10', 'Grants Level # Haste')] }
    remap({ stats: [] }, after, lines)
    const once = JSON.stringify(lines)
    const r = remap({ stats: [] }, after, lines)
    expect(JSON.stringify(lines)).toBe(once)
    expect(r.moved).toEqual([])
  })
})

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
    const ours = [{ ref: '+# to maximum Life', better: 1, matchers: [{ string: '# to maximum Life' }], trade: { ids: { explicit: ['explicit.stat_3'] } as Record<string, string[]> } }]
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
    expect(r.newItems.map((i: { name: string }) => i.name)).toEqual(['Abyss Thread', 'Mycelium Core', 'New Ring', "Sirus' Head"])
    expect(r.skipped).toEqual(['armour: Odd Plate (no category)'])
    expect(matcherText('Adds # to # Physical Damage (Local)')).toBe('Adds # to # Physical Damage')
    expect(matcherText('+#% to Item Rarity')).toBe('#% to Item Rarity')
  })

  it('scopes a run to one item group and the implicits it carries, leaving skill grants alone', () => {
    const after = {
      stats: [stat('implicit.stat_1', '#% chance to gain Elusive on Kill', 'implicit'), stat('explicit.stat_2', 'Some explicit'),
        stat('implicit.effect_3', 'Grants Level # Vitality', 'implicit'), stat('implicit.stat_4', 'Socketed Gems are Supported by Level # Pierce', 'implicit')],
      items: [{ group: 'viscera', name: null, type: 'Ghostly Claw' }, { group: 'jewel', name: null, type: 'Mycelium Core' }],
      static: [{ group: 'Currency', id: 'x', text: 'X', image: '' }]
    }
    const r = diff({ stats: [], items: [], static: [] }, scope(after, 'viscera'), [], [])
    expect(r.newStats.map((s: { ref: string }) => s.ref)).toEqual(['#% chance to gain Elusive on Kill'])
    expect(r.newItems).toEqual([{ name: 'Ghostly Claw', refName: 'Ghostly Claw', namespace: 'ITEM', craftable: { category: 'Viscera' }, icon: '' }])
    expect(() => scope(after, 'jewel')).toThrow(/No scoped run/)
  })
})
