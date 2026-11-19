// woke: where each notable sits on a cluster jewel (Guy's pick A, WOKEPOET-367).
// The jewel's passives are laid out on a ring the way the game and Path of Building
// do it (PassiveSpec:BuildSubgraph, also in pob-builds/cluster-graph.ts): sockets
// first, then notables in the game's sort order, then small passives. "Front" is
// the notable fewest points from where the jewel joins the tree, "back" the most.
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { NOTABLE_ORDER, TEMPLATES } from './layout-data'
import type { ClusterSize } from './types'

export interface ClusterSpot {
  /** Passives to allocate to reach it, the jewel's entry included. */
  points: number
  /** Only when the jewel's notables differ: front is nearest, back farthest. */
  side: 'front' | 'middle' | 'back' | null
}

const ORDER = new Map(NOTABLE_ORDER.map((n, i) => [n, i]))

export function clusterSpots (size: ClusterSize, nodeCount: number | null, socketCount: number, notableNames: string[]): Map<string, ClusterSpot> {
  const t: { total: number, small: readonly number[], notable: readonly number[], socket: readonly number[], min: number, max: number } = TEMPLATES[size]
  const out = new Map<string, ClusterSpot>()
  const notables = notableNames.filter(n => ORDER.has(n)).sort((a, b) => ORDER.get(a)! - ORDER.get(b)!)
  if (!notables.length) return out
  const notableCount = notables.length
  let nodes = nodeCount ?? (socketCount + notableCount)
  nodes = Math.min(Math.max(nodes, t.min), t.max)
  const smallCount = nodes - socketCount - notableCount

  const at = new Map<number, string>() // ring index -> what is there
  if (size === 'Large' && socketCount === 1) {
    at.set(6, 'socket')
  } else {
    for (let i = 0; i < Math.min(socketCount, t.socket.length); i++) at.set(t.socket[i], 'socket')
  }

  const notableIdx: number[] = []
  for (let i of t.notable) {
    if (notableIdx.length === notableCount) break
    if (size === 'Medium') {
      if (socketCount === 0 && notableCount === 2) {
        if (i === 6) i = 4
        else if (i === 10) i = 8
      } else if (nodes === 4) {
        if (i === 10) i = 9
        else if (i === 2) i = 3
      }
    }
    if (!at.has(i)) notableIdx.push(i)
  }
  notableIdx.sort((a, b) => a - b)
  notables.forEach((name, k) => { if (notableIdx[k] != null) at.set(notableIdx[k], name) })

  let smalls = 0
  for (let i of t.small) {
    if (smalls === smallCount) break
    if (size === 'Medium') {
      if (nodes === 5 && i === 4) i = 3
      else if (nodes === 4) {
        if (i === 8) i = 9
        else if (i === 4) i = 3
      }
    }
    if (!at.has(i)) { at.set(i, 'small'); smalls++ }
  }
  if (!at.has(0)) return out

  // The ring: each passive links to the next present one; Medium and Large close it.
  const ring = [...at.keys()].sort((a, b) => a - b)
  const links = new Map<number, number[]>(ring.map(i => [i, []]))
  const join = (a: number, b: number) => { links.get(a)!.push(b); links.get(b)!.push(a) }
  for (let k = 1; k < ring.length; k++) join(ring[k - 1], ring[k])
  if (size !== 'Small' && ring.length > 2) join(ring[ring.length - 1], ring[0])
  const dist = new Map<number, number>([[0, 1]])
  const queue = [0]
  while (queue.length) {
    const i = queue.shift()!
    for (const j of links.get(i)!) {
      if (!dist.has(j)) { dist.set(j, dist.get(i)! + 1); queue.push(j) }
    }
  }

  const points = notables.map((name, k) => dist.get(notableIdx[k]) ?? 0)
  const lo = Math.min(...points)
  const hi = Math.max(...points)
  notables.forEach((name, k) => {
    const p = points[k]
    if (!p) return
    out.set(name, { points: p, side: lo === hi ? null : p === lo ? 'front' : p === hi ? 'back' : 'middle' })
  })
  return out
}

const NOTABLE = '1 Added Passive Skill is '
const PASSIVES = 'Adds # Passive Skills'

/**
 * Marks each notable row of a non-unique cluster jewel with where it sits, and
 * lists the notable rows front first (the others keep their places).
 */
export function markClusterSpots (filters: FilterOrGroup[], size: ClusterSize): void {
  const rows = filters.filter((s): s is StatFilter => !('group' in s && s.group))
  const nodeCount = rows.find(s => s.statRef === PASSIVES)?.roll?.value ?? null
  // "1 Added Passive Skill is a Jewel Socket" parses onto this row too, as 1.
  const sockets = rows.find(s => s.statRef === '# Added Passive Skills are Jewel Sockets')?.roll?.value ?? 0
  const notableRows = rows.filter(s => s.statRef.startsWith(NOTABLE))
  // A notable the tree data doesn't know (a new league's) shifts every slot: no tags beat wrong ones.
  if (!notableRows.length || notableRows.some(s => !ORDER.has(s.statRef.slice(NOTABLE.length)))) return
  const spots = clusterSpots(size, nodeCount, sockets, notableRows.map(s => s.statRef.slice(NOTABLE.length)))
  for (const s of notableRows) {
    const spot = spots.get(s.statRef.slice(NOTABLE.length))
    if (spot) s.clusterSpot = spot
  }
  // Front first, in the notable rows' own places.
  const slots = notableRows.map(s => filters.indexOf(s))
  const sorted = [...notableRows].sort((a, b) => (a.clusterSpot?.points ?? 99) - (b.clusterSpot?.points ?? 99))
  slots.forEach((at, k) => { filters[at] = sorted[k] })
}

const ADDS_RE = /^Adds (\d+) Passive Skills$/
const SOCKETS_RE = /^(\d+) Added Passive Skills? (?:is a Jewel Socket|are Jewel Sockets)$/
const NOTABLE_RE = /^1 Added Passive Skill is (.+)$/

/**
 * The same spots read from a jewel's mod lines as text, such as a trade listing's
 * enchants and explicits. Keyed by notable name. Empty when a notable is unknown
 * to the tree data (it would shift every slot) or the base isn't a cluster jewel.
 */
export function clusterSpotsFromText (baseType: string | undefined, lines: string[]): Map<string, ClusterSpot> {
  const size = /^(Small|Medium|Large) Cluster Jewel$/.exec(baseType ?? '')?.[1] as ClusterSize | undefined
  if (!size) return new Map()
  let nodeCount: number | null = null
  let sockets = 0
  const notables: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    const adds = ADDS_RE.exec(line)
    if (adds) { nodeCount = Number(adds[1]); continue }
    const socket = SOCKETS_RE.exec(line)
    if (socket) { sockets = Number(socket[1]); continue }
    const notable = NOTABLE_RE.exec(line)
    if (notable) notables.push(notable[1])
  }
  if (!notables.length || notables.some(n => !ORDER.has(n))) return new Map()
  return clusterSpots(size, nodeCount, sockets, notables)
}

/** The notable a mod line names, to look its spot up. */
export function notableOfLine (line: string): string | null {
  return NOTABLE_RE.exec(line.trim())?.[1] ?? null
}
