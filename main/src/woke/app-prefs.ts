// App-level preferences the main process owns (the overlay owns config.json).
// Small and read once at start.
import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export interface AppPrefs {
  // The setup window has been shown once (finished or closed).
  wizardShown: boolean
  // Download updates in the background and install them on quit.
  autoUpdate: boolean
  // After a crash, offer to report it on the next launch.
  crashPrompt: boolean
  // Settings › Modules shows experimental rows (unlocked by clicking the
  // Economy heading 5 times).
  experimental: boolean
  // The player turned the stash reader on (personal/index.ts). Off by default.
  stashReader: boolean
  // The Claude link (claude-link/index.ts) listens on 127.0.0.1. Off by default.
  claudeLink: boolean
  // Draw the overlay with the graphics card (needs a restart). Off by default:
  // on some systems a GPU-drawn see-through window turned the whole game
  // screen black (upstream issue #818). Drawing without it costs CPU time in
  // proportion to the area that changes, so dragging a big panel on a big
  // screen stutters.
  gpuDrawing: boolean
}

const DEFAULTS: AppPrefs = { wizardShown: false, autoUpdate: true, crashPrompt: true, experimental: false, stashReader: false, claudeLink: false, gpuDrawing: false }

const file = () => path.join(app.getPath('userData'), 'apt-data', 'woke-app.json')

let prefs: AppPrefs | null = null
const listeners: Array<(p: AppPrefs) => void> = []

// Called after every change, wherever it came from (the tray's checkbox
// follows a change made in Settings).
export function onAppPrefsChange (fn: (p: AppPrefs) => void) { listeners.push(fn) }

export function appPrefs (): AppPrefs {
  if (!prefs) {
    try {
      const saved = JSON.parse(fs.readFileSync(file(), 'utf8')) as Record<string, unknown> | null
      prefs = { ...DEFAULTS }
      // Booleans only: a hand-edited "false" string would read as on.
      for (const key of Object.keys(DEFAULTS) as Array<keyof AppPrefs>) {
        if (typeof saved?.[key] === 'boolean') prefs[key] = saved[key] as boolean
      }
    } catch {
      prefs = { ...DEFAULTS }
    }
  }
  return prefs
}

export function setAppPrefs (patch: Partial<AppPrefs>): AppPrefs {
  const next = { ...appPrefs() }
  for (const key of Object.keys(DEFAULTS) as Array<keyof AppPrefs>) {
    if (typeof patch[key] === 'boolean') next[key] = patch[key]
  }
  prefs = next
  for (const fn of listeners) fn(next)
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true })
    fs.writeFileSync(file(), JSON.stringify(next, null, 2))
  } catch {}
  return next
}

// The app can start itself again: not a dev build (its launcher restarts it)
// and not the portable exe (its wrapper deletes the unpacked app on exit).
export function canRestartApp () {
  return app.isPackaged && !process.env.PORTABLE_EXECUTABLE_DIR
}

// With an update downloaded, quitting runs the installer; relaunching on top
// would race it. The updater registers how to install and start again instead.
let installAndRestart: (() => boolean) | null = null
export function onRestartWithUpdate (fn: () => boolean) { installAndRestart = fn }

export function restartApp () {
  if (!canRestartApp()) return
  if (installAndRestart?.()) return
  app.relaunch()
  app.quit()
}
