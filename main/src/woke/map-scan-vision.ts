// Map scan mode, worker side: finds the hovered item's tooltip in a game
// screenshot by its blue modifier text, and when it changed, cuts it into one
// enlarged image per text line. Main OCRs those lines across a pool of
// workers (ocrLine below), which is much faster and more accurate than
// reading the whole tooltip as one block.
// Runs in the vision worker (needs opencv + tesseract from ../vision).
import * as Bindings from '../vision/wasm-bindings'
import { cv, tessApi } from '../vision/wasm-bindings'
import { hsvToU8, timeIt } from '../vision/utils'
import type { ImageData } from '../vision/utils'

// Magic-blue modifier text (#8888FF), with room for anti-aliasing.
const BLUE_MIN = hsvToU8(222, 25, 55)
const BLUE_MAX = hsvToU8(258, 72, 100)
// Light blue (#B8DAF1) implicit lines such as "Area contains a Blight
// Encounter"; read like mods.
const PALE_MIN = hsvToU8(195, 14, 60)
const PALE_MAX = hsvToU8(220, 40, 100)
// Red "Corrupted" (#D20000).
const RED_MIN = hsvToU8(0, 70, 45)
const RED_MAX = hsvToU8(10, 100, 100)
// Grey/white property text ("Item Quantity: ", "Map Tier: ").
const GREY_MIN = hsvToU8(0, 0, 42)
const GREY_MAX = hsvToU8(360, 14, 100)

export interface ScanOptions {
  cursor: { x: number, y: number }
  // Top-left of the image within the game window, when main sent a crop.
  originX?: number
  originY?: number
  // Game window height, when the image is a crop shorter than the window.
  refHeight?: number
  // Search the whole image, not a band around the cursor (locked rolling).
  whole?: boolean
  // OCR only when this frame's signature equals `stableSig` (unchanged for
  // two frames, so not mid-animation) and differs from `lastReadSig`.
  stableSig: string | null
  lastReadSig: string | null
}

// One text line, dark text on white, 1 byte per pixel.
export interface LineImage {
  width: number
  height: number
  data: Uint8Array
}

export interface ScanResult {
  // Null when no tooltip-like blue text is near the cursor.
  sig: string | null
  lines?: string[]
  // Map scan: the tooltip's text lines, for main to OCR in parallel.
  lineImages?: LineImage[]
  // Where each line image was cut from (image pixels), for the OCR bench.
  lineRects?: Array<{ x: number, y: number, width: number, height: number }>
  rect?: { x: number, y: number, width: number, height: number }
  elapsed: number
}

function scalarMat (values: number[]) {
  const m = new cv.Mat(3, 1, cv.CV_8U)
  m.data.set(values)
  return m
}

let blueMin: any, blueMax: any, paleMin: any, paleMax: any, greyMin: any, greyMax: any, redMin: any, redMax: any // eslint-disable-line @typescript-eslint/no-explicit-any

function initRanges () {
  if (blueMin) return
  blueMin = scalarMat(BLUE_MIN)
  blueMax = scalarMat(BLUE_MAX)
  paleMin = scalarMat(PALE_MIN)
  paleMax = scalarMat(PALE_MAX)
  greyMin = scalarMat(GREY_MIN)
  greyMax = scalarMat(GREY_MAX)
  redMin = scalarMat(RED_MIN)
  redMax = scalarMat(RED_MAX)
}

// Blue mod text (plus the pale blue of some implicit lines).
function blueMask (hsv: any, blue: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  cv.inRange(hsv, blueMin, blueMax, blue)
  const pale = new cv.Mat()
  cv.inRange(hsv, paleMin, paleMax, pale)
  cv.bitwise_or(blue, pale, blue)
  pale.delete()
}

