// An atlas strategy read from screenshots of the game's atlas tree. Main finds
// the tree in each picture and says which of its lines are lit (blue: a point
// spent at both ends); this turns those lines into the passives taken.
//
// The start's own lines run under its blue art and never read lit, and a line
// can sit under the HUD or off the picture. So each group of lit lines that
// doesn't reach the start is joined to it by the shortest path, and the count
// of passives added that way is reported for the player to check. A taken
// passive's frame glows blue too: one next to what's taken, whose frame reads
// lit, is taken (a short line into a notable is mostly under its frame).
import { offBuildLines } from '../pob-builds/tree-overlay'
import type { BuildLine } from '../pob-builds/tree-overlay'
import { NODE_RADIUS } from '../pob-builds/passive-tree'
import { pathTo } from './atlas-tree'
import type { AtlasTreeModel } from './atlas-tree'

export interface ShotRead {
  // Passives taken, start left out.
  nodes: number[]
  // Of those, how many no lit line touched (joined by the shortest path).
  joined: number
  // Lit lines read, across every picture.
  lines: number
}

// Every line the game draws between two passives, arcs along their orbit.
// Wormholes are linked to their pair in the data, but no line joins them on
// screen (it would run straight across the tree).
export function shotLines (model: AtlasTreeModel): BuildLine[] {
  const hole = (id: number) => model.nodes.get(id)?.kind === 'wormhole'
  return offBuildLines(model.nodes, [], model.art).filter(l => !(hole(l.a) && hole(l.b)))
}

// Passives whose frame can be read: everything a point goes in.
export function ringNodes (model: AtlasTreeModel): number[] {
  return [...model.links.keys()].filter(id => id !== model.start && model.nodes.get(id)?.kind !== 'mastery')
}

// A ring of points just inside each passive's frame, flat x, y, for main's
// lit reading (one probe per node of ringNodes).
export function ringProbes (model: AtlasTreeModel, ids: number[]): number[][] {
  return ids.map(id => {
    const n = model.nodes.get(id)!
    const r = (NODE_RADIUS[n.kind] ?? 40) * 0.6
    const out: number[] = []
    for (let a = 0; a < 24; a++) out.push(n.x + Math.cos(a * Math.PI / 12) * r, n.y + Math.sin(a * Math.PI / 12) * r)
    return out
  })
}

// lit: per picture, one flag per line of `lines`. rings: per picture, one
// flag per node of `ringIds` (its frame reads lit).
export function readShots (model: AtlasTreeModel, lines: BuildLine[], lit: boolean[][], ringIds: number[] = [], rings: boolean[][] = []): ShotRead {
  const on = lines.map((_, i) => lit.some(l => l[i]))
  const touched = new Set<number>()
  lines.forEach((l, i) => {
    if (!on[i]) return
    touched.add(l.a)
    touched.add(l.b)
  })
  touched.delete(model.start)
  for (const id of [...touched]) if (!model.nodes.has(id) || model.nodes.get(id)!.kind === 'mastery') touched.delete(id)

  // Groups of lit lines, each a set of passives joined to one another.
  const next = new Map<number, number[]>()
  const link = (a: number, b: number) => { const n = next.get(a); if (n) n.push(b); else next.set(a, [b]) }
  lines.forEach((l, i) => { if (on[i] && touched.has(l.a) && touched.has(l.b)) { link(l.a, l.b); link(l.b, l.a) } })
  const groups: number[][] = []
  const seen = new Set<number>()
  for (const id of touched) {
    if (seen.has(id)) continue
    const group = [id]
    seen.add(id)
    for (let i = 0; i < group.length; i++) {
      for (const m of next.get(group[i]) ?? []) if (!seen.has(m)) { seen.add(m); group.push(m) }
    }
    groups.push(group)
  }

  // Join groups to the start, nearest first, so a later group may join
  // through an earlier one.
  const taken = new Set<number>()
  let joined = 0
  let left = groups
  while (left.length) {
    let best: { i: number, path: number[] } | null = null
    left.forEach((group, i) => {
      for (const id of group) {
        const path = pathTo(model, taken, id)
        if (!best || path.length < best.path.length) best = { i, path }
      }
    })
    const { i, path } = best!
    const group = left[i]
    // The path ends on the group's node; the rest of it was never read lit.
    for (const id of path) if (!group.includes(id)) { taken.add(id); joined++ }
    for (const id of group) taken.add(id)
    left = left.filter((_, j) => j !== i)
  }
  // Lit frames next to what's taken, until no more join.
  const glows = new Set(ringIds.filter((_, i) => rings.some(r => r[i])))
  taken.add(model.start)
  for (let grew = true; grew;) {
    grew = false
    for (const id of glows) {
      if (taken.has(id) || !(model.links.get(id) ?? []).some(m => taken.has(m))) continue
      taken.add(id)
      grew = true
    }
  }
  taken.delete(model.start)
  return { nodes: [...taken], joined, lines: on.filter(Boolean).length }
}
