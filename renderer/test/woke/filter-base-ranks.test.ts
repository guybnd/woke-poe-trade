// The loot filter's own base ranks (base-ranks.json, NeverSink retirement
// M2): exotic x1/x2 and rare crafting ranks r1-r3, ours, seeded from
// NeverSink 8.21.1; Rare gear, Drop tiers and Base ranks read them.
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { baseRanks } from '@/web/woke/loot-filter/weights'
import { defaultGear, exoticBases, rankLists, rankSource, readTiered } from '@/web/woke/loot-filter/gear'
import { ownBaseText } from '@/web/woke/loot-filter/own-base'
import table from '@/web/woke/loot-filter/base-ranks.json'
import { neverSink } from '../helpers/neversink'

describe('own base ranks', () => {
  it('lists each base once, in every list', () => {
    const r = baseRanks()
    const all = [...r.x1, ...r.x2, ...r.r1, ...r.r2, ...r.r3]
    expect(new Set(all).size).toBe(all.length)
    for (const k of ['x1', 'x2', 'r1', 'r2', 'r3'] as const) expect(r[k].length).toBeGreaterThan(20)
    expect(r.x1).toContain('Simplex Amulet')
  })

  it('drives the Drop tiers ranks, whatever the base filter lists', () => {
    const doc = parseFilter(neverSink('6-UBER-PLUS-STRICT'))
    const src = readTiered(doc)!
    expect(src.ranks.r1).toEqual(table.r1)
    expect(src.ranks.r3).toEqual(table.r3)
  })

  it('fills Base ranks on our own base too, with no NeverSink rules (Guy 2026-11-28)', () => {
    const doc = parseFilter(ownBaseText('2-SEMI-STRICT'))
    expect(readTiered(doc)).toBe(null)
    const lists = rankLists(rankSource(doc), defaultGear())
    expect(lists.r1).toEqual(table.r1)
    expect(lists.r2.length).toBeGreaterThan(20)
    const ex = exoticBases(doc)
    expect(ex.get('Simplex Amulet')).toEqual(['exotic_valuable'])
    expect(ex.size).toBe(new Set([...table.x1, ...table.x2]).size)
  })

  it('ranks every talisman exotic, never trash (Guy 2026-11-28)', () => {
    const exotic = new Set([...table.x1, ...table.x2])
    const talismans = fs.readFileSync(path.resolve(__dirname, '../../public/data/en/items.ndjson'), 'utf8').split('\n')
      .filter(l => l.includes('"namespace":"ITEM"')).map(l => (JSON.parse(l) as { name: string }).name).filter(n => / Talisman$/.test(n))
    expect(talismans.length).toBeGreaterThan(60)
    expect(talismans.filter(n => !exotic.has(n))).toEqual([])
  })
})
