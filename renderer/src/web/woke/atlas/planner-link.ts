// The "Atlas Tree Planner" site's links (atlas-blush-beta.vercel.app),
// read into pathofexile.com links. Its hash is one of:
//
//   compact   base64url bytes: 0xa1, then bits, most significant first. The
//             tree is walked breadth-first from the start (each passive's
//             neighbours by ascending id, gateway pairs linked); each passive
//             the walk reaches gets a bit, 1 = taken (the walk goes on
//             through it). Then 3 bits per taken passive with types, in walk
//             order: the picked type's index. Missing bits read 0 (the site
//             drops trailing zero bytes).
//   id,id.v   node ids, a picked type's index after '.' (older links)
//   GGG's     the pathofexile.com code itself
//
// The walk only means something on the tree it was made on. The site's tree
// data (checked 2026-11-26) is an older export than GGG's current one: it
// lacks PLANNER_LACKS, which sit in the walk and shift every bit after them.
// So the link is read on the site's tree (GGG's without them), and on GGG's
// only when that fails. A walk one bit out still reads as a tree, so the two
// can't be told apart by how well the bits fit: when the site moves to the
// newer tree, empty PLANNER_LACKS.
import { encodeAtlasTree } from './atlas-tree'
import type { AtlasTreeModel } from './atlas-tree'
import { trimLinkEnd } from './tree'

const MARK = 0xa1
// Celestial Presence and Runic Distortion: in GGG's export, not the site's.
export const PLANNER_LACKS = [27261, 53484]
// Any link to the site.
const ANY_LINK = /https?:\/\/atlas-blush-beta\.vercel\.app\/[^\s)"']*/gi

interface Read { nodes: number[], picks: Map<number, number> }

function bytesOf (code: string): Uint8Array | null {
  try {
    const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - code.length % 4) % 4))
    return Uint8Array.from(bin, c => c.charCodeAt(0))
  } catch {
    return null
  }
}

// The compact walk on the tree without `skip`; null when it doesn't fit the
// bits (stops before the last 1, or picks a type the passive doesn't have).
export function readCompact (model: AtlasTreeModel, b: Uint8Array, skip: ReadonlySet<number> = new Set()): Read | null {
  let last = -1
  for (let i = 8; i < b.length * 8; i++) if ((b[i >> 3] >> (7 - (i & 7))) & 1) last = i
  let pos = 8
  const bit = () => { const x = ((b[pos >> 3] ?? 0) >> (7 - (pos & 7))) & 1; pos++; return x }
  const seen = new Set([model.start])
  const order = [model.start]
  for (let i = 0; i < order.length; i++) {
    for (const id of [...(model.links.get(order[i]) ?? [])].sort((x, y) => x - y)) {
      if (seen.has(id) || skip.has(id)) continue
      seen.add(id)
      if (bit()) order.push(id)
      // Past every bit the link holds and then some: the wrong tree.
      if (pos > b.length * 8 + 4096) return null
    }
  }
  const picks = new Map<number, number>()
  for (const id of order) {
    const types = model.variants.get(id)
    if (!types) continue
    const x = bit() * 4 + bit() * 2 + bit()
    if (x >= types.length) return null
    picks.set(id, x)
  }
  if (pos <= last) return null
  const nodes = order.slice(1)
  if (!nodes.length || nodes.length > 255) return null
  return { nodes, picks }
}

function compactToLink (model: AtlasTreeModel, b: Uint8Array): string | null {
  const best = readCompact(model, b, new Set(PLANNER_LACKS)) ?? readCompact(model, b)
  if (!best) return null
  const variants: Record<number, number> = {}
  for (const [id, i] of best.picks) {
    const effect = model.variants.get(id)?.[i]?.effect
    if (effect !== undefined) variants[id] = effect
  }
  return encodeAtlasTree(best.nodes, variants)
}

// "id,id.v": what joins the start, as the site keeps it.
function listToLink (model: AtlasTreeModel, list: string): string | null {
  const want = new Map<number, number | undefined>()
  for (const part of list.split(',').filter(Boolean)) {
    const [id, v] = part.split('.')
    const n = Number(id)
    if (!model.nodes.has(n) || model.nodes.get(n)!.kind === 'mastery' || n === model.start) continue
    want.set(n, v ? Number(v) : undefined)
  }
  const nodes: number[] = []
  const queue = [model.start]
  const seen = new Set(queue)
  for (let i = 0; i < queue.length; i++) {
    for (const n of model.links.get(queue[i]) ?? []) {
      if (seen.has(n) || !want.has(n)) continue
      seen.add(n)
      queue.push(n)
      nodes.push(n)
    }
  }
  if (!nodes.length) return null
  const variants: Record<number, number> = {}
  for (const id of nodes) {
    const v = want.get(id)
    const effect = v === undefined ? undefined : model.variants.get(id)?.[v]?.effect
    if (effect !== undefined) variants[id] = effect
  }
  return encodeAtlasTree(nodes, variants)
}

// A planner link as a pathofexile.com one; null when it can't be read on this
// atlas (made on another tree, or cut short).
export function plannerToLink (model: AtlasTreeModel, link: string): string | null {
  const hash = trimLinkEnd(link.slice(link.indexOf('#') + 1))
  if (!hash) return null
  if (/^[\d.,]+$/.test(hash)) return listToLink(model, hash)
  if (!/^[\w-]+$/.test(hash)) return null
  const b = bytesOf(hash)
  if (!b || b.length < 2) return null
  if (b[0] === MARK) return compactToLink(model, b)
  // GGG's own code: u32 version, so a zero byte first.
  if (b[0] === 0 && b.length >= 7) return `https://www.pathofexile.com/fullscreen-atlas-skill-tree/${hash}`
  return null
}

// Every planner link in the text swapped for a pathofexile.com one. Throws
// when one can't be read.
export function rewritePlannerLinks (text: string, model: AtlasTreeModel | null): string {
  return text.replace(ANY_LINK, (match) => {
    const link = trimLinkEnd(match)
    const tail = match.slice(link.length)
    if (!/#./.test(link)) throw new Error('That atlas planner link has no tree in it (pick passives there first, then copy the link).')
    if (!model) throw new Error('The atlas tree data is still loading. Try again in a moment.')
    const out = plannerToLink(model, link)
    if (!out) throw new Error('That atlas planner link doesn\'t fit this league\'s atlas tree (made on another tree, or cut short).')
    return out + tail
  })
}
