// Cluster jewels grow small passive trees off the outer jewel sockets
// (WOKEPOET-205). The game's tree data has no nodes for them: this lays them
// out the way Path of Building does (PassiveSpec:BuildSubgraph, MIT), with the
// same node ids PoB saves in a build's allocated list, so a build's points on
// a cluster light up here as they do in PoB.
import type { TreeNode } from './passive-tree'
import type { PobItem } from './widget'

export interface ClusterTemplate {
  size: 'Small' | 'Medium' | 'Large'
  sizeIndex: number
  minNodes: number
  maxNodes: number
  small: number[]
  notable: number[]
  socket: number[]
  total: number
  skills: Record<string, { name: string, icon: string, stats: string[], enchant: string[] }>
}

export interface ClusterData {
  // Socket node id -> where it sits in the cluster scheme.
  sockets: Record<string, { size: number, index: number, proxy: number, parent?: number }>
  // Proxy node id -> its group's x, y, and the proxy's own orbit and index.
  proxies: Record<string, [number, number, number, number]>
  // Notables and keystones a cluster can add, by name.
  named: Record<string, { stats: string[], icon: string, key: number }>
  jewels: Record<string, ClusterTemplate>
  sortOrder: Record<string, number>
  keystones: string[]
  orbitOffsets: Record<string, Record<string, number>>
  orbitRadii: number[]
  skillsPerOrbit: number[]
}

// What a cluster jewel's text says it adds (PoB's ModParser jewel data).
export interface ClusterJewelData {
  template: ClusterTemplate
  skill: string | null
  nodeCount: number | null
  socketCount: number
  nothingness: number
  notables: string[]
  keystone: string | null
  addedMods: string[]
}

export function readClusterJewel (item: PobItem, data: ClusterData): ClusterJewelData | null {
  const sizeName = /(Small|Medium|Large) Cluster Jewel/.exec(item.base || item.name)?.[0]
  const template = sizeName ? data.jewels[sizeName] : undefined
  if (!template) return null
  const lines = [...item.implicits, ...item.mods]
  const lower = lines.map(l => l.toLowerCase())
  let skill: string | null = item.clusterSkill ?? null
  if (!skill) {
    for (const [tag, s] of Object.entries(template.skills)) {
      // A skill's enchant can be two lines (trap and mine, axe and sword...).
      if (s.enchant.length && s.enchant.every(e => lower.includes(e.toLowerCase()))) { skill = tag; break }
    }
  }
  // Small and Medium curse clusters read alike; each size has its own skill.
  if (skill === 'affliction_curse_effect' && template.size === 'Small') skill = 'affliction_curse_effect_small'
  if (skill === 'affliction_curse_effect_small' && template.size === 'Medium') skill = 'affliction_curse_effect'
  if (skill && !template.skills[skill]) skill = null

  let nodeCount: number | null = item.clusterNodeCount ?? null
  let socketCount = 0
  let socketOverride: number | null = null
  let nothingness = 0
  const notables: string[] = []
  let keystone: string | null = null
  const addedMods: string[] = []
  const names = new Map(Object.keys(data.sortOrder).map(n => [n.toLowerCase(), n]))
  const keystones = new Map(data.keystones.map(k => [k.toLowerCase(), k]))
  for (const l of lower) {
    let m
    if ((m = /^adds (\d+) passive skills$/.exec(l))) nodeCount ??= Number(m[1])
    else if (l === '1 added passive skill is a jewel socket') socketCount = 1
    else if ((m = /^(\d+) added passive skills are jewel sockets$/.exec(l))) socketCount = Number(m[1])
    else if ((m = /^adds (\d+) jewel socket passive skills?$/.exec(l))) socketOverride = Number(m[1])
    else if ((m = /^adds (\d+) small passive skills? which grants? nothing$/.exec(l))) nothingness = Number(m[1])
    else if ((m = /^1 added passive skill is (.+)$/.exec(l)) && names.has(m[1])) notables.push(names.get(m[1])!)
    else if ((m = /^adds (.+)$/.exec(l)) && keystones.has(m[1])) keystone = keystones.get(m[1])!
  }
  for (const l of lines) {
    const m = /^Added Small Passive Skills also grant: (.+)$/i.exec(l)
    if (m) addedMods.push(m[1])
  }
  if (nodeCount != null) nodeCount = Math.min(Math.max(nodeCount, template.minNodes), template.maxNodes)
  if (!keystone && !skill && !nothingness && !notables.length) return null
  return { template, skill, nodeCount, socketCount: socketOverride ?? socketCount, nothingness, notables, keystone, addedMods }
}

