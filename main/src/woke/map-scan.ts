// Scan modes, main side: while one is on and the game is focused, it takes a
// screenshot a few times a second, asks the vision worker to read the text
// under the cursor, and sends new readings to the overlay. Text is re-read
// whenever it changes, so rerolling the same map gives a new reading.
// Used by map scan (map tooltips) and essence scan (essence monolith labels).
import { screen } from 'electron'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { ServerEvents } from '../server'
import type { Logger } from '../RemoteLogger'
import type { GameWindow } from '../windowing/GameWindow'
import { OcrWorker } from '../vision/link-main'
import type { ScanOptions, ScanResult, LineImage } from './map-scan-vision'
import { perfRecord } from './perf'
import { ocrDir, USER_OCR_DIR } from './ocr-dir'

// About one quad-tab cell, as a fraction of the game window height.
const LOCK_LEAVE = 0.024
// Stop after this long without the game focused, so it can't run forever.
const IDLE_STOP_MS = 30 * 60 * 1000
// A scan started by entering a map stops sooner once the game is left
// (closed, or tabbed out for long), so the OCR worker can shut down.
const AUTO_AWAY_STOP_MS = 10 * 60 * 1000
// Files the OCR worker loads.
// The worker swallows load errors, so they're checked up front instead.
const OCR_FILES = ['tesseract-core-simd.js', 'opencv.js', 'eng.traineddata']

export interface OcrCheck {
  ok: boolean
  windows: boolean
  dir: string
  missing: string[]
  message: string | null
}

export function checkOcr (): OcrCheck {
  const windows = process.platform === 'win32'
  const dir = ocrDir()
  let missing: string[] = []
  try {
    const have = new Set(fs.readdirSync(dir))
    missing = OCR_FILES.filter(f => !have.has(f))
  } catch {
    missing = [...OCR_FILES]
  }
  let message: string | null = null
  if (!windows) {
    message = 'Scanning needs Windows (it uses the game screenshot API).'
  } else if (missing.length) {
    message = `OCR files missing: ${missing.join(', ')}. Reinstall the app, or download cv-ocr from the Awakened PoE Trade releases page and unzip it into ${USER_OCR_DIR()}`
  }
  return { ok: !message, windows, dir, missing, message }
}

export interface MapScanReading {
  lines: string[]
  // Cursor position as a fraction of the game window, for placing the badge.
  at: { x: number, y: number }
  sig: string
  ocrMs: number
  // Read from the locked box in rolling mode.
  rolling?: boolean
}

interface Rect { x: number, y: number, width: number, height: number }

export interface ScannerKind {
  // Event topic for the overlay, e.g. 'map-scan'.
  topic: string
  // Shown in errors, e.g. 'Map scan mode'.
  name: string
  frameMs: number
  // Stop when nothing has been read for this long (e.g. the stash was closed).
  noReadingStopMs?: number
  // Only this much of the screen either side of the cursor is sent to the
  // vision worker, as a fraction of the window height.
  cropHalfWidth: number
  // Rolling mode: lock onto the hovered tooltip and read only that box.
  canRoll?: boolean
  // The worker returns line images, OCR'd here across the worker pool.
  pooledLines?: boolean
  // Start the extra pool workers with the scan. Each is a full tesseract
  // instance (hundreds of MB): worth it for a map's long mod list, not for an
  // essence label's few lines, which the scan's own worker reads.
  warmPool?: boolean
  read: (worker: OcrWorker, image: { width: number, height: number, data: Uint8Array }, opts: ScanOptions) => Promise<ScanResult>
}

export const MAP_SCAN: ScannerKind = {
  topic: 'map-scan',
  name: 'Map scan mode',
  frameMs: 150,
  noReadingStopMs: 3 * 60 * 1000,
  cropHalfWidth: 0.6,
  canRoll: true,
  pooledLines: true,
  warmPool: true,
  read: async (worker, image, opts) => await worker.scanMapTooltip(image, opts)
}

export const ESSENCE_SCAN: ScannerKind = {
  topic: 'essence-scan',
  name: 'Essence scan mode',
  frameMs: 200,
  cropHalfWidth: 0.3,
  pooledLines: true,
  read: async (worker, image, opts) => await worker.scanEssenceLabel(image, opts)
}

