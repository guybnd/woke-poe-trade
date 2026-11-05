// Reads the Scarab sub-tab of the stash from one screenshot, for the Flips
// outlines. The tab's layout is fixed, so nothing is recognised item by item:
// find the tab on screen, then check which of its known slots are lit. Plain
// pixel sums, so the OCR worker (100-200 MB) stays unloaded.
//
// The panel moves (a folder row above it, a window like Faustus beside it), so
// the SCARAB button's text is searched for on every read and slots are placed
// from it. That text also shows on the other sub-tabs, so a symbol that only
// the Scarab tab has confirms it.
import { GLYPH, LABEL, REF_HEIGHT, SCARAB_SLOTS, SLOT_SIZE } from './stash-scarab-data'

// The first pass searches a shrunk picture, this much smaller at 1440p.
const COARSE = 4
const COARSE_MIN = 0.6
const COARSE_TRIES = 6
const LABEL_MIN = 0.7
const GLYPH_MIN = 0.6
// Empty slots show a dim ghost of their item (about 20), filled ones are 65+,
// on the screenshot the templates came from. Scaled by how the SCARAB text
// compares, so a brighter or darker game keeps the same split.
const FILLED_MIN = 40
// The button sits in the top half of the screen in every layout seen.
const SEARCH_HEIGHT = 0.6

export interface StashSlot {
  name: string
  // Top left and size, as fractions of the game window.
  x: number
  y: number
  width: number
  height: number
  filled: boolean
}

export type StashRead = { found: false } | { found: true, slots: StashSlot[] }

interface Gray { width: number, height: number, data: Float32Array }

function toGray (bgra: Uint8Array, width: number, height: number): Gray {
  const data = new Float32Array(width * height)
  for (let i = 0, p = 0; i < data.length; i++, p += 4) {
    data[i] = (bgra[p] + bgra[p + 1] + bgra[p + 2]) / 3
  }
  return { width, height, data }
}

// Area average, weighting the source pixels each target pixel partly covers.
function resize (src: Gray, width: number, height: number): Gray {
  const data = new Float32Array(width * height)
  const sx = src.width / width
  const sy = src.height / height
  for (let y = 0; y < height; y++) {
    const top = y * sy
    const bottom = (y + 1) * sy
    for (let x = 0; x < width; x++) {
      const left = x * sx
      const right = (x + 1) * sx
      let sum = 0
      let area = 0
      for (let j = Math.floor(top); j < Math.min(src.height, Math.ceil(bottom)); j++) {
        const wy = Math.min(j + 1, bottom) - Math.max(j, top)
        const row = j * src.width
        for (let i = Math.floor(left); i < Math.min(src.width, Math.ceil(right)); i++) {
          const w = wy * (Math.min(i + 1, right) - Math.max(i, left))
          sum += src.data[row + i] * w
          area += w
        }
      }
      data[y * width + x] = area ? sum / area : 0
    }
  }
  return { width, height, data }
}

interface Template { width: number, height: number, data: Float32Array, norm: number }

// Zero mean, so a match doesn't depend on how bright the screen is.
function template (src: Gray): Template {
  const n = src.data.length
  let mean = 0
  for (let i = 0; i < n; i++) mean += src.data[i]
  mean /= n
  const data = new Float32Array(n)
  let norm = 0
  for (let i = 0; i < n; i++) {
    data[i] = src.data[i] - mean
    norm += data[i] * data[i]
  }
  return { width: src.width, height: src.height, data, norm: Math.sqrt(norm) }
}

function matchAt (img: Gray, t: Template, x: number, y: number): number {
  let sum = 0
  let sumSq = 0
  let dot = 0
  for (let j = 0, k = 0; j < t.height; j++) {
    const row = (y + j) * img.width + x
    for (let i = 0; i < t.width; i++, k++) {
      const v = img.data[row + i]
      sum += v
      sumSq += v * v
      dot += v * t.data[k]
    }
  }
  const n = t.width * t.height
  const variance = sumSq - sum * sum / n
  return variance > 1e-6 && t.norm > 0 ? dot / (Math.sqrt(variance) * t.norm) : -1
}

function coarseCandidates (img: Gray, t: Template): Array<{ x: number, y: number }> {
  const maxY = Math.min(img.height - t.height, Math.floor(img.height * SEARCH_HEIGHT))
  const maxX = img.width - t.width
  const hits: Array<{ x: number, y: number, score: number }> = []
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= maxX; x++) {
      const score = matchAt(img, t, x, y)
      if (score < COARSE_MIN) continue
      const near = hits.find(h => Math.abs(h.x - x) <= t.width && Math.abs(h.y - y) <= t.height)
      if (!near) hits.push({ x, y, score })
      else if (score > near.score) { near.x = x; near.y = y; near.score = score }
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, COARSE_TRIES)
}

