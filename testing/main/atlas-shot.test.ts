import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { PNG } from 'pngjs'
import { ATLAS_FIT, ATLAS_PICTURE_FIT, fitPicture, fitTree, litLines, litProbes, readScreen } from '../../main/src/woke/tree-fit'
import { readAtlasTree } from '../../renderer/src/web/woke/atlas/atlas-tree'
import { fitPoints, lineProbes } from '../../renderer/src/web/woke/pob-builds/tree-overlay'
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