// Tesseract model trained on the game's tooltip font (Fontin SmallCaps), see
// ocr-bench/README.md. Much better than stock English at "+", small caps
// and digits. Ships with the renderer's static data; stock English is used
// if it's missing.
const SCAN_MODEL = 'poe'
let scanModel: Uint8Array | null | undefined

function readScanModel (): Uint8Array | null {
  if (scanModel !== undefined) return scanModel
  const candidates = [
    path.join(__dirname, 'data/ocr', `${SCAN_MODEL}.traineddata`),
    path.join(__dirname, '../../renderer/public/data/ocr', `${SCAN_MODEL}.traineddata`)
  ]
  scanModel = null
  for (const file of candidates) {
    try { scanModel = new Uint8Array(fs.readFileSync(file)); break } catch {}
  }
  return scanModel
}

async function useScanModel (w: OcrWorker) {
  const data = readScanModel()
  if (!data) return
  // Each worker gets its own copy (it's transferred to the worker's heap).
  try { await w.loadModel(data.slice(), SCAN_MODEL) } catch {}
}

// One OCR worker shared by all scan modes (each would load tesseract + opencv).
// It holds 100-200 MB, so it's shut down once no scan has run for a while.
const WORKER_IDLE_MS = 2 * 60 * 1000
let sharedWorker: Promise<OcrWorker> | null = null
let idleTimer: ReturnType<typeof setTimeout> | undefined
const runningScanners = new Set<ScreenScanner>()

async function getWorker (): Promise<OcrWorker> {
  clearTimeout(idleTimer)
  sharedWorker ??= OcrWorker.create().then(async (w) => {
    await w.updateOptions('en')
    await useScanModel(w)
    return w
  })
  return await sharedWorker
}

// Extra workers that only OCR text lines, so a tooltip's ~15 lines are read
// in parallel. Each holds its own tesseract + opencv (100-200 MB), so they
// only exist while map scan runs, and stop with the shared worker.
const POOL_SIZE = Math.max(1, Math.min(3, os.cpus().length - 2))
let linePool: Array<Promise<OcrWorker | null>> = []

function warmLinePool () {
  if (linePool.length) return
  for (let i = 0; i < POOL_SIZE; i++) {
    linePool.push(OcrWorker.create()
      .then(async (w) => { await w.updateOptions('en'); await useScanModel(w); return w })
      .catch(() => null))
  }
}

function stopLinePool () {
  const pool = linePool
  linePool = []
  for (const p of pool) p.then(async w => { await w?.terminate() }).catch(() => {})
}

// OCRs line images on the main worker plus every pool worker that's loaded,
// each pulling the next line, and returns the text in the original order.
async function ocrLinesPooled (lines: LineImage[], main: OcrWorker): Promise<string[]> {
  const pool = await Promise.all(linePool.map(async p => await Promise.race([p, Promise.resolve(null)])))
  const workers = [main, ...pool.filter((w): w is OcrWorker => w != null)]
  const out = new Array<string>(lines.length).fill('')
  // Longest lines first, so no worker is left with a big one at the end.
  const order = lines.map((_, i) => i).sort((a, b) => lines[b].width - lines[a].width)
  let next = 0
  await Promise.all(workers.map(async (w) => {
    while (next < order.length) {
      const i = order[next++]
      out[i] = (await w.ocrLines([lines[i]]))[0]
    }
  }))
  return out
}

function scannerStopped (scanner: ScreenScanner) {
  runningScanners.delete(scanner)
  releaseOcr(scanner)
  releaseWorker()
}

// One scan mode reads the screen at a time. Starting another pauses the
// current one, which carries on by itself once the newer one stops.
let ocrOwner: ScreenScanner | null = null
const waiting: ScreenScanner[] = []

function claimOcr (scanner: ScreenScanner) {
  if (ocrOwner === scanner) return
  const i = waiting.indexOf(scanner)
  if (i >= 0) waiting.splice(i, 1)
  if (ocrOwner) {
    waiting.push(ocrOwner)
    ocrOwner.pause(scanner.name)
  }
  ocrOwner = scanner
}

function releaseOcr (scanner: ScreenScanner) {
  const i = waiting.indexOf(scanner)
  if (i >= 0) waiting.splice(i, 1)
  if (ocrOwner !== scanner) return
  ocrOwner = null
  const next = waiting.pop()
  if (next) {
    ocrOwner = next
    next.resume()
  }
}

