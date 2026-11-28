// Base families on Base ranks (Guy, 2026-11-28): read from the item art.
import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { familyIndex, familyOf, foldFamilies, matchFamilies } from '@/web/woke/loot-filter/base-families'

const icons = new Map<string, string>()
for (const line of fs.readFileSync(path.resolve(__dirname, '../../public/data/en/items.ndjson'), 'utf8').split('\n')) {
  if (!line) continue
  const d = JSON.parse(line) as { name: string, namespace: string, icon?: string }
  if (d.namespace === 'ITEM' && d.icon && !icons.has(d.name)) icons.set(d.name, d.icon)
}
const fam = (b: string) => familyOf(b, icons.get(b))?.id ?? null

describe('base families', () => {
  it('names each family from the art', () => {
    expect(fam('Ape Talisman')).toBe('talisman')
    expect(fam('Carrion Queen Talisman')).toBe('talisman')
    expect(fam('Runic Crown')).toBe('runic')
    expect(fam('Runic Sabatons')).toBe('runic')
    expect(fam('Cogwork Ring')).toBe('heist')
    expect(fam('Accumulator Wand')).toBe('heist')
    expect(fam('Heat-attuned Tower Shield')).toBe('heist')
    expect(fam('Synaptic Ring')).toBe('breachring')
    expect(fam('Dusk Ring')).toBe('lakering')
    expect(fam('Trapsetter Gloves')).toBe('ritual')
    expect(fam('Vaal Regalia')).toBeNull()
  })

  it('folds three or more of a family into one row at its first base', () => {
    const f = (b: string) => b.startsWith('T') ? { id: 't', label: 'Ts' } : null
    expect(foldFamilies(['A', 'T1', 'B', 'T2', 'T3'], f)).toEqual([
      { kind: 'base', base: 'A' },
      { kind: 'family', family: { id: 't', label: 'Ts' }, bases: ['T1', 'T2', 'T3'] },
      { kind: 'base', base: 'B' }
    ])
    // Two aren't folded.
    expect(foldFamilies(['T1', 'B', 'T2'], f).every(r => r.kind === 'base')).toBe(true)
  })

  it('the add box offers a family by its name or by a base of it', () => {
    const f = (b: string) => familyOf(b, icons.get(b))
    const index = familyIndex([...icons.keys()], f)
    expect(index.get('talisman')!.bases).toContain('Mandible Talisman')
    expect(matchFamilies('talis', [], index, f).map(x => x.id)).toEqual(['talisman'])
    expect(matchFamilies('mandible', ['Mandible Talisman'], index, f).map(x => x.id)).toEqual(['talisman'])
    expect(matchFamilies('regalia', ['Vaal Regalia'], index, f)).toEqual([])
    expect(matchFamilies('t', [], index, f)).toEqual([])
  })
})
