// What the build tree overlay draws: the active build's nodes and lines, in
// tree coordinates, with sample points along each line so the main process
// can tell which are already lit (allocated) in game.
import type { TreeArt, TreeNode } from './passive-tree'
import { NODE_RADIUS } from './passive-tree'

// Drawn in game and read by the fit (main/src/woke/tree-fit.ts).
const FIT_KINDS = new Set(['small', 'notable', 'key', 'jewel', 'mastery', 'start'])

export function fitPoints (nodes: Map<number, TreeNode>): { x: number[], y: number[], r: number[] } {
  const out = { x: [] as number[], y: [] as number[], r: [] as number[] }
  for (const n of nodes.values()) {
    if (!FIT_KINDS.has(n.kind)) continue
    out.x.push(n.x)
    out.y.push(n.y)
    out.r.push(NODE_RADIUS[n.kind] ?? 40)
  }
  return out
}

export interface BuildLine {
  a: number
  b: number
  // Set when the line follows an orbit: its centre and radius.
  arc: { cx: number, cy: number, r: number, from: number, to: number, ccw: boolean } | null
}

export interface BuildPath {
  // Build nodes the game draws (masteries and ascendancy left out).
  nodes: TreeNode[]
  lines: BuildLine[]
}

export function buildPath (all: Map<number, TreeNode>, ids: number[], art: TreeArt): BuildPath {
  const inBuild = new Set(ids)
  const drawn = (n: TreeNode | undefined): n is TreeNode => n != null && FIT_KINDS.has(n.kind) && n.kind !== 'mastery'
  const nodes = ids.map(id => all.get(id)).filter(drawn)
  const lines: BuildLine[] = []
  const seen = new Set<string>()
  for (const n of nodes) {
    for (const id of n.out) {
      const m = all.get(id)
      if (!drawn(m) || !inBuild.has(id)) continue
      const key = n.id < m.id ? `${n.id}-${m.id}` : `${m.id}-${n.id}`
      if (seen.has(key)) continue
      seen.add(key)
      lines.push({ a: n.id, b: m.id, arc: arcOf(n, m, art) })
    }
  }
  return { nodes, lines }
}

// Same rule as tree-draw.ts: nodes on one orbit of one group join along it.
function arcOf (n: TreeNode, m: TreeNode, art: TreeArt): BuildLine['arc'] {
  const g = n.group === m.group && n.radius === m.radius && n.radius > 0 ? art.groups[n.group] : null
  if (!g) return null
  let turn = m.angle - n.angle
  while (turn > Math.PI) turn -= 2 * Math.PI
  while (turn < -Math.PI) turn += 2 * Math.PI
  return { cx: g[0], cy: g[1], r: n.radius, from: n.angle - Math.PI / 2, to: n.angle - Math.PI / 2 + turn, ccw: turn < 0 }
}

// Points along the middle of each line (clear of the node frames), flat x, y.
export function probesOf (path: BuildPath, all: Map<number, TreeNode>): number[][] {
  return path.lines.map(l => {
    const out: number[] = []
    for (const t of [0.35, 0.42, 0.5, 0.58, 0.65]) {
      if (l.arc) {
        const a = l.arc.from + (l.arc.to - l.arc.from) * t
        out.push(l.arc.cx + Math.cos(a) * l.arc.r, l.arc.cy + Math.sin(a) * l.arc.r)
      } else {
        const a = all.get(l.a)!
        const b = all.get(l.b)!
        out.push(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
      }
    }
    return out
  })
}

// A node is taken when a lit line touches it; a class start always is.
export function takenNodes (path: BuildPath, lit: boolean[]): Set<number> {
  const taken = new Set<number>()
  path.lines.forEach((l, i) => { if (lit[i]) { taken.add(l.a); taken.add(l.b) } })
  for (const n of path.nodes) if (n.kind === 'start') taken.add(n.id)
  return taken
}
