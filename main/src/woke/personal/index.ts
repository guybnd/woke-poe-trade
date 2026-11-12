// The stash reader. Shipped in every build but inert: it wakes up only when a
// player turns it on (Settings > Modules, hidden until unlocked) or a file
// named personal.flag is in the app's data folder (always on). Off, no handler
// is registered, nothing listens to the game log, and the overlay is told it's
// off, so it shows nothing either. Turning it off signs out and undoes all that.
import fs from 'fs'
import path from 'path'
import { app, BrowserWindow, net, session } from 'electron'
import type { Logger } from '../../RemoteLogger'
import type { GameLogWatcher } from '../../host-files/GameLogWatcher'
import { allowSignInWindow, isWebUrl } from '../web-guard'
import { appPrefs, setAppPrefs } from '../app-prefs'
import { entersHideout } from './stash-parse'
import { POE_SITE, StashReader, fetchAccountName, readCache, readSavedAccount, saveAccount } from './stash-reader'
import type { Fetcher, HttpReply, ReaderStatus } from './stash-reader'
import { TEMPLATES, deleteSet, fitsTemplate, readLeagueTabs, saveSet, setChoice } from './tab-choice'
import type { TabChoice } from './tab-choice'
import { WornReader } from './worn-items'

export const PERSONAL_FLAG = 'personal.flag'

export function personalFlagOn (dir = app.getPath('userData')): boolean {
  try {
    return fs.statSync(path.join(dir, PERSONAL_FLAG)).isFile()
  } catch {
    return false
  }
}

type Handler = (args: any) => Promise<unknown> // eslint-disable-line @typescript-eslint/no-explicit-any

export interface PersonalPrefs {
  experimental: boolean
  stashReader: boolean
}

export interface PersonalContext {
  register: (op: string, handler: Handler) => void
  unregister: (op: string) => void
  broadcast: (topic: string, data: unknown) => void
  logger: Logger
  gameLog: Pick<GameLogWatcher, 'onLines'>
  // Tests swap these; the app uses woke-app.json and the cookie store.
  prefs?: { get: () => PersonalPrefs, set: (patch: Partial<PersonalPrefs>) => void }
  signOut?: () => Promise<void>
}

// What the overlay is told. forced: personal.flag, so it can't be turned off.
export interface PersonalState {
  on: boolean
  forced: boolean
  unlocked: boolean
}

export interface PersonalControl {
  state: () => PersonalState
  setOn: (on: boolean) => Promise<PersonalState>
  setUnlocked: (unlocked: boolean) => Promise<PersonalState>
}

// Every op the reader adds. None may share a name with an always-on handler:
// turning the reader off removes them.
export const READER_OPS = [
  'stash-auth-status', 'stash-sign-in', 'stash-sign-out', 'stash-reader-config',
  'stash-reader-status', 'stash-reader-read', 'stash-cache',
  'stash-tab-list', 'stash-tab-choice', 'stash-tab-set-save', 'stash-tab-set-delete',
  'worn-items'
] as const

const ids = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

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
    // JSON for the stash, HTML for /my-account (the account name).
    headers: { 'user-agent': app.userAgentFallback, accept: 'application/json, text/html;q=0.9' }
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

function closeSignIn () {
  if (signInWindow && !signInWindow.isDestroyed()) signInWindow.close()
}

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

