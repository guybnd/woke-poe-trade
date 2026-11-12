// Finds where the game's passive tree sits on screen: the zoom and offset that
// map tree coordinates to screen pixels (screen = tree * zoom + offset). The
// tree is never rotated, so those three numbers are all there is.
//
// 1. Bright blobs on a half-size, high-passed grey copy of the screen are
//    the node frames and icons.
// 2. For each zoom tried, every blob votes for the offsets that would put
//    some node on it (a Hough transform). The busiest offsets are checked by
//    how bright the screen is under all the nodes they'd place.
// 3. The best one is nudged to the pixel by the same check.
// Pure: only reads the BGRA pixels it is given.

export interface TreePoints {
  // Tree coordinates and frame radius of every node drawn in game.
  x: Float32Array
  y: Float32Array
  r: Float32Array
}

export interface TreeFit {
  zoom: number
  ox: number
  oy: number
  // Brightness under the nodes against the screen's average. A real tree
  // scores about 3.5 to 7.5; anything else stays near 1.
  score: number
  // Share of the nodes on screen that sit on something bright. A real tree
  // is about 0.8 and up; a chance match on a dark screen far less.
  hits: number
}

// Below this the tree isn't open (or isn't the one we know). Real trees
// scored 5.3 and up on test shots; play screens up to 3.5.
export const MIN_SCORE = 4.3
// Play screens were 0.6 dark at most, tree screens 0.85 and up.
const MIN_DARK = 0.75
const MIN_HITS = 0.6

// Zoom steps measured at 2560x1440. Other window heights scale them.
const STEPS_1440 = [0.1440, 0.2339, 0.3236, 0.6227, 0.7180]
const REF_H = 1440

export interface Screen {
  width: number
  height: number
  // Share of near-black pixels. A tree screen is about 0.85 to 0.9.
  dark: number
  // Brightness of the top 3% of map: what a node centre reads at least.
  thr: number
  // Blurred high-pass grey, half size (width >> 1 by height >> 1).
  map: Float32Array
  mw: number
  mh: number
  // Mean of map where nodes may be read.
  mean: number
  // Blob centres, full-size pixels.
  peaks: Float32Array
  // UI that hides the tree: bottom bar and the Skills header (full pixels).
  hudTop: number
  headX0: number
  headX1: number
  headY: number
}

export function readScreen (bgra: Uint8Array, width: number, height: number): Screen {
  const mw = width >> 1
  const mh = height >> 1
  const k = height / REF_H
  const hudTop = Math.round(1210 * k)
  const headX0 = Math.round(width / 2 - 460 * k)
  const headX1 = Math.round(width / 2 + 460 * k)
  const headY = Math.round(240 * k)

  const g = new Float32Array(mw * mh)
  const row = width * 4
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const i = (y * 2) * row + (x * 2) * 4
      let s = 0
      for (const j of [i, i + 4, i + row, i + row + 4]) s += bgra[j] * 0.114 + bgra[j + 1] * 0.587 + bgra[j + 2] * 0.299
      g[y * mw + x] = s / 4
    }
  }
  // The tree's backdrop is near black: most of the screen is, with it open.
  let darkN = 0
  let allN = 0
  for (let y = headY >> 1; y < hudTop >> 1 && y < mh; y += 2) {
    for (let x = 0; x < mw; x += 2) { allN++; if (g[y * mw + x] < 30) darkN++ }
  }
  const dark = allN ? darkN / allN : 0
  // High-pass: take away a 31 px box average, keep what's brighter.
  const avg = boxBlur(g, mw, mh, 15)
  for (let i = 0; i < g.length; i++) g[i] = Math.max(0, g[i] - avg[i])
  // Masked parts read as empty.
  const mHud = hudTop >> 1
  for (let y = mHud; y < mh; y++) g.fill(0, y * mw, (y + 1) * mw)
  for (let y = 0; y < (headY >> 1); y++) g.fill(0, y * mw + Math.max(0, headX0 >> 1), y * mw + Math.min(mw, headX1 >> 1))

  // Three box blurs of radius 2 come close to a Gaussian of sigma 3.
  const map = boxBlur(boxBlur(boxBlur(g, mw, mh, 2), mw, mh, 2), mw, mh, 2)
  let sum = 0
  let n = 0
  for (let y = 0; y < mHud && y < mh; y++) {
    for (let x = 0; x < mw; x++) { sum += map[y * mw + x]; n++ }
  }
  const mean = n ? sum / n : 0

  // Local maxima over 9x9, in the brightest 3%.
  const mx = maxFilter(map, mw, mh, 4)
  const thr = percentile(map, 0.97)
  const peaks: number[] = []
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const v = map[y * mw + x]
      if (v > thr && v === mx[y * mw + x]) peaks.push(x * 2, y * 2)
    }
  }
  return { width, height, dark, thr, map, mw, mh, mean, peaks: Float32Array.from(peaks), hudTop, headX0, headX1, headY }
}

// The zoom steps for this window height.
export function zoomSteps (height: number): number[] {
  return STEPS_1440.map(z => z * height / REF_H)
}

