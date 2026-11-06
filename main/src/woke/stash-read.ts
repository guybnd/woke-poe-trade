// Reads a flip's stash sub-tab from one screenshot, for the Flips outlines. A
// tab's layout is fixed, so nothing is recognised item by item: find the tab on
// screen, then check which of its known slots hold something. Plain
// pixel sums, so the OCR worker (100-200 MB) stays unloaded.
//
// The panel moves (a folder row above it, a window like Faustus beside it), so
// the row symbols at the left of the tab are searched for on every read and
// slots are placed from them. The sub-tab buttons above can't be used: their
// number varies. The middle column of symbols confirms the match.
import { ANCHOR, CONFIRM, REF_HEIGHT, SCARAB_LAYOUTS, SLOT_SIZE } from './stash-scarab-data'
import { DIGITS, DIGIT_HEIGHT, DIGIT_STROKE, DIGIT_TOP } from './stash-digits-data'
import { STASH_TABS } from './stash-tabs-data'

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

export type StashRead = { found: false } | { found: true, family: string, slots: StashSlot[] }

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

// Linear interpolation, for making a picture bigger.
function enlarge (src: Gray, width: number, height: number): Gray {
  const data = new Float32Array(width * height)
  const sx = src.width / width
  const sy = src.height / height
  for (let y = 0; y < height; y++) {
    const fy0 = Math.min(src.height - 1, Math.max(0, (y + 0.5) * sy - 0.5))
    const j = Math.min(Math.floor(fy0), Math.max(0, src.height - 2))
    const j1 = Math.min(j + 1, src.height - 1)
    const fy = fy0 - j
    for (let x = 0; x < width; x++) {
      const fx0 = Math.min(src.width - 1, Math.max(0, (x + 0.5) * sx - 0.5))
      const i = Math.min(Math.floor(fx0), Math.max(0, src.width - 2))
      const i1 = Math.min(i + 1, src.width - 1)
      const fx = fx0 - i
      const top = src.data[j * src.width + i] * (1 - fx) + src.data[j * src.width + i1] * fx
      const low = src.data[j1 * src.width + i] * (1 - fx) + src.data[j1 * src.width + i1] * fx
      data[y * width + x] = top * (1 - fy) + low * fy
    }
  }
  return { width, height, data }
}