// Shuts the worker down after a while unless a scan is using it.
function releaseWorker () {
  if (runningScanners.size || !sharedWorker) return
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    if (runningScanners.size || !sharedWorker) return
    const worker = sharedWorker
    sharedWorker = null
    worker.then(async w => { await w.terminate() }).catch(() => {})
    stopLinePool()
  }, WORKER_IDLE_MS)
}

export class ScreenScanner {
  private worker: OcrWorker | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private running = false
  private mouse = { x: 0, y: 0 }
  // Cursor position of the last frame that found no tooltip; while the
  // cursor stays there, no screenshots are taken.
  private emptyAt: { x: number, y: number } | null = null
  private lastReadingAt = Date.now()
  private prevSig: string | null = null
  private lastReadSig: string | null = null
  private lastActive = Date.now()
  private failures = 0
  // Bumped on every start/stop so a frame still in flight from an earlier
  // run doesn't schedule a second loop.
  private loopId = 0
  // Rolling mode: once the tooltip is found, only `lock` (window pixels) is
  // sent to the worker, and readings are pinned to the cursor at lock time.
  private rolling = false
  // Another scan mode has the screen (see claimOcr).
  private paused = false
  private lock: Rect | null = null
  private lockAt: { x: number, y: number } | null = null
  // Started by entering a map (autoStart), not by hand: town stops it again.
  private auto = false
  // start() waits for the worker before it runs. A stop or a newer start in
  // that wait wins: these let the waiting start tell.
  private stopCount = 0
  private startSeq = 0

  constructor (
    private readonly server: ServerEvents,
    private readonly logger: Logger,
    private readonly poeWindow: GameWindow,
    private readonly kind: ScannerKind = MAP_SCAN
  ) {}

  get isRunning () { return this.running }
  get isRolling () { return this.rolling }
  get isPaused () { return this.paused }
  get isAuto () { return this.auto }

  // Entering a map. Leaves a running scan as it is, never takes the screen
  // from another scan mode, and does nothing with the game in the background
  // (a log replayed at start-up still says you're in the last map).
  async autoStart (): Promise<{ running: boolean, auto: boolean }> {
    if (this.running || (ocrOwner && ocrOwner !== this) || !this.poeWindow.isActive) {
      return { running: this.running, auto: this.auto }
    }
    return { running: (await this.start(true)).running, auto: this.auto }
  }

  // Town or hideout: stops only a scan that autoStart began.
  autoStop (): { running: boolean } {
    if (this.running && this.auto) this.stop()
    return { running: this.running }
  }
  get name () { return this.kind.name }

  pause (by: string) {
    if (!this.running || this.paused) return
    this.paused = true
    this.unlock()
    this.send({ type: 'clear' })
    this.emitState(`Paused while ${by} is on. Resumes when it stops.`)
  }

  resume () {
    if (!this.running || !this.paused) return
    this.paused = false
    this.fresh()
    this.emitState()
  }

  // Forget what was on screen: read from scratch, where the cursor is now.
  private fresh () {
    this.prevSig = null
    this.lastReadSig = null
    this.lastActive = Date.now()
    this.lastReadingAt = Date.now()
    this.emptyAt = null
    this.failures = 0
    this.mouse = cursorInScreenPixels()
  }

  // Toggles rolling mode, starting the scanner if it's off.
  async roll (): Promise<{ running: boolean, rolling: boolean }> {
    if (!this.kind.canRoll) throw new Error(`${this.kind.name} has no rolling mode.`)
    if (this.rolling) {
      this.unlock()
      this.emitState()
      return { running: this.running, rolling: false }
    }
    await this.start()
    this.rolling = true
    this.lock = null
    this.lockAt = null
    this.prevSig = null
    this.lastReadSig = null
    this.emitState()
    return { running: true, rolling: true }
  }

  private unlock () {
    this.rolling = false
    this.lock = null
    this.lockAt = null
  }

