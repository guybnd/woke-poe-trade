// Guessing an unidentified unique from its art (unid-art-match.ts). At the
// price check hotkey, when the copied text is an unidentified unique, the
// square around the mouse is kept, before the overlay can draw over it. The
// price check then asks which of its candidates that square shows.
import { net, nativeImage, screen } from 'electron'
import type { GameWindow } from '../windowing/GameWindow'
import { CELL, finishGuess, makeTemplate, prepareShot, scoreCandidate, type ArtGuess, type Candidate, type Template } from './unid-art-match'
import { perfRecord } from './perf'

// Room for the mouse to sit anywhere in a cell of any size it is compared at.
const SQUARE_CELLS = 3.4
// A guess is asked for right after the text arrives; an older square is another item's.
const KEEP_MS = 20_000
const ICON_TIMEOUT_MS = 8_000

// The item text it was kept for: a check from a menu or a paste is another item.
interface Square { at: number, text: string, width: number, height: number, data: Uint8Array, cellPx: number }
let last: Square | null = null

const UNID_UNIQUE = /^Rarity: Unique\r?$/m
const UNIDENTIFIED = /^Unidentified\r?$/m

export function cursorInScreenPixels (): { x: number, y: number } {
  const p = screen.getCursorScreenPoint()
  return process.platform === 'win32' ? screen.dipToScreenPoint(p) : p
}

/** Keeps the square under the mouse when the copied item is an unidentified unique. */
export function keepUnidArt (poeWindow: GameWindow, itemText: string, cursor: { x: number, y: number }): void {
  last = null
  if (!UNID_UNIQUE.test(itemText) || !UNIDENTIFIED.test(itemText)) return
  try {
    const t0 = performance.now()
    const bounds = poeWindow.bounds
    if (!bounds.width || !bounds.height) return
    const cx = cursor.x - bounds.x
    const cy = cursor.y - bounds.y
    if (cx < 0 || cy < 0 || cx >= bounds.width || cy >= bounds.height) return
    const cellPx = bounds.height * CELL
    const half = Math.round(cellPx * SQUARE_CELLS / 2)
    const x0 = Math.max(0, Math.round(cx) - half)
    const y0 = Math.max(0, Math.round(cy) - half)
    const width = Math.min(bounds.width, Math.round(cx) + half) - x0
    const height = Math.min(bounds.height, Math.round(cy) + half) - y0
    const shot = poeWindow.screenshot()
    if (!shot || shot.length < bounds.width * bounds.height * 4) return
    const data = new Uint8Array(width * height * 4)
    for (let y = 0; y < height; y++) {
      const from = ((y0 + y) * bounds.width + x0) * 4
      data.set(shot.subarray(from, from + width * 4), y * width * 4)
    }
    last = { at: Date.now(), text: itemText, width, height, data, cellPx }
    perfRecord('Unid unique: art square', performance.now() - t0)
  } catch {
    last = null
  }
}

// The renderer's rawText may differ in line endings or trailing space.
function sameItem (a: string, b: string | undefined): boolean {
  const norm = (t: string) => t.replace(/\r/g, '').trim()
  return b != null && norm(a) === norm(b)
}

/** A failed copy or a copy of another item leaves no square behind. */
export function forgetUnidArt (): void {
  last = null
}

const templates = new Map<string, Promise<Template | null>>()

async function iconTemplate (url: string): Promise<Template | null> {
  let p = templates.get(url)
  if (!p) {
    p = (async () => {
      if (!/^https:\/\/web\.poecdn\.com\//.test(url)) return null
      const res = await net.fetch(url, { signal: AbortSignal.timeout(ICON_TIMEOUT_MS) })
      if (!res.ok) throw new Error(`icon ${res.status}`)
      const img = nativeImage.createFromBuffer(Buffer.from(await res.arrayBuffer()))
      const { width, height } = img.getSize()
      if (!width || !height) return null
      // toBitmap is BGRA on Windows; makeTemplate wants RGBA.
      const data = new Uint8Array(img.toBitmap())
      for (let i = 0; i < data.length; i += 4) {
        const b = data[i]; data[i] = data[i + 2]; data[i + 2] = b
      }
      return makeTemplate({ width, height, data })
    })()
    templates.set(url, p)
    // A failed download is tried again next time.
    p.catch(() => { templates.delete(url) })
  }
  return await p
}

export type UnidArtResult = ArtGuess | { ranked: null, reason: 'no-art' | 'icons' }

/** Ranks the candidates against the kept square. */
export async function guessUnidArt (args: { itemText?: string, candidates?: Array<{ name: string, icon: string }> }): Promise<UnidArtResult> {
  const square = last
  const list = (args?.candidates ?? []).slice(0, 60)
  if (!square || Date.now() - square.at > KEEP_MS || list.length < 2 || !sameItem(square.text, args?.itemText)) return { ranked: null, reason: 'no-art' }
  let cands: Candidate[]
  try {
    cands = await Promise.all(list.map(async c => ({ name: String(c.name), art: String(c.icon), template: await iconTemplate(String(c.icon)) })))
  } catch {
    return { ranked: null, reason: 'icons' }
  }
  // One candidate at a time (a few ms each), so main's other work isn't held up.
  let busy = 0
  let t0 = performance.now()
  const prepared = prepareShot({ width: square.width, height: square.height, data: square.data }, square.cellPx)
  const scores: number[] = []
  for (const c of cands) {
    busy += performance.now() - t0
    await new Promise(resolve => setImmediate(resolve))
    t0 = performance.now()
    scores.push(scoreCandidate(prepared, c.template))
  }
  busy += performance.now() - t0
  perfRecord('Unid unique: art match', busy)
  return finishGuess(cands, scores)
}
