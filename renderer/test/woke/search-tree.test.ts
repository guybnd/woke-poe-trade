// Search palette passive tree lookup, on the real tree data.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { passiveList, treeLookup, withOils } from '@/web/woke/search/lookups/tree'
import { notableOils, oilNames } from '@/web/price-check/filters/pseudo/anointments'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const data = JSON.parse(readFileSync(join(__dirname, '../../public/data/tree/passive-tree.json'), 'utf8'))
const nodes = (data.nodes as Array<[number, number, number, string, string, string[]]>).map(n => ({ kind: n[3], name: n[4], stats: n[5] }))
const passives = passiveList(nodes, data.clusters.named)
const lookup = treeLookup(passives)
const ctx = {} as LookupContext

describe('treeLookup', () => {
  it('shows a keystone with what it does', () => {
    const [card] = lookup('resolute', ctx)
    expect(card.name).toBe('Resolute Technique')
    expect(card.sub).toBe('Keystone')
    expect(card.sections[0].text).toEqual(["Your hits can't be Evaded", 'Never deal Critical Strikes'])
  })
  it('finds ascendancy and cluster jewel notables', () => {
    expect(lookup('bringer of ruin', ctx)[0].sub).toBe('Ascendancy notable')
    expect(lookup('lord of drought', ctx)[0].sub).toBe('Cluster jewel notable')
  })
  it('keeps same-named nodes of each kind, and stat-less ascendancy notables', () => {
    expect(lookup('sanctuary', ctx).map(c => c.sub)).toEqual(expect.arrayContaining(['Notable', 'Ascendancy notable']))
    expect(lookup('coated blade', ctx)[0].name).toBe('Coated Blade')
  })
  it('needs four letters, and lists no small passives', () => {
    expect(lookup('res', ctx)).toEqual([])
    expect(passives.some(p => p.name === 'Strength')).toBe(false)
    expect(treeLookup(null)('resolute', ctx)).toEqual([])
  })
})

// The game's anoint recipes, as the app's stat data carries them.
const stats = new Map<string, unknown>(readFileSync(join(__dirname, '../../public/data/en/stats.ndjson'), 'utf8')
  .split('\n').filter(Boolean).map(l => { const s = JSON.parse(l); return [s.ref, s] }))
const statByRef = (ref: string) => stats.get(ref)

describe('notable anoint oils', () => {
  it('reads recipes cheapest first, matching poedb', () => {
    expect(notableOils('Acrimony', statByRef)).toEqual(['Clear Oil', 'Black Oil', 'Black Oil'])
    expect(notableOils('Acuity', statByRef)).toEqual(['Clear Oil', 'Violet Oil', 'Black Oil'])
    expect(oilNames('10,1,8')).toEqual(['Clear Oil', 'Violet Oil', 'Black Oil'])
  })
  it("gives nothing for what can't be anointed", () => {
    expect(notableOils('Resolute Technique', statByRef)).toBeUndefined()
    expect(notableOils('Not A Notable', statByRef)).toBeUndefined()
  })
  it('finds a recipe inside a stat group', () => {
    const group = { stats: [{ ref: 'Allocates Hematophagy', anointments: [{ oils: '8,10,12' }] }, { ref: 'Allocates Vampirism', anointments: [{ oils: '3,5,8' }] }] }
    expect(notableOils('Vampirism', () => group)).toEqual(['Amber Oil', 'Teal Oil', 'Violet Oil'])
  })
  it('shows the oils with prices and a total on a notable card', () => {
    const list = withOils(passives, n => notableOils(n, statByRef))
    const prices: Record<string, number> = { 'Clear Oil': 1, 'Azure Oil': 2, 'Black Oil': 5, 'Prismatic Oil': 0.5 }
    const priced = { price: (n: string) => prices[n] ?? null } as unknown as LookupContext
    const [card] = treeLookup(list)("sione's ambition", priced)
    const anoint = card.sections.find(s => s.label === 'Anoint')!
    expect(anoint.rows!.map(r => [r.label, r.chaos])).toEqual([
      ['Prismatic Oil', 0.5], ['Azure Oil', 2], ['Black Oil', 5], ['Total', 7.5]
    ])
    // A missing price leaves the total blank rather than short.
    const partial = { price: (n: string) => n === 'Black Oil' ? 5 : null } as unknown as LookupContext
    const rows = treeLookup(list)("sione's ambition", partial)[0].sections.find(s => s.label === 'Anoint')!.rows!
    expect(rows.at(-1)).toMatchObject({ label: 'Total', chaos: null })
  })
  it('only notables on the tree get oils', () => {
    const list = withOils(passives, n => notableOils(n, statByRef))
    expect(list.filter(p => p.oils).every(p => p.kind === 'Notable')).toBe(true)
    expect(list.filter(p => p.oils).length).toBeGreaterThan(300)
    expect(treeLookup(list)('resolute', ctx)[0].sections.some(s => s.label === 'Anoint')).toBe(false)
  })
})