// hint: the last fit, when only the offset may have changed (a drag).
export function fitTree (scr: Screen, pts: TreePoints, hint?: { zoom: number } | null): TreeFit | null {
  if (scr.dark < MIN_DARK) return null
  const tryZooms = (zooms: number[]) => {
    let best: TreeFit | null = null
    for (const z of zooms) {
      for (const c of hough(scr, pts, z)) {
        const score = check(scr, pts, z, c[0], c[1])
        if (!best || score > best.score) best = { zoom: z, ox: c[0], oy: c[1], score, hits: 0 }
      }
    }
    return best
  }
  let best: TreeFit | null = null
  if (hint) best = tryZooms([hint.zoom])
  if (!best || best.score < MIN_SCORE) {
    const other = tryZooms(zoomSteps(scr.height))
    if (other && (!best || other.score > best.score)) best = other
  }
  if (!best || best.score < MIN_SCORE) {
    // Not one of the steps we know: look everywhere in between.
    const k = scr.height / REF_H
    const zooms: number[] = []
    for (let i = 0; i < 60; i++) zooms.push(k * 0.1 * Math.pow(9, i / 59))
    const other = tryZooms(zooms)
    if (other && (!best || other.score > best.score)) best = other
  }
  if (!best || best.score < MIN_SCORE) return null
  const fit = refine(scr, pts, best)
  fit.hits = hitShare(scr, pts, fit.zoom, fit.ox, fit.oy)
  return fit.score >= MIN_SCORE && fit.hits >= MIN_HITS ? fit : null
}

// The 8 offsets with most votes at zoom z.
function hough (scr: Screen, pts: TreePoints, z: number): Array<[number, number]> {
  // Keep in step with refine().
  const bin = Math.max(8, 30 * z)
  // Offsets that leave some of the tree on screen.
  const span = 9200 * z
  const x0 = -span
  const y0 = -span
  const nx = Math.ceil((2 * span + scr.width) / bin)
  const ny = Math.ceil((2 * span + scr.height) / bin)
  const acc = new Uint16Array(nx * ny)
  const { peaks } = scr
  const n = pts.x.length
  for (let p = 0; p < peaks.length; p += 2) {
    const px = peaks[p] - x0
    const py = peaks[p + 1] - y0
    for (let i = 0; i < n; i++) {
      const bx = Math.floor((px - pts.x[i] * z) / bin)
      const by = Math.floor((py - pts.y[i] * z) / bin)
      if (bx < 0 || by < 0 || bx >= nx || by >= ny) continue
      const j = by * nx + bx
      if (acc[j] < 65535) acc[j]++
    }
  }
  const top: Array<[number, number]> = []
  for (let j = 0; j < acc.length; j++) {
    const v = acc[j]
    if (v < 3) continue
    if (top.length < 8 || v > top[top.length - 1][1]) {
      top.push([j, v])
      top.sort((a, b) => b[1] - a[1])
      if (top.length > 8) top.pop()
    }
  }
  return top.map(([j]) => [x0 + ((j % nx) + 0.5) * bin, y0 + (Math.floor(j / nx) + 0.5) * bin])
}

// Share of the nodes on screen that sit on something node-bright.
export function hitShare (scr: Screen, pts: TreePoints, z: number, ox: number, oy: number): number {
  const { map, mw, width, hudTop, headX0, headX1, headY } = scr
  let hit = 0
  let n = 0
  for (let i = 0; i < pts.x.length; i++) {
    const x = pts.x[i] * z + ox
    const y = pts.y[i] * z + oy
    if (x < 4 || y < 4 || x >= width - 4 || y >= hudTop) continue
    if (y < headY && x > headX0 && x < headX1) continue
    n++
    if (map[(y >> 1) * mw + (x >> 1)] > scr.thr * 0.5) hit++
  }
  return n < 6 ? 0 : hit / n
}

// Mean brightness under the nodes on screen, against the screen's mean.
export function check (scr: Screen, pts: TreePoints, z: number, ox: number, oy: number): number {
  const { map, mw, width, hudTop, headX0, headX1, headY } = scr
  let sum = 0
  let n = 0
  for (let i = 0; i < pts.x.length; i++) {
    const x = pts.x[i] * z + ox
    const y = pts.y[i] * z + oy
    if (x < 4 || y < 4 || x >= width - 4 || y >= hudTop) continue
    if (y < headY && x > headX0 && x < headX1) continue
    sum += map[(y >> 1) * mw + (x >> 1)]
    n++
  }
  if (n < 6) return 0
  return (sum / n) / (scr.mean + 1e-3)
}

