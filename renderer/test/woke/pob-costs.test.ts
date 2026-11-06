// Stage costs and build comparison on small real-shaped builds.
import { beforeAll, describe, expect, it } from 'vitest'
import { stageCosts } from '@/web/woke/pob-builds/build-costs'
import { compareBuilds } from '@/web/woke/pob-builds/compare-builds'
import type { PobDetails, PobItem } from '@/web/woke/pob-builds/widget'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData)

const unique = (name: string, base: string) => ({ rarity: 'UNIQUE', name, base, sockets: '', implicits: [], mods: [] }) as PobItem
const rare = (base: string, mods: string[] = []) => ({ rarity: 'RARE', name: 'New Item', base, sockets: '', implicits: [], mods }) as PobItem

describe('stageCosts', () => {
  const d = {
    itemSets: [
      { title: 'Heading', isActive: false, slots: [], divider: true },
      { title: 'Start', isActive: false, slots: [{ slot: 'Helmet', item: rare('Hubris Circlet') }] },
      {
        title: 'End',
        isActive: true,
        slots: [
          { slot: 'Belt', item: unique("Kaom's Binding", 'Heavy Belt') },
          { slot: 'Boots', item: unique('Seven-League Step', 'Rawhide Boots') },
          { slot: 'Gloves', item: rare('Sorcerer Gloves') },
          { slot: 'Weapon 1 Swap', item: unique('Seven-League Step', 'Rawhide Boots') }
        ]
      }
    ]
  } as unknown as PobDetails

  it('adds priced uniques, counts rares, and leaves headings and swap out', () => {
    const costs = stageCosts(d, item => item.name === 'Seven-League Step' ? { chaos: 1000 } : null)
    expect(costs.map(c => c.title)).toEqual(['Start', 'End'])
    expect(costs[0]).toMatchObject({ chaos: 0, uniques: [] })
    expect(costs[0].rares).toHaveLength(1)
    expect(costs[1].chaos).toBe(1000)
    expect(costs[1].uniques.map(r => r.item.name)).toEqual(['Seven-League Step'])
    expect(costs[1].unpriced.map(r => r.item.name)).toEqual(["Kaom's Binding"])
    expect(costs[1].rares).toHaveLength(1)
    expect(costs[1].atLeast).toBe(true)
  })

  it('starts a range at its lowest, and adds jewels from the same-named tree', () => {
    const withTree = {
      itemSets: [{ title: 'End', isActive: true, slots: [{ slot: 'Belt', item: unique('Mageblood', 'Heavy Belt') }] }],
      trees: [{ title: 'End', isActive: true, url: '', nodes: [1, 2, 3], jewels: [unique('Watcher\'s Eye', 'Prismatic Jewel'), rare('Cobalt Jewel')] }]
    } as unknown as PobDetails
    const [cost] = stageCosts(withTree, item => item.name === 'Mageblood' ? { chaos: 13000, high: 90000 } : { chaos: 500 })
    expect(cost.chaos).toBe(13500)
    expect(cost.atLeast).toBe(true)
    expect(cost.uniques.map(r => r.slot)).toEqual(['Belt', 'Tree'])
    expect(cost.rares).toEqual([])
  })
})

describe('compareBuilds', () => {
  const build = (stats: PobDetails['stats'], helmet: PobItem, gems: string[], nodes: number[]) => ({
    stats,
    itemSets: [{ title: 'A', isActive: true, slots: [{ slot: 'Helmet', item: helmet }, { slot: 'Belt', item: unique('Same', 'Heavy Belt') }] }],
    skillSets: [{ title: 'A', isActive: true, groups: [{ label: '', slot: '', enabled: true, isMain: false, gems: gems.map(name => ({ name, level: 1, quality: 0, enabled: true })) }] }],
    trees: [{ title: 'A', url: '', isActive: true, nodes }],
    skills: []
  }) as unknown as PobDetails

  const r = compareBuilds(
    build({ CombinedDPS: 863627895, EnergyShield: 6845, TotalEHP: 1066135, FireResistOverCap: 76 }, rare('Lich\'s Circlet'), ['Arc', 'Hypothermia'], [1, 2, 3]),
    build({ CombinedDPS: 729571628, EnergyShield: 9365, TotalEHP: 2240135, FireResistOverCap: 48 }, unique('The Gull', 'Raven Mask'), ['Arc', 'Controlled Destruction'], [1, 2])
  )

  it('shows real changes with their direction', () => {
    const row = (label: string) => r.stats.find(s => s.label === label)!
    expect(row('DPS')).toMatchObject({ a: '863.6M', b: '729.6M', delta: '-15.5%', tone: 'down' })
    expect(row('Energy shield')).toMatchObject({ delta: '+2,520', tone: 'up' })
    expect(row('Total EHP')).toMatchObject({ delta: '+110%', tone: 'up' })
    expect(row('Fire over cap')).toMatchObject({ delta: '-28', tone: 'down' })
  })

  it('leaves out what is the same', () => {
    expect(r.gear.map(g => g.slot)).toEqual(['Helmet'])
    expect(r.gearTotal).toBe(2)
    expect(r.gemsOnlyA).toEqual(['Hypothermia'])
    expect(r.gemsOnlyB).toEqual(['Controlled Destruction'])
    expect(r.treeOnlyA).toBe(1)
    expect(r.treeOnlyB).toBe(0)
  })
})
