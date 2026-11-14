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
export function probesOf (path: BuildPath, all: Map<number, TreeNode>, at = [0.35, 0.42, 0.5, 0.58, 0.65]): number[][] {
  return path.lines.map(l => {
    const out: number[] = []
    for (const t of at) {
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

// ---- nodes taken in game that the build doesn't have ----

// Every line the game draws between two passives, outside the build: when
// one is lit, a point was spent there.
export function offBuildLines (all: Map<number, TreeNode>, ids: number[], art: TreeArt): BuildLine[] {
  const inBuild = new Set(ids)
  const every = buildPath(all, [...all.keys()], art).lines
  return every.filter(l => !(inBuild.has(l.a) && inBuild.has(l.b)))
}

// Points along most of each line, flat x, y. The main process skips any that
// land on a node's frame, so these may run close to the ends.
export function lineProbes (lines: BuildLine[], all: Map<number, TreeNode>): number[][] {
  return probesOf({ nodes: [], lines }, all, [0.12, 0.22, 0.32, 0.42, 0.5, 0.58, 0.68, 0.78, 0.88])
}

// The nodes to refund: off the build, joined by lit lines to something known
// to be taken (taken: the build's lit nodes and its class start). A lit line
// with no such link is left out: likely gold art read as a line, or a branch
// leaving the screen we can't follow. keep: nodes you'd take later anyway
// (a later tree of a levelling guide), never told to refund.
export function refundNodes (lines: BuildLine[], lit: boolean[], taken: Set<number>, keep: Set<number>): Set<number> {
  const next = new Map<number, number[]>()
  const link = (a: number, b: number) => { const l = next.get(a); if (l) l.push(b); else next.set(a, [b]) }
  lines.forEach((l, i) => { if (lit[i]) { link(l.a, l.b); link(l.b, l.a) } })
  const reached = new Set<number>()
  const queue = [...taken].filter(id => next.has(id))
  for (const id of queue) reached.add(id)
  while (queue.length) {
    const id = queue.pop()!
    for (const m of next.get(id) ?? []) {
      if (reached.has(m)) continue
      reached.add(m)
      queue.push(m)
    }
  }
  const out = new Set<number>()
  for (const id of reached) if (!taken.has(id) && !keep.has(id)) out.add(id)
  return out
}

// A node is taken when a lit line touches it; a class or ascendancy start
// always is.
export function takenNodes (path: BuildPath, lit: boolean[]): Set<number> {
  const taken = new Set<number>()
  path.lines.forEach((l, i) => { if (lit[i]) { taken.add(l.a); taken.add(l.b) } })
  for (const n of path.nodes) if (n.kind === 'start' || n.kind === 'ascstart') taken.add(n.id)
  return taken
}

// ---- the ascendancy, in its bubble on the tree ----

export { placeAscendancies } from './asc-layout'

const ASC_RADIUS: Record<string, number> = { asc: 40, ascstart: 40 }
const ASC_NOTABLE_RADIUS = 60

// The build's ascendancy: the one most of its ascendancy points are in, so a
// bloodline's one or two points don't win over the class's own. Null when it
// has none, or the data is older than ascendancy positions.
export function buildAscendancy (all: Map<number, TreeNode>, ids: number[]): string | null {
  const count = new Map<string, number>()
  for (const id of ids) {
    const n = all.get(id)
    if (n?.kind === 'asc' && n.asc) count.set(n.asc, (count.get(n.asc) ?? 0) + 1)
  }
  let best: string | null = null
  for (const [asc, n] of count) if (best == null || n > count.get(best)!) best = asc
  return best
}

export function ascRadius (n: TreeNode): number {
  return n.name ? ASC_NOTABLE_RADIUS : ASC_RADIUS[n.kind] ?? 40
}

// The build's path through its ascendancy, its start included.
export function ascPath (all: Map<number, TreeNode>, ids: number[], art: TreeArt, asc: string): BuildPath {
  const inBuild = new Set(ids)
  const nodes: TreeNode[] = []
  for (const n of all.values()) {
    // The start is never in a build's list, yet every path leaves from it.
    if (n.asc === asc && (inBuild.has(n.id) || n.kind === 'ascstart')) nodes.push(n)
  }
  const here = new Set(nodes.map(n => n.id))
  const lines: BuildLine[] = []
  const seen = new Set<string>()
  for (const n of nodes) {
    for (const id of n.out) {
      const m = all.get(id)
      if (!m || !here.has(id)) continue
      const key = n.id < m.id ? `${n.id}-${m.id}` : `${m.id}-${n.id}`
      if (seen.has(key)) continue
      seen.add(key)
      lines.push({ a: n.id, b: m.id, arc: arcOf(n, m, art) })
    }
  }
  // Its start isn't a point to take, and only shows where a line leaves it.
  return { nodes: nodes.filter(n => n.kind !== 'ascstart' || lines.some(l => l.a === n.id || l.b === n.id)), lines }
}
