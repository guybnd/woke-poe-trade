// The hourly upstream data job merges upstream's item and stat files into ours
// (scripts/upstream-merge.mjs) instead of copying them whole: #651 lost
// Facetor's Lens, every Captured Beast and our stat refs that way.
import { describe, it, expect } from 'vitest'
import { findRenames, mergeData, newClashes } from '../../../scripts/upstream-merge.mjs'

type M = { string: string, value?: number, negate?: boolean }
const stat = (ref: string, ids: string[], matchers: Array<string | M> = [ref], extra: Record<string, unknown> = {}) => ({
  ref,
  better: 1,
  ...extra,
  matchers: matchers.map(m => typeof m === 'string' ? { string: m } : m),
  trade: { ids: { explicit: ids } }
})
const item = (name: string, namespace = 'ITEM', extra: Record<string, unknown> = {}) =>
  ({ name, refName: name, namespace, icon: '', ...extra })

describe('items', () => {
  it('keeps what only we added and what upstream dropped, takes what upstream added', () => {
    const base = [item('Abyss Scarab'), item('Chrome-touched Goliath', 'CAPTURED_BEAST'), item('Exalted Orb')]
    const ours = [...base, item("Facetor's Lens")]
    const theirs = [item('Exalted Orb', 'ITEM', { icon: 'exalt.png' }), item('Wickerman Torso')]
    const { list, count } = mergeData({ base, ours, theirs, kind: 'items' })
    expect(list.map(i => i.name).sort()).toEqual(['Abyss Scarab', 'Chrome-touched Goliath', 'Exalted Orb', "Facetor's Lens", 'Wickerman Torso'])
    expect(list.find(i => i.name === 'Exalted Orb')!.icon).toBe('exalt.png')
    expect(count).toMatchObject({ upstreamNew: 1, upstreamChanged: 1, kept: 1, keptDropped: 2 })
  })

  it('keeps our own change when upstream left the entry alone', () => {
    const base = [item('Mycelium Core')]
    const ours = [item('Mycelium Core', 'ITEM', { craftable: { category: 'Jewel' } })]
    const { list } = mergeData({ base, ours, theirs: base, kind: 'items' })
    expect(list).toEqual(ours)
  })

  it('takes upstream on a clash of plain values and keeps fields only we have', () => {
    const ours = [item('Putrid Seed', 'UNIQUE', { unique: { base: 'Mycelium Core' }, woke: 1 })]
    const theirs = [item('Putrid Seed', 'UNIQUE', { icon: 'seed.png', unique: { base: 'Mycelium Core', disenchantValue: 3.5 } })]
    const { list } = mergeData({ base: [], ours, theirs, kind: 'items' })
    expect(list).toEqual([{ ...theirs[0], woke: 1 }])
  })

  it('puts our extra entries back where they were', () => {
    const base = [item('A'), item('C')]
    const ours = [item('A'), item('B'), item('C')]
    const { list } = mergeData({ base, ours, theirs: [item('A'), item('C'), item('D')], kind: 'items' })
    expect(list.map(i => i.name)).toEqual(['A', 'B', 'C', 'D'])
  })
})