// To another size: area averaged down, interpolated up.
function resample (src: Gray, width: number, height: number): Gray {
  return width <= src.width && height <= src.height ? resize(src, width, height) : enlarge(src, width, height)
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

function coarseCandidates (img: Gray, t: Template, near?: { x: number, y: number, slackX: number, slackY: number }): Array<{ x: number, y: number }> {
  const maxY = Math.min(img.height - t.height, near ? near.y + near.slackY : Math.floor(img.height * SEARCH_HEIGHT))
  const maxX = Math.min(img.width - t.width, near ? near.x + near.slackX : Math.floor(img.width * SEARCH_WIDTH))
  const hits: Array<{ x: number, y: number, score: number }> = []
  for (let y = near ? Math.max(0, near.y - near.slackY) : 0; y <= maxY; y++) {
    for (let x = near ? Math.max(0, near.x - near.slackX) : 0; x <= maxX; x++) {
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

// The best full-size match around one coarse hit.
function refineHit (gray: Gray, t: Template, hit: { x: number, y: number }, coarse: number) {
  const slack = coarse * 2
  let best = -1
  let at = { x: 0, y: 0 }
  const xMax = Math.min(gray.width - t.width, hit.x * coarse + slack)
  const yMax = Math.min(gray.height - t.height, hit.y * coarse + slack)
  for (let y = Math.max(0, hit.y * coarse - slack); y <= yMax; y++) {
    for (let x = Math.max(0, hit.x * coarse - slack); x <= xMax; x++) {
      const score = matchAt(gray, t, x, y)
      if (score > best) { best = score; at = { x, y } }
    }
  }
  return { at, best }
}

function refine (gray: Gray, t: Template, hits: Array<{ x: number, y: number }>, coarse: number, min: number) {
  for (const hit of hits) {
    const { at, best } = refineHit(gray, t, hit, coarse)
    if (best >= min) return at
  }
  return null
}

function findTab (gray: Gray, small: Gray, scale: number): { x: number, y: number } | null {
  const t = templatesFor(gray.height)
  const coarse = coarseFactor(gray.height)
  for (const hit of coarseCandidates(small, t.coarse)) {
    const { at, best } = refineHit(gray, t.anchor, hit, coarse)
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

// The digits were captured at 1440p. At another window size the count's corner
// is resampled to 1440p first, so the same digit pictures and limits apply.
const COUNT_MIN = 0.85
// Below this the number has ended. True digits score at least 0.96 and the item
// behind them at most about 0.8 on bright fossils. In between, a white shape means
// something is covering a digit, and anything else is just the item.
const COUNT_END = 0.6
const COUNT_WHITE = 170
const COUNT_WIDTH = SLOT_SIZE
const COUNT_DIGITS = 4
const COUNT_NEXT = 7
// Slots differ in size between tabs, so the first digit can start further in.
const COUNT_FIRST = 16
const COUNT_SETTLE = 1
const COUNT_ROWS = [-2, -1, 0, 1, 2, 3, 4, 5, 6]

interface DigitTemplate {
  digit: number
  width: number
  offsets: number[]
  // Zero mean, at 1440p.
  values: number[]
  norm: number
  // The same digit taken to the window's size and back, as the corner is: the
  // round trip softens the strokes, so a softened digit matches better.
  soft: number[] | null
  softNorm: number
  // How bright the stroke must be to say something white covers a digit. Softened
  // strokes are dimmer, so this drops with them.
  white: number
}

function zeroMean (values: number[]) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const zeroed = values.map(v => v - mean)
  return { values: zeroed, norm: Math.sqrt(zeroed.reduce((a, v) => a + v * v, 0)) }
}

// Only the stroke and the dark outline around it, as the item shows through the rest.
function digitTemplatesFor (scale: number): DigitTemplate[] {
  return DIGITS.map(d => {
    const offsets: number[] = []
    const values: number[] = []
    const at: number[] = []
    const stroke = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < d.width && y < DIGIT_HEIGHT && d.gray[y * d.width + x] > DIGIT_STROKE
    for (let y = 0; y < DIGIT_HEIGHT; y++) {
      for (let x = 0; x < d.width; x++) {
        let near = false
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) near = near || stroke(x + i, y + j)
        if (!near) continue
        offsets.push(y * COUNT_WIDTH + x)
        values.push(d.gray[y * d.width + x])
        at.push(y * d.width + x)
      }
    }
    const sharp = zeroMean(values)
    let soft: ReturnType<typeof zeroMean> | null = null
    let white = COUNT_WHITE
    if (scale !== 1) {
      const full = { width: d.width, height: DIGIT_HEIGHT, data: Float32Array.from(d.gray) }
      const there = resample(full, Math.max(2, Math.round(d.width * scale)), Math.max(2, Math.round(DIGIT_HEIGHT * scale)))
      const back = resample(there, d.width, DIGIT_HEIGHT)
      const raw = at.map(k => back.data[k])
      soft = zeroMean(raw)
      const strokes = sharp.values.flatMap((v, k) => v > 0 ? [k] : [])
      const mean = (list: number[]) => strokes.reduce((a, k) => a + list[k], 0) / strokes.length
      white = COUNT_WHITE * Math.min(1, mean(raw) / mean(values))
    }
    return { digit: d.digit, width: d.width, offsets, values: sharp.values, norm: sharp.norm, soft: soft?.values ?? null, softNorm: soft?.norm ?? 0, white }
  })
}

const digitCache = new Map<number, DigitTemplate[]>()
function digitTemplates (scale: number): DigitTemplate[] {
  let t = digitCache.get(scale)
  if (!t) {
    if (digitCache.size > 4) digitCache.clear()
    t = digitTemplatesFor(scale)
    digitCache.set(scale, t)
  }
  return t
}

function digitScore (crop: Float32Array, t: DigitTemplate, x: number, y: number): number {
  const at = y * COUNT_WIDTH + x
  let sum = 0
  let sumSq = 0
  let dot = 0
  let softDot = 0
  for (let k = 0; k < t.offsets.length; k++) {
    const v = crop[at + t.offsets[k]]
    sum += v
    sumSq += v * v
    dot += v * t.values[k]
    if (t.soft) softDot += v * t.soft[k]
  }
  const variance = sumSq - sum * sum / t.offsets.length
  if (variance <= 1e-6) return -1
  const sharp = t.norm > 0 ? dot / (Math.sqrt(variance) * t.norm) : -1
  const soft = t.soft && t.softNorm > 0 ? softDot / (Math.sqrt(variance) * t.softNorm) : -1
  return Math.max(sharp, soft)
}

function strokeBrightness (crop: Float32Array, t: DigitTemplate, at: number): number {
  let sum = 0
  let n = 0
  for (let k = 0; k < t.offsets.length; k++) {
    if (t.values[k] <= 0) continue
    sum += crop[at + t.offsets[k]]
    n++
  }
  return n ? sum / n : 0
}

const CROP_ROWS = DIGIT_TOP + DIGIT_HEIGHT + COUNT_ROWS[COUNT_ROWS.length - 1]

// The darkest channel, as the digits are white and most items are not.
function darkest (bgra: Uint8Array, width: number, x: number, y: number): number {
  const p = (y * width + x) * 4
  return Math.min(bgra[p], bgra[p + 1], bgra[p + 2])
}

// The count's corner at 1440p size, its top left at (x0, y0) in the window,
// which can fall between pixels. A bigger window is area averaged down, a
// smaller one interpolated up.
function countCrop (bgra: Uint8Array, width: number, height: number, x0: number, y0: number, scale: number): Float32Array | null {
  if (x0 < 0 || y0 < 0 || x0 + COUNT_WIDTH * scale > width || y0 + CROP_ROWS * scale > height) return null
  const crop = new Float32Array(COUNT_WIDTH * CROP_ROWS)
  if (scale === 1 && Number.isInteger(x0) && Number.isInteger(y0)) {
    for (let y = 0; y < CROP_ROWS; y++) {
      for (let x = 0; x < COUNT_WIDTH; x++) crop[y * COUNT_WIDTH + x] = darkest(bgra, width, x0 + x, y0 + y)
    }
    return crop
  }
  for (let y = 0; y < CROP_ROWS; y++) {
    for (let x = 0; x < COUNT_WIDTH; x++) {
      let v = 0
      if (scale > 1) {
        const left = x0 + x * scale
        const right = left + scale
        const top = y0 + y * scale
        const bottom = top + scale
        let area = 0
        for (let j = Math.floor(top); j < Math.min(height, Math.ceil(bottom)); j++) {
          const wy = Math.min(j + 1, bottom) - Math.max(j, top)
          for (let i = Math.floor(left); i < Math.min(width, Math.ceil(right)); i++) {
            const w = wy * (Math.min(i + 1, right) - Math.max(i, left))
            v += darkest(bgra, width, i, j) * w
            area += w
          }
        }
        v = area ? v / area : 0
      } else {
        const sx = Math.min(width - 1, Math.max(0, x0 + (x + 0.5) * scale - 0.5))
        const sy = Math.min(height - 1, Math.max(0, y0 + (y + 0.5) * scale - 0.5))
        const i = Math.min(Math.floor(sx), width - 2)
        const j = Math.min(Math.floor(sy), height - 2)
        const fx = sx - i
        const fy = sy - j
        v = (darkest(bgra, width, i, j) * (1 - fx) + darkest(bgra, width, i + 1, j) * fx) * (1 - fy) +
          (darkest(bgra, width, i, j + 1) * (1 - fx) + darkest(bgra, width, i + 1, j + 1) * fx) * fy
      }
      crop[y * COUNT_WIDTH + x] = v
    }
  }
  return crop
}

// Below about 1000 pixels tall the digits are too few pixels to tell apart for
// certain, so a smaller window reads no counts rather than guess.
const COUNT_MIN_SCALE = 0.7

// Where the slot's corner falls between window pixels, as a part of a 1440p
// pixel. The game's digits sit on its own pixel grid, so another window size
// tries a few and keeps the longest number, then the surest: a phase that
// misses a digit reads a shorter number, so the longest one is the full count.
const COUNT_PHASES = [0, -1 / 3, 1 / 3]

function readCount (bgra: Uint8Array, width: number, height: number, x0: number, y0: number, scale: number): number | null {
  if (scale < COUNT_MIN_SCALE) return null
  const templates = digitTemplates(scale)
  if (scale === 1) {
    const crop = countCrop(bgra, width, height, x0, y0, 1)
    return crop ? readCountIn(crop, templates)?.value ?? null : null
  }
  let best: { value: number, digits: number, score: number } | null = null
  for (const py of COUNT_PHASES) {
    for (const px of COUNT_PHASES) {
      const crop = countCrop(bgra, width, height, x0 + px * scale, y0 + py * scale, scale)
      const read = crop && readCountIn(crop, templates)
      if (read && (!best || read.digits > best.digits || (read.digits === best.digits && read.score > best.score))) best = read
    }
  }
  return best?.value ?? null
}

// The number in one corner, and how sure the least sure digit is.
function readCountIn (crop: Float32Array, templates: DigitTemplate[]): { value: number, digits: number, score: number } | null {
  let x = 0
  let row: number | null = null
  let digits = 0
  let value = 0
  let worst = 1
  for (;;) {
    let best = -1
    let bestDigit = 0
    let bestEnd = 0
    let bestRow = 0
    let bestAt = 0
    let bestT = templates[0]
    // Leftmost first: a narrow digit also fits inside a wider one, a little further on.
    let foundAt = -1
    for (let dx = 0; dx < (digits ? COUNT_NEXT : COUNT_FIRST); dx++) {
      if (foundAt >= 0 && dx > foundAt + COUNT_SETTLE) break
      for (const t of templates) {
        if (x + dx + t.width > COUNT_WIDTH) continue
        for (const dy of row == null ? COUNT_ROWS : [row]) {
          const score = digitScore(crop, t, x + dx, DIGIT_TOP + dy)
          if (score > best) { best = score; bestDigit = t.digit; bestEnd = x + dx + t.width; bestRow = dy; bestAt = (DIGIT_TOP + dy) * COUNT_WIDTH + x + dx; bestT = t }
        }
      }
      if (foundAt < 0 && best >= COUNT_MIN) foundAt = dx
    }
    if (best < COUNT_END || (best < COUNT_MIN && strokeBrightness(crop, bestT, bestAt) < bestT.white)) break
    if (best < COUNT_MIN || (!digits && !bestDigit) || digits === COUNT_DIGITS) return null
    value = value * 10 + bestDigit
    digits++
    worst = Math.min(worst, best)
    x = bestEnd
    row = bestRow
  }
  return digits ? { value, digits, score: worst } : null
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

// The other tabs were captured at 1440p and are scaled to the window like the
// Scarab tab. Only a stack count tells their full slots from empty ones: their
// backings vary too much for the blueness test.
const OTHER_TAB_MIN = 0.93
// Scaled, the picture lands between pixels and true matches score about 0.9, while
// the best wrong spot seen scores about 0.55.
const OTHER_TAB_SCALED_MIN = 0.85
// How far a tab's picture has been seen to move, and a little more: a folder row
// moves it down, a window like Faustus to the side.
const OTHER_TAB_SLACK = { x: 120, y: 130 }
let otherTabs: { height: number, tabs: Array<{ full: Template, coarse: Template, tab: typeof STASH_TABS[number] }> } | null = null

function otherTabsFor (height: number) {
  if (otherTabs?.height === height) return otherTabs.tabs
  const scale = height / REF_HEIGHT
  const coarse = coarseFactor(height)
  const tabs = STASH_TABS.map(tab => {
    const image = scaled(tab.anchor, scale)
    return {
      full: template(image),
      coarse: template(resize(image, Math.max(1, Math.floor(image.width / coarse)), Math.max(1, Math.floor(image.height / coarse)))),
      tab
    }
  })
  otherTabs = { height, tabs }
  return tabs
}

function readOtherTab (bgra: Uint8Array, width: number, height: number, gray: Gray, small: Gray): StashRead {
  const scale = height / REF_HEIGHT
  // Without counts every slot would read empty.
  if (scale < COUNT_MIN_SCALE) return { found: false }
  const coarse = coarseFactor(height)
  for (const t of otherTabsFor(height)) {
    const near = {
      x: Math.floor(t.tab.anchor.x * scale / coarse),
      y: Math.floor(t.tab.anchor.y * scale / coarse),
      slackX: Math.ceil(OTHER_TAB_SLACK.x * scale / coarse),
      slackY: Math.ceil(OTHER_TAB_SLACK.y * scale / coarse)
    }
    const at = refine(gray, t.full, coarseCandidates(small, t.coarse, near), coarse, scale === 1 ? OTHER_TAB_MIN : OTHER_TAB_SCALED_MIN)
    if (!at) continue
    const size = Math.round(t.tab.size * scale)
    return {
      found: true,
      family: t.tab.family,
      slots: t.tab.slots.map(s => {
        const x = at.x + Math.round(s.dx * scale)
        const y = at.y + Math.round(s.dy * scale)
        const count = readCount(bgra, width, height, at.x + s.dx * scale, at.y + s.dy * scale, scale)
        return { name: s.name, x: x / width, y: y / height, width: size / width, height: size / height, filled: count != null, count }
      })
    }
  }
  return { found: false }
}

// `bgra` is a screenshot of the game window.
export function readStashTab (bgra: Uint8Array, width: number, height: number): StashRead {
  const gray = toGray(bgra, width, height)
  const coarse = coarseFactor(height)
  const small = resize(gray, Math.floor(width / coarse), Math.floor(height / coarse))
  const scarab = readScarabIn(bgra, width, height, gray, small)
  return scarab.found ? scarab : readOtherTab(bgra, width, height, gray, small)
}

function readScarabIn (bgra: Uint8Array, width: number, height: number, gray: Gray, small: Gray): StashRead {
  const scale = height / REF_HEIGHT
  const at = findTab(gray, small, scale)
  if (!at) return { found: false }
  const layout = findLayout(gray, at, scale)
  if (!layout) return { found: false }
  const size = Math.round(SLOT_SIZE * scale)
  return {
    found: true,
    family: 'scarabs',
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
        count: filled ? readCount(bgra, width, height, at.x + s.dx * scale, at.y + s.dy * scale, scale) : null
      }
    })
  }
}
