// The atlas tree as a drawable, editable tree: GGG's atlas export read into the
// same shape as the passive tree (pob-builds/passive-tree.ts), so the PoB tree
// drawing draws it. Plus allocating and refunding with paths, and writing a
// pathofexile.com link back out.
import type { TreeArt, TreeNode, NodeKind } from '../pob-builds/passive-tree'
import { plainText } from './tree'

export interface AtlasVariant {
  effect: number
  text: string
}

export interface AtlasTreeModel {
  nodes: Map<number, TreeNode>
  art: TreeArt
  // Notables where you pick a type (3.30): node id -> its choices.
  variants: Map<number, AtlasVariant[]>
  // The node every path starts from. Always allocated, never a point.
  start: number
  points: number
  // Allocatable neighbours, both ways.
  links: Map<number, number[]>
}

const ANGLES_16 = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]
const ANGLES_40 = [0, 10, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 135, 140, 150, 160, 170, 180, 190, 200, 210, 220, 225, 230, 240, 250, 260, 270, 280, 290, 300, 310, 315, 320, 330, 340, 350]
// The tree drawing's art scale; the export has every sheet at this zoom.
const SPRITE_ZOOM = '0.3835'
// Export sheet name -> the name the drawing looks up.
const SHEETS: Record<string, string> = {
  normalActive: 'normalActive',
  notableActive: 'notableActive',
  keystoneActive: 'keystoneActive',
  wormholeActive: 'wormholeActive',
  normalInactive: 'normalInactive',
  notableInactive: 'notableInactive',
  keystoneInactive: 'keystoneInactive',
  wormholeInactive: 'wormholeInactive',
  mastery: 'masteryInactive',
  frame: 'frame',
  groupBackground: 'groupBackground',
  background: 'background'
}
// Nothing else in the atlas tree holds this many points; the export says.
const DEFAULT_POINTS = 138

interface RawNode {
  skill?: number
  name?: string
  icon?: string
  stats?: unknown[]
  group?: number
  orbit?: number
  orbitIndex?: number
  out?: Array<string | number>
  isNotable?: boolean
  isKeystone?: boolean
  isMastery?: boolean
  isWormhole?: boolean
  variantEffects?: Array<{ effect?: number, stats?: unknown[] }>
}

interface RawSheet { filename?: string, coords?: Record<string, { x: number, y: number, w: number, h: number }> }

export function readAtlasTree (json: unknown): AtlasTreeModel {
  const data = (json && typeof json === 'object' ? json : {}) as {
    nodes?: Record<string, RawNode>
    groups?: Record<string, { x: number, y: number, background?: { image?: string, isHalfImage?: boolean } }>
    constants?: { orbitRadii?: number[], skillsPerOrbit?: number[] }
    sprites?: Record<string, Record<string, RawSheet>>
    points?: { totalPoints?: number }
  }
  const raw = data.nodes
  const groupsIn = data.groups
  if (!raw || !groupsIn) throw new Error('Unexpected atlas data format')
  const radii = data.constants?.orbitRadii ?? [0, 82, 162, 335, 493, 662, 846]
  const perOrbit = data.constants?.skillsPerOrbit ?? [1, 6, 16, 16, 40, 72, 72]
  const angle = (orbit: number, index: number) => {
    const n = perOrbit[orbit]
    const deg = n === 16 ? ANGLES_16[index] : n === 40 ? ANGLES_40[index] : index * 360 / n
    return (deg ?? 0) * Math.PI / 180
  }
  const rootOut = raw.root?.out?.map(Number) ?? []
  const start = rootOut[0] ?? 0

  const groupIndex = new Map<string, number>()
  const groups: TreeArt['groups'] = []
  const nodes = new Map<number, TreeNode>()
  const variants = new Map<number, AtlasVariant[]>()
  const usedIcons = new Set<string>()
  for (const [key, n] of Object.entries(raw)) {
    if (key === 'root' || n.group == null) continue
    const g = groupsIn[String(n.group)]
    if (!g) continue
    const id = typeof n.skill === 'number' ? n.skill : Number(key)
    if (!Number.isFinite(id)) continue
    const kind: NodeKind = id === start ? 'start' : n.isKeystone ? 'key' : n.isNotable ? 'notable' : n.isMastery ? 'mastery' : n.isWormhole ? 'wormhole' : 'small'
    if (!groupIndex.has(String(n.group))) {
      groupIndex.set(String(n.group), groups.length)
      groups.push([Math.round(g.x), Math.round(g.y), g.background?.image ?? '', g.background?.isHalfImage ? 1 : 0])
    }
    const orbit = n.orbit ?? 0
    const a = angle(orbit, n.orbitIndex ?? 0)
    const r = radii[orbit] ?? 0
    const icon = n.icon ?? ''
    if (icon) usedIcons.add(icon)
    nodes.set(id, {
      id,
      x: Math.round(g.x + r * Math.sin(a)),
      y: Math.round(g.y - r * Math.cos(a)),
      kind,
      name: plainText(n.name ?? ''),
      stats: (n.stats ?? []).filter((s): s is string => typeof s === 'string').map(plainText),
      out: (n.out ?? []).map(Number),
      icon,
      group: groupIndex.get(String(n.group)) ?? 0,
      radius: r,
      angle: Math.round(a * 1000) / 1000
    })
    const choices = (n.variantEffects ?? [])
      .filter(e => typeof e.effect === 'number')
      .map(e => ({ effect: e.effect!, text: (e.stats ?? []).filter((s): s is string => typeof s === 'string').map(plainText).join(' / ') }))
    if (choices.length) variants.set(id, choices)
  }

  // Masteries in the atlas tree are labels: nothing links to them.
  const links = new Map<number, number[]>()
  const link = (a: number, b: number) => {
    const list = links.get(a)
    if (list) { if (!list.includes(b)) list.push(b) } else links.set(a, [b])
  }
  for (const n of nodes.values()) {
    if (n.kind === 'mastery') continue
    for (const o of n.out) {
      const m = nodes.get(o)
      if (!m || m.kind === 'mastery') continue
      link(n.id, o)
      link(o, n.id)
    }
  }

  const sprites: TreeArt['sprites'] = {}
  for (const [kind, name] of Object.entries(SHEETS)) {
    const zooms = data.sprites?.[kind]
    if (!zooms) continue
    const sheet = zooms[SPRITE_ZOOM] ?? Object.values(zooms).at(-1)
    if (!sheet?.filename || !sheet.coords) continue
    const coords: Record<string, [number, number, number, number]> = {}
    for (const [key, c] of Object.entries(sheet.coords)) {
      if (kind === 'frame' || kind === 'groupBackground' || kind === 'background' || usedIcons.has(key)) coords[key] = [c.x, c.y, c.w, c.h]
    }
    sprites[name] = { url: sheet.filename, coords }
  }

  return {
    nodes,
    art: { groups, sprites },
    variants,
    start,
    points: data.points?.totalPoints ?? DEFAULT_POINTS,
    links
  }
}