// `kind` 'essence': an essence monster's label, whose essence lines are blue
// like map mods; a red "Corrupted" line under them is read too.
export function scanTooltip (img: ImageData, opts: ScanOptions, kind: 'map' | 'essence' = 'map'): ScanResult {
  initRanges()
  let elapsed = 0
  const H = img.height
  const W = img.width
  // Sizes scale with the game window, not with the crop we were sent.
  const refH = opts.refHeight ?? H
  // Tooltips open beside the hovered item, left or right of it.
  const halfW = Math.round(refH * 0.6)
  const x0 = opts.whole ? 0 : Math.max(0, Math.min(W - 1, opts.cursor.x - halfW))
  const x1 = opts.whole ? W : Math.max(x0 + 1, Math.min(W, opts.cursor.x + halfW))

  const full = Bindings.cvMatFromImage(img)
  const area = full.roi(new cv.Rect(x0, 0, x1 - x0, H))
  const hsv = new cv.Mat()
  const blue = new cv.Mat()
  elapsed += timeIt(() => {
    cv.cvtColor(area, hsv, cv.COLOR_BGR2HSV_FULL)
    blueMask(hsv, blue)
  })

  const minPixels = Math.round((refH / 1080) * (refH / 1080) * 400)
  const count = cv.countNonZero(blue)
  if (count < minPixels) {
    hsv.delete(); blue.delete(); area.delete(); full.delete()
    return { sig: null, elapsed }
  }

  const lineH = Math.round(refH * 0.0185)
  const grey = new cv.Mat()
  const red = kind === 'essence' ? new cv.Mat() : null
  let found: TooltipLayout | null = null
  elapsed += timeIt(() => {
    cv.inRange(hsv, greyMin, greyMax, grey)
    if (red) cv.inRange(hsv, redMin, redMax, red)
    const cursor = { x: opts.cursor.x - x0, y: opts.cursor.y }
    found = findTooltip(blue.data as Uint8Array, grey.data as Uint8Array, blue.cols, blue.rows, lineH, cursor,
      red ? red.data as Uint8Array : undefined)
    // Line images take any text colour.
    if (red) cv.bitwise_or(grey, red, grey)
  })
  red?.delete()
  if (!found) {
    grey.delete(); hsv.delete(); blue.delete(); area.delete(); full.delete()
    return { sig: null, elapsed }
  }
  const tip: TooltipLayout = found

  // Signature: coarse picture of the mod text, so a reroll (new mods)
  // changes it but cursor jitter doesn't.
  const box = new cv.Rect(tip.mods.x0, tip.mods.y0, tip.mods.x1 - tip.mods.x0 + 1, tip.mods.y1 - tip.mods.y0 + 1)
  const small = new cv.Mat()
  const blueBox = blue.roi(box)
  cv.resize(blueBox, small, new cv.Size(48, 24), 0, 0, cv.INTER_AREA)
  blueBox.delete()
  let bits = ''
  for (let i = 0; i < small.data.length; i++) bits += small.data[i] > 40 ? '1' : '0'
  small.delete()
  const sig = `${Math.round(((opts.originX ?? 0) + x0 + box.x) / 8)},${Math.round(((opts.originY ?? 0) + box.y) / 8)}:${hashBits(bits)}`

  const result: ScanResult = {
    sig,
    elapsed,
    rect: { x: x0 + tip.x0, y: tip.y0, width: tip.x1 - tip.x0 + 1, height: tip.y1 - tip.y0 + 1 }
  }

  if (sig === opts.stableSig && sig !== opts.lastReadSig) {
    elapsed += timeIt(() => {
      const lines = tip.lines.slice(0, MAX_LINES)
      result.lineImages = lines.map(l => cutLine(blue.data as Uint8Array, grey.data as Uint8Array, hsv.data as Uint8Array, blue.cols, l, lineH))
      result.lineRects = lines.map(l => ({ x: x0 + l.x0, y: l.y0, width: l.x1 - l.x0 + 1, height: l.y1 - l.y0 + 1 }))
    })
    result.elapsed = elapsed
  }

  grey.delete()
  hsv.delete(); blue.delete(); area.delete(); full.delete()
  return result
}

// Essence scan's one-shot: reads every essence label on screen. Each label
// is found like a map tooltip (a centred stack of blue lines) and read line
// by line.
const MAX_LABELS = 12
export function scanAllTooltips (img: ImageData, readLine: (l: LineImage) => string):
{ labels: Array<{ lines: string[], at: { x: number, y: number } }>, elapsed: number } {
  initRanges()
  let elapsed = 0
  const lineH = Math.round(img.height * 0.0185)
  const full = Bindings.cvMatFromImage(img)
  const hsv = new cv.Mat()
  const blue = new cv.Mat()
  const grey = new cv.Mat()
  const red = new cv.Mat()
  let tips: TooltipLayout[] = []
  elapsed += timeIt(() => {
    cv.cvtColor(full, hsv, cv.COLOR_BGR2HSV_FULL)
    blueMask(hsv, blue)
    cv.inRange(hsv, greyMin, greyMax, grey)
    cv.inRange(hsv, redMin, redMax, red)
    tips = findAllTooltips(blue.data as Uint8Array, grey.data as Uint8Array, blue.cols, blue.rows, lineH, MAX_LABELS, red.data as Uint8Array)
    cv.bitwise_or(grey, red, grey)
  })
  const labels: Array<{ lines: string[], at: { x: number, y: number } }> = []
  for (const t of tips) {
    let lines: string[] = []
    elapsed += timeIt(() => {
      lines = t.lines.slice(0, MAX_LINES)
        .map(l => readLine(cutLine(blue.data as Uint8Array, grey.data as Uint8Array, hsv.data as Uint8Array, blue.cols, l, lineH)))
        .filter(l => l.length > 2)
    })
    if (lines.length) labels.push({ lines, at: { x: (t.x0 + t.x1) / 2, y: (t.y0 + t.y1) / 2 } })
  }
  red.delete(); grey.delete(); blue.delete(); hsv.delete(); full.delete()
  return { labels, elapsed }
}

