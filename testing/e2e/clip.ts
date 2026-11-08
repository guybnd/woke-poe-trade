// Short looping clips for the landing page: a test drives the overlay through
// a Clip, which takes a frame of its camera's part of the page after every
// step, then encodes the frames with ffmpeg into docs/public/clips/<name>.mp4
// and .webm, with a still (see `poster`) as docs/public/shots/<name>.webp. The clip
// tests are at the end of landing-highlights.spec.ts.
//
// Frames are screenshots rendered at the clip's 1920x1080 (the screencast API
// only sends CSS pixels, which is blurry once cropped). A screenshot takes tens of
// milliseconds, so cursor moves run on the clip's own clock: one frame per
// step, each 1/30 s long, however long the step really took. Holds keep real
// time, so loading and fades play at their own speed.
//
// Headless Chromium draws no mouse pointer, so the clip draws a game-style
// cursor of its own and shows the keys pressed.
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import type { CDPSession, Page } from '@playwright/test'

export const CLIPS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/public/clips')
// The first frame goes with the stills, so the site makes its phone crop and
// thumbnail like any shot's (docs/scripts/phone-shots.mjs).
const SHOTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/public/shots')

export interface Rect { x: number, y: number, width: number, height: number }

const FPS = 30
const OUT_WIDTH = 1920

