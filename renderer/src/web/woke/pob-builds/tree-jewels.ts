// Jewels in the passive tree (WOKEPOET-205): what sits in each socket, the
// ring of a jewel with a radius, and the passives inside a ring that the
// jewel changes (Timeless jewels and the radius uniques).
import type { TreeNode } from './passive-tree'
import type { PobItem } from './widget'

// Path of Building's jewel radii (tree units, 3.16 and later).
export const JEWEL_RADIUS: Record<string, number> = {
  'Small': 960,
  'Medium': 1200,
  'Large': 1500,
  'Very Large': 1800,
  'Massive': 2880
}

// Uniques that rewrite the passives in their ring, besides Timeless jewels.
const RADIUS_CHANGERS = new Set([
  'Impossible Escape', 'Thread of Hope', 'Unnatural Instinct', "Lioneye's Fall", 'Might of the Meek',
  'Intuitive Leap', 'Inspired Learning', 'Brute Force Solution', 'Careful Planning', 'Efficient Training',
  'Fertile Mind', 'Fluid Motion', 'Fragile Bloom', 'Inertia', 'Energised Armour', 'Healthy Mind', 'Split Personality',
  'Anatomical Knowledge', 'Apparitions', 'Cold Steel', 'Collateral Damage', 'Combat Focus', 'Dead Reckoning',
  'Fight for Survival', 'First Snow', 'Fireborn', 'Frozen Trail', 'Growing Agony', 'Hidden Potential',
  'Hungry Abyss', 'Inevitability', 'Pugilist', 'Quickening Covenant', 'Rain of Splinters', 'Ring of Blades',
  'Spire of Stone', 'Spreading Rot', 'Static Electricity', 'Steel Spirit', 'Tempered Flesh', 'Tempered Mind',
  'Tempered Spirit', 'The Blue Dream', 'The Blue Nightmare', 'The Golden Rule', 'The Green Dream',
  'The Green Nightmare', 'The Red Dream', 'The Red Nightmare', 'Transcendent Flesh', 'Transcendent Mind',
  'Transcendent Spirit', 'Weight of Sin', 'Wildfire', 'Winter Burial', 'Calamitous Visions', 'Kitava\'s Teachings',
  'Light of Meaning', 'Pure Talent', 'Sacrificial Harvest', 'Survival Instincts', 'Survival Secrets', 'Survival Skills'
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
  return /Cluster Jewel$/.test(item.base || item.name)
}

export function socketedJewels (sockets: Array<{ node: number, item: PobItem }> | undefined): SocketedJewel[] {
  return (sockets ?? []).map(({ node, item }) => {
    const radius = item.radius ? JEWEL_RADIUS[item.radius] ?? null : null
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

// The jewel whose ring changes this passive, if any (the nearest wins).
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
