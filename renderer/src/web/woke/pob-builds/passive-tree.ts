// The passive tree, loaded the first time it is opened, and what changes
// between two of a build's trees. Data: scripts/build-tree-data.mjs.
import { dataFileUrl, onSharedDataChange } from '../app/live-data'

export type NodeKind = 'small' | 'notable' | 'key' | 'jewel' | 'mastery' | 'asc' | 'ascstart' | 'start'

export interface TreeNode {
  id: number
  x: number
  y: number
  kind: NodeKind
  name: string
  stats: string[]
  out: number[]
  icon: string
  // Index into the art's groups, with the orbit around that group's centre.
  group: number
  radius: number
  // Clockwise from up, in radians.
  angle: number
}

type Row = [number, number, number, NodeKind, string, string[], number[], string, number, number, number]

export interface SpriteSheet {
  url: string
  coords: Record<string, [number, number, number, number]>
}

export interface TreeArt {
  // x, y, background sprite ('' for none), and whether it's half a circle.
  groups: Array<[number, number, string, number]>
  sprites: Record<string, SpriteSheet>
}

let job: Promise<Map<number, TreeNode>> | null = null
let art: TreeArt | null = null
// A newer tree downloaded: read it the next time the tree opens.
let generation = 0
onSharedDataChange(() => { generation++; job = null })

// The groups and sprites, once loadPassiveTree has finished.
export function passiveTreeArt (): TreeArt | null {
  return art
}

export function readNodes (rows: Row[]): Map<number, TreeNode> {
  return new Map(rows.map(([id, x, y, kind, name, stats, out, icon, group, radius, angle]) =>
    [id, { id, x, y, kind, name, stats, out, icon: icon ?? '', group: group ?? 0, radius: radius ?? 0, angle: angle ?? 0 }]))
}

export function loadPassiveTree (): Promise<Map<number, TreeNode>> {
  if (!job) {
    const mine = generation
    job = fetch(dataFileUrl('tree/passive-tree.json'))
      .then(res => {
        if (!res.ok) throw new Error(`The passive tree didn't load (${res.status})`)
        return res.json() as Promise<TreeArt & { nodes: Row[] }>
      })
      .then(data => {
        // A tree read from before a newer one arrived doesn't replace its art.
        if (mine === generation) art = { groups: data.groups, sprites: data.sprites }
        return readNodes(data.nodes)
      })
    // A failed load can be tried again by opening the tree again.
    const failed = job
    job.catch(() => { if (job === failed) job = null })
  }
  return job
}

export interface TreeDiff {
  // Passive points, as PoB counts them. Before the data loads, every node counts.
  added: number
  removed: number
  // Ascendancy points; both are spent apart from passive points.
  addedAscendancy: number
  // Worth naming: notables, keystones, jewel sockets, ascendancy.
  addedNames: TreeNode[]
  removedNames: TreeNode[]
}

// Notables, keystones and sockets, plus what the small passives never are: asc
// notables come named, and asc smalls don't.
const NAMED: NodeKind[] = ['notable', 'key', 'jewel', 'asc']

export function treeDiff (nodes: Map<number, TreeNode> | null, from: number[], to: number[]): TreeDiff {
  const before = new Set(from)
  const after = new Set(to)
  const added = to.filter(id => !before.has(id))
  const removed = from.filter(id => !after.has(id))
  const named = (ids: number[]) => ids
    .map(id => nodes?.get(id))
    .filter((n): n is TreeNode => n != null && n.name !== '' && NAMED.includes(n.kind))
  // Class and ascendancy starts cost nothing. Ids the data doesn't know are
  // cluster jewel passives, which are points.
  const kindOf = (id: number) => nodes?.get(id)?.kind
  const isPoint = (id: number) => !['asc', 'ascstart', 'start'].includes(kindOf(id) ?? '')
  return {
    added: added.filter(isPoint).length,
    removed: removed.filter(isPoint).length,
    addedAscendancy: added.filter(id => kindOf(id) === 'asc').length,
    addedNames: named(added),
    removedNames: named(removed)
  }
}

export type NodeState = 'keep' | 'add' | 'remove' | ''

export function nodeState (id: number, from: Set<number>, to: Set<number>): NodeState {
  if (to.has(id)) return from.has(id) ? 'keep' : 'add'
  return from.has(id) ? 'remove' : ''
}

// The state of the line between two nodes: lit only when both ends are.
export function linkState (a: NodeState, b: NodeState): NodeState {
  if (!a || !b) return ''
  if (a === 'remove' || b === 'remove') return a === 'add' || b === 'add' ? '' : 'remove'
  return a === 'add' || b === 'add' ? 'add' : 'keep'
}

export interface Box { x: number, y: number, w: number, h: number }

// The drawn part of the tree around these nodes.
export function fitBox (nodes: TreeNode[], pad = 900): Box | null {
  const drawn = nodes.filter(n => n.kind !== 'asc' && n.kind !== 'ascstart' && n.kind !== 'mastery')
  if (!drawn.length) return null
  const xs = drawn.map(n => n.x)
  const ys = drawn.map(n => n.y)
  const x = Math.min(...xs) - pad
  const y = Math.min(...ys) - pad
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y }
}

// ---- finding a node under the mouse ----

export interface View { zoom: number, ox: number, oy: number }

// Drawn size in tree units, at the size the game gives them.
export const NODE_RADIUS: Partial<Record<NodeKind, number>> = { small: 34, notable: 54, key: 82, jewel: 54, mastery: 70, start: 40 }

// The node nearest a point on the canvas, within reach: never less than `reach`
// pixels, since small passives are tiny when zoomed out.
export function nodeAt (nodes: Iterable<TreeNode>, x: number, y: number, view: View, reach: number): TreeNode | null {
  let best: TreeNode | null = null
  let bestDist = Infinity
  for (const n of nodes) {
    const r = NODE_RADIUS[n.kind]
    if (!r) continue
    const limit = Math.max(reach, r * view.zoom)
    const dx = n.x * view.zoom + view.ox - x
    const dy = n.y * view.zoom + view.oy - y
    if (Math.abs(dx) > limit || Math.abs(dy) > limit) continue
    const dist = dx * dx + dy * dy
    if (dist <= limit * limit && dist < bestDist) {
      best = n
      bestDist = dist
    }
  }
  return best
}

// What a node's tooltip says about it in this tree.
export function nodeNote (state: NodeState): string | undefined {
  return state === 'add' ? 'New in this tree' : state === 'remove' ? 'Goes away in this tree' : state === 'keep' ? 'Allocated' : undefined
}
