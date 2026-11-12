// Jewels in the passive tree (WOKEPOET-205): what sits in each socket, the
// ring of a jewel with a radius, and the passives inside a ring that the
// jewel changes (Timeless jewels and the radius uniques).
import type { TreeNode } from './passive-tree'
import type { PobItem } from './widget'

// Path of Building's jewel radii (tree units, Modules/Data.lua, 3.16 and later).
export const JEWEL_RADIUS: Record<string, number> = {
  'Small': 960,
  'Medium': 1440,
  'Large': 1800,
  'Very Large': 2400,
  'Massive': 2880
}

// Uniques that rewrite the passives in their ring, besides Timeless jewels.
// Jewels that only count what's allocated in their ring aren't here. Thread
// of Hope (a variable ring) and Impossible Escape (a ring around a keystone,
// not its socket) aren't drawn yet.
const RADIUS_CHANGERS = new Set([
  "Lioneye's Fall", 'Might of the Meek', 'Unnatural Instinct', 'Energised Armour', 'Healthy Mind',
  'Brute Force Solution', 'Careful Planning', 'Efficient Training', 'Fertile Mind', 'Fluid Motion', 'Inertia',
  'Cold Steel', 'Fireborn', 'Tempered Flesh', 'Tempered Mind', 'Tempered Spirit',
  'Transcendent Flesh', 'Transcendent Mind', 'Transcendent Spirit',
  'The Red Dream', 'The Red Nightmare', 'The Green Dream', 'The Green Nightmare', 'The Blue Dream', 'The Blue Nightmare'
])

export interface SocketedJewel {
  node: number
  item: PobItem
  // Tree units, when the jewel has a radius.
  radius: number | null
  // It changes the passives in its ring, not just counts them.
  changes: boolean
}

export function isTimeless (item: PobItem): boolean {
  return item.base === 'Timeless Jewel'
}

export function isCluster (item: PobItem): boolean {
  // A magic cluster's one line carries its affixes: "Large Cluster Jewel of Fire".
  return /Cluster Jewel\b/.test(item.base || item.name)
}

export function socketedJewels (sockets: Array<{ node: number, item: PobItem }> | undefined): SocketedJewel[] {
  return (sockets ?? []).map(({ node, item }) => {
    // Impossible Escape's ring is around a keystone, not its socket: not drawn yet.
    const radius = item.radius && item.name !== 'Impossible Escape' ? JEWEL_RADIUS[item.radius] ?? null : null
    return { node, item, radius, changes: radius != null && (isTimeless(item) || RADIUS_CHANGERS.has(item.name)) }
  })
}

// Passives inside a jewel's ring that a jewel can change (not sockets,
// masteries, the class start or the ascendancy).
export function nodesInRadius (nodes: Map<number, TreeNode>, jewel: SocketedJewel): TreeNode[] {
  const centre = nodes.get(jewel.node)
  if (!centre || jewel.radius == null) return []
  const r2 = jewel.radius * jewel.radius
  const out: TreeNode[] = []
  for (const n of nodes.values()) {
    if (n.kind !== 'small' && n.kind !== 'notable' && n.kind !== 'key') continue
    const dx = n.x - centre.x
    const dy = n.y - centre.y
    if (dx * dx + dy * dy <= r2) out.push(n)
  }
  return out
}

// The first jewel (in socket order) whose ring changes this passive, if any.
export function changedBy (nodes: Map<number, TreeNode>, jewels: SocketedJewel[], node: TreeNode): SocketedJewel | null {
  for (const j of jewels) {
    if (j.changes && nodesInRadius(nodes, j).some(n => n.id === node.id)) return j
  }
  return null
}

// A socket's own text for totals: what the jewel in it gives. Timeless and
// cluster jewels describe what they do to other passives, so they add nothing here.
export function jewelStats (item: PobItem): string[] {
  if (isTimeless(item) || isCluster(item)) return []
  return [...item.implicits, ...item.mods]
}
