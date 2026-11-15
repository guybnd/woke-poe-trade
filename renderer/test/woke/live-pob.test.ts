// Your character written as a PoB build, and read back by the app's PoB reader.
import { describe, expect, it } from 'vitest'
import { parseBuild } from '../../../main/src/woke/pob-parse'
import { liveBuildXml, pobNativeText } from '@/web/woke/pob-builds/live-pob'
import type { CharacterSnapshot } from '@/web/woke/pob-builds/character'

const SNAP: CharacterSnapshot = {
  version: 1,
  account: 'a',
  readAt: 0,
  character: { name: 'whekq', league: 'Covens', class: 'Gladiator', level: 81 },
  gear: [
    { slot: 'Belt', item: { rarity: 'RARE', name: 'Horror Shackle', base: 'Heavy Belt', sockets: '', implicits: ['+31 to Strength'], mods: ['+80 to maximum Life', 'Hits can\'t be Evaded'], modKinds: ['', 'crafted'], corrupted: true } },
    { slot: 'Flask 1', item: { rarity: 'MAGIC', name: 'Seething Divine Life Flask of Warding', base: '', sockets: '', implicits: [], mods: ['Instant Recovery'] } }
  ],
  gems: [{ slot: 'Helmet', gems: [{ name: 'Elemental Hit', level: 19, quality: 5, support: false, colour: 'G' }, { name: 'Fortify Support', level: 19, quality: null, support: true, colour: 'R' }] }],
  tree: { nodes: [758, 1325], clusterNodes: [65600], masteries: { 4707: 29652 }, jewels: [], classId: 4, ascendClassId: 2 }
}

describe('live PoB build', () => {
  it('writes items in PoB\'s own text, crafted mods marked', () => {
    expect(pobNativeText(SNAP.gear[0].item)).toBe('Rarity: RARE\nHorror Shackle\nHeavy Belt\nImplicits: 1\n+31 to Strength\n+80 to maximum Life\n{crafted}Hits can\'t be Evaded\nCorrupted')
  })

  it('reads back with class, tree, gear and gems', () => {
    const d = parseBuild(liveBuildXml(SNAP, []).replace('treeVersion="latest"', 'treeVersion="3_29"'))
    expect([d.className, d.ascendClassName, d.level]).toEqual(['Duelist', 'Gladiator', 81])
    expect(d.trees[0].nodes).toEqual([758, 1325, 65600])
    expect(d.trees[0].masteries).toEqual({ 4707: 29652 })
    expect(d.itemSets?.[0].slots.map(s => s.item.name)).toEqual(['Horror Shackle', 'Seething Divine Life Flask of Warding'])
    expect(d.itemSets?.[0].slots[0].item.modKinds).toEqual(['', 'crafted'])
    expect(d.skills[0].gems.map(g => [g.name, g.level, g.quality])).toEqual([['Elemental Hit', 19, 5], ['Fortify', 19, 0]])
  })
})