// Registers the reader's handlers and the game log hook. Returns the undo.
function startReader (ctx: PersonalContext): () => void {
  let live = true
  const reader = new StashReader({
    fetch: sessionFetch,
    now: () => Date.now(),
    sleep: async (ms) => { await new Promise(resolve => setTimeout(resolve, ms)) },
    // A read that was under way when it was turned off says nothing more.
    onStatus: (s) => { if (live) ctx.broadcast('stash-reader', s) },
    choice: async (league) => (await readLeagueTabs(league)).choice
  })
  readSavedAccount().then(a => { if (a && live) reader.restoreAccount(a) }).catch(() => {})
  const worn = new WornReader({
    fetch: sessionFetch,
    now: () => Date.now(),
    account: () => reader.account ?? reader.fallbackAccount,
    league: () => reader.league,
    log: (line) => ctx.logger.write(line),
    signedOut: () => {
      if (!live || !reader.account) return
      reader.signedOut()
      saveAccount(null).catch(() => {})
    }
  })

  const authStatus = async (verify: boolean) => {
    if (verify) {
      const name = await fetchAccountName(sessionFetch).catch(() => undefined)
      if (!live) return { signedIn: false, account: null }
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

  const sameLeague = (args: { league?: unknown } | null | undefined) =>
    typeof args?.league === 'string' && args.league === reader.league ? args.league : null

  const ops: Record<typeof READER_OPS[number], Handler> = {
    'stash-auth-status': async (args) => await authStatus(args?.verify === true),
    'stash-sign-in': async () => {
      const account = await openSignIn((name) => {
        if (!live) return
        reader.signedIn(name)
        saveAccount(name).catch(() => {})
      })
      if (!live) return { signedIn: false, account: null }
      return { signedIn: !!(account ?? reader.account), account: account ?? reader.account }
    },
    'stash-sign-out': async () => {
      await (ctx.signOut ?? removeLoginCookies)()
      reader.signedOut()
      await saveAccount(null)
      return { signedIn: false, account: null }
    },
    // The overlay says which league to read (and the Account name setting).
    'stash-reader-config': async (args) => {
      reader.fallbackAccount = typeof args?.accountName === 'string' && args.accountName.trim() ? args.accountName.trim() : null
      await reader.setLeague(typeof args?.league === 'string' && args.league ? args.league : null)
      return reader.current
    },
    'stash-reader-status': async () => reader.current,
    'stash-reader-read': async () => await reader.read('manual'),
    'stash-cache': async (args) => {
      const league = typeof args?.league === 'string' ? args.league : reader.league
      return league ? await readCache(league) : null
    },
    // The tab picker: the league's tabs (one call), what each template picks,
    // what is chosen now and the saved sets.
    'stash-tab-list': async () => {
      const r = await reader.listTabs()
      if (!live) return { error: 'The stash reader is off.' }
      if ('error' in r) return r
      // Switched league meanwhile: that list isn't this league's.
      if (r.league !== reader.league) return { error: 'The league changed. Open it again.' }
      const { league, tabs } = r
      const fits = Object.fromEntries(TEMPLATES.map(t => [t, tabs.filter(tab => fitsTemplate(t, tab)).map(tab => tab.id)]))
      return { league, tabs, fits, ...await readLeagueTabs(league) }
    },
    // Writes name the league the picker was showing, and only that one.
    'stash-tab-choice': async (args) => {
      const league = sameLeague(args)
      const template = args?.template as TabChoice['template']
      if (!league || !(TEMPLATES.includes(template as never) || template === 'custom')) return null
      return await setChoice(league, { template, ids: ids(args?.ids), ...(typeof args?.set === 'string' ? { set: args.set } : {}) })
    },
    'stash-tab-set-save': async (args) => {
      const league = sameLeague(args)
      if (!league || typeof args?.name !== 'string') return null
      return await saveSet(league, args.name, ids(args?.ids))
    },
    'stash-tab-set-delete': async (args) => {
      const league = sameLeague(args)
      if (!league || typeof args?.name !== 'string') return null
      return await deleteSet(league, args.name)
    },
    // The gear the character wears now, for the price check's compare.
    'worn-items': async (args) => {
      const hint = typeof args?.character === 'string' ? args.character.trim() : ''
      return await worn.read(hint).catch((e: Error) => ({ error: e.message }))
    }
  }
  for (const op of READER_OPS) ctx.register(op, ops[op])

  // Quiet read on entering the hideout, from the log watcher that already runs.
  const onLines = (lines: string[]) => {
    if (!entersHideout(lines)) return
    const run = reader.readIfDue()
    run?.then((s: ReaderStatus) => {
      if (s.error && s.error.kind !== 'signed-out') ctx.logger.write(`warn [stash-reader] ${s.error.message}`)
    }).catch(() => {})
  }
  ctx.gameLog.onLines = onLines

  return () => {
    live = false
    for (const op of READER_OPS) ctx.unregister(op)
    if (ctx.gameLog.onLines === onLines) ctx.gameLog.onLines = null
    reader.stop()
  }
}

export function initPersonal (ctx: PersonalContext): PersonalControl {
  const prefs = ctx.prefs ?? { get: appPrefs, set: setAppPrefs }
  const forced = personalFlagOn()
  let stop: (() => void) | null = null
  // One switch at a time, in the order they came.
  let queue: Promise<unknown> = Promise.resolve()

  const state = (): PersonalState => ({ on: stop != null, forced, unlocked: forced || prefs.get().experimental })

  const turnOn = () => {
    if (stop) return
    stop = startReader(ctx)
    ctx.logger.write(`info [personal] stash reader on${forced ? ' (personal.flag)' : ''}.`)
  }
  // Off: no handlers, no hook, and the pathofexile.com login is removed.
  const turnOff = async () => {
    if (!stop) return
    stop()
    stop = null
    closeSignIn()
    await (ctx.signOut ?? removeLoginCookies)().catch(() => {})
    await saveAccount(null).catch(() => {})
    ctx.logger.write('info [personal] stash reader off.')
  }

  const serial = async (fn: () => Promise<void>): Promise<PersonalState> => {
    const next = queue.then(fn, fn)
    queue = next.catch(() => {})
    await next
    return state()
  }

  if (forced || (prefs.get().experimental && prefs.get().stashReader)) turnOn()

  return {
    state,
    setOn: async (on) => await serial(async () => {
      if (forced) return
      // Only from the unlocked row.
      if (on && !prefs.get().experimental) return
      prefs.set({ stashReader: on })
      if (on) turnOn()
      else await turnOff()
    }),
    // Hiding the experimental rows turns what's in them off too.
    setUnlocked: async (unlocked) => await serial(async () => {
      if (forced) return
      if (unlocked) {
        prefs.set({ experimental: true })
        return
      }
      prefs.set({ experimental: false, stashReader: false })
      await turnOff()
    })
  }
}