describe('stats', () => {
  const nearby = '#% increased Attack Speed while a Rare or Unique Enemy is Nearby'
  const metres = '#% increased Attack Speed while a Rare or Unique Enemy is within 6 metres'

  it('a stat upstream renamed keeps our ref and gets both wordings', () => {
    const base = [stat(nearby, ['explicit.stat_1'])]
    // Our launch-day patch added the new wording to our stat.
    const ours = [stat(nearby, ['explicit.stat_1'], [nearby, metres])]
    const theirs = [stat(metres, ['explicit.stat_1'])]
    const { list, count } = mergeData({ base, ours, theirs, kind: 'stats' })
    expect(list).toEqual([stat(nearby, ['explicit.stat_1'], [nearby, metres])])
    expect(count.renamed).toBe(1)
  })

  it('finds renames by trade id, one to one, and not onto a ref we already have', () => {
    const base = [stat('old a', ['explicit.stat_1']), stat('old b', ['explicit.stat_2']), stat('old c', ['explicit.stat_3']), stat('old d', ['explicit.stat_4'])]
    const ours = [...base, stat('new c', ['explicit.stat_3'])]
    const theirs = [
      stat('new a', ['explicit.stat_1']),
      stat('new b', ['explicit.stat_2', 'explicit.stat_4']),
      stat('new c', ['explicit.stat_3'])
    ]
    const renames = findRenames(base, ours, theirs)
    // b and d both point at "new b": neither is a rename.
    expect([...renames]).toEqual([['new a', 'old a']])
  })

  it('uses the English renames for another language', () => {
    const renames = new Map([[metres, nearby]])
    const base = [stat(nearby, ['explicit.stat_1'], ['# Nearby (ru)'])]
    const theirs = [stat(metres, ['explicit.stat_1'], ['# 6 metres (ru)'])]
    const { list } = mergeData({ base, ours: base, theirs, kind: 'stats', renames })
    expect(list.map(s => s.ref)).toEqual([nearby])
    expect(list[0].matchers).toEqual([{ string: '# Nearby (ru)' }, { string: '# 6 metres (ru)' }])
  })

  it('keeps our copy of a wording when upstream\'s leaves a field off', () => {
    const ref = 'Bathed in the blood of # sacrificed in the name of Xibaqua'
    const advanced = { string: ref, advanced: ref + '(Ahuana-Xibaqua)' }
    const base = [stat(ref, ['explicit.pseudo_x'], [advanced, 'old wording'])]
    const theirs = [stat(ref, ['explicit.pseudo_x'], [ref, 'new wording'])]
    const { list } = mergeData({ base, ours: base, theirs, kind: 'stats' })
    // Items still carry old wordings, so upstream taking one out keeps it.
    expect(list[0].matchers).toEqual([advanced, { string: 'old wording' }, { string: 'new wording' }])
  })

  it("a map mod's wording upstream took out goes: maps show today's wording", () => {
    const ref = 'Area is infested with Fungal Growths'
    const base = [stat(ref, ['implicit.stat_1'], ['old two lines'], { fromAreaMods: 'yes' })]
    const theirs = [stat(ref, ['implicit.stat_1'], ['new two lines'], { fromAreaMods: 'yes' })]
    const { list } = mergeData({ base, ours: base, theirs, kind: 'stats' })
    expect(list[0].matchers).toEqual([{ string: 'new two lines' }])
  })

  it('a placeholder wording upstream put on a pseudo stat is not taken', () => {
    const ref = 'Has Room: Throne of Atziri (Tier 3)'
    const base = [{ ...stat(ref, ['pseudo.temple_3'], ['Throne of Atziri (Tier 3)'], { better: 0 }), trade: { ids: { pseudo: ['pseudo.temple_3'] }, option: true } }]
    const theirs = [{ ...stat(ref, ['pseudo.temple_3'], [ref + ' ']), trade: { ids: { pseudo: ['pseudo.temple_3'] } } }]
    const { list, count } = mergeData({ base, ours: base, theirs, kind: 'stats' })
    expect(list).toEqual(base)
    expect(count.upstreamPlaceholder).toBe(1)
  })

  it('takes zero-width spaces out of upstream wordings', () => {
    const ref = 'Socketed Gems are Supported by Level # Empower Support'
    const ours = [stat(ref, ['explicit.effect_1'])]
    const theirs = [stat(ref, ['explicit.effect_1'], ['Socketed Gems are Supported by Level # ​Empower Support', { string: 'Socketed Gems are Supported by ​Empower Support', value: 1 }])]
    const { list } = mergeData({ base: [], ours, theirs, kind: 'stats' })
    expect(list[0].matchers).toEqual([{ string: ref }, { string: 'Socketed Gems are Supported by Empower Support', value: 1 }])
  })

  it('trade ids: upstream\'s, with our additions and removals on top', () => {
    const base = [stat('x', ['explicit.stat_1', 'explicit.stat_dead'])]
    const ours = [{ ...stat('x', ['explicit.stat_1', 'explicit.stat_new']), trade: { ids: { explicit: ['explicit.stat_1', 'explicit.stat_new'] } } }]
    const theirs = [{ ...stat('x', ['explicit.stat_1', 'explicit.stat_dead']), trade: { ids: { explicit: ['explicit.stat_1', 'explicit.stat_dead'], implicit: ['implicit.stat_1'] } } }]
    const { list } = mergeData({ base, ours, theirs, kind: 'stats' })
    expect(list[0].trade).toEqual({ ids: { explicit: ['explicit.stat_1', 'explicit.stat_new'], implicit: ['implicit.stat_1'] } })
  })

  it('a wording we added to a stat stays there; upstream\'s new stat for it is left out', () => {
    const rarity = '#% increased Rarity of Items found'
    const base = [stat(rarity, ['pseudo.rarity'])]
    const ours = [stat(rarity, ['pseudo.rarity'], [rarity, '#% to Item Rarity'])]
    const theirs = [stat(rarity, ['pseudo.rarity']), stat('+#% to Item Rarity', ['explicit.stat_9'], ['#% to Item Rarity'])]
    const { list, count } = mergeData({ base, ours, theirs, kind: 'stats' })
    expect(list).toEqual([{ ...ours[0], trade: { ids: { explicit: ['pseudo.rarity', 'explicit.stat_9'] } } }])
    expect(count.upstreamCovered).toBe(1)
    expect(newClashes(list, ours)).toEqual([])
  })

  it('upstream\'s new stat stays when it has other wordings of its own', () => {
    const ours = [stat('a', ['explicit.stat_1'], ['a', 'shared'])]
    const theirs = [stat('a', ['explicit.stat_1']), stat('b', ['explicit.stat_2'], ['b', 'shared'])]
    const { list } = mergeData({ base: [stat('a', ['explicit.stat_1'])], ours, theirs, kind: 'stats' })
    expect(list.map(s => [s.ref, s.matchers.map((m: M) => m.string)])).toEqual([['a', ['a', 'shared']], ['b', ['b']]])
  })

  it('a stat upstream dropped stays, without wordings an upstream stat now has', () => {
    const base = [stat('+# to Level of all Arcane Link Gems', ['explicit.skill_288'], ['# to Level of all Arcane Link Gems'])]
    const theirs = [stat('+# to Level of all Arcane Link Gems (Random Skill Gem)', ['explicit.skill_288'], ['# to Level of all Arcane Link Gems'])]
    // Not taken as a rename (say English didn't find it).
    const { list } = mergeData({ base, ours: base, theirs, kind: 'stats', renames: new Map() })
    expect(list.map(s => s.ref).sort()).toEqual(['+# to Level of all Arcane Link Gems', '+# to Level of all Arcane Link Gems (Random Skill Gem)'])
    expect(list.find(s => s.ref === '+# to Level of all Arcane Link Gems')!.matchers).toEqual([])
    expect(newClashes(list, base)).toEqual([])
  })

  it('reports a ref or wording the merge puts on two stats', () => {
    const ours = [stat('a', ['explicit.stat_1'], ['same'])]
    const merged = [...ours, stat('b', ['explicit.stat_2'], ['same']), stat('a', ['explicit.stat_1'])]
    expect(newClashes(merged, ours)).toEqual(['matcher: same', 'ref: a'])
  })
})
