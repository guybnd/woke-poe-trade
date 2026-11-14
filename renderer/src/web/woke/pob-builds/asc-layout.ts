// The build window's tree draws the build's ascendancies where GGG's data
// places them, in a ring outside the main tree, each in a round bubble.
// The data's other ascendancies stay undrawn (drawnRadius).
import type { TreeNode } from './passive-tree'

export interface AscBubble { x: number, y: number, r: number }

export interface AscLayout {
  // Copies of the drawn ascendancies' nodes, marked placed.
  nodes: TreeNode[]
  bubbles: AscBubble[]
}

// Room around the outermost node, in tree units. GGG keeps every
// ascendancy at least 560 from the main tree.
const PAD = 160

// ids: every point of the trees shown.
export function placeAscendancies (all: Map<number, TreeNode>, ids: Set<number>): AscLayout {
  const out: AscLayout = { nodes: [], bubbles: [] }
  const names = new Set<string>()
  for (const id of ids) {
    const n = all.get(id)
    if (n?.kind === 'asc' && n.asc) names.add(n.asc)
  }
  if (!names.size) return out
  const by = new Map<string, TreeNode[]>()
  for (const n of all.values()) {
    if (n.asc && names.has(n.asc)) {
      const list = by.get(n.asc)
      if (list) list.push(n)
      else by.set(n.asc, [n])
    }
  }
  for (const own of by.values()) {
    const root = own.find(n => n.kind === 'ascstart')
    if (!root) continue
    const r = Math.max(...own.map(n => Math.hypot(n.x - root.x, n.y - root.y))) + PAD
    for (const n of own) out.nodes.push({ ...n, placed: true })
    out.bubbles.push({ x: root.x, y: root.y, r })
  }
  return out
}
