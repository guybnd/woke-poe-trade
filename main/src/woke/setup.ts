// First-run setup window: a normal window (not the overlay) that opens by
// itself the first time, so a new player is guided before the game is even
// running. It loads the same page as the overlay with #setup.
import { app, BrowserWindow, dialog, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import type { AppUpdater } from '../AppUpdater'
import { appIconFile } from './app-icon'
import { appPrefs, setAppPrefs } from './app-prefs'
import type { AppPrefs } from './app-prefs'
import { findGameLogs } from './game-log-finder'
import { migration } from './user-data'
import { registerWokeHandler } from './index'
import { dismissCrashes, noteRendererError, openCrashFolder, openReport, pendingCrash } from './crash-reports'
import { openWebLink } from './web-guard'

let win: BrowserWindow | null = null
let port = 0

function pageUrl () {
  const base = process.env.VITE_DEV_SERVER_URL || `http://localhost:${port}/index.html`
  return `${base}#setup`
}

export function refreshSetupIcon () {
  if (process.platform !== 'darwin' && win && !win.isDestroyed()) win.setIcon(appIconFile('png'))
}

export function openSetupWindow () {
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore()
    win.focus()
    return
  }
  win = new BrowserWindow({
    title: 'Woke PoE Trade · Setup',
    icon: appIconFile('png'),
    width: 820,
    height: 600,
    minWidth: 640,
    minHeight: 480,
    show: false,
    backgroundColor: '#17171b',
    autoHideMenuBar: true,
    webPreferences: { spellcheck: false }
  })
  win.setMenu(null)
  win.webContents.setWindowOpenHandler((details) => {
    openWebLink((url) => shell.openExternal(url), details.url)
    return { action: 'deny' }
  })
  // Keep our title, not the page's.
  win.on('page-title-updated', (e) => e.preventDefault())
  win.once('ready-to-show', () => win?.show())
  win.on('closed', () => { win = null })
  win.loadURL(pageUrl())
  setAppPrefs({ wizardShown: true })
}

// Toolkit setup already done means an existing player: no window.
function configSaysSetupDone (): boolean {
  try {
    const raw = fs.readFileSync(path.join(app.getPath('userData'), 'apt-data', 'config.json'), 'utf8')
    return (JSON.parse(raw) as { woke?: { setupDone?: boolean } }).woke?.setupDone === true
  } catch {
    return false
  }
}

// Read before the overlay loads, so the tray opens on the saved pick.
export function savedAppIcon (): unknown {
  try {
    const raw = fs.readFileSync(path.join(app.getPath('userData'), 'apt-data', 'config.json'), 'utf8')
    return (JSON.parse(raw) as { appIcon?: unknown }).appIcon
  } catch {
    return undefined
  }
}

function canStartWithWindows () {
  return app.isPackaged && process.platform === 'win32' && !process.env.PORTABLE_EXECUTABLE_DIR
}

function prefsView () {
  return {
    ...appPrefs(),
    openAtLogin: canStartWithWindows() ? app.getLoginItemSettings().openAtLogin : false,
    canOpenAtLogin: canStartWithWindows(),
    canAutoUpdate: app.isPackaged && !process.env.PORTABLE_EXECUTABLE_DIR,
    version: app.getVersion(),
    platform: process.platform,
    migration
  }
}

export function initSetup (appUpdater: AppUpdater) {
  registerWokeHandler('setup-game-logs', async () => await findGameLogs())
  registerWokeHandler('setup-browse-log', async () => {
    const opts: Electron.OpenDialogOptions = {
      title: 'Find Client.txt (in the game folder, under logs)',
      properties: ['openFile'],
      filters: [{ name: 'Client.txt', extensions: ['txt'] }]
    }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    return res.canceled ? null : res.filePaths[0] ?? null
  })
  registerWokeHandler('setup-prefs', async () => prefsView())
  registerWokeHandler('setup-prefs-set', async (patch: Partial<AppPrefs> & { openAtLogin?: boolean }) => {
    // The stash reader switches only through personal-set, which starts and
    // stops it too.
    const { experimental: _e, stashReader: _s, ...rest } = patch ?? {}
    setAppPrefs(rest)
    if (typeof patch.autoUpdate === 'boolean') appUpdater.setAutoDownload(patch.autoUpdate)
    if (typeof patch.openAtLogin === 'boolean' && canStartWithWindows()) {
      app.setLoginItemSettings({ openAtLogin: patch.openAtLogin })
    }
    return prefsView()
  })
  registerWokeHandler('setup-open', async () => { openSetupWindow(); return true })
  registerWokeHandler('setup-finish', async () => {
    setAppPrefs({ wizardShown: true })
    // Let the reply reach the page before it goes away.
    setTimeout(() => { if (win && !win.isDestroyed()) win.close() }, 50)
    return true
  })

  registerWokeHandler('crash-pending', async () => pendingCrash())
  registerWokeHandler('crash-dismiss', async () => { dismissCrashes(); return true })
  registerWokeHandler('crash-report', async (args: { id?: string | null, context?: string }) => {
    await openReport(args?.id ?? null, args?.context)
    return true
  })
  registerWokeHandler('crash-folder', async () => { await openCrashFolder(); return true })
  registerWokeHandler('renderer-error', async (args: { text: string }) => {
    if (typeof args?.text === 'string') noteRendererError(args.text)
    return true
  })
}

// Once the page server is up.
export function maybeOpenSetup (serverPort: number) {
  port = serverPort
  const forced = process.argv.includes('--setup')
  if (forced || (!appPrefs().wizardShown && !configSaysSetupDone())) {
    openSetupWindow()
  }
}