// What a small passive that grants nothing looks like, as in PoB.
export const NOTHINGNESS_ICON = 'Art/2DArt/SkillIcons/passives/MasteryBlank.png'

// Cluster template index space <-> the tree's orbit index space.
function translate (oidx: number, from: number, to: number): number {
  if (from === to) return oidx
  if (from === 12 && to === 16) return [0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15][oidx]
  if (from === 16 && to === 12) return [0, 1, 1, 2, 3, 4, 4, 5, 6, 7, 7, 8, 9, 10, 10, 11][oidx]
  if (from === 6 && to === 16) return [0, 3, 5, 8, 11, 13][oidx]
  if (from === 16 && to === 6) return [0, 0, 0, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 5][oidx]
  return Math.floor(oidx * to / from)
}

const ANGLES_16 = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]
const ANGLES_40 = [0, 10, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 135, 140, 150, 160, 170, 180, 190, 200, 210, 220, 225, 230, 240, 250, 260, 270, 280, 290, 300, 310, 315, 320, 330, 340, 350]
function orbitAngle (perOrbit: number, index: number): number {
  const deg = perOrbit === 16 ? ANGLES_16[index] : perOrbit === 40 ? ANGLES_40[index] : index * 360 / perOrbit
  return deg * Math.PI / 180
}

interface Built {
  nodes: TreeNode[]
  // Centres of the cluster rings, as groups for drawing orbit arcs.
  groups: Array<[number, number, string, number]>
}

// Every cluster subtree in a tree: for each large outer socket holding a
// cluster jewel, and recursively for the sockets those add. `groupBase` is the
// tree art's group count, so the rings' groups follow it.
export function buildClusters (
  data: ClusterData,
  base: Map<number, TreeNode>,
  jewelAt: (node: number) => PobItem | undefined,
  groupBase: number
): Built {
  const out: Built = { nodes: [], groups: [] }
  for (const [sid, socket] of Object.entries(data.sockets)) {
    if (socket.size !== 2) continue
    const parent = base.get(Number(sid))
    const item = jewelAt(Number(sid))
    if (!parent || !item) continue
    const jewel = readClusterJewel(item, data)
    if (jewel) subgraph(data, jewel, parent, Number(sid), 0x10000, jewelAt, out, groupBase)
  }
  return out
}