// Line images are scaled so text is about this tall: Tesseract reads text
// much better at ~30 px than at the 10-15 px the game draws it.
const LINE_TARGET_H = 34
const MAX_LINES = 24

interface Span { x0: number, x1: number, y0: number, y1: number }

export interface TooltipLayout {
  // The tooltip's text, in reading order: property lines, then mods.
  lines: Span[]
  // The block of mod lines (for the signature).
  mods: Span
  // Everything read.
  x0: number, x1: number, y0: number, y1: number
}

// Finds the hovered map's tooltip in the masks of the area around the
// cursor (blue = mod text, grey = grey/white text, 1 byte per pixel).
//
// Tooltip text is centred, so the mods are a stack of blue text lines that
// share one centre. That stack is found first (blue elsewhere on screen, from
// item art, the stash or the game world, doesn't line up like that), then the
// property lines above it that share its centre. Exported for tests.
export function findTooltip (blue: Uint8Array, grey: Uint8Array, cols: number, rows: number, lineH: number,
  cursor: { x: number, y: number }, red?: Uint8Array): TooltipLayout | null {
  let best: Span[] | null = null
  let bestScore = -Infinity
  for (const s of textStacks(blue, cols, rows, lineH)) {
    const b = spanOf(s)
    const dx = cursor.x < b.x0 ? b.x0 - cursor.x : cursor.x > b.x1 ? cursor.x - b.x1 : 0
    const dy = cursor.y < b.y0 ? b.y0 - cursor.y : cursor.y > b.y1 ? cursor.y - b.y1 : 0
    // Tooltips open beside or above the hovered item, not far from it.
    if (dx > lineH * 25 || dy > lineH * 30) continue
    const score = s.length - Math.hypot(dx, dy) / (lineH * 4)
    if (score > bestScore) { best = s; bestScore = score }
  }
  return best ? stackLayout(best, blue, grey, cols, rows, lineH, red) : null
}

// Every tooltip-like block in the masks (essence scan's whole-screen pass),
// top to bottom.
export function findAllTooltips (blue: Uint8Array, grey: Uint8Array, cols: number, rows: number, lineH: number,
  max: number, red?: Uint8Array): TooltipLayout[] {
  const out: TooltipLayout[] = []
  const stacks = textStacks(blue, cols, rows, lineH).sort((a, b) => b.length - a.length)
  for (const s of stacks) {
    if (out.length >= max) break
    const t = stackLayout(s, blue, grey, cols, rows, lineH, red)
    if (!t || out.some(o => t.x0 <= o.x1 && t.x1 >= o.x0 && t.y0 <= o.y1 && t.y1 >= o.y0)) continue
    out.push(t)
  }
  return out.sort((a, b) => a.y0 - b.y0)
}

function spanOf (lines: Span[]): Span {
  return {
    x0: Math.min(...lines.map(l => l.x0)),
    x1: Math.max(...lines.map(l => l.x1)),
    y0: lines[0].y0,
    y1: lines[lines.length - 1].y1
  }
}