  async start (auto = false): Promise<{ running: boolean }> {
    const check = checkOcr()
    if (!check.ok) throw new Error(check.message!)
    const seq = ++this.startSeq
    const stops = this.stopCount
    try {
      // Every start: the shared worker may have been shut down while idle.
      this.worker = await getWorker()
    } catch (err) {
      sharedWorker = null
      throw err
    }
    // Stopped while waiting (portal out before the worker was up): stay off.
    if (this.stopCount !== stops) return { running: this.running }
    // A newer start (hotkey during an auto start) decides, auto flag and all.
    if (seq !== this.startSeq) return { running: this.running }
    this.auto = auto
    if (this.kind.warmPool) warmLinePool()
    if (!this.running) {
      this.running = true
      this.paused = false
      runningScanners.add(this)
      this.fresh()
      this.loopId++
      claimOcr(this)
      this.schedule()
      this.emitState()
    } else if (this.paused) {
      // Started again while paused: take the screen back.
      claimOcr(this)
      this.paused = false
      this.fresh()
      this.emitState()
    }
    return { running: true }
  }

  stop (reason?: string): { running: boolean } {
    this.auto = false
    this.stopCount++
    if (this.running) {
      this.running = false
      this.paused = false
      this.unlock()
      this.loopId++
      clearTimeout(this.timer)
      scannerStopped(this)
      this.emitState(reason)
    }
    return { running: false }
  }

  // Forget the last reading, so the tooltip under the cursor is read again.
  reread (): { ok: true } {
    this.lastReadSig = null
    this.emptyAt = null
    return { ok: true }
  }

  private schedule () {
    const id = this.loopId
    this.timer = setTimeout(() => {
      this.frame().finally(() => { if (this.running && id === this.loopId) this.schedule() })
    }, this.kind.frameMs)
  }

