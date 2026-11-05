// The fake app: Awakened PoE Trade's main process with the real server,
// config store, Client.txt watcher, hotkeys, overlay focus logic and woke
// handlers (OCR scanning included), wired to the fake game (game.ts) instead
// of Windows. Electron, uiohook and the overlay window are stubs (stubs/).
// The overlay page itself runs in Playwright's Chromium.
//
// Built by build.mjs into dist/fake-app.cjs, next to the renderer's build.
import fs from 'fs'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import { game } from './game'
import nodeGypBuild from './stubs/node-gyp-build.cjs'
import { registeredShortcuts, shellCalls } from 'electron'
import { uIOhook, UiohookKey, EventType } from 'uiohook-napi'
import { startServer, eventPipe, server } from '../../main/src/server'
import { Logger } from '../../main/src/RemoteLogger'
import { GameWindow } from '../../main/src/windowing/GameWindow'
import { OverlayWindow } from '../../main/src/windowing/OverlayWindow'
import { GameConfig } from '../../main/src/host-files/GameConfig'
import { GameLogWatcher } from '../../main/src/host-files/GameLogWatcher'
import { Shortcuts } from '../../main/src/shortcuts/Shortcuts'
import { initWoke, initWokeOverlay } from '../../main/src/woke'
import { KeyToElectron } from '../../ipc/KeyToCode'
import type { IpcEvent } from '../../ipc/types'
import type { AppUpdater } from '../../main/src/AppUpdater'
import { decodePng } from './png'
import { OcrWorker } from '../../main/src/vision/link-main'

const fakeHook = (nodeGypBuild as unknown as { fakeHook: { emit: (e: unknown) => void } }).fakeHook

export { game }

export interface FakeAppOptions {
  // Settings, saved data, OCR files (apt-data/cv-ocr) live here.
  userData: string
  // Recorded HTTP responses for /proxy requests (testing/fixtures/http).
  httpFixtures: string
}

export interface RecordedRequest { method: string, url: string, body: string, mocked: boolean }

const CLIENT_EVENTS: Array<IpcEvent['name']> = [
  'CLIENT->MAIN::update-host-config',
  'CLIENT->MAIN::used-recently',
  'CLIENT->MAIN::save-config',
  'CLIENT->MAIN::user-action',
  'CLIENT->MAIN::woke-request',
  'OVERLAY->MAIN::focus-game',
  'OVERLAY->MAIN::track-area',
  'OVERLAY->MAIN::woke-hover-zones'
]

const UiohookToName = Object.fromEntries(Object.entries(UiohookKey).map(([k, v]) => [v, k]))
game.keyNames = UiohookToName

export class FakeApp {
  port = 0
  // Events the overlay sent to the app, newest last.
  readonly received: Array<{ name: string, payload: any, at: number }> = [] // eslint-disable-line @typescript-eslint/no-explicit-any
  readonly requests: RecordedRequest[] = []
  readonly logLines: string[] = []
  readonly game = game
  readonly shellCalls = shellCalls
  clientLogPath: string

  private logCount = 0

  constructor (readonly opts: FakeAppOptions, readonly logger: Logger) {
    this.clientLogPath = ''
    this.newClientLog()
  }

  // Starts an empty Client.txt (as after a fresh install), so one test's log
  // lines don't leak into the next. The overlay's next settings push points
  // the log watcher at it.
  newClientLog (lines: string[] = []) {
    this.clientLogPath = path.join(this.opts.userData, 'Path of Exile', `logs-${++this.logCount}`, 'Client.txt')
    fs.mkdirSync(path.dirname(this.clientLogPath), { recursive: true })
    fs.writeFileSync(this.clientLogPath, lines.map(l => l + '\r\n').join(''))
  }

  get url () { return `http://127.0.0.1:${this.port}/index.html` }

  // ---- the game ----

  // Appends lines to Client.txt, as the game does. Lines without a
  // timestamp get the current time. The real log watcher picks them up
  // (it polls every 450 ms) and streams them to the overlay.
  appendClientLog (lines: string[]) {
    const stamped = lines.map(l => /^\d{4}\/\d\d\/\d\d /.test(l) ? l : `${clientLogStamp(new Date())} ${l}`)
    fs.appendFileSync(this.clientLogPath, stamped.map(l => l + '\r\n').join(''))
  }

