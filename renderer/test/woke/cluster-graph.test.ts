// Cluster jewel subtrees (WOKEPOET-205), laid out the way Path of Building
// does. The data is the shipped tree file; the jewels are real ones.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { buildClusters, readClusterJewel } from '@/web/woke/pob-builds/cluster-graph'
import type { ClusterData } from '@/web/woke/pob-builds/cluster-graph'
import { readNodes } from '@/web/woke/pob-builds/passive-tree'
import type { PobItem } from '@/web/woke/pob-builds/widget'

const file = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/data/tree/passive-tree.json'), 'utf8'))
const data = file.clusters as ClusterData
const nodes = readNodes(file.nodes)

const item = (over: Partial<PobItem>): PobItem => ({ rarity: 'RARE', name: 'Doom Spark', base: 'Large Cluster Jewel', sockets: '', implicits: [], mods: [], ...over })

const LARGE = item({
  implicits: ['Adds 8 Passive Skills', '2 Added Passive Skills are Jewel Sockets', 'Added Small Passive Skills grant: 12% increased Fire Damage'],
  mods: ['1 Added Passive Skill is Prodigious Defence', '1 Added Passive Skill is Advance Guard']
})

describe('cluster jewels in the PoB tree', () => {
  it('reads what a cluster jewel adds', () => {
    const j = readClusterJewel(LARGE, data)!
    expect(j.template.size).toBe('Large')
    expect(j.skill).toBe('affliction_fire_damage')
    expect(j.nodeCount).toBe(8)
    expect(j.socketCount).toBe(2)
    expect(j.notables).toEqual(['Prodigious Defence', 'Advance Guard'])
  })

  it('reads a skill whose enchant is two lines', () => {
    const j = readClusterJewel(item({ implicits: ['Adds 8 Passive Skills', 'Added Small Passive Skills grant: Axe Attacks deal 12% increased Damage with Hits and Ailments', 'Added Small Passive Skills grant: Sword Attacks deal 12% increased Damage with Hits and Ailments'] }), data)!
    expect(j.skill).toBe('affliction_axe_and_sword_damage')
  })

  it('grows a large cluster off an outer socket with PoB\'s node ids', () => {
    const [outer] = Object.entries(data.sockets).find(([, s]) => s.size === 2)!
    const built = buildClusters(data, nodes, id => id === Number(outer) ? LARGE : undefined, 100)
    // 2 sockets, 2 notables, 4 small passives.
    expect(built.nodes.length).toBe(8)
    expect(built.nodes.filter(n => n.kind === 'jewel')).toHaveLength(2)
    expect(built.nodes.filter(n => n.kind === 'notable').map(n => n.name).sort()).toEqual(['Advance Guard', 'Prodigious Defence'])
    const s = data.sockets[outer]
    const base = 0x10000 + (s.index << 6) + (2 << 4)
    for (const n of built.nodes.filter(n => n.kind !== 'jewel')) expect(n.id - base).toBeGreaterThanOrEqual(0)
    // All on the large ring around the proxy group.
    const [gx, gy] = data.proxies[s.proxy]
    for (const n of built.nodes) expect(Math.abs(Math.hypot(n.x - gx, n.y - gy) - data.orbitRadii[3])).toBeLessThan(2)
  })

  // Every cluster node a real PoB build allocated exists in what's grown here.
  const builds = path.join(process.env.USERPROFILE ?? '', 'Documents/Path of Building/Builds')
  it.runIf(fs.existsSync(builds))('matches the cluster node ids in real PoB builds', async () => {
    const { parseBuild } = await import('../../../main/src/woke/pob-parse')
    const files: string[] = []
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) walk(p)
        else if (p.endsWith('.xml')) files.push(p)
      }
    }
    walk(builds)
    let checked = 0
    for (const f of files) {
      const xml = fs.readFileSync(f, 'utf8')
      if (!xml.includes('Cluster Jewel')) continue
      const d = parseBuild(xml)
      for (const spec of d.trees) {
        const at = new Map((spec.sockets ?? []).map(s => [s.node, s.item]))
        const grown = new Set(buildClusters(data, nodes, id => at.get(id), 0).nodes.map(n => n.id))
        const wanted = spec.nodes.filter(id => id >= 0x10000)
        if (!wanted.length) continue
        checked++
        expect(wanted.filter(id => !grown.has(id)), `${path.basename(f)} / ${spec.title}`).toEqual([])
      }
    }
    console.log(`checked ${checked} trees with cluster points`)
  })
})