function subgraph (
  data: ClusterData,
  jewel: ClusterJewelData,
  parent: TreeNode,
  parentId: number,
  idIn: number,
  jewelAt: (node: number) => PobItem | undefined,
  out: Built,
  groupBase: number
) {
  const exp = data.sockets[parentId]
  const t = jewel.template
  let id = idIn
  if (exp.size === 2) id += exp.index << 6
  else if (exp.size === 1) id += exp.index << 9
  const nodeId = id + (t.sizeIndex << 4)
  const proxy = data.proxies[exp.proxy]
  if (!proxy) return
  const [gx, gy] = proxy
  const group = groupBase + out.groups.length
  out.groups.push([gx, gy, '', 0])
  const link = (a: TreeNode, b: TreeNode) => { a.out.push(b.id) }

  const place = (n: TreeNode, orbit: number, oidx: number) => {
    const per = data.skillsPerOrbit[orbit]
    const a = orbitAngle(per, oidx)
    const r = data.orbitRadii[orbit]
    n.x = Math.round(gx + r * Math.sin(a))
    n.y = Math.round(gy - r * Math.cos(a))
    n.radius = r
    n.angle = Math.round(a * 1000) / 1000
  }
  const make = (id: number, kind: TreeNode['kind'], name: string, stats: string[], icon: string): TreeNode =>
    ({ id, x: 0, y: 0, kind, name, stats, out: [], icon, group, radius: 0, angle: 0 })

  if (jewel.keystone) {
    const k = data.named[jewel.keystone]
    const n = make(nodeId, 'key', jewel.keystone, k?.stats ?? [], k?.icon ?? '')
    place(n, 0, 0)
    // From the new node: the tree's own nodes are never changed.
    link(n, parent)
    out.nodes.push(n)
    return
  }

  const notables = jewel.notables
    .filter(name => data.named[name] && data.sortOrder[name] != null)
    .sort((a, b) => data.sortOrder[a] - data.sortOrder[b])
  const skill = jewel.skill ? t.skills[jewel.skill] : null
  const socketCount = jewel.socketCount
  const notableCount = notables.length
  const nodeCount = jewel.nodeCount ?? (socketCount + notableCount + jewel.nothingness)
  const smallCount = nodeCount - socketCount - notableCount
  const orbit = t.sizeIndex + 1
  const indicies = new Map<number, TreeNode>()
  const children: Array<{ node: TreeNode, socketId: number }> = []

  // Sockets: the inner sockets of this proxy group, by their index.
  const findSocket = (jewelIndex: number): number | null => {
    for (const [sid, s] of Object.entries(data.sockets)) {
      if (s.parent === parentId && s.index === jewelIndex) return Number(sid)
    }
    return null
  }
  const makeSocket = (nodeIndex: number, jewelIndex: number) => {
    const sid = findSocket(jewelIndex)
    if (sid == null) return
    const n = make(sid, 'jewel', 'Jewel Socket', [], '')
    indicies.set(nodeIndex, n)
    children.push({ node: n, socketId: sid })
  }
  if (t.size === 'Large' && socketCount === 1) makeSocket(6, 1)
  else {
    const order = [0, 2, 1]
    for (let i = 0; i < Math.min(socketCount, t.socket.length); i++) makeSocket(t.socket[i], order[i])
  }

  // Notables.
  const notableIdx: number[] = []
  for (let nodeIndex of t.notable) {
    if (notableIdx.length === notableCount) break
    if (t.size === 'Medium') {
      if (socketCount === 0 && notableCount === 2) {
        if (nodeIndex === 6) nodeIndex = 4
        else if (nodeIndex === 10) nodeIndex = 8
      } else if (nodeCount === 4) {
        if (nodeIndex === 10) nodeIndex = 9
        else if (nodeIndex === 2) nodeIndex = 3
      }
    }
    if (!indicies.has(nodeIndex)) notableIdx.push(nodeIndex)
  }
  notableIdx.sort((a, b) => a - b)
  notables.forEach((name, i) => {
    const at = notableIdx[i]
    if (at == null) return
    const k = data.named[name]
    indicies.set(at, make(nodeId + at, 'notable', name, k.stats, k.icon))
  })

  // Small passives.
  const smallIdx: number[] = []
  for (let nodeIndex of t.small) {
    if (smallIdx.length === smallCount) break
    if (t.size === 'Medium') {
      if (nodeCount === 5 && nodeIndex === 4) nodeIndex = 3
      else if (nodeCount === 4) {
        if (nodeIndex === 8) nodeIndex = 9
        else if (nodeIndex === 4) nodeIndex = 3
      }
    }
    if (!indicies.has(nodeIndex)) smallIdx.push(nodeIndex)
  }
  for (let i = 0; i < smallCount; i++) {
    const at = smallIdx[i]
    if (at == null) break
    const stats = skill ? [...skill.stats, ...jewel.addedMods] : [...jewel.addedMods]
    indicies.set(at, make(nodeId + at, 'small', skill?.name ?? 'Nothingness', stats, skill?.icon ?? NOTHINGNESS_ICON))
  }

  const entrance = indicies.get(0)
  if (!entrance) return

  // Template index space -> the tree's orbit index space, then a place.
  const per = data.skillsPerOrbit[orbit]
  const start = data.orbitOffsets[exp.proxy]?.[t.sizeIndex] ?? 0
  for (const [i, n] of indicies) place(n, orbit, translate((i + start) % t.total, t.total, per))

  // Links around the ring (closed for Medium and Large), and into the socket.
  let first: TreeNode | null = null
  let last: TreeNode | null = null
  for (let i = 0; i < t.total; i++) {
    const n = indicies.get(i)
    if (!n) continue
    if (!first) first = n
    if (last) link(last, n)
    last = n
  }
  if (first && last && first !== last && t.size !== 'Small') link(last, first)
  link(entrance, parent)
  out.nodes.push(...indicies.values())

  // Jewels in this cluster's sockets: a smaller cluster grows its own tree.
  for (const { node, socketId } of children) {
    const item = jewelAt(socketId)
    const inner = item ? readClusterJewel(item, data) : null
    if (inner) subgraph(data, inner, node, socketId, id, jewelAt, out, groupBase)
  }
}