// Stacks of blue text lines sharing a centre.
export function textStacks (blue: Uint8Array, cols: number, rows: number, lineH: number): Span[][] {
  const lines = textBlobs(blue, cols, rows, lineH).filter(b => {
    const h = b.y1 - b.y0 + 1
    const w = b.x1 - b.x0 + 1
    return h >= lineH * 0.3 && h <= lineH * 1.4 && w >= lineH * 1.5 && b.n >= w * h * 0.06
  }).sort((a, b) => a.y0 - b.y0)
  // The gap allows a separator, or one line hidden (e.g. by a health bar).
  const tol = Math.max(3, lineH * 0.6)
  const stacks: Span[][] = []
  for (const l of lines) {
    const c = (l.x0 + l.x1) / 2
    const stack = stacks.find(s => {
      const last = s[s.length - 1]
      const gap = l.y0 - last.y1
      return gap >= 0 && gap <= lineH * 2.5 && Math.abs((last.x0 + last.x1) / 2 - c) <= tol
    })
    if (stack) stack.push(l)
    else stacks.push([l])
  }
  return stacks
}

// The tooltip around a stack of mod lines: the centred lines above it, and
// with `red`, a red line just below it ("Corrupted").
function stackLayout (stack: Span[], blue: Uint8Array, grey: Uint8Array, cols: number, rows: number, lineH: number,
  red?: Uint8Array): TooltipLayout | null {
  const mods = spanOf(stack)
  const cx = Math.round(mods.x0 + mods.x1) / 2
  // Lines can be wider than the mods (long property names, short mods).
  const half = Math.max((mods.x1 - mods.x0) / 2, lineH * 9) + lineH
  const wx0 = Math.max(0, Math.floor(cx - half))
  const wx1 = Math.min(cols - 1, Math.ceil(cx + half))

  // Text rows within that window, above and through the mods.
  const top = Math.max(0, Math.round(mods.y0 - lineH * 14))
  const bottom = Math.min(rows - 1, mods.y1 + 1)
  const ink = (i: number) => blue[i] || grey[i]
  const rowInk = new Int32Array(bottom - top + 1)
  for (let y = top; y <= bottom; y++) {
    let n = 0
    const off = y * cols
    for (let x = wx0; x <= wx1; x++) if (ink(off + x)) n++
    rowInk[y - top] = n
  }
  const bands: Span[] = []
  let start = -1
  for (let y = top; y <= bottom + 1; y++) {
    const on = y <= bottom && rowInk[y - top] >= 2
    if (on && start < 0) start = y
    if (!on && start >= 0) {
      const h = y - start
      // Lines with no blank row between them are split evenly.
      const parts = Math.max(1, Math.round(h / (lineH * 1.05)))
      for (let p = 0; p < parts; p++) {
        bands.push({
          x0: 0,
          x1: 0,
          y0: start + Math.floor((h * p) / parts),
          y1: start + Math.floor((h * (p + 1)) / parts) - 1
        })
      }
      start = -1
    }
  }

  // Keep centred lines, walking up from the mods; stop at the first big gap.
  const out: Span[] = []
  let prevTop = mods.y1 + 1
  for (let i = bands.length - 1; i >= 0; i--) {
    const b = bands[i]
    const h = b.y1 - b.y0 + 1
    if (b.y1 < mods.y0 && prevTop - b.y1 > lineH * 3) break
    if (h < lineH * 0.3 || h > lineH * 1.4) continue
    const ext = centredExtent(blue, grey, cols, b, cx, wx0, wx1, lineH)
    if (!ext) continue
    out.push({ ...b, x0: ext.x0, x1: ext.x1 })
    prevTop = b.y0
  }
  // One lone line is as likely to be something else on screen.
  if (out.length < 2) return null
  out.reverse()
  if (red) {
    const below = redLineBelow(red, cols, rows, mods, cx, wx0, wx1, lineH)
    if (below) out.push(below)
  }
  return {
    lines: out,
    mods,
    x0: Math.min(mods.x0, ...out.map(l => l.x0)),
    x1: Math.max(mods.x1, ...out.map(l => l.x1)),
    y0: Math.min(mods.y0, out[0].y0),
    y1: Math.max(mods.y1, out[out.length - 1].y1)
  }
}

function redLineBelow (red: Uint8Array, cols: number, rows: number, mods: Span, cx: number,
  wx0: number, wx1: number, lineH: number): Span | null {
  const none = new Uint8Array(red.length)
  let start = -1
  const end = Math.min(rows - 1, mods.y1 + Math.round(lineH * 6))
  for (let y = mods.y1 + 1; y <= end + 1; y++) {
    let n = 0
    if (y <= end) for (let x = wx0, off = y * cols; x <= wx1; x++) if (red[off + x]) n++
    if (n >= 2 && start < 0) start = y
    if (n < 2 && start >= 0) {
      const b = { x0: 0, x1: 0, y0: start, y1: y - 1 }
      const h = b.y1 - b.y0 + 1
      if (h >= lineH * 0.3 && h <= lineH * 1.4) {
        const ext = centredExtent(red, none, cols, b, cx, wx0, wx1, lineH)
        if (ext) return { ...b, ...ext }
      }
      start = -1
    }
  }
  return null
}

