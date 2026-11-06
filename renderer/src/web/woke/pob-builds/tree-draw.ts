// Draws the passive tree on a canvas with the game's own art. Thousands of
// sprites, so it only runs when the view or the trees change, never on hover.
import { linkState, nodeState, NODE_RADIUS } from './passive-tree'
import type { NodeState, SpriteSheet, TreeArt, TreeNode, View } from './passive-tree'

// The art is cut at this fraction of tree size.
const ART_SCALE = 0.3835

export type Sheets = Map<string, HTMLImageElement>

// Loads what it can. A sheet that fails is left out, and what needs it falls
// back to a plain dot, so the tree still works offline.
export async function loadSheets (art: TreeArt): Promise<Sheets> {
  const urls = [...new Set(Object.values(art.sprites).map(s => s.url))]
  const sheets: Sheets = new Map()
  await Promise.all(urls.map(url => new Promise<void>(resolve => {
    const img = new Image()
    img.onload = () => { sheets.set(url, img); resolve() }
    img.onerror = () => { resolve() }
    img.src = url
  })))
  return sheets
}

export interface DrawInput {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  view: View
  // Canvas pixels per CSS pixel, for line widths.
  px: number
  nodes: Map<number, TreeNode>
  art: TreeArt
  sheets: Sheets
  from: Set<number>
  to: Set<number>
  colours: Record<'keep' | 'add' | 'remove' | 'off' | 'bg', string>
}