// The cheapest way from what's allocated to `target`: the nodes to add, target
// included. Empty when it's allocated already or can't be reached.
export function pathTo (model: AtlasTreeModel, allocated: Set<number>, target: number): number[] {
  if (allocated.has(target) || !model.nodes.has(target) || model.nodes.get(target)!.kind === 'mastery') return []
  const from = new Set(allocated)
  from.add(model.start)
  const prev = new Map<number, number | null>()
  const queue: number[] = []
  for (const a of from) { prev.set(a, null); queue.push(a) }
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i]
    if (cur === target) break
    for (const next of model.links.get(cur) ?? []) {
      if (prev.has(next)) continue
      prev.set(next, cur)
      queue.push(next)
    }
  }
  if (!prev.has(target)) return []
  const path: number[] = []
  for (let c: number | null | undefined = target; c != null && !from.has(c); c = prev.get(c)) path.push(c)
  return path
}

// What refunding `id` takes with it: it, and everything that only reached the
// start through it.
export function refundSet (model: AtlasTreeModel, allocated: Set<number>, id: number): number[] {
  if (!allocated.has(id)) return []
  const seen = new Set<number>([model.start])
  const queue = [model.start]
  for (let i = 0; i < queue.length; i++) {
    for (const next of model.links.get(queue[i]) ?? []) {
      if (next === id || seen.has(next) || !allocated.has(next)) continue
      seen.add(next)
      queue.push(next)
    }
  }
  return [...allocated].filter(a => !seen.has(a))
}

// Points a set of nodes costs: the start is free.
export function pointsUsed (model: AtlasTreeModel | null, allocated: Iterable<number>): number {
  let n = 0
  for (const id of allocated) if (!model || id !== model.start) n++
  return n
}

function bytesToBase64Url (bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// The share link pathofexile.com reads (version 6, as the website writes).
// Picked types go where masteries go in the character tree, as effect and node.
export function encodeAtlasTree (nodes: number[], variants: Record<number, number>): string {
  const ids = [...new Set(nodes)].slice(0, 255)
  const picks = Object.entries(variants).filter(([n]) => ids.includes(Number(n))).slice(0, 255)
  const bytes = new Uint8Array(4 + 2 + 1 + ids.length * 2 + 1 + 1 + picks.length * 4)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 6)
  let pos = 6
  view.setUint8(pos++, ids.length)
  for (const id of ids) { view.setUint16(pos, id); pos += 2 }
  view.setUint8(pos++, 0)
  view.setUint8(pos++, picks.length)
  for (const [node, effect] of picks) {
    view.setUint16(pos, Number(effect))
    view.setUint16(pos + 2, Number(node))
    pos += 4
  }
  return `https://www.pathofexile.com/fullscreen-atlas-skill-tree/${bytesToBase64Url(bytes)}`
}