  // Shows this screenshot (PNG file) as the game's screen.
  showScreen (pngFile: string) {
    const img = decodePng(fs.readFileSync(pngFile))
    const bgra = new Uint8Array(img.width * img.height * 4)
    for (let i = 0; i < bgra.length; i += 4) {
      bgra[i] = img.data[i + 2]
      bgra[i + 1] = img.data[i + 1]
      bgra[i + 2] = img.data[i]
      bgra[i + 3] = 255
    }
    game.bounds = { ...game.bounds, width: img.width, height: img.height }
    game.screen = bgra
    game.screenFile = pngFile
  }

  // Moves the mouse (game window coordinates), as the global mouse hook sees it.
  moveMouse (x: number, y: number) {
    game.cursor = { x: game.bounds.x + x, y: game.bounds.y + y }
    fakeHook.emit({ type: EventType.EVENT_MOUSE_MOVED, x: game.cursor.x, y: game.cursor.y, button: 0, clicks: 0, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, time: Date.now() })
  }

  // Presses the left mouse button there, as the global mouse hook sees it.
  pressMouse (x: number, y: number) {
    game.cursor = { x: game.bounds.x + x, y: game.bounds.y + y }
    fakeHook.emit({ type: EventType.EVENT_MOUSE_PRESSED, x: game.cursor.x, y: game.cursor.y, button: 1, clicks: 1, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, time: Date.now() })
  }

  // Hover an item in game: Ctrl+C now copies this text.
  hoverItem (text: string | null) {
    game.hoveredItem = text == null ? null : text.replace(/\r?\n/g, '\r\n')
  }

  // Presses a hotkey the app registered ("Ctrl + D", "Alt + M"...).
  // Throws when the app didn't register it, like a key nothing listens to.
  pressHotkey (shortcut: string) {
    const accel = shortcut.split(' + ').map(k => (KeyToElectron as Record<string, string>)[k]).join('+')
    const cb = registeredShortcuts.get(accel)
    if (!cb) throw new Error(`Hotkey ${shortcut} (${accel}) is not registered. Registered: ${[...registeredShortcuts.keys()].join(', ')}`)
    // The player holds the hotkey's keys while the app reacts to it.
    game.holdKeys(shortcut.split(' + '), cb)
  }

  registeredHotkeys (): string[] {
    return [...registeredShortcuts.keys()]
  }

  // The game window gains / loses focus (alt-tab, clicking the overlay...).
  focusGame (focused = true) {
    game.focused = focused
    game.emit('focus-change', focused)
  }

  // ---- the app ----

  sendToOverlay (event: IpcEvent) {
    eventPipe.sendEventTo('broadcast', event)
  }

  clearReceived () { this.received.length = 0 }

  async waitForReceived (name: string, pred: (payload: any) => boolean = () => true, timeoutMs = 5000) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const end = Date.now() + timeoutMs
    while (Date.now() < end) {
      const hit = this.received.find(e => e.name === name && pred(e.payload))
      if (hit) return hit.payload
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    throw new Error(`The overlay did not send ${name} within ${timeoutMs} ms`)
  }

  configPath () { return path.join(this.opts.userData, 'apt-data', 'config.json') }

  // The settings file as saved now; null when missing or not valid JSON
  // (e.g. read in the middle of a write).
  readConfig (): any | null { // eslint-disable-line @typescript-eslint/no-explicit-any
    try { return JSON.parse(fs.readFileSync(this.configPath(), 'utf8')) } catch { return null }
  }

  readConfigText (): string | null {
    try { return fs.readFileSync(this.configPath(), 'utf8') } catch { return null }
  }

