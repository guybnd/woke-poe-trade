import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { ascendancyShown, cheapest, classOf, forbiddenNotables, groupsFor, jewelQuery, jewelText, pairEstimate, ONLY_HERE } from '@/web/woke/forbidden/notables'
import type { StatLike, TreeNodeLike } from '@/web/woke/forbidden/notables'
import { forbiddenLookup } from '@/web/woke/search/lookups/forbidden'
import type { LookupContext } from '@/web/woke/search/lookups/types'

// The app's own stat and tree data, as the window reads them.
const DATA = path.join(__dirname, '../../public/data')
const stats: StatLike[] = fs.readFileSync(path.join(DATA, 'en/stats.ndjson'), 'utf8').split('\n')
  .filter(l => l.includes('matching modifier on Forbidden')).map(l => JSON.parse(l) as StatLike)
type Row = [number, number, number, string, string, string[], number[], string, number, number, number, string?]
const nodes = new Map((JSON.parse(fs.readFileSync(path.join(DATA, 'tree/passive-tree.json'), 'utf8')) as { nodes: Row[] }).nodes
  .map(r => [r[0], { name: r[4], stats: r[5], asc: r[11] } satisfies TreeNodeLike]))
const all = forbiddenNotables(stats, id => nodes.get(id))

describe('forbiddenNotables', () => {
  it('pairs Flame and Flesh by node, with both trade stats', () => {
    const bb = all.find(n => n.name === 'Bone Barrier')!
    expect(bb).toMatchObject({ cls: 'Witch', group: 'Necromancer', flameStat: 'explicit.stat_1190333629', fleshStat: 'explicit.stat_2460506030' })
    expect(bb.stats.length).toBeGreaterThan(0)
  })

  it('gives every class its three ascendancies and its own notable', () => {
    for (const cls of ['Duelist', 'Marauder', 'Ranger', 'Shadow', 'Templar', 'Witch'] as const) {
      const groups = new Set(all.filter(n => n.cls === cls).map(n => n.group))
      expect([...groups].sort(), cls).toHaveLength(4)
      expect(groups.has(ONLY_HERE), cls).toBe(true)
    }
    expect(all.find(n => n.name === 'Nine Lives')).toMatchObject({ cls: 'Witch', group: ONLY_HERE })
    expect(all.filter(n => n.cls === 'Scion').map(n => n.group)).toContain('Ascendant')
  })

  it('shows the Warden by its name, and leaves out notables the tree no longer has', () => {
    expect(all.find(n => n.name === 'Oath of Spring')).toMatchObject({ cls: 'Ranger', group: 'Warden' })
    expect(all.some(n => n.group === 'Raider')).toBe(false)
    expect(all.some(n => n.name === "Tawhoa, Forest's Strength")).toBe(false)
  })

  it('drops a notable with only one jewel', () => {
    const one = forbiddenNotables([stats.find(s => s.ref.includes('Bone Barrier') && s.ref.endsWith('Flame'))!], id => nodes.get(id))
    expect(one).toEqual([])
  })
})

describe('classOf and ascendancyShown', () => {
  it('reads classes, ascendancies and the Warden', () => {
    expect(classOf('Necromancer')).toBe('Witch')
    expect(classOf('Warden')).toBe('Ranger')
    expect(classOf('Witch')).toBe('Witch')
    expect(classOf('None')).toBeNull()
    expect(ascendancyShown('Warden')).toBe('Warden')
    expect(ascendancyShown('Raider')).toBe('Warden')
    expect(ascendancyShown('Witch')).toBeNull()
  })
})

describe('groupsFor', () => {
  it('puts your ascendancy first and the jewels\' own notable last', () => {
    const g = groupsFor(all, 'Witch', 'Occultist')
    expect(g.map(x => x.group)).toEqual(['Occultist', 'Elementalist', 'Necromancer', ONLY_HERE])
    expect(g[0].mine).toBe(true)
  })
})

describe('jewelQuery', () => {
  it('searches one jewel by its stat with the node as the option', () => {
    const bb = all.find(n => n.name === 'Bone Barrier')!
    expect(jewelQuery(bb, 'flesh', 'securable')).toEqual({
      query: {
        status: { option: 'securable' },
        name: 'Forbidden Flesh',
        type: 'Cobalt Jewel',
        stats: [{ type: 'and', filters: [{ id: 'explicit.stat_2460506030', value: { option: bb.node } }] }]
      },
      sort: { price: 'asc' }
    })
  })
})

describe('jewelText', () => {
  it('writes each jewel naming the other, as the game does', () => {
    const bb = all.find(n => n.name === 'Bone Barrier')!
    const flesh = jewelText(bb, 'flesh').split('\n')
    expect(flesh.slice(0, 4)).toEqual(['Item Class: Jewels', 'Rarity: Unique', 'Forbidden Flesh', 'Cobalt Jewel'])
    expect(flesh).toContain('Allocates Bone Barrier if you have the matching modifier on Forbidden Flame')
    expect(jewelText(bb, 'flame')).toContain('Crimson Jewel')
    expect(jewelText(bb, 'flame')).toContain('matching modifier on Forbidden Flesh')
  })
})

describe('prices', () => {
  it('estimates a pair only from exactly two rows', () => {
    expect(pairEstimate([{ chaos: 100 }, { chaos: 250 }])).toBe(350)
    expect(pairEstimate([{ chaos: 100 }])).toBeNull()
    expect(pairEstimate([{ chaos: 100 }, { chaos: 0 }])).toBeNull()
    expect(pairEstimate([{ chaos: 1 }, { chaos: 2 }, { chaos: 3 }])).toBeNull()
  })

  it('takes the cheapest listing, divines at the rate', () => {
    expect(cheapest([{ priceAmount: 2, priceCurrency: 'divine' }, { priceAmount: 300, priceCurrency: 'chaos' }, { priceAmount: 1, priceCurrency: 'exalted' }], 9, 200))
      .toEqual({ chaos: 300, listings: 9 })
    expect(cheapest([], 0, 200)).toEqual({ chaos: null, listings: 0 })
  })
})

describe('forbiddenLookup', () => {
  const ctx = (items: Array<{ type: string, name: string, chaos: number }>): LookupContext => ({
    price: () => null,
    items: items.map(i => ({ ...i, variant: '' })),
    tools: new Set(['woke-forbidden']),
    divine: 200,
    now: 0,
    league: null
  })

  it('finds a notable\'s pair with poe.ninja\'s price of both jewels', () => {
    const cards = forbiddenLookup(all)('bone barrier', ctx([{ type: 'ForbiddenJewel', name: 'Bone Barrier', chaos: 400 }, { type: 'ForbiddenJewel', name: 'Bone Barrier', chaos: 600 }]))
    const card = cards.find(c => c.name === 'Bone Barrier')!
    expect(card.sub).toBe('Forbidden pair · Necromancer')
    expect(card.sections[1].rows?.at(-1)).toMatchObject({ chaos: 1000 })
    expect(card.actions[0]).toEqual({ label: 'Open in the finder', open: { tool: 'woke-forbidden', id: 'Bone Barrier' } })
  })

  it('offers the tool for "forbidden", and nothing with the tool off', () => {
    expect(forbiddenLookup(all)('forbidden', ctx([])).map(c => c.id)).toContain('forbidden-finder')
    expect(forbiddenLookup(all)('forbidden', { ...ctx([]), tools: new Set() })).toEqual([])
  })
})