  private async frame () {
    if (this.paused) return
    if (!this.poeWindow.isActive) {
      // Time away isn't time with nothing to read: coming back must not stop it.
      this.lastReadingAt = Date.now()
      if (this.auto && Date.now() - this.lastActive > AUTO_AWAY_STOP_MS) this.stop()
      else if (Date.now() - this.lastActive > IDLE_STOP_MS) this.stop('Stopped after 30 minutes away from the game.')
      return
    }
    this.lastActive = Date.now()
    const bounds = this.poeWindow.bounds
    if (!bounds.width || !bounds.height) return
    // Asked for on every frame: the mouse hook reports no moves while a button
    // is held, which would leave the position (and the badge) behind.
    const now = cursorInScreenPixels()
    const moved = now.x !== this.mouse.x || now.y !== this.mouse.y
    this.mouse = now
    const cursor = { x: this.mouse.x - bounds.x, y: this.mouse.y - bounds.y }
    // Rolling: a lock holds while the cursor stays on that item. Once it moves
    // about a quad-tab cell away it may be on another one, so the tooltip is
    // found again when it rests. Small drift between clicks keeps the lock.
    if (this.lock && this.lockAt && moved) {
      const dx = cursor.x - this.lockAt.x * bounds.width
      const dy = cursor.y - this.lockAt.y * bounds.height
      if (Math.hypot(dx, dy) > bounds.height * LOCK_LEAVE) {
        this.lock = null
        this.lockAt = null
        this.prevSig = null
        this.lastReadSig = null
        this.emitState()
      }
    }
    const lock = this.lock
    if (!lock && (cursor.x < 0 || cursor.y < 0 || cursor.x >= bounds.width || cursor.y >= bounds.height)) {
      this.lastReadingAt = Date.now()
      return
    }
    if (this.kind.noReadingStopMs && Date.now() - this.lastReadingAt > this.kind.noReadingStopMs) {
      this.stop(`Stopped: nothing to read for ${Math.round(this.kind.noReadingStopMs / 60000)} minutes.`)
      return
    }
    if (!lock) {
      // Wait for the cursor to rest, and skip frames while it sits where
      // there was nothing to read.
      if (moved) return
      if (this.emptyAt && this.emptyAt.x === this.mouse.x && this.emptyAt.y === this.mouse.y) return
    }

    try {
      const t0 = performance.now()
      const shot = this.poeWindow.screenshot()
      // Send only part of the screen: a vertical strip around the cursor, or
      // the locked tooltip box. Less to copy into the worker and convert there.
      let crop: Rect
      if (lock) {
        crop = lock
      } else {
        const half = Math.round(bounds.height * this.kind.cropHalfWidth)
        const x0 = Math.max(0, cursor.x - half)
        crop = { x: x0, y: 0, width: Math.min(bounds.width, cursor.x + half) - x0, height: bounds.height }
      }
      const data = cropRegion(shot, bounds.width, bounds.height, crop)
      const res = await this.kind.read(this.worker!,
        { width: crop.width, height: crop.height, data },
        {
          cursor: { x: cursor.x - crop.x, y: cursor.y - crop.y },
          originX: crop.x,
          originY: crop.y,
          refHeight: bounds.height,
          whole: Boolean(lock),
          stableSig: this.prevSig,
          lastReadSig: this.lastReadSig
        })
      perfRecord(`${this.kind.name}: ${lock ? 'locked frame' : 'frame'}`, performance.now() - t0)
      // Stopped or paused while the worker was reading: drop the result.
      if (!this.running || this.paused) return
      this.failures = 0
      if (this.rolling && res.rect) {
        const found = { ...res.rect, x: res.rect.x + crop.x, y: res.rect.y + crop.y }
        if (!lock) {
          // First sight of the tooltip: lock onto it.
          this.lock = lockAround(found, bounds)
          this.lockAt = { x: cursor.x / bounds.width, y: cursor.y / bounds.height }
          this.emitState()
        } else if (touchesEdge(res.rect, crop, bounds)) {
          // The tooltip grew past the box (more mods): re-lock, read next frame.
          this.lock = lockAround(found, bounds)
          this.prevSig = null
          this.lastReadSig = null
          return
        }
      }
      this.prevSig = res.sig
      this.emptyAt = res.sig == null ? { ...this.mouse } : null
      if (res.sig != null) this.lastReadingAt = Date.now()
      if (res.sig == null) {
        // Tooltip gone: hovering the same map again later reads it again.
        if (this.lastReadSig != null) {
          this.lastReadSig = null
          this.send({ type: 'clear' })
        }
        return
      }
      if (res.lineImages) {
        const t1 = performance.now()
        res.lines = res.lineImages.length ? await ocrLinesPooled(res.lineImages, this.worker!) : []
        res.lines = res.lines.filter(l => l.length > 2)
        perfRecord(`${this.kind.name}: OCR ${res.lineImages.length} lines`, performance.now() - t1)
        res.elapsed += performance.now() - t1
        if (!this.running || this.paused) return
      }
      if (res.lines) {
        perfRecord(`${this.kind.name}: read text`, res.elapsed)
        this.lastReadSig = res.sig
        const reading: MapScanReading = {
          lines: res.lines,
          at: this.lockAt ?? { x: cursor.x / bounds.width, y: cursor.y / bounds.height },
          sig: res.sig,
          ocrMs: Math.round(res.elapsed),
          rolling: this.rolling
        }
        this.send({ type: 'reading', reading })
      }
    } catch (err) {
      this.failures++
      if (this.failures === 1) this.logger.write(`error [${this.kind.topic}] ${String(err)}`)
      if (this.failures >= 5) {
        this.stop(`OCR failed: ${String(err)}. Check that the OCR files are installed.`)
      }
    }
  }

  private emitState (message?: string) {
    this.send({ type: 'state', running: this.running, paused: this.paused, rolling: this.rolling, locked: this.lock != null, auto: this.auto, message })
  }

  private send (data: unknown) {
    this.server.sendEventTo('broadcast', {
      name: 'MAIN->CLIENT::woke-event',
      payload: { topic: this.kind.topic, data }
    })
  }
}

// Essence scan's one-shot: reads every label on screen once. Positions are
// fractions of the game window.
export async function readAllEssenceLabels (poeWindow: GameWindow):
Promise<{ labels: Array<{ lines: string[], at: { x: number, y: number } }> }> {
  const check = checkOcr()
  if (!check.ok) throw new Error(check.message!)
  const bounds = poeWindow.bounds
  if (!bounds.width || !bounds.height) throw new Error('Game window not found.')
  let worker: OcrWorker
  try {
    worker = await getWorker()
  } catch (err) {
    sharedWorker = null
    throw err
  }
  try {
    const t0 = performance.now()
    const shot = poeWindow.screenshot()
    const res = await worker.scanAllEssenceLabels({ width: bounds.width, height: bounds.height, data: shot })
    perfRecord('Essence scan: whole screen', performance.now() - t0)
    return {
      labels: res.labels.map(l => ({ lines: l.lines, at: { x: l.at.x / bounds.width, y: l.at.y / bounds.height } }))
    }
  } finally {
    releaseWorker()
  }
}