export function drawTree (d: DrawInput) {
  const { ctx, width, height, view, px, nodes, art, sheets, from, to, colours } = d
  const X = (x: number) => x * view.zoom + view.ox
  const Y = (y: number) => y * view.zoom + view.oy
  const state = (id: number) => nodeState(id, from, to)

  const sprite = (kind: string, key: string, x: number, y: number): boolean => {
    const sheet: SpriteSheet | undefined = art.sprites[kind]
    const img = sheet && sheets.get(sheet.url)
    const c = sheet?.coords[key]
    if (!img || !c) return false
    const w = c[2] / ART_SCALE * view.zoom
    const h = c[3] / ART_SCALE * view.zoom
    ctx.drawImage(img, c[0], c[1], c[2], c[3], X(x) - w / 2, Y(y) - h / 2, w, h)
    return true
  }

  ctx.fillStyle = colours.bg
  ctx.fillRect(0, 0, width, height)
  const bg = art.sprites.background
  const bgImg = bg && sheets.get(bg.url)
  if (bgImg) {
    const pattern = ctx.createPattern(bgImg, 'repeat')
    if (pattern) {
      ctx.fillStyle = pattern
      ctx.fillRect(0, 0, width, height)
    }
  }

  // Off screen by more than this is skipped: the biggest sprite's half width.
  const margin = 500 * view.zoom
  const onScreen = (x: number, y: number) => {
    const sx = X(x)
    const sy = Y(y)
    return sx > -margin && sx < width + margin && sy > -margin && sy < height + margin
  }

  const groupSheet = art.sprites.groupBackground
  const groupImg = groupSheet && sheets.get(groupSheet.url)
  if (groupImg) {
    for (const [x, y, key, half] of art.groups) {
      const c = groupSheet.coords[key]
      if (!c || !onScreen(x, y)) continue
      const w = c[2] / ART_SCALE * view.zoom
      const h = c[3] / ART_SCALE * view.zoom
      if (half) {
        ctx.drawImage(groupImg, c[0], c[1], c[2], c[3], X(x) - w / 2, Y(y) - h, w, h)
        ctx.save()
        ctx.translate(X(x), Y(y))
        ctx.scale(1, -1)
        ctx.drawImage(groupImg, c[0], c[1], c[2], c[3], -w / 2, -h, w, h)
        ctx.restore()
      } else {
        ctx.drawImage(groupImg, c[0], c[1], c[2], c[3], X(x) - w / 2, Y(y) - h / 2, w, h)
      }
    }
  }

  // Lines, dim first so lit ones sit on top. Nodes on one orbit of one group
  // join along the orbit, as in the game.
  const line = (lit: NodeState, colour: string, width: number) => {
    ctx.strokeStyle = colour
    ctx.lineWidth = width * px
    ctx.beginPath()
    for (const n of nodes.values()) {
      if (!NODE_RADIUS[n.kind] || n.kind === 'mastery') continue
      for (const id of n.out) {
        const m = nodes.get(id)
        if (!m || !NODE_RADIUS[m.kind] || m.kind === 'mastery') continue
        if (linkState(state(n.id), state(m.id)) !== lit) continue
        ctx.moveTo(X(n.x), Y(n.y))
        const centre = n.group === m.group && n.radius === m.radius && n.radius > 0 ? art.groups[n.group] : null
        if (centre) {
          let turn = m.angle - n.angle
          while (turn > Math.PI) turn -= 2 * Math.PI
          while (turn < -Math.PI) turn += 2 * Math.PI
          ctx.arc(X(centre[0]), Y(centre[1]), n.radius * view.zoom, n.angle - Math.PI / 2, m.angle - Math.PI / 2, turn < 0)
        } else {
          ctx.lineTo(X(m.x), Y(m.y))
        }
      }
    }
    ctx.stroke()
  }
  line('', colours.off, 1.5)
  line('remove', colours.remove, 3.5)
  line('keep', colours.keep, 3.5)
  line('add', colours.add, 4)

  // Masteries have no lit art here, so a ring says which you have.
  for (const n of nodes.values()) {
    if (n.kind !== 'mastery' || !onScreen(n.x, n.y)) continue
    sprite('masteryInactive', n.icon, n.x, n.y)
    const s = state(n.id)
    if (s) {
      ctx.beginPath()
      ctx.arc(X(n.x), Y(n.y), (NODE_RADIUS.mastery ?? 70) * view.zoom + px, 0, 2 * Math.PI)
      ctx.strokeStyle = s === 'add' ? colours.add : s === 'remove' ? colours.remove : colours.keep
      ctx.lineWidth = 2 * px
      ctx.stroke()
    }
  }

  for (const n of nodes.values()) {
    const r = NODE_RADIUS[n.kind]
    if (!r || n.kind === 'mastery' || !onScreen(n.x, n.y)) continue
    const s = state(n.id)
    const on = s === 'keep' || s === 'add'
    const drawn = drawNodeArt(sprite, n, on)
    if (!drawn) {
      ctx.beginPath()
      ctx.arc(X(n.x), Y(n.y), Math.max(2 * px, r * 0.55 * view.zoom), 0, 2 * Math.PI)
      ctx.fillStyle = s === 'keep' ? colours.keep : s === 'add' ? colours.add : s === 'remove' ? colours.remove : colours.off
      ctx.fill()
    }
    // New and lost points stand out from what you have.
    if (s === 'add' || s === 'remove') {
      ctx.beginPath()
      ctx.arc(X(n.x), Y(n.y), r * view.zoom + 2 * px, 0, 2 * Math.PI)
      ctx.strokeStyle = s === 'add' ? colours.add : colours.remove
      ctx.lineWidth = 2 * px
      ctx.stroke()
    }
  }
}

function drawNodeArt (sprite: (kind: string, key: string, x: number, y: number) => boolean, n: TreeNode, on: boolean): boolean {
  switch (n.kind) {
    case 'jewel':
      return sprite('frame', on ? 'JewelFrameAllocated' : 'JewelFrameUnallocated', n.x, n.y)
    case 'key':
      return sprite(on ? 'keystoneActive' : 'keystoneInactive', n.icon, n.x, n.y) &&
        sprite('frame', on ? 'KeystoneFrameAllocated' : 'KeystoneFrameUnallocated', n.x, n.y)
    case 'notable':
      return sprite(on ? 'notableActive' : 'notableInactive', n.icon, n.x, n.y) &&
        sprite('frame', on ? 'NotableFrameAllocated' : 'NotableFrameUnallocated', n.x, n.y)
    case 'small':
      return sprite(on ? 'normalActive' : 'normalInactive', n.icon, n.x, n.y) &&
        sprite('frame', on ? 'PSSkillFrameActive' : 'PSSkillFrame', n.x, n.y)
    default:
      return false
  }
}