function scaled (src: { width: number, height: number, gray: number[] }, scale: number): Gray {
  const full = { width: src.width, height: src.height, data: Float32Array.from(src.gray) }
  return scale === 1 ? full : resize(full, Math.max(1, Math.round(src.width * scale)), Math.max(1, Math.round(src.height * scale)))
}

function coarseFactor (height: number): number {
  return Math.max(1, Math.round(COARSE * height / REF_HEIGHT))
}

// Templates at the sizes this window needs, kept between reads.
let cache: { height: number, label: Template, coarse: Template, glyph: Template } | null = null

function templatesFor (height: number) {
  if (cache?.height === height) return cache
  const scale = height / REF_HEIGHT
  const label = scaled(LABEL, scale)
  const coarse = coarseFactor(height)
  cache = {
    height,
    label: template(label),
    coarse: template(resize(label, Math.max(1, Math.floor(label.width / coarse)), Math.max(1, Math.floor(label.height / coarse)))),
    glyph: template(scaled(GLYPH, scale))
  }
  return cache
}

function findTab (gray: Gray, small: Gray, scale: number): { x: number, y: number } | null {
  const t = templatesFor(gray.height)
  const coarse = coarseFactor(gray.height)
  const slack = coarse * 2
  for (const hit of coarseCandidates(small, t.coarse)) {
    let best = -1
    let at = { x: 0, y: 0 }
    const xMax = Math.min(gray.width - t.label.width, hit.x * coarse + slack)
    const yMax = Math.min(gray.height - t.label.height, hit.y * coarse + slack)
    for (let y = Math.max(0, hit.y * coarse - slack); y <= yMax; y++) {
      for (let x = Math.max(0, hit.x * coarse - slack); x <= xMax; x++) {
        const score = matchAt(gray, t.label, x, y)
        if (score > best) { best = score; at = { x, y } }
      }
    }
    if (best < LABEL_MIN) continue
    const gx = at.x + Math.round(GLYPH.dx * scale)
    const gy = at.y + Math.round(GLYPH.dy * scale)
    if (gx < 0 || gy < 0 || gx + t.glyph.width > gray.width || gy + t.glyph.height > gray.height) continue
    if (matchAt(gray, t.glyph, gx, gy) >= GLYPH_MIN) return at
  }
  return null
}

const LABEL_MEAN = LABEL.gray.reduce((a, b) => a + b, 0) / LABEL.gray.length

function slotMean (gray: Gray, x: number, y: number, size: number): number {
  const inset = Math.round(size / 6)
  return regionMean(gray, x + inset, y + inset, size - inset * 2, size - inset * 2)
}

function regionMean (gray: Gray, x: number, y: number, width: number, height: number): number {
  const x0 = Math.max(0, x)
  const y0 = Math.max(0, y)
  const x1 = Math.min(gray.width, x + width)
  const y1 = Math.min(gray.height, y + height)
  if (x1 <= x0 || y1 <= y0) return 0
  let sum = 0
  for (let j = y0; j < y1; j++) {
    const row = j * gray.width
    for (let i = x0; i < x1; i++) sum += gray.data[row + i]
  }
  return sum / ((x1 - x0) * (y1 - y0))
}

// `bgra` is a screenshot of the game window.
export function readScarabTab (bgra: Uint8Array, width: number, height: number): StashRead {
  const scale = height / REF_HEIGHT
  const gray = toGray(bgra, width, height)
  const coarse = coarseFactor(height)
  const small = resize(gray, Math.floor(width / coarse), Math.floor(height / coarse))
  const at = findTab(gray, small, scale)
  if (!at) return { found: false }
  const size = Math.round(SLOT_SIZE * scale)
  const t = templatesFor(height)
  const brightness = regionMean(gray, at.x, at.y, t.label.width, t.label.height) / LABEL_MEAN
  const filledMin = FILLED_MIN * brightness
  return {
    found: true,
    slots: SCARAB_SLOTS.map(s => {
      const x = at.x + Math.round(s.dx * scale)
      const y = at.y + Math.round(s.dy * scale)
      return {
        name: s.name,
        x: x / width,
        y: y / height,
        width: size / width,
        height: size / height,
        filled: slotMean(gray, x, y, size) >= filledMin
      }
    })
  }
}
