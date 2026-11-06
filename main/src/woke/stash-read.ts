// Reads the Scarab sub-tab of the stash from one screenshot, for the Flips
// outlines. The tab's layout is fixed, so nothing is recognised item by item:
// find the tab on screen, then check which of its known slots are lit. Plain
// pixel sums, so the OCR worker (100-200 MB) stays unloaded.
//
// The panel moves (a folder row above it, a window like Faustus beside it), so
// the row symbols at the left of the tab are searched for on every read and
// slots are placed from them. The sub-tab buttons above can't be used: their
// number varies. The middle column of symbols confirms the match.
import { ANCHOR, CONFIRM, REF_HEIGHT, SCARAB_LAYOUTS, SLOT_SIZE } from './stash-scarab-data'
import { DIGITS, DIGIT_HEIGHT, DIGIT_STROKE, DIGIT_TOP } from './stash-digits-data'

// The first pass searches a shrunk picture, this much smaller at 1440p.
const COARSE = 4
const COARSE_MIN = 0.6
const COARSE_TRIES = 6
const ANCHOR_MIN = 0.7
const CONFIRM_MIN = 0.6
// Text in the wrong spot scores about 0; thin text at small sizes about 0.6.
const LAYOUT_MIN = 0.45
// A filled slot has a navy backing and an empty one a dark grey, so a slot's
// corners show which it is, whatever the item's colour. Blue minus red, as a part
// of how bright the corner is, so a darker screen keeps the same split: filled
// slots are far bluer than empty ghosts and the tab's own teal background.
const FILLED_BLUENESS = 0.3
// The stash opens at the left, and the symbols sit in the top half of the screen,
// in every layout seen. Windows like Faustus open beside it.
const SEARCH_HEIGHT = 0.6
const SEARCH_WIDTH = 0.5

