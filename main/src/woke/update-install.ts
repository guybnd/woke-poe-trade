// woke: when a downloaded update may install by itself. Before, it waited for
// the player to quit, which a tray app rarely sees. Now it also installs once
// Path of Exile has been closed for a few minutes, and never while the game
// runs: installing restarts the overlay.
import { execFile } from 'child_process'

// The game must stay closed this long first: a crash, a relaunch or a patch
// restart brings it back within seconds.
export const GAME_CLOSED_GRACE_MS = 3 * 60_000
// How often a waiting update looks again.
export const RECHECK_MS = 5 * 60_000

export interface InstallInputs {
  // An update has downloaded and waits to install.
  updateReady: boolean
  // The player's "Install updates automatically" switch.
  autoUpdate: boolean
  // A packaged, installed build (not dev, not portable).
  canRestart: boolean
  // An install has already started.
  installing: boolean
  // The game's process: true, false, or null when Windows couldn't tell us.
  gameRunning: boolean | null
  // Last time the game was seen running (or when watching started).
  gameSeenAt: number
  // One of the app's windows has keyboard focus: the player is using it.
  appFocused: boolean
  now: number
}

export type InstallVerdict =
  | 'install'
  | 'no-update'
  | 'auto-update-off'
  | 'cant-restart'
  | 'installing'
  | 'game-running'
  | 'game-unknown'
  | 'game-just-closed'
  | 'app-in-use'

export function installVerdict (i: InstallInputs): InstallVerdict {
  if (!i.updateReady) return 'no-update'
  if (i.installing) return 'installing'
  if (!i.autoUpdate) return 'auto-update-off'
  if (!i.canRestart) return 'cant-restart'
  if (i.gameRunning === true) return 'game-running'
  // Not knowing is treated as running: restarting over the game is the one
  // thing this must never do.
  if (i.gameRunning === null) return 'game-unknown'
  if (i.now - i.gameSeenAt < GAME_CLOSED_GRACE_MS) return 'game-just-closed'
  if (i.appFocused) return 'app-in-use'
  return 'install'
}

// For the log: why a waiting update didn't install this time.
export const VERDICT_TEXT: Record<InstallVerdict, string> = {
  install: 'Path of Exile is closed, installing now',
  'no-update': 'no update downloaded',
  'auto-update-off': 'automatic updates are off, installs on quit',
  'cant-restart': 'this build can\'t restart itself (dev or portable), installs on quit',
  installing: 'already installing',
  'game-running': 'Path of Exile is running, waiting for it to close',
  'game-unknown': 'couldn\'t tell if Path of Exile is running, waiting',
  'game-just-closed': 'Path of Exile closed less than 3 minutes ago, waiting',
  'app-in-use': 'an overlay window is in use, waiting'
}

// `tasklist /FO CSV /NH` prints one quoted row per process, or a localized
// "no tasks" line. Covers PathOfExile.exe, PathOfExile_x64.exe,
// PathOfExileSteam.exe, PathOfExile_x64Steam.exe, PathOfExile_KG.exe and so on.
export function tasklistHasGame (stdout: string): boolean {
  return /^"pathofexile[^"]*\.exe"/im.test(stdout)
}

// Whether the game runs, without PowerShell (antivirus tools flag scripted
// PowerShell). null when the check failed or isn't possible here.
export function isGameRunning (): Promise<boolean | null> {
  if (process.platform !== 'win32') return Promise.resolve(null)
  return new Promise((resolve) => {
    execFile('tasklist', ['/FI', 'IMAGENAME eq PathOfExile*', '/FO', 'CSV', '/NH'],
      { windowsHide: true, timeout: 10_000 }, (err, stdout) => {
        resolve(err ? null : tasklistHasGame(stdout))
      })
  })
}

// One log line for an updater error, with what it was doing and the codes
// electron-updater and Node attach (HTTP status, system error code).
export function describeUpdateError (err: unknown, stage: string, current: string, target: string | null): string {
  const e = (err ?? {}) as { message?: unknown, code?: unknown, statusCode?: unknown, errno?: unknown }
  const message = typeof e.message === 'string' && e.message ? e.message : String(err)
  const codes = [
    e.statusCode != null ? `HTTP ${String(e.statusCode)}` : null,
    typeof e.code === 'string' || typeof e.code === 'number' ? `code ${String(e.code)}` : null
  ].filter(Boolean)
  const versions = target ? `${current} -> ${target}` : current
  // The first line only: the stack follows on electron-updater's own line.
  const first = message.split('\n')[0].trim()
  return `Update failed while ${stage} (${versions})${codes.length ? ` [${codes.join(', ')}]` : ''}: ${first}`
}
