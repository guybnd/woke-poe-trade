// Which unique an unidentified item is, from its art. The copied text of an
// unidentified unique names only the base ("Crimson Jewel"), but the game draws
// the unique's own art in the slot. So the square around the mouse at the price
// check hotkey is compared with each candidate unique's icon (unid-art.ts).
// Pure: no Electron, so the tests run it.
//
// Masked, zero-mean correlation over red, green and blue at a small size: the
// icon's see-through parts are left out, so the slot's tint and the grid lines
// don't count, and a brighter or darker screen scores the same.

export interface Rgba {
  width: number
  height: number
  data: Uint8Array
}

interface Plane {
  w: number
  h: number
  r: Float32Array
  g: Float32Array
  b: Float32Array
  a: Float32Array
}

export interface Template {
  // Masked pixels as offsets into a TEMPLATE x TEMPLATE square, zero-mean colours.
  xs: Int16Array
  ys: Int16Array
  r: Float32Array
  g: Float32Array
  b: Float32Array
  norm: number
}

// The icon is compared at this many pixels a side.
export const TEMPLATE = 16
// Inventory and stash cells, as a part of the game window's height (52.7 px at 1080p).
export const CELL = 0.0488
// Normal cells, a little off in case the slot is drawn bigger or smaller, and quad-tab cells.
export const SCALES = [1, 0.95, 0.9, 0.85, 1.05, 0.5, 0.45]
// Sure: the best match beats every other art by this much (a test with all
// unique jewel icons had no wrong guess at 0.04).
export const SURE_MARGIN = 0.05
// Below this the square isn't the art of any candidate (ground label, chat link).
export const MIN_SCORE = 0.45

// Box-filtered resize. Icons (RGBA, colour weighted by alpha) or screen (BGRA, opaque).
function resample (src: Uint8Array, sw: number, sh: number, tw: number, th: number, bgra: boolean): Plane {
  const n = tw * th
  const out: Plane = { w: tw, h: th, r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n), a: new Float32Array(n) }
  const fx = sw / tw
  const fy = sh / th
  for (let y = 0; y < th; y++) {
    const y0 = y * fy
    const y1 = y0 + fy
    for (let x = 0; x < tw; x++) {
      const x0 = x * fx
      const x1 = x0 + fx
      let R = 0; let G = 0; let B = 0; let A = 0; let W = 0
      for (let yy = Math.floor(y0); yy < Math.ceil(y1) && yy < sh; yy++) {
        const wy = Math.min(y1, yy + 1) - Math.max(y0, yy)
        for (let xx = Math.floor(x0); xx < Math.ceil(x1) && xx < sw; xx++) {
          const w = (Math.min(x1, xx + 1) - Math.max(x0, xx)) * wy
          const o = (yy * sw + xx) * 4
          if (bgra) {
            B += src[o] * w; G += src[o + 1] * w; R += src[o + 2] * w
          } else {
            const al = src[o + 3] / 255
            R += src[o] * w * al; G += src[o + 1] * w * al; B += src[o + 2] * w * al
            A += al * w
          }
          W += w
        }
      }
      const i = y * tw + x
      if (bgra) {
        out.r[i] = R / W; out.g[i] = G / W; out.b[i] = B / W; out.a[i] = 1
      } else {
        out.a[i] = A / W
        const k = A > 0 ? 1 / A : 0
        out.r[i] = R * k; out.g[i] = G * k; out.b[i] = B * k
      }
    }
  }
  return out
}

/** An icon (RGBA) made ready to compare. Null when it is nearly all see-through. */
export function makeTemplate (icon: Rgba): Template | null {
  const p = resample(icon.data, icon.width, icon.height, TEMPLATE, TEMPLATE, false)
  const idx: number[] = []
  for (let i = 0; i < p.a.length; i++) if (p.a[i] > 0.6) idx.push(i)
  const m = idx.length
  if (m < 10) return null
  let mean = 0
  for (const i of idx) mean += p.r[i] + p.g[i] + p.b[i]
  mean /= 3 * m
  const t: Template = { xs: new Int16Array(m), ys: new Int16Array(m), r: new Float32Array(m), g: new Float32Array(m), b: new Float32Array(m), norm: 0 }
  let norm = 0
  idx.forEach((i, k) => {
    t.xs[k] = i % TEMPLATE
    t.ys[k] = Math.floor(i / TEMPLATE)
    t.r[k] = p.r[i] - mean; t.g[k] = p.g[i] - mean; t.b[k] = p.b[i] - mean
    norm += t.r[k] ** 2 + t.g[k] ** 2 + t.b[k] ** 2
  })
  t.norm = Math.sqrt(norm)
  return t.norm > 0 ? t : null
}

