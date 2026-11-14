// Where the build's ascendancy sits on the tree. Since 3.30 the game draws a
// class's ascendancy inside the main tree, in a bubble beside the class start,
// at the tree's own scale, and it moves and zooms with the tree. GGG's data
// keeps each ascendancy far off in a ring, so its nodes are moved, as copies.
// Measured on a Duelist's (Slayer) tree in game: the bubble's start is 918
// tree units straight up from the class start. Only that class is placed:
// the same rule would put the other classes' bubbles over their passives, so
// theirs wait for a measurement. Unplaced ascendancies (other classes,
// bloodlines, and the ones the data doesn't link from a class start) are
// drawn where GGG places them in the build window, and left out over the game.
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

// Each measured class start (by id), and where its ascendancy's start sits
// relative to it, in tree units.
const MEASURED: Record<number, { dx: number, dy: number }> = {
  // Duelist: Slayer, from two shots at different zooms.
  50986: { dx: 0, dy: -BUBBLE_FROM_START }
}

// Where an ascendancy's start sits on the tree, as measured above; null when
// not measured.
export function ascCentre (all: Map<number, TreeNode>, root: TreeNode): { x: number, y: number } | null {
  let start: TreeNode | undefined
  for (const n of all.values()) {
    if (n.kind === 'start' && n.out.includes(root.id)) { start = n; break }
  }
  const at = start && MEASURED[start.id]
  return at ? { x: start!.x + at.dx, y: start!.y + at.dy } : null
}

// ids: every point of the trees shown. inTreeOnly: leave out ascendancies
// with no known place in the game's tree.
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
