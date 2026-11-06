// The passive tree, loaded the first time it is opened, and what changes
// between two of a build's trees. Data: scripts/build-tree-data.mjs.

export type NodeKind = 'small' | 'notable' | 'key' | 'jewel' | 'mastery' | 'asc'

export interface TreeNode {
  id: number
  x: number
  y: number
  kind: NodeKind
  name: string
  stats: string[]
  out: number[]
}

type Row = [number, number, number, NodeKind, string, string[], number[]]

let job: Promise<Map<number, TreeNode>> | null = null

export function loadPassiveTree (): Promise<Map<number, TreeNode>> {
  if (!job) {
    job = fetch(`${import.meta.env.BASE_URL}data/tree/passive-tree.json`)
      .then(res => {
        if (!res.ok) throw new Error(`The passive tree didn't load (${res.status})`)
        return res.json() as Promise<Row[]>
      })
      .then(rows => new Map(rows.map(([id, x, y, kind, name, stats, out]) => [id, { id, x, y, kind, name, stats, out }])))
    // A failed load can be tried again by opening the tree again.
    job.catch(() => { job = null })
  }
  return job
}

export interface TreeDiff {
  // Points spent, as PoB counts them: every node of the tree, known or not.
  added: number
  removed: number
  // Worth naming: notables, keystones, jewel sockets, ascendancy.
  addedNames: TreeNode[]
  removedNames: TreeNode[]
}

const NAMED: NodeKind[] = ['notable', 'key', 'jewel', 'asc']

export function treeDiff (nodes: Map<number, TreeNode> | null, from: number[], to: number[]): TreeDiff {
  const before = new Set(from)
  const after = new Set(to)
  const added = to.filter(id => !before.has(id))
  const removed = from.filter(id => !after.has(id))
  const named = (ids: number[]) => ids
    .map(id => nodes?.get(id))
    .filter((n): n is TreeNode => n != null && NAMED.includes(n.kind))
  return {
    added: added.length,
    removed: removed.length,
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
  const drawn = nodes.filter(n => n.kind !== 'asc' && n.kind !== 'mastery')
  if (!drawn.length) return null
  const xs = drawn.map(n => n.x)
  const ys = drawn.map(n => n.y)
  const x = Math.min(...xs) - pad
  const y = Math.min(...ys) - pad
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y }
}
