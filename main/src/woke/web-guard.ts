// What pages inside the app may do. The overlay page is the app's own code;
// everything in a <webview> (lab, Wealthy Exile, the trade site, the wiki) is
// someone else's site, so it gets a plain locked-down browser tab and nothing
// more. Links only ever leave the app as web addresses, whoever asked.
//
// Pure checks here; electron wiring in `guardWebContents` below.
import type { App, Session, WebContents } from 'electron'

// The only kinds of address the system browser is asked to open. Anything
// else (file:, a custom protocol handler, ms-*, javascript:) could start a
// program, so it is dropped.
export function isWebUrl (url: unknown): url is string {
  if (typeof url !== 'string') return false
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

// A webview may show web pages and the blank page it starts on.
export function isWebviewSrc (url: unknown): boolean {
  if (url === '' || url == null || url === 'about:blank') return true
  return isWebUrl(url)
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]'])

// The app's own page: served by its local server, or Vite's in dev.
export function isOwnPage (url: unknown, devServerUrl?: string): boolean {
  if (typeof url !== 'string') return false
  try {
    const u = new URL(url)
    if (devServerUrl && u.origin === new URL(devServerUrl).origin) return true
    return u.protocol === 'http:' && LOOPBACK.has(u.hostname)
  } catch {
    return false
  }
}

// Asked for by ordinary pages and harmless: copy buttons, a video's fullscreen.
const ANYONE = new Set(['clipboard-sanitized-write', 'fullscreen'])

export function allowPermission (permission: string, requestingUrl: string | undefined, devServerUrl?: string): boolean {
  if (ANYONE.has(permission)) return true
  // The overlay itself uses notifications (market alerts) and sound.
  return isOwnPage(requestingUrl, devServerUrl)
}

type OpenExternal = (url: string) => unknown

// Every link the app hands to the system browser goes through here.
export function openWebLink (open: OpenExternal, url: unknown): boolean {
  if (!isWebUrl(url)) return false
  open(url)
  return true
}

// Locks down every webview the overlay attaches and the pages inside it.
export function guardWebContents (app: App, session: Session, open: OpenExternal) {
  const dev = process.env.VITE_DEV_SERVER_URL

  session.setPermissionRequestHandler((_wc, permission, callback, details) => {
    callback(allowPermission(permission, details.requestingUrl, dev))
  })
  session.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
    return allowPermission(permission, requestingOrigin, dev)
  })

  app.on('web-contents-created', (_e, contents: WebContents) => {
    contents.on('will-attach-webview', (event, webPreferences, params) => {
      // Never a preload script or Node for someone else's site, whatever the
      // tag asked for.
      delete (webPreferences as { preload?: string }).preload
      webPreferences.nodeIntegration = false
      webPreferences.nodeIntegrationInSubFrames = false
      webPreferences.nodeIntegrationInWorker = false
      webPreferences.contextIsolation = true
      webPreferences.sandbox = true
      webPreferences.webSecurity = true
      webPreferences.allowRunningInsecureContent = false
      if (!isWebviewSrc(params.src)) event.preventDefault()
    })

    if (contents.getType() === 'window') {
      // The app's own windows stay on the app's own page: a link that would
      // replace it opens in the system browser instead.
      contents.on('will-navigate', (event, url) => {
        if (isOwnPage(url, dev)) return
        event.preventDefault()
        openWebLink(open, url)
      })
      return
    }
    if (contents.getType() !== 'webview') return
    // Inside a webview: no popups (as before: an ad must never pull the
    // browser up over the game), and no page but a web page, however the
    // navigation started (a link, a redirect, or the overlay setting src).
    contents.setWindowOpenHandler(() => ({ action: 'deny' }))
    contents.on('will-navigate', (event, url) => {
      if (!isWebviewSrc(url)) event.preventDefault()
    })
    contents.on('will-redirect', (event, url) => {
      if (!isWebviewSrc(url)) event.preventDefault()
    })
    contents.on('did-start-navigation', (details) => {
      if (!details.isMainFrame || isWebviewSrc(details.url)) return
      contents.stop()
      contents.loadURL('about:blank').catch(() => {})
    })
  })
}
