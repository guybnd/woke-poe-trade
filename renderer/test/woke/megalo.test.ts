import { describe, it, expect } from 'vitest'
import { buildTags, defaultOn, megaloQuery, notablePool, notableTags, scoreNotables, suggestedMinWeight, tagWeights, MAX_TRADE_FILTERS } from '@/web/woke/megalo/score'
import { TAGS } from '@/web/woke/megalo/tags'

// Real notable text from the tree data's cluster list.
const NAMED = {
  'Feasting Fiends': { stats: ['Minions have 10% increased maximum Life', 'Minions deal 10% increased Damage', 'Minions Leech 0.4% of Damage as Life'], key: 0 },
  'Renewal': { stats: ['Minions Regenerate 1% of Life per second', 'Minions have 5% chance to deal Double Damage while they are on Full Life'], key: 0 },
  'Cremator': { stats: ['30% increased Fire Damage', 'Ignited Enemies Killed by your Hits are destroyed'], key: 0 },
  'Master of Fire': { stats: ['Enemies within 3 metres have Fire Exposure'], key: 0 },
  'Fettle': { stats: ['+20 to maximum Life', '10% increased maximum Life'], key: 0 },
  'Haemorrhage': { stats: ['+10% to Damage over Time Multiplier for Ailments from Critical Strikes', '30% increased Critical Strike Chance'], key: 0 },
  'Purposeful Harbinger': { stats: ['Auras from your Skills have 8% increased Effect on you for\neach Herald affecting you, up to a maximum of 40%'], key: 0 },
  'Disciple of Kitava': { stats: ['Every 4 seconds, Regenerate...'], key: 1 }
}

const srsBuild = {
  mainGems: ['Summon Raging Spirit', 'Minion Damage Support', 'Melee Splash Support'],
  gems: ['Summon Raging Spirit', 'Herald of Purity', 'Flesh Offering', 'Anger', 'Fettle'],
  stats: { Life: 4800, EnergyShield: 300, MinionTotalDPS: 2_000_000, CombinedDPS: 1000 }
}

describe('megalo tags', () => {
  it('every tag id is unique', () => {
    expect(new Set(TAGS.map(t => t.id)).size).toBe(TAGS.length)
  })
  it('lists about as many tags as the mock promised', () => {
    expect(TAGS.length).toBeGreaterThan(100)
  })
})

describe('notablePool', () => {
  it('drops cluster keystones and splits wrapped lines', () => {
    const pool = notablePool(NAMED)
    expect(pool.map(n => n.name)).not.toContain('Disciple of Kitava')
    expect(pool.find(n => n.name === 'Purposeful Harbinger')!.stats).toEqual(['Auras from your Skills have 8% increased Effect on you for', 'each Herald affecting you, up to a maximum of 40%'])
  })
})

describe('notableTags', () => {
  it("doesn't call minion life your life", () => {
    const tags = notableTags({ name: 'x', stats: NAMED['Feasting Fiends'].stats })
    expect(tags.has('Minions')).toBe(true)
    expect(tags.has('Life')).toBe(false)
    expect(tags.has('Leech')).toBe(true)
  })
})

describe('buildTags', () => {
  it('reads a minion build', () => {
    const f = buildTags(srsBuild)
    expect(f.main).toEqual(expect.arrayContaining(['Minions', 'Raging Spirits', 'Fire']))
    expect(f.found).toEqual(expect.arrayContaining(['Heralds', 'Auras', 'Offerings', 'Life', 'Minion damage']))
    expect(f.found).not.toContain('Energy shield')
  })
  it('spots Chaos Inoculation', () => {
    expect(buildTags({ mainGems: [], gems: [], stats: { Life: 1, EnergyShield: 9000 } }).found).toEqual(['Energy shield', 'Chaos Inoculation'])
  })
})

describe('scoreNotables', () => {
  const rows = scoreNotables(notablePool(NAMED), tagWeights(buildTags(srsBuild), { add: [], drop: [] }))
  const w = (n: string) => rows.find(r => r.name === n)!.weight
  it('puts minion notables first and your own fire damage low', () => {
    expect(rows[0].name).toBe('Feasting Fiends')
    expect(w('Feasting Fiends')).toBe(100)
    expect(w('Cremator')).toBeLessThan(w('Renewal'))
    expect(rows.find(r => r.name === 'Cremator')!.weak).toContain('Fire')
  })
  it('weights are steps of 5 from 0 to 100', () => {
    for (const r of rows) expect(r.weight % 5 === 0 && r.weight >= 0 && r.weight <= 100).toBe(true)
  })
  it('a dropped tag stops counting', () => {
    const noHerald = scoreNotables(notablePool(NAMED), tagWeights(buildTags(srsBuild), { add: [], drop: ['Heralds', 'Auras'] }))
    expect(noHerald.find(r => r.name === 'Purposeful Harbinger')!.score).toBe(0)
  })
  it('ticks decent fits by default', () => {
    expect(defaultOn(rows).has('Feasting Fiends')).toBe(true)
    expect(defaultOn(rows).has('Haemorrhage')).toBe(false)
  })
})

