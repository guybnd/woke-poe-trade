// Personal-only features. Shipped in every build but inert: they wake up only
// when a file named personal.flag is in the app's data folder. Without it no
// handler is registered, nothing listens to the game log, and the overlay is
// told the flag is off, so it shows nothing either.
import fs from 'fs'
import path from 'path'
import { app, BrowserWindow, net, session } from 'electron'
import type { Logger } from '../../RemoteLogger'
import type { GameLogWatcher } from '../../host-files/GameLogWatcher'
import { allowSignInWindow, isWebUrl } from '../web-guard'
import { entersHideout } from './stash-parse'
import { POE_SITE, StashReader, fetchAccountName, readCache, readSavedAccount, saveAccount } from './stash-reader'
import type { Fetcher, HttpReply, ReaderStatus } from './stash-reader'

export const PERSONAL_FLAG = 'personal.flag'

export function personalFlagOn (dir = app.getPath('userData')): boolean {
  try {
    return fs.statSync(path.join(dir, PERSONAL_FLAG)).isFile()
  } catch {
    return false
  }
}

type Handler = (args: any) => Promise<unknown> // eslint-disable-line @typescript-eslint/no-explicit-any

export interface PersonalContext {
  register: (op: string, handler: Handler) => void
  broadcast: (topic: string, data: unknown) => void
  logger: Logger
  gameLog: GameLogWatcher
}

const TIMEOUT_MS = 30_000

// GET with the default session's cookies (the same store the trade proxy and
// the sign-in window use). Redirects aren't followed: one to the login page
// means signed out.
export const sessionFetch: Fetcher = (url) => new Promise<HttpReply>((resolve, reject) => {
  const req = net.request({
    url,
    method: 'GET',
    useSessionCookies: true,
    redirect: 'manual',
    headers: { 'user-agent': app.userAgentFallback, accept: 'application/json' }
  })
  const timer = setTimeout(() => { req.abort(); reject(new Error('pathofexile.com did not answer.')) }, TIMEOUT_MS)
  req.on('redirect', (status, _method, _url, headers) => {
    clearTimeout(timer)
    req.abort()
    resolve({ status, headers: headers as HttpReply['headers'], body: '' })
  })
  req.on('response', (res) => {
    const chunks: Buffer[] = []
    res.on('data', (c: Buffer) => chunks.push(c))
    res.on('end', () => {
      clearTimeout(timer)
      resolve({ status: res.statusCode, headers: res.headers as HttpReply['headers'], body: Buffer.concat(chunks).toString('utf8') })
    })
    res.on('error', (e: Error) => { clearTimeout(timer); reject(e) })
  })
  req.on('error', (e) => { clearTimeout(timer); reject(e) })
  req.end()
})

async function removeLoginCookies () {
  const cookies = session.defaultSession.cookies
  for (const url of [POE_SITE, 'https://pathofexile.com']) {
    await cookies.remove(url, 'POESESSID').catch(() => {})
  }
  await cookies.flushStore().catch(() => {})
}

let signInWindow: BrowserWindow | null = null

// A small pathofexile.com window on the default session. Done when the site
// says who is signed in, or when it is closed.
function openSignIn (onAccount: (account: string) => void): Promise<string | null> {
  if (signInWindow && !signInWindow.isDestroyed()) {
    signInWindow.focus()
    return Promise.resolve(null)
  }
  const win = new BrowserWindow({
    width: 520,
    height: 760,
    title: 'Sign in to pathofexile.com',
    autoHideMenuBar: true,
    alwaysOnTop: true,
    webPreferences: { session: session.defaultSession, sandbox: true, contextIsolation: true, nodeIntegration: false }
  })
  signInWindow = win
  allowSignInWindow(win.webContents)
  // Sign-in through Steam or another site stays in this window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isWebUrl(url)) win.loadURL(url).catch(() => {})
    return { action: 'deny' }
  })

  return new Promise((resolve) => {
    let found: string | null = null
    let checking = false
    let again = false
    const check = async () => {
      if (checking) { again = true; return }
      checking = true
      try {
        do {
          again = false
          const name = await fetchAccountName(sessionFetch).catch(() => null)
          if (name) {
            found = name
            onAccount(name)
            if (!win.isDestroyed()) win.close()
            return
          }
        } while (again)
      } finally {
        checking = false
      }
    }
    const onCookie = (_e: unknown, cookie: Electron.Cookie, _cause: string, removed: boolean) => {
      if (!removed && cookie.name === 'POESESSID' && /pathofexile\.com$/.test(cookie.domain ?? '')) check().catch(() => {})
    }
    session.defaultSession.cookies.on('changed', onCookie)
    win.webContents.on('did-navigate', (_e, url) => {
      if (url.startsWith(POE_SITE) && !/\/login/.test(url)) check().catch(() => {})
    })
    win.on('closed', () => {
      session.defaultSession.cookies.removeListener('changed', onCookie)
      signInWindow = null
      resolve(found)
    })
    win.loadURL(`${POE_SITE}/login`).catch(() => {})
  })
}

export function initPersonal (ctx: PersonalContext): boolean {
  if (!personalFlagOn()) return false

  const reader = new StashReader({
    fetch: sessionFetch,
    now: () => Date.now(),
    sleep: async (ms) => { await new Promise(resolve => setTimeout(resolve, ms)) },
    onStatus: (s) => { ctx.broadcast('stash-reader', s) }
  })
  readSavedAccount().then(a => { if (a) reader.restoreAccount(a) }).catch(() => {})

  const authStatus = async (verify: boolean) => {
    if (verify) {
      const name = await fetchAccountName(sessionFetch).catch(() => undefined)
      // undefined: no answer (offline, busy). Keep what we knew.
      if (name === null) {
        reader.signedOut()
        await saveAccount(null)
      } else if (name) {
        reader.signedIn(name)
        await saveAccount(name)
      }
    }
    return { signedIn: !!reader.account, account: reader.account }
  }

  ctx.register('stash-auth-status', async (args) => await authStatus(args?.verify === true))
  ctx.register('stash-sign-in', async () => {
    const account = await openSignIn((name) => {
      reader.signedIn(name)
      saveAccount(name).catch(() => {})
    })
    return { signedIn: !!(account ?? reader.account), account: account ?? reader.account }
  })
  ctx.register('stash-sign-out', async () => {
    await removeLoginCookies()
    reader.signedOut()
    await saveAccount(null)
    return { signedIn: false, account: null }
  })
  // The overlay says which league to read (and the Account name setting).
  ctx.register('stash-reader-config', async (args) => {
    reader.fallbackAccount = typeof args?.accountName === 'string' && args.accountName.trim() ? args.accountName.trim() : null
    await reader.setLeague(typeof args?.league === 'string' && args.league ? args.league : null)
    return reader.current
  })
  ctx.register('stash-reader-status', async () => reader.current)
  ctx.register('stash-read', async () => await reader.read('manual'))
  ctx.register('stash-cache', async (args) => {
    const league = typeof args?.league === 'string' ? args.league : reader.league
    return league ? await readCache(league) : null
  })

  // Quiet read on entering the hideout, from the log watcher that already runs.
  ctx.gameLog.onLines = (lines) => {
    if (!entersHideout(lines)) return
    const run = reader.readIfDue()
    run?.then((s: ReaderStatus) => {
      if (s.error && s.error.kind !== 'signed-out') ctx.logger.write(`warn [stash-reader] ${s.error.message}`)
    }).catch(() => {})
  }
  ctx.logger.write('info [personal] personal.flag found: stash reader on.')
  return true
}