// The text's horizontal extent in a band, grown from the tooltip's centre
// across word gaps. Null unless the text is centred on it (so not stray
// background) and long enough to be a line.
function centredExtent (blue: Uint8Array, grey: Uint8Array, cols: number, b: Span, cx: number,
  wx0: number, wx1: number, lineH: number): { x0: number, x1: number } | null {
  const colInk = new Uint8Array(wx1 - wx0 + 1)
  for (let y = b.y0; y <= b.y1; y++) {
    const off = y * cols
    for (let x = wx0; x <= wx1; x++) if (blue[off + x] || grey[off + x]) colInk[x - wx0] = 1
  }
  const maxGap = Math.round(lineH * 0.9)
  const c = Math.round(cx) - wx0
  let x0 = -1
  let x1 = -1
  for (let x = c, gap = 0; x >= 0 && gap <= maxGap; x--) {
    if (colInk[x]) { x0 = x; gap = 0; if (x1 < 0) x1 = x } else gap++
  }
  for (let x = c, gap = 0; x < colInk.length && gap <= maxGap; x++) {
    if (colInk[x]) { x1 = Math.max(x1, x); gap = 0; if (x0 < 0) x0 = x } else gap++
  }
  if (x0 < 0 || x1 - x0 < lineH * 1.5) return null
  if (Math.abs((x0 + x1) / 2 - (c)) > Math.max(lineH * 0.8, 4)) return null
  return { x0: x0 + wx0, x1: x1 + wx0 }
}

interface Blob extends Span { n: number }

// Connected groups of mask pixels, with letters and words of a line joined:
// runs closer than half a line height count as touching.
function textBlobs (mask: Uint8Array, cols: number, rows: number, lineH: number): Blob[] {
  const join = Math.max(2, Math.round(lineH * 0.5))
  const parent: number[] = []
  const find = (i: number): number => {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i] }
    return i
  }
  const blobs: Blob[] = []
  let prev: Array<{ x0: number, x1: number, id: number }> = []
  for (let y = 0; y < rows; y++) {
    const off = y * cols
    const runs: Array<{ x0: number, x1: number, id: number, n: number }> = []
    let x = 0
    while (x < cols) {
      if (!mask[off + x]) { x++; continue }
      const r = { x0: x, x1: x, id: -1, n: 0 }
      let gap = 0
      while (x < cols && gap <= join) {
        if (mask[off + x]) { r.x1 = x; r.n++; gap = 0 } else gap++
        x++
      }
      runs.push(r)
    }
    for (const r of runs) {
      for (const p of prev) {
        if (p.x1 < r.x0 || p.x0 > r.x1) continue
        const a = find(p.id)
        if (r.id < 0) r.id = a
        else {
          const b = find(r.id)
          if (a !== b) parent[b] = a
        }
      }
      if (r.id < 0) {
        r.id = parent.length
        parent.push(r.id)
        blobs.push({ x0: r.x0, x1: r.x1, y0: y, y1: y, n: 0 })
      }
      const b = blobs[r.id]
      // Stats are summed per run's first id and merged below.
      if (r.x0 < b.x0) b.x0 = r.x0
      if (r.x1 > b.x1) b.x1 = r.x1
      if (y > b.y1) b.y1 = y
      b.n += r.n
    }
    prev = runs
  }
  const merged = new Map<number, Blob>()
  blobs.forEach((b, i) => {
    const root = find(i)
    const m = merged.get(root)
    if (!m) merged.set(root, { ...b })
    else {
      m.x0 = Math.min(m.x0, b.x0); m.x1 = Math.max(m.x1, b.x1)
      m.y0 = Math.min(m.y0, b.y0); m.y1 = Math.max(m.y1, b.y1)
      m.n += b.n
    }
  })
  return [...merged.values()]
}

