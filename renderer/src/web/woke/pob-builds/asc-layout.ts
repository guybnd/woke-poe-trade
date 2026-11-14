// Where the build's ascendancy sits on the tree. Since 3.30 the game draws a
// class's ascendancy inside the main tree, in a bubble beside the class start,
// at the tree's own scale, and it moves and zooms with the tree. GGG's data
// keeps each ascendancy far off in a ring, so its nodes are moved, as copies.
// Measured on a Duelist's (Slayer) tree in game: the bubble's centre is 918
// tree units from the class start, towards the tree's centre. Other classes
// are assumed to follow the same rule (unconfirmed in game).
// Bloodlines aren't linked from a class start: the build window draws them
// where GGG places them, and the overlay over the game leaves them out.
import type { TreeArt, TreeNode } from './passive-tree'

export interface AscBubble { x: number, y: number, r: number }

export interface AscLayout {
  // Copies of the drawn ascendancies' nodes, marked placed.
  nodes: TreeNode[]
  // Moved copies of their groups (orbit centres), to append to the art's
  // groups from `groupBase` on; no background.
  groups: TreeArt['groups']
  bubbles: AscBubble[]
}

export const BUBBLE_FROM_START = 918
// Room around the outermost node, in tree units.
const PAD = 160

// Where an ascendancy's start sits on the tree, by the rule above; null for a
// bloodline (or data older than ascendancy positions).
export function ascCentre (all: Map<number, TreeNode>, root: TreeNode): { x: number, y: number } | null {
  let start: TreeNode | undefined
  for (const n of all.values()) {
    if (n.kind === 'start' && n.out.includes(root.id)) { start = n; break }
  }
  if (!start) return null
  const len = Math.hypot(start.x, start.y)
  // The Scion's start is the tree's centre: up.
  const [ux, uy] = len > 100 ? [-start.x / len, -start.y / len] : [0, -1]
  return { x: start.x + ux * BUBBLE_FROM_START, y: start.y + uy * BUBBLE_FROM_START }
}

// ids: every point of the trees shown. inTreeOnly: leave out ascendancies
// with no place in the game's tree (bloodlines).
export function placeAscendancies (all: Map<number, TreeNode>, ids: Set<number>, art: TreeArt, groupBase: number, inTreeOnly = false): AscLayout {
  const out: AscLayout = { nodes: [], groups: [], bubbles: [] }
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
    const at = ascCentre(all, root)
    if (!at && inTreeOnly) continue
    const dx = at ? at.x - root.x : 0
    const dy = at ? at.y - root.y : 0
    const r = Math.max(...own.map(n => Math.hypot(n.x - root.x, n.y - root.y))) + PAD
    const moved = new Map<number, number>()
    for (const n of own) {
      let g = moved.get(n.group)
      if (g == null) {
        const src = art.groups[n.group]
        g = groupBase + out.groups.length
        out.groups.push([(src?.[0] ?? n.x) + dx, (src?.[1] ?? n.y) + dy, '', 0])
        moved.set(n.group, g)
      }
      out.nodes.push({ ...n, x: n.x + dx, y: n.y + dy, group: g, placed: true })
    }
    out.bubbles.push({ x: root.x + dx, y: root.y + dy, r })
  }
  return out
}