function refine (scr: Screen, all: TreePoints, fit: TreeFit): TreeFit {
  let { zoom, ox, oy } = fit
  // Only nodes near the screen matter; the rest would be skipped each time.
  const pad = 120
  const keep: number[] = []
  for (let i = 0; i < all.x.length; i++) {
    const x = all.x[i] * zoom + ox
    const y = all.y[i] * zoom + oy
    if (x > -pad && y > -pad && x < scr.width + pad && y < scr.height + pad) keep.push(i)
  }
  const pts: TreePoints = { x: Float32Array.from(keep, i => all.x[i]), y: Float32Array.from(keep, i => all.y[i]), r: Float32Array.from(keep, i => all.r[i]) }
  let score = fit.score
  const cx = scr.width / 2
  const cy = scr.height / 2
  // The vote bins were this coarse, so the first pass needn't look further.
  const bin = Math.max(8, 30 * zoom)
  for (const [range, step, zr] of [[Math.ceil(bin), 2, 0.03], [4, 0.5, 0.006]]) {
    const z0 = zoom
    const tx = (cx - ox) / z0
    const ty = (cy - oy) / z0
    let best = { zoom, ox, oy, score: -1, hits: 0 }
    for (let k = 0; k < 13; k++) {
      const z = z0 * (1 - zr + (2 * zr * k) / 12)
      // Rescale about the screen centre.
      const bx = cx - tx * z
      const by = cy - ty * z
      for (let dx = -range; dx <= range; dx += step) {
        for (let dy = -range; dy <= range; dy += step) {
          const s = checkSmooth(scr, pts, z, bx + dx, by + dy)
          if (s > best.score) best = { zoom: z, ox: bx + dx, oy: by + dy, score: s, hits: 0 }
        }
      }
    }
    ;({ zoom, ox, oy } = best)
  }
  score = check(scr, all, zoom, ox, oy)
  return { zoom, ox, oy, score, hits: 0 }
}

// check() with bilinear reads, for sub-pixel steps.
function checkSmooth (scr: Screen, pts: TreePoints, z: number, ox: number, oy: number): number {
  const { map, mw, mh, width, hudTop, headX0, headX1, headY } = scr
  let sum = 0
  let n = 0
  for (let i = 0; i < pts.x.length; i++) {
    const x = pts.x[i] * z + ox
    const y = pts.y[i] * z + oy
    if (x < 4 || y < 4 || x >= width - 4 || y >= hudTop) continue
    if (y < headY && x > headX0 && x < headX1) continue
    const fx = x / 2
    const fy = y / 2
    const ix = Math.floor(fx)
    const iy = Math.floor(fy)
    if (ix + 1 >= mw || iy + 1 >= mh) continue
    const ax = fx - ix
    const ay = fy - iy
    const j = iy * mw + ix
    sum += (map[j] * (1 - ax) + map[j + 1] * ax) * (1 - ay) + (map[j + mw] * (1 - ax) + map[j + mw + 1] * ax) * ay
    n++
  }
  return n < 6 ? 0 : sum / n
}

// Whether lines are lit (allocated): each probe is a run of tree points
// along one line. Lit lines are pale gold and much brighter than the rest.
export function litProbes (bgra: Uint8Array, width: number, height: number, fit: TreeFit, probes: Float32Array[]): boolean[] {
  return probes.map(probe => {
    let lit = 0
    let seen = 0
    for (let i = 0; i < probe.length; i += 2) {
      const x = Math.round(probe[i] * fit.zoom + fit.ox)
      const y = Math.round(probe[i + 1] * fit.zoom + fit.oy)
      if (x < 2 || y < 2 || x >= width - 2 || y >= height - 2) continue
      seen++
      // The brightest pixel across the line's width.
      let best = 0
      for (let d = -2; d <= 2; d++) {
        for (const [px, py] of [[x + d, y], [x, y + d]]) {
          const j = (py * width + px) * 4
          const b = bgra[j]
          const g = bgra[j + 1]
          const r = bgra[j + 2]
          if (r > b + 40) best = Math.max(best, (r + g) / 2)
        }
      }
      if (best > 165) lit++
    }
    return seen > 0 && lit / seen >= 0.6
  })
}

function boxBlur (src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length)
  const out = new Float32Array(src.length)
  for (let y = 0; y < h; y++) {
    let s = 0
    const o = y * w
    for (let x = -r; x <= r; x++) s += src[o + Math.min(w - 1, Math.max(0, x))]
    for (let x = 0; x < w; x++) {
      tmp[o + x] = s / (2 * r + 1)
      s += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)]
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0
    for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / (2 * r + 1)
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]
    }
  }
  return out
}

function maxFilter (src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length)
  const out = new Float32Array(src.length)
  for (let y = 0; y < h; y++) {
    const o = y * w
    for (let x = 0; x < w; x++) {
      let m = -Infinity
      for (let i = Math.max(0, x - r); i <= Math.min(w - 1, x + r); i++) m = Math.max(m, src[o + i])
      tmp[o + x] = m
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = -Infinity
      for (let i = Math.max(0, y - r); i <= Math.min(h - 1, y + r); i++) m = Math.max(m, tmp[i * w + x])
      out[y * w + x] = m
    }
  }
  return out
}

function percentile (src: Float32Array, q: number): number {
  // A sample is plenty for a threshold.
  const step = Math.max(1, Math.floor(src.length / 20000))
  const s: number[] = []
  for (let i = 0; i < src.length; i += step) s.push(src[i])
  s.sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]
}