describe('review fixes', () => {
  const tagsOf = (...stats: string[]) => [...notableTags({ name: 'x', stats }).keys()]
  it('Critical Strike is not a Strike, Energy Shield not a Shield', () => {
    expect(tagsOf('30% increased Critical Strike Chance')).not.toContain('Strikes')
    expect(tagsOf('15% increased maximum Energy Shield')).not.toContain('Shield')
    expect(tagsOf('+5% Chance to Block Attack Damage while holding a Shield')).toContain('Shield')
  })
  it('your resistances and blocks are not a kind of damage or skill', () => {
    expect(tagsOf('+20% to Cold Resistance')).not.toContain('Cold')
    expect(tagsOf('+5% Chance to Block Attack Damage')).not.toContain('Attacks')
    expect(tagsOf('+5% chance to Suppress Spell Damage')).not.toContain('Spells')
    expect(tagsOf('Enemies Ignited by you have -5% to Fire Resistance')).toContain('Fire')
  })
  it('movement skills and crit supports tag nothing else', () => {
    const f = buildTags({ mainGems: ['Boneshatter', 'Brutality Support'], gems: ['Flame Dash', 'Frostblink', 'Increased Critical Strikes Support'] })
    expect(f.found).not.toContain('Fire')
    expect(f.found).not.toContain('Cold')
    expect(f.found).toContain('Movement skills')
    expect(buildTags({ mainGems: ['Arc', 'Increased Critical Strikes Support'], gems: [] }).found).not.toContain('Strikes')
  })
  it("minions' damage lines count little on a build of your own", () => {
    const pool = notablePool({ Mine: { stats: ['30% increased Fire Damage'] }, Theirs: { stats: ['Minions deal 30% increased Fire Damage'] } })
    const rows = scoreNotables(pool, tagWeights({ found: ['Fire'], main: ['Fire'] }, { add: [], drop: [] }))
    expect(rows[0].name).toBe('Mine')
    expect(rows.find(r => r.name === 'Theirs')!.weak).toContain('Fire')
  })
})

describe('megaloQuery', () => {
  const picks = [{ statId: 'explicit.stat_1', weight: 100 }, { statId: 'explicit.stat_2', weight: 60 }]
  it('writes a count group', () => {
    expect(megaloQuery(picks, { mode: 'count', need: 2, minWeight: 0, maxDiv: 5 })).toEqual({
      name: 'Megalomaniac',
      type: 'Medium Cluster Jewel',
      stats: [{ type: 'count', value: { min: 2 }, filters: [{ id: 'explicit.stat_1' }, { id: 'explicit.stat_2' }] }],
      filters: { trade_filters: { filters: { price: { max: 5, option: 'divine' } } } }
    })
  })
  it('writes a weighted sum group with no price filter', () => {
    const q = megaloQuery(picks, { mode: 'weight', need: 2, minWeight: 150, maxDiv: null })
    expect(q.stats[0]).toEqual({ type: 'weight', value: { min: 150 }, filters: [{ id: 'explicit.stat_1', value: { weight: 100 } }, { id: 'explicit.stat_2', value: { weight: 60 } }] })
    expect('filters' in q).toBe(false)
  })
  it('stops at the trade limit', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ statId: `s${i}`, weight: 5 }))
    expect(megaloQuery(many, { mode: 'count', need: 2, minWeight: 0, maxDiv: null }).stats[0].filters).toHaveLength(MAX_TRADE_FILTERS)
  })
  it('must-haves are an and group and count toward need', () => {
    const three = [{ statId: 'a', weight: 100, must: true }, { statId: 'b', weight: 60 }, { statId: 'c', weight: 40 }]
    expect(megaloQuery(three, { mode: 'count', need: 2, minWeight: 0, maxDiv: null }).stats).toEqual([
      { type: 'and', filters: [{ id: 'a' }] },
      { type: 'count', value: { min: 1 }, filters: [{ id: 'b' }, { id: 'c' }] }
    ])
    const two = three.map(p => ({ ...p, must: p.statId !== 'c' }))
    expect(megaloQuery(two, { mode: 'count', need: 2, minWeight: 0, maxDiv: null }).stats).toEqual([{ type: 'and', filters: [{ id: 'a' }, { id: 'b' }] }])
    const w = megaloQuery(three, { mode: 'weight', need: 2, minWeight: 150, maxDiv: null }).stats
    expect(w[0]).toEqual({ type: 'and', filters: [{ id: 'a' }] })
    expect(w[1].filters).toHaveLength(3)
  })
  it('suggests a total two good fits reach', () => {
    expect(suggestedMinWeight([40, 100, 85])).toBe(185)
  })
})
