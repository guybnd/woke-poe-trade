// Search palette passive tree lookup, on the real tree data.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { passiveList, treeLookup } from '@/web/woke/search/lookups/tree'
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
