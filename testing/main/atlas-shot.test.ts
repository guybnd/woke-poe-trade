import fs from 'fs'
import path from 'path'
import { Worker } from 'worker_threads'
import { describe, it, expect } from 'vitest'
import { PNG } from 'pngjs'
import { ATLAS_FIT, ATLAS_PICTURE_FIT, fitPicture, fitTree, litLines, litProbes, readScreen } from '../../main/src/woke/tree-fit'
import { readPicture } from '../../main/src/woke/picture-worker'
import { readAtlasTree } from '../../renderer/src/web/woke/atlas/atlas-tree'
import { buildPath, fitPoints, lineProbes } from '../../renderer/src/web/woke/pob-builds/tree-overlay'
import { readShots, ringNodes, ringProbes, shotLines } from '../../renderer/src/web/woke/atlas/shot-import'

// Screenshots of the game's atlas tree read into a strategy (Atlas
// strategies' Import box). Real 3.30 shots of one tree with 13 points spent:
// the game said 13/150.
const model = readAtlasTree(JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/atlas-tree-export.json'), 'utf8')))
const fp = fitPoints(model.nodes)
const pts = { x: Float32Array.from(fp.x), y: Float32Array.from(fp.y), r: Float32Array.from(fp.r) }
const lines = shotLines(model)
const extra = lineProbes(lines, model.nodes).map(p => Float32Array.from(p))
const ringIds = ringNodes(model)
const rings = ringProbes(model, ringIds).map(p => Float32Array.from(p))

// As main's TreeOverlay.readImage: a full screenshot first, else a snip.
// crop: a part cut from the picture, as Win+Shift+S would.
function read (file: string, crop?: { x: number, y: number, w: number, h: number }) {
  const png = PNG.sync.read(fs.readFileSync(path.join(__dirname, '../fixtures/screens', file)))
  let px = new Uint8Array(png.data)
  let width = png.width
  let height = png.height
  if (crop) {
    const out = new Uint8Array(crop.w * crop.h * 4)
    for (let y = 0; y < crop.h; y++) out.set(px.subarray(((crop.y + y) * width + crop.x) * 4, ((crop.y + y) * width + crop.x + crop.w) * 4), y * crop.w * 4)
    px = out
    width = crop.w
    height = crop.h
  }
  for (let i = 0; i < px.length; i += 4) { const t = px[i]; px[i] = px[i + 2]; px[i + 2] = t }
  const { fit, bare } = fitPicture(px, width, height, pts, ATLAS_FIT, ATLAS_PICTURE_FIT)
  if (!fit) return null
  return {
    bare,
    lines: litLines(px, width, height, fit, extra, pts, 'blue', bare),
    rings: litProbes(px, width, height, fit, rings, 'blue')
  }
}

const names = (ids: number[]) => ids.map(id => model.nodes.get(id)!.name).sort()

describe('atlas tree screenshots to a strategy', () => {
  const out = read('atlas-tree-real-zoomed-out.png')!
  const inn = read('atlas-tree-real-zoomed-in.png')!

  it('reads every point spent on the zoomed-out tree', () => {
    const r = readShots(model, lines, [out.lines], ringIds, [out.rings])
    expect(r.nodes).toHaveLength(13)
    expect(r.joined).toBe(0)
    // The notable at the end of the short branch: its line is mostly under
    // its frame, so only the frame's blue glow shows it.
    expect(names(r.nodes)).toContain('Supplication')
    expect(r.nodes).not.toContain(model.start)
  })

  it('reads only what a zoomed-in shot shows, and adds it to the rest', () => {
    const alone = readShots(model, lines, [inn.lines], ringIds, [inn.rings])
    const whole = readShots(model, lines, [out.lines], ringIds, [out.rings])
    expect(alone.nodes.length).toBeGreaterThan(0)
    for (const id of alone.nodes) expect(whole.nodes).toContain(id)
    const both = readShots(model, lines, [out.lines, inn.lines], ringIds, [out.rings, inn.rings])
    expect(both.nodes.sort()).toEqual(whole.nodes.sort())
  })

  it('reads a snip cut from the screen (Win+Shift+S)', () => {
    // The middle of the zoomed-out shot, half its size: the whole plan is in it.
    const snip = read('atlas-tree-real-zoomed-out.png', { x: 640, y: 360, w: 1280, h: 720 })!
    expect(snip).not.toBeNull()
    const r = readShots(model, lines, [snip.lines], ringIds, [snip.rings])
    const whole = readShots(model, lines, [out.lines], ringIds, [out.rings])
    expect(r.nodes.sort()).toEqual(whole.nodes.sort())
  })

  it('reads off the main thread in the picture worker (built by build:host)', async () => {
    const png = PNG.sync.read(fs.readFileSync(path.join(__dirname, '../fixtures/screens/atlas-tree-real-zoomed-out.png')))
    const px = new Uint8Array(png.data)
    for (let i = 0; i < px.length; i += 4) { const t = px[i]; px[i] = px[i + 2]; px[i + 2] = t }
    const worker = new Worker(path.join(__dirname, '../fake-host/dist/picture.js'))
    const res = await new Promise<{ ok: boolean, lit: boolean[], extraLit: boolean[] }>((resolve, reject) => {
      worker.once('message', resolve)
      worker.once('error', reject)
      worker.postMessage({ px, width: png.width, height: png.height, pts, kind: ATLAS_FIT, snip: ATLAS_PICTURE_FIT, tone: 'blue', probes: rings.map(r => [...r]), extra: extra.map(e => [...e]) })
    }).finally(() => worker.terminate())
    expect(res.ok).toBe(true)
    expect(readShots(model, lines, [res.extraLit], ringIds, [res.lit]).nodes).toHaveLength(13)
  })

  it('reads a small picture (a shrunk 150-point tree, 876 by 746)', () => {
    // Guy's paste that first read nothing: the tree is 660 px across.
    const png = PNG.sync.read(fs.readFileSync(path.join(__dirname, '../fixtures/screens/atlas-tree-small-snip.png')))
    const px = new Uint8Array(png.data)
    for (let i = 0; i < px.length; i += 4) { const t = px[i]; px[i] = px[i + 2]; px[i + 2] = t }
    const res = readPicture({ px, width: png.width, height: png.height, pts, kind: ATLAS_FIT, snip: ATLAS_PICTURE_FIT, tone: 'blue', probes: rings.map(r => [...r]), extra: extra.map(e => [...e]) })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    // The game said 150/150; within a few either way (arcs aren't read, so
    // their passives are guessed by path).
    const n = readShots(model, lines, [res.extraLit], ringIds, [res.lit]).nodes.length
    expect(n).toBeGreaterThanOrEqual(148)
    expect(n).toBeLessThanOrEqual(158)
  })

  it('draws no line between paired gateways (Mortal, Cryptic)', () => {
    // Linked in the data, so a path may jump between them; the game draws no
    // line, and one drawn lit ran across the tree over passives not taken.
    const holes = [...model.nodes.values()].filter(n => n.kind === 'wormhole').map(n => n.id)
    expect(holes).toHaveLength(4)
    const path = buildPath(model.nodes, holes, model.art)
    expect(path.lines).toHaveLength(0)
    expect(lines.some(l => holes.includes(l.a) && holes.includes(l.b))).toBe(false)
  })

  it('reads the atlas viewer on the website (cream lines, grey page)', () => {
    // Guy's import that came out as 255 passives: frames there all have blue
    // art, which read as taken and chained across the tree.
    const png = PNG.sync.read(fs.readFileSync(path.join(__dirname, '../fixtures/screens/atlas-tree-website.png')))
    const px = new Uint8Array(png.data)
    for (let i = 0; i < px.length; i += 4) { const t = px[i]; px[i] = px[i + 2]; px[i + 2] = t }
    const res = readPicture({ px, width: png.width, height: png.height, pts, kind: ATLAS_FIT, snip: ATLAS_PICTURE_FIT, tone: 'blue', probes: rings.map(r => [...r]), extra: extra.map(e => [...e]) })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const r = readShots(model, lines, [res.extraLit], ringIds, [res.lit])
    // 143 on the picture, checked by eye along its cream lines.
    expect(r.nodes.length).toBeGreaterThanOrEqual(135)
    expect(r.nodes.length).toBeLessThanOrEqual(150)
    expect(r.joined).toBeLessThanOrEqual(5)
  })

  it('reads the website at a screen size, on its own page or a dark one', () => {
    // A full-window browser shot: no HUD to skip. On a dark page the dark
    // check passes, so the website is told by its cream lines.
    const png = PNG.sync.read(fs.readFileSync(path.join(__dirname, '../fixtures/screens/atlas-tree-website.png')))
    for (const bg of [[37, 39, 50], [20, 20, 20]]) {
      const W = 1920
      const H = 1080
      const px = new Uint8Array(W * H * 4)
      for (let i = 0; i < px.length; i += 4) { px[i] = bg[2]; px[i + 1] = bg[1]; px[i + 2] = bg[0]; px[i + 3] = 255 }
      const ox = (W - png.width) >> 1
      const oy = (H - png.height) >> 1
      for (let y = 0; y < png.height; y++) {
        for (let x = 0; x < png.width; x++) {
          const s = (y * png.width + x) * 4
          const d = ((oy + y) * W + ox + x) * 4
          px[d] = png.data[s + 2]; px[d + 1] = png.data[s + 1]; px[d + 2] = png.data[s]; px[d + 3] = 255
        }
      }
      const res = readPicture({ px, width: W, height: H, pts, kind: ATLAS_FIT, snip: ATLAS_PICTURE_FIT, tone: 'blue', probes: rings.map(r => [...r]), extra: extra.map(e => [...e]) })
      expect(res.ok, String(bg)).toBe(true)
      if (!res.ok) continue
      expect(res.lit.some(Boolean), 'frames are not read on the website').toBe(false)
      const n = readShots(model, lines, [res.extraLit], ringIds, [res.lit]).nodes.length
      expect(n, String(bg)).toBeGreaterThanOrEqual(130)
      expect(n, String(bg)).toBeLessThanOrEqual(150)
    }
  })

  it('reads no tree in pictures of other screens, bright ones too', () => {
    // Through readPicture: its website retry drops the dark check.
    const job = (px: Uint8Array, width: number, height: number) => readPicture({ px, width, height, pts, kind: ATLAS_FIT, snip: ATLAS_PICTURE_FIT, tone: 'blue', probes: [], extra: [] })
    for (const file of ['passive-tree-real-zoomed-in.png', 'area-mods-real-1.png', 'map-real-01.png', 'stash-general-real.png']) {
      const png = PNG.sync.read(fs.readFileSync(path.join(__dirname, '../fixtures/screens', file)))
      const px = new Uint8Array(png.data)
      for (let i = 0; i < px.length; i += 4) { const t = px[i]; px[i] = px[i + 2]; px[i + 2] = t }
      expect(job(px, png.width, png.height).ok, file).toBe(false)
    }
    const W = 2560
    const H = 1440
    const bright = new Uint8Array(W * H * 4)
    for (let i = 0; i < bright.length; i++) bright[i] = 40 + ((i * 2654435761) >>> 24) % 120
    expect(job(bright, W, H).ok, 'bright noise').toBe(false)
  })

  it('finds no atlas tree on other screens', () => {
    for (const file of ['passive-tree-real-zoomed-in.png', 'area-mods-real-1.png', 'map-real-01.png', 'stash-general-real.png']) expect(read(file), file).toBeNull()
  })

  it('joins a group of lit lines cut off from the start by the shortest path', () => {
    // Lit: only the line between the 2nd and 3rd passives of a path out.
    const a = model.links.get(model.start)![0]
    const b = model.links.get(a)!.find(n => n !== model.start)!
    const c = model.links.get(b)!.find(n => n !== a && n !== model.start)!
    const lit = lines.map(l => (l.a === b && l.b === c) || (l.a === c && l.b === b))
    const r = readShots(model, lines, [lit])
    expect(r.nodes.sort()).toEqual([a, b, c].sort())
    expect(r.joined).toBe(1)
    expect(r.lines).toBe(1)
  })

  it('takes a glowing frame only next to what is taken', () => {
    const far = ringIds.find(id => !(model.links.get(id) ?? []).includes(model.start))!
    const r = readShots(model, lines, [lines.map(() => false)], ringIds, [ringIds.map(id => id === far)])
    expect(r.nodes).toEqual([])
    const near = model.links.get(model.start)![0]
    const r2 = readShots(model, lines, [lines.map(() => false)], ringIds, [ringIds.map(id => id === near)])
    expect(r2.nodes).toEqual([near])
  })
})
