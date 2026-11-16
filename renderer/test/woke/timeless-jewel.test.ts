// Timeless jewel seed + conqueror mods. The stat data's advanced form ends the
// keystone name in an option range ("Asenath(Asenath-Nasima)"); 3.30 copy
// text leaves it out, so the plain text has to be found too.
import fs from 'fs'
import path from 'path'
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { FilterGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { buildStatIndexes } from '@/assets/data/build-indexes'

const STATS = fs.readFileSync(path.resolve(__dirname, '../../public/data/en/stats.ndjson'), 'utf-8')
const TIMELESS = STATS.split('\n').filter(l => l.includes('"modFamily"') && l.includes('Conquered by'))
  .map(l => JSON.parse(l) as { ref: string, matchers: Array<{ string: string, advanced?: string }> })

const NAMES: Record<string, string> = {
  'Vaal': 'Glorious Vanity',
  'Templars': 'Militant Faith',
  'Karui': 'Lethal Pride',
  'Eternal Empire': 'Elegant Hubris',
  'Maraketh': 'Brutal Restraint',
  'Kalguur': 'Heroic Tragedy'
}

function jewel (mod: string) {
  const name = NAMES[/Conquered by the (.+)$/.exec(mod)![1]]
  return parseItem(`Item Class: Jewels
Rarity: Unique
${name}
Timeless Jewel
--------
Limited to: 1 Historic
Radius: Large
--------
Item Level: 86
--------
{ Unique Modifier }
${mod}
--------
Place into an allocated Jewel Socket on the Passive Skill Tree. Right click to remove from the Socket.
`)
}

describe('timeless jewel mods', () => {
  beforeAll(loadGameData)

  it('covers every conqueror', () => {
    expect(TIMELESS.length).toBe(18)
  })

  for (const stat of TIMELESS) {
    const { string, advanced } = stat.matchers[0]
    for (const [label, text] of [
      ['3.30 copy', string.replace('#', '7993(500-8000)')],
      ['older advanced copy', advanced!.replace('#', '7993(500-8000)')],
      ['plain copy', string.replace('#', '7993')]
    ]) {
      it(`reads ${stat.ref} (${label})`, () => {
        const item = jewel(text)
        expect(item.unknownModifiers.map(m => m.text)).toEqual([])
        expect(item.statsByType.map(s => s.stat.ref)).toEqual([stat.ref])
        expect(item.statsByType[0].sources[0].stat.roll?.value).toBe(7993)
      })
    }
  }

  it('makes the seed search for all three conquerors on the real 3.30 copy', () => {
    const item = parseItem(fixture('items/unique-brutal-restraint-330.txt'))
    const groups = initUiModFilters(item, { searchStatRange: 10 })
      .filter((f): f is FilterGroup => 'group' in f && f.group === 'one')
    expect(groups).toHaveLength(1)
    const rows = groups[0].stats as StatFilter[]
    expect(rows.map(r => r.statRef).sort()).toEqual([
      'Denoted service of # dekhara in the akhara of Asenath',
      'Denoted service of # dekhara in the akhara of Balbala',
      'Denoted service of # dekhara in the akhara of Nasima'
    ])
    expect(rows.every(r => r.roll?.value === 7993)).toBe(true)
  })

  it('never indexes plain text another line already owns', () => {
    const line = (ref: string, string: string, advanced?: string) =>
      JSON.stringify({ ref, better: 1, matchers: [{ string, advanced }], trade: { ids: {} } }) + '\n'
    const a = line('a', 'Same text', 'Same text(X-Y)')
    const b = line('b', 'Same text', 'Same text(Z-W)')
    const c = line('c', 'Own text')
    const d = line('d', 'Own text', 'Own text(X-Y)')
    expect(buildStatIndexes(a + b).matchers.length / 2).toBe(2) // two advanced, shared plain dropped
    expect(buildStatIndexes(c + d).matchers.length / 2).toBe(2) // plain owned by c
    expect(buildStatIndexes(a).matchers.length / 2).toBe(2) // advanced + plain fallback
  })
})
