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
}

const DEFAULTS: AppPrefs = { wizardShown: false, autoUpdate: true, crashPrompt: true, experimental: false, stashReader: false }

const file = () => path.join(app.getPath('userData'), 'apt-data', 'woke-app.json')

let prefs: AppPrefs | null = null

export function appPrefs (): AppPrefs {
  if (!prefs) {
    try {
      prefs = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file(), 'utf8')) as Partial<AppPrefs> }
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
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true })
    fs.writeFileSync(file(), JSON.stringify(next, null, 2))
  } catch {}
  return next
}
