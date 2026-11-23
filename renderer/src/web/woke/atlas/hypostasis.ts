// hypostasis.faith atlas tree links, read into pathofexile.com links.
//
//   #s=id,id:choice,...   node ids, with the picked type (0-based) after ':'
//   #t=<code>             4 base64url characters of checksum (24-bit FNV-1a
//                         of the sorted "id" / "id:choice" list), then bits,
//                         six per character, most significant first.
//
// The short form lists no ids: it walks the tree breadth-first from the start
// (each node's neighbours by ascending id). Each node the walk reaches gets a
// bit, 1 = taken (the walk goes on through it); a taken node with types is
// followed by its pick, 0 = none or i + 1 = type i, in as few bits as hold
// its type count. Missing bits read 0. The walk only means something on the
// tree it was made on, so the checksum must match. Their graph is GGG's: the
// same links, start and type order as atlas-tree.ts reads (checked 2026-11-23).
import { encodeAtlasTree } from './atlas-tree'
import type { AtlasTreeModel } from './atlas-tree'

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const SUM = 4

// Any hypostasis.faith link, to say what's wrong with one that isn't read.
const ANY_LINK = /https?:\/\/(?:www\.)?hypostasis\.faith\/[^\s)"']*/gi
// The normal atlas tree's page (data.html, or the folder); ruthless.html is
// another tree, refused below.
const TREE_PAGE = /^https?:\/\/(?:www\.)?hypostasis\.faith\/atlas\/(?:data\.html|index\.html)?(?:\?[^#]*)?#[st]=[\w,:-]+$/i
// Their viewer's cap (MAX_PICK).
const MAX_PICK = 150

type Item = [id: number, choice: number | undefined]

const width = (k: number) => Math.ceil(Math.log2(k + 1))

function checksum (items: Item[]): string {
  const s = items.slice().sort((a, b) => a[0] - b[0])
    .map(([id, c]) => c === undefined ? String(id) : `${id}:${c}`).join(',')
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  h = ((h >>> 24) ^ h) & 0xffffff
  let out = ''
  for (let i = 0; i < SUM; i++) out += B64[(h >>> (6 * (SUM - 1 - i))) & 63]
  return out
}

// The short code's picks, or null when it isn't a tree of this atlas.
export function decodeShort (model: AtlasTreeModel, code: string): Item[] | null {
  if (code.length < SUM || /[^\w-]/.test(code)) return null
  const bits: number[] = []
  for (const ch of code.slice(SUM)) {
    const x = B64.indexOf(ch)
    if (x < 0) return null
    for (let b = 5; b >= 0; b--) bits.push((x >> b) & 1)
  }
  let pos = 0
  let bad = false
  const read = (n: number) => { let x = 0; while (n--) x = x * 2 + (bits[pos++] ?? 0); return x }
  const items: Item[] = []
  const seen = new Set([model.start])
  const queue = [model.start]
  for (let i = 0; i < queue.length; i++) {
    for (const id of [...(model.links.get(queue[i]) ?? [])].sort((a, b) => a - b)) {
      if (seen.has(id)) continue
      seen.add(id)
      if (!read(1)) continue
      const k = model.variants.get(id)?.length ?? 0
      const x = k ? read(width(k)) : 0
      if (x > k) bad = true
      items.push([id, x ? x - 1 : undefined])
      queue.push(id)
    }
  }
  if (bad || !items.length || bits.indexOf(1, pos) >= 0) return null
  return checksum(items) === code.slice(0, SUM) ? items : null
}

// A hypostasis.faith link as a pathofexile.com one; null when it can't be read
// on this atlas (made on an older tree, or cut short).
export function hypostasisToLink (model: AtlasTreeModel, link: string): string | null {
  const hash = link.slice(link.indexOf('#'))
  let items: Item[] | null = null
  const short = /#t=([\w-]+)/.exec(hash)
  const long = /#s=([\d,:]+)/.exec(hash)
  if (short) items = decodeShort(model, short[1])
  else if (long) {
    // As their viewer reads it: passives only, at most MAX_PICK, and only
    // what joins the start (an old link's islands are dropped).
    const listed = long[1].split(',').filter(Boolean).map(part => {
      const [id, c] = part.split(':').map(Number)
      return [id, Number.isFinite(c) ? c : undefined] as Item
    }).filter(([id]) => model.nodes.has(id) && model.nodes.get(id)!.kind !== 'mastery' && id !== model.start).slice(0, MAX_PICK)
    const want = new Map(listed)
    const reach = new Set<number>()
    const queue = [model.start]
    for (let i = 0; i < queue.length; i++) {
      for (const n of model.links.get(queue[i]) ?? []) if (want.has(n) && !reach.has(n)) { reach.add(n); queue.push(n) }
    }
    items = listed.filter(([id]) => reach.has(id))
  }
  if (!items?.length) return null
  const nodes: number[] = []
  const variants: Record<number, number> = {}
  for (const [id, c] of items) {
    if (!model.nodes.has(id) || id === model.start) continue
    nodes.push(id)
    const effect = c === undefined ? undefined : model.variants.get(id)?.[c]?.effect
    if (effect !== undefined) variants[id] = effect
  }
  return nodes.length ? encodeAtlasTree(nodes, variants) : null
}

// Every hypostasis.faith link in the text swapped for a pathofexile.com one.
// Throws when one can't be read.
export function rewriteHypostasisLinks (text: string, model: AtlasTreeModel | null): string {
  return text.replace(ANY_LINK, (link) => {
    if (/\/ruthless\.html/i.test(link)) throw new Error('That hypostasis.faith link is a Ruthless atlas tree; only the normal tree can be imported.')
    if (!/#[st]=/.test(link)) throw new Error('That hypostasis.faith link has no tree in it (pick passives there first, then copy the link).')
    if (!TREE_PAGE.test(link)) throw new Error('That hypostasis.faith link isn\'t one of its atlas tree pages.')
    if (!model) throw new Error('The atlas tree data is still loading. Try again in a moment.')
    const out = hypostasisToLink(model, link)
    if (!out) throw new Error('That hypostasis.faith link doesn\'t fit this league\'s atlas tree (made on an older tree, or cut short).')
    return out
  })
}