  // Resolves once the overlay has sent no settings save for `quietMs`.
  async settled (quietMs = 1000, timeoutMs = 15000) {
    const end = Date.now() + timeoutMs
    while (Date.now() < end) {
      const last = this.received.filter(e => e.name === 'CLIENT->MAIN::save-config').pop()
      if (!last || Date.now() - last.at >= quietMs) return
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  lastSavedContents (): string | null {
    return this.received.filter(e => e.name === 'CLIENT->MAIN::save-config').pop()?.payload.contents ?? null
  }

  writeConfig (config: unknown) {
    fs.mkdirSync(path.dirname(this.configPath()), { recursive: true })
    fs.writeFileSync(this.configPath(), JSON.stringify(config, null, 2))
  }

  unmockedRequests () { return this.requests.filter(r => !r.mocked) }

  // OCR workers (opencv + tesseract, 100-200 MB each) loaded right now.
  ocrWorkers () { return OcrWorker.live }
}

function clientLogStamp (d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} ${p(Math.floor(performance.now()) % 1e9, 9)} cff94598 [INFO Client 1234]`
}

// /proxy/<host>/<path> -> testing/fixtures/http/<host>/<path>[.<method>].json
// Query strings are ignored. `_any[.<method>].json` in a folder answers any
// last path part (a league name, a list of trade result ids).
function fixtureProxy (app: FakeApp) {
  server.prependListener('request', (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url?.startsWith('/proxy/')) return
    let body = ''
    req.on('data', (c: Buffer) => { body += c.toString('utf8') })
    req.on('end', () => {
      const target = req.url!.slice('/proxy/'.length).split('?')[0]
      const base = path.join(app.opts.httpFixtures, ...target.split('/').map(decodeURIComponent))
      const method = req.method!.toLowerCase()
      const any = path.join(path.dirname(base), '_any')
      const candidates = [`${base}.${method}.json`, `${base}.json`, `${any}.${method}.json`, `${any}.json`]
      const file = candidates.find(f => fs.existsSync(f))
      app.requests.push({ method: req.method!, url: req.url!.slice('/proxy/'.length), body, mocked: Boolean(file) })
      if (!file) {
        res.writeHead(404, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: { message: `No recorded response for ${req.method} ${target}` } }))
        return
      }
      res.writeHead(200, {
        'content-type': 'application/json',
        // The fake trade site allows 100 requests a second, so tests don't
        // wait out APT's default limit (1 per 5 s) between searches.
        ...(target.includes('/api/trade/') ? { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' } : {})
      })
      res.end(fs.readFileSync(file))
    })
  })
}

const fakeUpdater = { info: { state: 'update-not-available', checkedAt: 0 }, checkAtStartup () {} } as unknown as AppUpdater

let started: FakeApp | null = null

// One app per process: main's server and handlers are module singletons.
export async function startFakeApp (opts: FakeAppOptions): Promise<FakeApp> {
  if (started) throw new Error('The fake app is already running in this process')
  process.env.WOKE_FAKE_USER_DATA = opts.userData
  process.argv.push('--no-overlay', '--listen=127.0.0.1:0')
  fs.mkdirSync(opts.userData, { recursive: true })

  const logger = new Logger(eventPipe)
  const app = new FakeApp(opts, logger)
  started = app

  const origWrite = logger.write.bind(logger)
  logger.write = (message: string) => { app.logLines.push(message); origWrite(message) }

  for (const name of CLIENT_EVENTS) {
    eventPipe.onEventAnyClient(name, (payload: unknown) => {
      app.received.push({ name, payload, at: Date.now() })
    })
  }

  const gameLogWatcher = new GameLogWatcher(eventPipe, logger)
  const gameConfig = new GameConfig(eventPipe, logger)
  const poeWindow = new GameWindow()
  fixtureProxy(app)
  initWoke(eventPipe, logger, poeWindow, gameLogWatcher)

  const overlay = new OverlayWindow(eventPipe, logger, poeWindow)
  initWokeOverlay(eventPipe, overlay)
  const shortcuts = await Shortcuts.create(logger, overlay, poeWindow, gameConfig, eventPipe)
  eventPipe.onEventAnyClient('CLIENT->MAIN::update-host-config', (cfg) => {
    overlay.updateOpts(cfg.overlayKey, cfg.windowTitle)
    shortcuts.updateActions(cfg.shortcuts, cfg.stashScroll, cfg.logKeys, cfg.restoreClipboard, cfg.language)
    // The fake game's Client.txt, whatever the settings say.
    if (cfg.wokeGameLog === false) gameLogWatcher.stop()
    else gameLogWatcher.restart(app.clientLogPath)
    gameConfig.readConfig(cfg.gameConfig ?? '')
  })
  uIOhook.start()
  app.port = await startServer(fakeUpdater, logger)
  return app
}