// The game's pointer, near enough: a gold arrow with a dark edge.
const CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1c4"/><stop offset=".45" stop-color="#d9a441"/><stop offset="1" stop-color="#6b4512"/></linearGradient></defs>
<path d="M2 2 L2 31 L9.5 24.5 L14.5 35.5 L19.5 33.3 L14.6 22.6 L24.5 22 Z" fill="url(#g)" stroke="#120b04" stroke-width="2" stroke-linejoin="round"/></svg>`

const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export class Clip {
  private dir: string
  private frames: Array<{ file: string, seconds: number }> = []
  private x: number
  private y: number
  private view: [number, number, number] = [1920, 1080, 2]
  // The part of the page the clip shows, eased toward `aim` a little each frame.
  private camera: Rect = { x: 0, y: 0, width: 1920, height: 1080 }
  private aim: Rect = this.camera
  private posterFrame = 0
  // The clip time of the last frame, so the camera eases at the same speed
  // through holds and moves.
  private lastFrame = 0
  // Whether the page mouse is where the cursor is (the last move was `page`).
  private overPage = false

  private constructor (readonly page: Page, readonly name: string, private cdp: CDPSession, at: [number, number]) {
    this.dir = fs.mkdtempSync(path.join(os.tmpdir(), `woke-clip-${name}-`))
    ;[this.x, this.y] = at
  }

  // `camera` is the part of the 1920x1080 page to show (16:9; see `around`).
  static async start (page: Page, name: string, at: [number, number], camera: Rect) {
    const cdp = await page.context().newCDPSession(page)
    const clip = new Clip(page, name, cdp, at)
    clip.view = await page.evaluate(() => [window.innerWidth, window.innerHeight, window.devicePixelRatio] as [number, number, number])
    clip.camera = clip.aim = camera
    await page.evaluate(([svg, x, y]) => {
      const c = document.createElement('div')
      c.id = 'clip-cursor'
      c.innerHTML = svg as string
      Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none', transformOrigin: '2px 2px', transform: `translate(${x}px, ${y}px)`, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.7))' })
      const k = document.createElement('div')
      k.id = 'clip-keys'
      Object.assign(k.style, { position: 'fixed', zIndex: '2147483646', pointerEvents: 'none', display: 'none', gap: '8px' })
      document.documentElement.append(c, k)
    }, [CURSOR_SVG, at[0], at[1]] as const)
    return clip
  }

  // Moves the camera to `rect` over the next frames.
  look (rect: Rect) {
    this.aim = rect
  }

  // One frame of the page as it is now, shown for `seconds`. The shot is
  // rendered straight at the clip's size (a clip with a scale re-renders at
  // that scale; without one the shot comes at CSS pixels).
  private async frame (seconds = 1 / FPS) {
    // 14% of the way each 1/30 s, whatever the frame's real length.
    const now = Date.now()
    const dt = seconds > 0 ? seconds : this.lastFrame ? (now - this.lastFrame) / 1000 : 1 / FPS
    this.lastFrame = now
    const k = 1 - Math.pow(1 - 0.14, Math.min(dt, 1) * FPS)
    const c = this.camera
    const a = this.aim
    this.camera = { x: c.x + (a.x - c.x) * k, y: c.y + (a.y - c.y) * k, width: c.width + (a.width - c.width) * k, height: c.height + (a.height - c.height) * k }
    if (Math.abs(this.camera.width - a.width) < 0.5 && Math.abs(this.camera.x - a.x) < 0.5 && Math.abs(this.camera.y - a.y) < 0.5) this.camera = a
    const cam = this.camera
    // The shot comes at the clip's scale times the device's pixel ratio: this
    // makes it OUT_WIDTH wide.
    const shot = await this.cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true, clip: { ...cam, scale: OUT_WIDTH / cam.width / this.view[2] } })
    const file = path.join(this.dir, `f${String(this.frames.length).padStart(5, '0')}.jpg`)
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'))
    this.frames.push({ file, seconds })
  }

  private async cursorAt (x: number, y: number, scale = 1) {
    await this.page.evaluate(([x, y, s]) => {
      const c = document.getElementById('clip-cursor')
      if (c) c.style.transform = `translate(${x}px, ${y}px) scale(${s})`
    }, [x, y, scale])
  }

  // Real time passes, with frames taken as fast as they come.
  async hold (ms: number) {
    const end = Date.now() + ms
    let last = Date.now()
    await this.frame(0)
    while (Date.now() < end) {
      await this.frame(0)
      const now = Date.now()
      this.frames[this.frames.length - 2].seconds = (now - last) / 1000
      last = now
    }
    this.frames[this.frames.length - 1].seconds = Math.max(1 / FPS, (end - last) / 1000)
  }

  // Glides the cursor to (x, y) in `ms` of clip time. `page` moves the mouse
  // over the overlay (it gets hover and clicks); `game` hands each point to
  // `game`, for the app's in-game mouse hook; `none` only moves the drawing.
  async moveTo (x: number, y: number, ms = 600, mode: 'page' | 'game' | 'none' = 'page', game?: (x: number, y: number) => void) {
    const [x0, y0] = [this.x, this.y]
    const steps = Math.max(2, Math.round(ms * FPS / 1000))
    for (let i = 1; i <= steps; i++) {
      const k = ease(i / steps)
      const [cx, cy] = [Math.round(x0 + (x - x0) * k), Math.round(y0 + (y - y0) * k)]
      await this.cursorAt(cx, cy)
      if (mode === 'page') await this.page.mouse.move(cx, cy)
      else if (mode === 'game') game?.(cx, cy)
      await this.frame()
    }
    this.x = x; this.y = y
    this.overPage = mode === 'page'
  }

  // The cursor's press. It clicks the page only when the last move was over
  // the page; after a `game` move the test makes the in-game click itself.
  async click () {
    await this.cursorAt(this.x, this.y, 0.85)
    if (this.overPage) await this.page.mouse.down()
    await this.frame(); await this.frame()
    if (this.overPage) await this.page.mouse.up()
    await this.cursorAt(this.x, this.y)
    await this.frame()
  }

  // Shows keycaps (e.g. ['Ctrl', 'D']) at (x, y), runs `press` while they
  // show, holds `showMs`, then hides them.
  async keys (caps: string[], x: number, y: number, press?: () => Promise<void>, showMs = 900) {
    await this.page.evaluate(([caps, x, y]) => {
      const k = document.getElementById('clip-keys')!
      k.replaceChildren(...(caps as string[]).map(cap => {
        const e = document.createElement('span')
        e.textContent = cap
        Object.assign(e.style, { padding: '6px 14px 8px', minWidth: '44px', textAlign: 'center', background: 'linear-gradient(#2a2118, #15100b)', border: '2px solid #c9a35a', borderBottomWidth: '5px', borderRadius: '7px', color: '#f0dca8', font: '600 26px/1 "Fontin SmallCaps", Georgia, serif', boxShadow: '0 4px 14px rgba(0,0,0,.8)' })
        return e
      }))
      Object.assign(k.style, { left: `${x}px`, top: `${y}px`, display: 'flex' })
    }, [caps, x, y] as const)
    await this.hold(250)
    await press?.()
    await this.hold(showMs)
    await this.page.evaluate(() => { document.getElementById('clip-keys')!.style.display = 'none' })
  }

  // Makes the frame on show now the still: the clip's picture before it
  // plays, in the picture strip, and for visitors who turned motion off.
  async poster () {
    await this.frame()
    this.posterFrame = this.frames.length - 1
  }

  // Types into the focused box, a key every `perKey` ms of clip time, with
  // the page's real response caught by a short hold after each key.
  async type (text: string, perKey = 110) {
    for (const ch of text) {
      await this.page.keyboard.type(ch)
      await this.hold(perKey)
    }
  }

  // Encodes the frames (already at the clip's size) to MP4 and WebM, and the still.
  async save () {
    try {
      await this.encode()
    } finally {
      this.discard()
    }
    return { seconds: this.frames.reduce((s, f) => s + f.seconds, 0), frames: this.frames.length }
  }

  // Drops the frames on disk: after saving, or from a test that failed.
  discard () {
    fs.rmSync(this.dir, { recursive: true, force: true })
    this.cdp.detach().catch(() => {})
  }

  private async encode () {
    if (this.frames.length < 2) throw new Error(`Clip ${this.name} has ${this.frames.length} frames`)
    const lines: string[] = []
    const entry = (file: string) => `file '${file.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`
    for (const f of this.frames) lines.push(entry(f.file), `duration ${Math.max(0.001, f.seconds).toFixed(4)}`)
    // The concat demuxer drops the last frame's duration unless it is listed again.
    lines.push(entry(this.frames[this.frames.length - 1].file))
    const list = path.join(this.dir, 'list.txt')
    fs.writeFileSync(list, lines.join('\n'))
    fs.mkdirSync(CLIPS, { recursive: true })
    const vf = `scale=${OUT_WIDTH}:${OUT_WIDTH * 9 / 16}:flags=lanczos,setsar=1,fps=${FPS}`
    const ffmpeg = process.env.FFMPEG ?? 'ffmpeg'
    const run = (args: string[]) => {
      const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', ...args], { encoding: 'utf8' })
      if (r.status !== 0) throw new Error(`ffmpeg failed for ${this.name}: ${r.stderr || r.error}`)
    }
    const input = ['-f', 'concat', '-safe', '0', '-i', list, '-vf', vf, '-an']
    // Both encoded beside the old ones first, so a failed encode never leaves
    // a new MP4 next to an old WebM.
    const mp4 = path.join(this.dir, 'clip.mp4')
    const webm = path.join(this.dir, 'clip.webm')
    run([...input, '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4])
    run([...input, '-c:v', 'libvpx-vp9', '-crf', '36', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', webm])
    run(['-i', this.frames[this.posterFrame].file, '-vf', `scale=${OUT_WIDTH}:${OUT_WIDTH * 9 / 16}:flags=lanczos`, '-c:v', 'libwebp', '-quality', '86', path.join(SHOTS, `${this.name}.webp`)])
    fs.copyFileSync(mp4, path.join(CLIPS, `${this.name}.mp4`))
    fs.copyFileSync(webm, path.join(CLIPS, `${this.name}.webm`))
  }
}

// A 16:9 rect around boxes, at least `min` wide, kept inside the 1920x1080 page.
export function around (boxes: Array<Rect | null>, min = 1120, pad = 36): Rect {
  const bs = boxes.filter((b): b is Rect => b != null)
  if (!bs.length) throw new Error('Nothing to crop around')
  const left = Math.min(...bs.map(b => b.x))
  const top = Math.min(...bs.map(b => b.y))
  const right = Math.max(...bs.map(b => b.x + b.width))
  const bottom = Math.max(...bs.map(b => b.y + b.height))
  const width = Math.min(1920, Math.max(min, right - left + pad * 2, (bottom - top + pad * 2) * 16 / 9))
  const height = width * 9 / 16
  const x = Math.max(0, Math.min(1920 - width, (left + right) / 2 - width / 2))
  const y = Math.max(0, Math.min(1080 - height, (top + bottom) / 2 - height / 2))
  return { x, y, width, height }
}
