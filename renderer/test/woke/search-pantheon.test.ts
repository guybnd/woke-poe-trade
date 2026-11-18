// Search palette: Pantheon gods, their powers and upgrade souls.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { godCard, godKills, pantheonLookup } from '@/web/woke/search/lookups/pantheon'
import type { PantheonData, PantheonGod } from '@/web/woke/search/lookups/pantheon'
import { zoneFacts } from '@/web/woke/search/lookups/zones'
import { routeData, routeSources } from '@/web/woke/campaign/route-data'
import { EXAMPLES } from '@/web/woke/search/lookups/examples'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const data = JSON.parse(readFileSync(join(__dirname, '../../public/data/pantheon-data.json'), 'utf8')) as PantheonData
const zones = zoneFacts(routeSources, routeData)
const ctx = {} as LookupContext
const god = (name: string) => data.gods.find(g => g.name === name)!

describe('pantheon-data.json', () => {
  it('has the four major and eight minor gods, each with its own soul first', () => {
    expect(data.gods.filter(g => g.major).map(g => g.name).sort()).toEqual(['Arakaali', 'Lunaris', 'Solaris', 'The Brine King'])
    expect(data.gods.filter(g => !g.major)).toHaveLength(8)
    for (const g of data.gods) expect(g.souls[0].name).toMatch(/^Soul of /)
  })
})

describe('godKills', () => {
  it('finds where the route kills the god, not its harbinger', () => {
    expect(godKills(god('Lunaris'), zones).map(k => [k.boss, k.zone.name, k.zone.act])).toEqual([['Lunaris, Eternal Moon', 'The Harbour Bridge', 8]])
    expect(godKills(god('The Brine King'), zones).map(k => k.boss)).toEqual(['Tsoagoth, The Brine King'])
  })
})

describe('godCard', () => {
  const fake: PantheonGod = {
    id: 'Test',
    name: 'Testgod',
    major: false,
    souls: [
      { name: 'Soul of Testgod', lines: ['Power one'] },
      { name: 'Boss A', lines: ['Upgrade one'], map: 'Reef' },
      { name: 'Boss B', lines: ['Upgrade two'] }
    ]
  }
  it('gives the base power, then each upgrade with its map', () => {
    const card = godCard(fake)
    expect(card.sub).toBe('Minor god · 2 upgrades')
    expect(card.sections[0]).toMatchObject({ label: 'Base power · Minor god', text: ['Power one'], rows: [] })
    expect(card.sections[1]).toEqual({ label: 'Upgrade 1 · Boss A', text: ['Upgrade one'], rows: [{ label: 'Soul from', value: 'Reef Map boss' }] })
    expect(card.sections[2].rows).toEqual([{ label: 'Soul from', value: "Map not in poedb's data", dim: true }])
    expect(card.sections.at(-1)!.text![0]).toMatch(/Divine Vessel/)
  })
  it('says where the god is killed', () => {
    const rows = godCard(god('Lunaris'), zones).sections[0].rows!
    expect(rows).toEqual([{ label: 'Unlocked by', value: 'Lunaris, Eternal Moon · Act 8, The Harbour Bridge' }])
  })
})

describe('pantheonLookup', () => {
  const lookup = pantheonLookup(data, zones)
  it('finds a god by name, "Soul of", or an upgrade soul', () => {
    expect(lookup('soul of lunaris', ctx).map(c => c.name)).toEqual(['Lunaris'])
    expect(lookup('soul of the brine king', ctx).map(c => c.name)).toEqual(['The Brine King'])
    expect(lookup('shock and horror', ctx).map(c => c.name)).toEqual(['Lunaris'])
    expect(lookup('captured soul of thraxia', ctx).map(c => c.name)).toEqual(['Arakaali'])
  })
  it('lists every god for "pantheon", majors first', () => {
    const cards = lookup('pantheon', ctx)
    expect(cards).toHaveLength(12)
    expect(cards.slice(0, 4).every(c => c.sub.startsWith('Major'))).toBe(true)
  })
  it('waits for the data and four letters', () => {
    expect(pantheonLookup(null)('lunaris', ctx)).toEqual([])
    expect(lookup('lun', ctx)).toEqual([])
    expect(lookup('soul', ctx)).toEqual([])
    expect(lookup('soul of', ctx)).toEqual([])
  })
  it('takes a short start after "Soul of"', () => {
    expect(lookup('soul of yug', ctx).map(c => c.name)).toEqual(['Yugul'])
    expect(lookup('soul of shak', ctx).map(c => c.name)).toEqual(['Shakari'])
    expect(lookup('yug', ctx)).toEqual([])
  })
  it('answers its example', () => {
    expect(EXAMPLES.some(e => e.query === 'soul of lunaris')).toBe(true)
  })
})