function cutLine (blue: Uint8Array, grey: Uint8Array, hsv: Uint8Array, cols: number, l: Span, lineH: number): LineImage {
  // Dark text on white, keeping the glyphs' brightness for smooth edges.
  const pad = Math.max(2, Math.round(lineH / 4))
  const rows = hsv.length / 3 / cols
  const ox = Math.max(0, l.x0 - pad)
  const oy = Math.max(0, l.y0 - 2)
  const w = Math.min(cols, l.x1 + pad + 1) - ox
  const hh = Math.min(rows, l.y1 + 3) - oy
  const h = l.y1 - l.y0 + 1
  const src = new cv.Mat(hh, w, cv.CV_8U)
  const d = src.data as Uint8Array
  for (let y = 0; y < hh; y++) {
    const off = (oy + y) * cols + ox
    for (let x = 0; x < w; x++) {
      const i = off + x
      d[y * w + x] = (blue[i] || grey[i]) ? 255 - hsv[i * 3 + 2] : 255
    }
  }
  const scale = Math.min(4, Math.max(1, LINE_TARGET_H / Math.max(h, 1)))
  const big = new cv.Mat()
  cv.resize(src, big, new cv.Size(Math.round(w * scale), Math.round(hh * scale)), 0, 0, cv.INTER_LINEAR)
  src.delete()
  const img = { width: big.cols as number, height: big.rows as number, data: new Uint8Array(big.data as Uint8Array) }
  big.delete()
  return img
}

// Reads one line image (see LineImage). Runs in any vision worker.
const LINE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%+-.,:\'() '
export function ocrLine (img: LineImage): string {
  Bindings.ocrSetImage(img.data, img.width, img.height, 1)
  tessApi.SetVariable('tessedit_pageseg_mode', '7') // single line
  tessApi.SetVariable('tessedit_char_whitelist', LINE_CHARS)
  tessApi.Recognize()
  const text: string = tessApi.GetUTF8Text()
  // The worker's tesseract is shared with other readers.
  tessApi.SetVariable('tessedit_char_whitelist', '')
  return text.replace(/\s+/g, ' ').trim()
}

// The game's own list of this area's mods: blue lines, right-aligned against the
// window's edge, top right. `img` is that corner of the window, `refH` the
// window's height. Null when the list isn't open.
export function scanAreaModList (img: ImageData, refH: number): LineImage[] | null {
  initRanges()
  const full = Bindings.cvMatFromImage(img)
  const hsv = new cv.Mat()
  const blue = new cv.Mat()
  const grey = new cv.Mat()
  cv.cvtColor(full, hsv, cv.COLOR_BGR2HSV_FULL)
  cv.inRange(hsv, blueMin, blueMax, blue)
  cv.inRange(hsv, greyMin, greyMax, grey)
  const lineH = Math.round(refH * 0.0185)
  const stack = areaModStack(blue.data as Uint8Array, blue.cols, blue.rows, lineH)
  const lines = stack?.slice(0, MAX_LINES).map(l =>
    cutLine(blue.data as Uint8Array, grey.data as Uint8Array, hsv.data as Uint8Array, blue.cols, l, lineH)) ?? null
  grey.delete(); hsv.delete(); blue.delete(); full.delete()
  return lines
}

// Right-aligned lines against the edge. Null for fewer than two, which is more
// likely a tooltip that happens to touch the edge than the list.
export function areaModStack (blue: Uint8Array, cols: number, rows: number, lineH: number): Span[] | null {
  const lines: Span[] = []
  for (const b of textBlobs(blue, cols, rows, lineH)) {
    const h = b.y1 - b.y0 + 1
    const w = b.x1 - b.x0 + 1
    if (h < lineH * 0.3 || h > lineH * 2.6 || w < lineH * 1.5 || b.n < w * h * 0.06) continue
    if (b.x1 < cols - lineH * 0.6) continue
    if (h <= lineH * 1.4) {
      lines.push(b)
      continue
    }
    // Two lines joined by a descender.
    const mid = Math.round((b.y0 + b.y1) / 2)
    lines.push({ ...b, y1: mid - 1 }, { ...b, y0: mid })
  }
  lines.sort((a, b) => a.y0 - b.y0)
  // The gap allows a few lines hidden, by a tooltip say.
  const tol = Math.max(3, lineH * 0.6)
  let best: Span[] | null = null
  let run: Span[] = []
  for (const l of lines) {
    const last = run[run.length - 1]
    if (last && (l.y0 - last.y1 > lineH * 6 || Math.abs(l.x1 - last.x1) > tol)) run = []
    run.push(l)
    if (run.length >= 2 && (!best || run.length > best.length)) best = run
  }
  return best
}

function hashBits (s: string): string {
  // FNV-1a, 32 bit.
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}