export interface StashSlot {
  name: string
  // Top left and size, as fractions of the game window.
  x: number
  y: number
  width: number
  height: number
  filled: boolean
  // The stack count, or null when it can't be read for certain.
  count: number | null
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
  const maxX = Math.min(img.width - t.width, Math.floor(img.width * SEARCH_WIDTH))
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
let cache: { height: number, anchor: Template, coarse: Template, confirm: Template } | null = null

function templatesFor (height: number) {
  if (cache?.height === height) return cache
  const scale = height / REF_HEIGHT
  const anchor = scaled(ANCHOR, scale)
  const coarse = coarseFactor(height)
  cache = {
    height,
    anchor: template(anchor),
    coarse: template(resize(anchor, Math.max(1, Math.floor(anchor.width / coarse)), Math.max(1, Math.floor(anchor.height / coarse)))),
    confirm: template(scaled(CONFIRM, scale))
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
    const xMax = Math.min(gray.width - t.anchor.width, hit.x * coarse + slack)
    const yMax = Math.min(gray.height - t.anchor.height, hit.y * coarse + slack)
    for (let y = Math.max(0, hit.y * coarse - slack); y <= yMax; y++) {
      for (let x = Math.max(0, hit.x * coarse - slack); x <= xMax; x++) {
        const score = matchAt(gray, t.anchor, x, y)
        if (score > best) { best = score; at = { x, y } }
      }
    }
    if (best < ANCHOR_MIN) continue
    const cx = at.x + Math.round(CONFIRM.dx * scale)
    const cy = at.y + Math.round(CONFIRM.dy * scale)
    if (cx < 0 || cy < 0 || cx + t.confirm.width > gray.width || cy + t.confirm.height > gray.height) continue
    if (matchAt(gray, t.confirm, cx, cy) >= CONFIRM_MIN) return at
  }
  return null
}

// How blue a slot's corners are. The middle of three, as an item can hang
// over one corner, and the top left holds the stack count.
function slotBlueness (bgra: Uint8Array, width: number, height: number, x: number, y: number, size: number): number {
  const k = Math.max(3, Math.floor(size / 7))
  const corners = [
    [x + 1, y + size - k - 1],
    [x + size - k - 1, y + size - k - 1],
    [x + size - k - 1, y + 1]
  ]
  const values = corners.map(([cx, cy]) => {
    let diff = 0
    let sum = 0
    for (let j = Math.max(0, cy); j < Math.min(height, cy + k); j++) {
      for (let i = Math.max(0, cx); i < Math.min(width, cx + k); i++) {
        const p = (j * width + i) * 4
        diff += bgra[p] - bgra[p + 2]
        sum += (bgra[p] + bgra[p + 1] + bgra[p + 2]) / 3
      }
    }
    return sum > 0 ? diff / sum : 0
  })
  return values.sort((a, b) => a - b)[1]
}

// The digits are one font at one size, and only 1440p has been seen, so another
// window size reads no counts rather than guess.
const COUNT_MIN = 0.85
// Below this the number has ended. True digits score at least 0.96 and the item
// behind them at most 0.48, so between the two something is covering a digit.
const COUNT_END = 0.6
const COUNT_WIDTH = SLOT_SIZE
const COUNT_DIGITS = 4
const COUNT_NEXT = 7
const COUNT_ROWS = [-2, -1, 0, 1, 2]

// Only the stroke and the dark outline around it, as the item shows through the rest.
const digitTemplates = DIGITS.map(d => {
  const offsets: number[] = []
  const values: number[] = []
  const stroke = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < d.width && y < DIGIT_HEIGHT && d.gray[y * d.width + x] > DIGIT_STROKE
  for (let y = 0; y < DIGIT_HEIGHT; y++) {
    for (let x = 0; x < d.width; x++) {
      let near = false
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) near = near || stroke(x + i, y + j)
      if (!near) continue
      offsets.push(y * COUNT_WIDTH + x)
      values.push(d.gray[y * d.width + x])
    }
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const zeroed = values.map(v => v - mean)
  return { digit: d.digit, width: d.width, offsets, values: zeroed, norm: Math.sqrt(zeroed.reduce((a, v) => a + v * v, 0)) }
})

function digitScore (crop: Float32Array, t: typeof digitTemplates[number], x: number, y: number): number {
  const at = y * COUNT_WIDTH + x
  let sum = 0
  let sumSq = 0
  let dot = 0
  for (let k = 0; k < t.offsets.length; k++) {
    const v = crop[at + t.offsets[k]]
    sum += v
    sumSq += v * v
    dot += v * t.values[k]
  }
  const variance = sumSq - sum * sum / t.offsets.length
  return variance > 1e-6 && t.norm > 0 ? dot / (Math.sqrt(variance) * t.norm) : -1
}

const CROP_ROWS = DIGIT_TOP + DIGIT_HEIGHT + COUNT_ROWS[COUNT_ROWS.length - 1]

function readCount (bgra: Uint8Array, width: number, height: number, x0: number, y0: number): number | null {
  if (height !== REF_HEIGHT || x0 < 0 || y0 < 0 || x0 + COUNT_WIDTH > width || y0 + CROP_ROWS > height) return null
  // The darkest channel, as the digits are white and most items are not.
  const crop = new Float32Array(COUNT_WIDTH * CROP_ROWS)
  for (let y = 0; y < CROP_ROWS; y++) {
    for (let x = 0; x < COUNT_WIDTH; x++) {
      const p = ((y0 + y) * width + x0 + x) * 4
      crop[y * COUNT_WIDTH + x] = Math.min(bgra[p], bgra[p + 1], bgra[p + 2])
    }
  }
  let x = 0
  let row: number | null = null
  let digits = 0
  let value = 0
  for (;;) {
    let best = -1
    let bestDigit = 0
    let bestEnd = 0
    let bestRow = 0
    for (const t of digitTemplates) {
      for (let dx = 0; dx < COUNT_NEXT && x + dx + t.width <= COUNT_WIDTH; dx++) {
        for (const dy of row == null ? COUNT_ROWS : [row]) {
          const score = digitScore(crop, t, x + dx, DIGIT_TOP + dy)
          if (score > best) { best = score; bestDigit = t.digit; bestEnd = x + dx + t.width; bestRow = dy }
        }
      }
    }
    if (best < COUNT_END) break
    if (best < COUNT_MIN || (!digits && !bestDigit) || digits === COUNT_DIGITS) return null
    value = value * 10 + bestDigit
    digits++
    x = bestEnd
    row = bestRow
  }
  return digits ? value : null
}

let layoutCache: { height: number, labels: Template[] } | null = null

// Stashes differ: one has a Breach button, and its slots hold other scarabs.
// The SCARAB button's text sits in a different spot in each, so it says which
// table applies. An unknown layout reads as nothing, rather than a wrong table.
function findLayout (gray: Gray, at: { x: number, y: number }, scale: number) {
  if (layoutCache?.height !== gray.height) {
    layoutCache = { height: gray.height, labels: SCARAB_LAYOUTS.map(l => template(scaled(l.label, scale))) }
  }
  const labels = layoutCache.labels
  let best: typeof SCARAB_LAYOUTS[number] | null = null
  let bestScore = LAYOUT_MIN
  for (let n = 0; n < SCARAB_LAYOUTS.length; n++) {
    const layout = SCARAB_LAYOUTS[n]
    const t = labels[n]
    const slack = Math.ceil(3 * scale)
    const x0 = at.x + Math.round(layout.label.dx * scale)
    const y0 = at.y + Math.round(layout.label.dy * scale)
    for (let y = Math.max(0, y0 - slack); y <= Math.min(gray.height - t.height, y0 + slack); y++) {
      for (let x = Math.max(0, x0 - slack); x <= Math.min(gray.width - t.width, x0 + slack); x++) {
        const score = matchAt(gray, t, x, y)
        if (score > bestScore) { bestScore = score; best = layout }
      }
    }
  }
  return best
}

// `bgra` is a screenshot of the game window.
export function readScarabTab (bgra: Uint8Array, width: number, height: number): StashRead {
  const scale = height / REF_HEIGHT
  const gray = toGray(bgra, width, height)
  const coarse = coarseFactor(height)
  const small = resize(gray, Math.floor(width / coarse), Math.floor(height / coarse))
  const at = findTab(gray, small, scale)
  if (!at) return { found: false }
  const layout = findLayout(gray, at, scale)
  if (!layout) return { found: false }
  const size = Math.round(SLOT_SIZE * scale)
  return {
    found: true,
    slots: layout.slots.map(s => {
      const x = at.x + Math.round(s.dx * scale)
      const y = at.y + Math.round(s.dy * scale)
      const filled = slotBlueness(bgra, width, height, x, y, size) >= FILLED_BLUENESS
      return {
        name: s.name,
        x: x / width,
        y: y / height,
        width: size / width,
        height: size / height,
        filled,
        count: filled ? readCount(bgra, width, height, x, y) : null
      }
    })
  }
}