// Death recap's read of the game's own map mod list (top right, when open).
// Only looks at the screen and reads it; no input goes to the game. Null when
// the list isn't showing. The worker only loads once blue text is there, so a
// collapsed list costs one screenshot.
// Wide enough for the longest mods in the data, about 100 characters.
const AREA_LIST_WIDTH = 0.7
const AREA_LIST_HEIGHT = 0.75
export async function readAreaMods (poeWindow: GameWindow, delayMs = 0): Promise<{ lines: string[] | null, ocrMissing?: boolean }> {
  if (!checkOcr().ok) return { lines: null, ocrMissing: true }
  if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, 10_000)))
  // The capture copies the desktop, so anything in front of the game would be read.
  const bounds = poeWindow.bounds
  if (!poeWindow.hasFocus || !bounds.width || !bounds.height) return { lines: null }
  const t0 = performance.now()
  const width = Math.min(bounds.width, Math.round(bounds.height * AREA_LIST_WIDTH))
  const height = Math.round(bounds.height * AREA_LIST_HEIGHT)
  const corner = cropRegion(poeWindow.screenshot(), bounds.width, bounds.height,
    { x: bounds.width - width, y: 0, width, height })
  if (!hasBlueText(corner, bounds.height)) return { lines: null }
  let worker: OcrWorker
  try {
    worker = await getWorker()
  } catch (err) {
    sharedWorker = null
    throw err
  }
  try {
    const lines = await worker.scanAreaModList({ width, height, data: corner }, bounds.height)
    perfRecord('Death recap: map mod list', performance.now() - t0)
    return { lines }
  } finally {
    releaseWorker()
  }
}

// BGRA. Mod text is #8888FF; this is loose on purpose, as the worker looks properly.
function hasBlueText (bgra: Uint8Array, refH: number): boolean {
  const need = Math.round((refH / 1080) * (refH / 1080) * 400)
  let found = 0
  for (let i = 0; i < bgra.length; i += 4) {
    if (bgra[i] > 110 && bgra[i] > bgra[i + 2] * 1.3 && bgra[i] > bgra[i + 1] * 1.3 && ++found >= need) return true
  }
  return false
}

// Same units as uiohook's mouse events: physical pixels on Windows.
function cursorInScreenPixels (): { x: number, y: number } {
  const p = screen.getCursorScreenPoint()
  return process.platform === 'win32' ? screen.dipToScreenPoint(p) : p
}

// Copies a rectangle of a 4-byte-per-pixel image.
function cropRegion (data: Uint8Array, width: number, height: number, r: Rect): Uint8Array {
  if (r.x === 0 && r.y === 0 && r.width === width && r.height === height) return data
  const rowBytes = r.width * 4
  const out = new Uint8Array(rowBytes * r.height)
  for (let y = 0; y < r.height; y++) {
    const from = ((r.y + y) * width + r.x) * 4
    out.set(data.subarray(from, from + rowBytes), y * rowBytes)
  }
  return out
}

// The box read while rolling: the tooltip plus room to grow, since a reroll
// can add mods (taller) or longer lines (wider).
function lockAround (r: Rect, bounds: { width: number, height: number }): Rect {
  const padX = Math.round(bounds.height * 0.05)
  const padY = Math.round(bounds.height * 0.12)
  const x = Math.max(0, r.x - padX)
  const y = Math.max(0, r.y - padY)
  return {
    x,
    y,
    width: Math.min(bounds.width, r.x + r.width + padX) - x,
    height: Math.min(bounds.height, r.y + r.height + padY) - y
  }
}

// Whether the text found (crop pixels) runs into a side of the locked crop
// that isn't also the window's edge.
function touchesEdge (r: Rect, crop: Rect, bounds: { width: number, height: number }): boolean {
  const m = 2
  return (r.x <= m && crop.x > 0) ||
    (r.y <= m && crop.y > 0) ||
    (r.x + r.width >= crop.width - m && crop.x + crop.width < bounds.width) ||
    (r.y + r.height >= crop.height - m && crop.y + crop.height < bounds.height)
}
