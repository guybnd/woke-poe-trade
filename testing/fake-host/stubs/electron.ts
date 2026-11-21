// Stand-in for the electron module, enough for main's woke code, the server,
// config store, log watcher, shortcuts and the overlay window (--no-overlay).
import os from 'os'
import path from 'path'
import { EventEmitter } from 'events'
import { PNG } from 'pngjs'
import { game } from '../game'

const userData = () => process.env.WOKE_FAKE_USER_DATA ?? path.join(os.tmpdir(), 'woke-fake-app')

// Things the app asked the OS to do (open a folder, a URL...).
export const shellCalls: Array<{ op: string, target: string }> = []

export const app = Object.assign(new EventEmitter(), {
  getPath (name: string) {
    switch (name) {
      case 'userData': return userData()
      case 'documents': return path.join(userData(), 'Documents')
      case 'home': return path.join(userData(), 'home')
      default: return path.join(userData(), name)
    }
  },
  getVersion: () => '0.0.0-test',
  getAppMetrics: () => [] as unknown[],
  exit (code?: number) { throw new Error(`app.exit(${code})`) },
  userAgentFallback: 'woke-fake-app',
  requestSingleInstanceLock: () => true,
  isPackaged: false
})

export const shell = {
  async openPath (p: string) { shellCalls.push({ op: 'openPath', target: p }); return '' },
  showItemInFolder (p: string) { shellCalls.push({ op: 'showItemInFolder', target: p }) },
  async openExternal (url: string) { shellCalls.push({ op: 'openExternal', target: url }) },
  // The Recycle Bin: the file just goes.
  async trashItem (p: string) { shellCalls.push({ op: 'trashItem', target: p }); await import('fs').then(fs => fs.promises.rm(p)) }
}

// Crash reports (main/src/woke/crash-reports.ts): never started here.
export const crashReporter = { start () {} }

export const powerMonitor = new EventEmitter()

export const screen = Object.assign(new EventEmitter(), {
  getCursorScreenPoint: () => ({ ...game.cursor }),
  dipToScreenPoint: (p: { x: number, y: number }) => p,
  dipToScreenRect: (_w: unknown, r: unknown) => r,
  getPrimaryDisplay: () => ({ scaleFactor: 1, bounds: game.bounds, workArea: game.bounds })
})

export const clipboard = {
  readText: () => game.clipboard,
  writeText: (text: string) => { game.clipboard = text }
}

// Hotkeys the app registered, so a test can "press" one.
export const registeredShortcuts = new Map<string, () => void>()
export const globalShortcut = {
  register (accel: string, cb: () => void) {
    if (registeredShortcuts.has(accel)) return false
    registeredShortcuts.set(accel, cb)
    return true
  },
  unregister (accel: string) { registeredShortcuts.delete(accel) },
  unregisterAll () { registeredShortcuts.clear() },
  isRegistered: (accel: string) => registeredShortcuts.has(accel)
}

export const dialog = {
  showErrorBox (title: string, content: string) { shellCalls.push({ op: 'errorBox', target: `${title}: ${content}` }) }
}

export const Menu = { buildFromTemplate: () => ({}), setApplicationMenu () {} }
export class BrowserWindow { constructor () { throw new Error('No windows in the fake app') } }
// Pictures pasted into the overlay (PNG data: URLs), as BGRA like Electron's.
export const nativeImage = {
  createFromPath: () => ({}),
  createFromDataURL (url: string) {
    const m = /^data:image\/png;base64,(.*)$/.exec(url)
    if (!m) return { getSize: () => ({ width: 0, height: 0 }), toBitmap: () => Buffer.alloc(0) }
    const png = PNG.sync.read(Buffer.from(m[1], 'base64'))
    const px = Buffer.from(png.data)
    for (let i = 0; i < px.length; i += 4) { const t = px[i]; px[i] = px[i + 2]; px[i + 2] = t }
    return { getSize: () => ({ width: png.width, height: png.height }), toBitmap: () => px }
  }
}
export class Tray {}
// pathofexile.com as main's own requests see it (the stash reader: /my-account
// and get-stash-items). A test sets `reply`; any URL it answers null for has
// no network, as before. Redirects aren't followed, like sessionFetch asks.
export interface SiteReply { status: number, headers?: Record<string, string>, body: string }
export const site = {
  reply: null as null | ((url: string) => SiteReply | null),
  requests: [] as string[]
}
export const net = {
  request (opts: { url: string } | string) {
    const url = typeof opts === 'string' ? opts : opts.url
    const r = site.reply?.(url) ?? null
    if (!r) throw new Error('No network in the fake app')
    site.requests.push(url)
    let aborted = false
    const req = Object.assign(new EventEmitter(), {
      abort () { aborted = true },
      end () {
        setImmediate(() => {
          if (aborted) return
          if (r.status >= 300 && r.status < 400) {
            req.emit('redirect', r.status, 'GET', r.headers?.location ?? '', r.headers ?? {})
            return
          }
          const res = Object.assign(new EventEmitter(), { statusCode: r.status, headers: r.headers ?? {} })
          req.emit('response', res)
          res.emit('data', Buffer.from(r.body, 'utf8'))
          res.emit('end')
        })
      }
    })
    return req
  }
}
export const session = { defaultSession: { webRequest: { onHeadersReceived () {} } } }
export type Rectangle = { x: number, y: number, width: number, height: number }

export default { app, shell, screen, crashReporter, powerMonitor, clipboard, globalShortcut, dialog, Menu, BrowserWindow, nativeImage, Tray, net, session }