function nccAt (img: Plane, t: Template, ox: number, oy: number): number {
  const m = t.xs.length
  let s = 0; let s2 = 0; let dot = 0
  for (let k = 0; k < m; k++) {
    const j = (oy + t.ys[k]) * img.w + ox + t.xs[k]
    const R = img.r[j]; const G = img.g[j]; const B = img.b[j]
    s += R + G + B
    s2 += R * R + G * G + B * B
    dot += R * t.r[k] + G * t.g[k] + B * t.b[k]
  }
  const mean = s / (3 * m)
  const v = s2 - 3 * m * mean * mean
  return v > 1e-6 ? dot / (Math.sqrt(v) * t.norm) : -1
}

// Best score anywhere in the square: every other spot, then around the best few.
function bestScore (img: Plane, t: Template): number {
  const maxX = img.w - TEMPLATE
  const maxY = img.h - TEMPLATE
  if (maxX < 0 || maxY < 0) return -1
  const top: Array<{ s: number, x: number, y: number }> = []
  for (let y = 0; y <= maxY; y += 2) {
    for (let x = 0; x <= maxX; x += 2) {
      const s = nccAt(img, t, x, y)
      if (top.length < 3 || s > top[top.length - 1].s) {
        top.push({ s, x, y })
        top.sort((a, b) => b.s - a.s)
        if (top.length > 3) top.pop()
      }
    }
  }
  let best = top.length ? top[0].s : -1
  for (const c of top) {
    for (let y = Math.max(0, c.y - 1); y <= Math.min(maxY, c.y + 1); y++) {
      for (let x = Math.max(0, c.x - 1); x <= Math.min(maxX, c.x + 1); x++) {
        if ((x - c.x) % 2 === 0 && (y - c.y) % 2 === 0) continue
        best = Math.max(best, nccAt(img, t, x, y))
      }
    }
  }
  return best
}

export interface Candidate {
  name: string
  // Candidates sharing one icon (Replica twins) can't be told apart.
  art: string
  template: Template | null
}

export interface ArtGuess {
  /** Candidate names, best match first. */
  ranked: Array<{ name: string, score: number }>
  /** The best match beats every candidate with other art clearly. */
  sure: boolean
}

/** The square around the mouse at each size it is compared at. */
export function prepareShot (shot: Rgba, cellPx: number): unknown[] {
  const planes: Plane[] = []
  for (const scale of SCALES) {
    const f = TEMPLATE / (cellPx * scale)
    const w = Math.round(shot.width * f)
    const h = Math.round(shot.height * f)
    if (w >= TEMPLATE && h >= TEMPLATE) planes.push(resample(shot.data, shot.width, shot.height, w, h, true))
  }
  return planes
}

/** How well one icon matches anywhere in the square, at any size (about -1..1). */
export function scoreCandidate (prepared: unknown[], template: Template | null): number {
  if (!template) return -1
  let best = -1
  for (const img of prepared as Plane[]) best = Math.max(best, bestScore(img, template))
  return best
}

/** Best first, and whether the best clearly beats every other art. */
export function finishGuess (candidates: Candidate[], scores: number[]): ArtGuess {
  const ranked = candidates.map((c, i) => ({ name: c.name, art: c.art, score: scores[i] }))
    .sort((a, b) => b.score - a.score)
  const best = ranked[0]
  const rival = ranked.find(r => r.art !== best?.art)
  const sure = best != null && best.score >= MIN_SCORE &&
    (rival == null || best.score - rival.score >= SURE_MARGIN)
  return { ranked: ranked.map(({ name, score }) => ({ name, score: Math.round(score * 1000) / 1000 })), sure }
}

/**
 * Ranks the candidates against the square around the mouse, in one go.
 * @param shot BGRA pixels of the square.
 * @param cellPx A normal inventory cell's size in the square's pixels.
 */
export function rankByArt (shot: Rgba, cellPx: number, candidates: Candidate[]): ArtGuess {
  const prepared = prepareShot(shot, cellPx)
  return finishGuess(candidates, candidates.map(c => scoreCandidate(prepared, c.template)))
}
