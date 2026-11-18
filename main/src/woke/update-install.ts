// woke: when a downloaded update may install by itself. Before, it waited for
// the player to quit, which a tray app rarely sees. Now it also installs once
// Path of Exile has been closed for a few minutes, and never while the game
// runs: installing restarts the overlay.
import { execFile } from 'child_process'
import fs from 'fs'

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

// Just before an automatic install: the game must still be closed by both
// process checks, and its window must not have come back in between.
export function stillClosed (first: boolean | null, second: boolean | null, attached: boolean): boolean {
  return first === false && second === false && !attached
}

// Why the downloaded installer can't run, or null when it can: antivirus may
// have quarantined it, or something may hold it locked. Checked before an
// automatic install, since electron-updater quits the app even when the
// installer then fails to start.
export function installerProblem (file: string | null | undefined): string | null {
  if (!file) return 'no installer path'
  let fd: number | undefined
  try {
    fd = fs.openSync(file, 'r')
    const size = fs.fstatSync(fd).size
    if (size === 0) return `installer is empty: ${file}`
    fs.readSync(fd, Buffer.alloc(1), 0, 1, 0)
    return null
  } catch (e) {
    const code = (e as { code?: unknown }).code
    return `can't read the installer${typeof code === 'string' ? ` (${code})` : ''}: ${file}`
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd) } catch {}
  }
}

// What a later updater event does to a downloaded update waiting to install.
// A failed or repeated check (offline, GitHub down) mustn't hide it: it stays
// installable from Restart now, on quit and once the game is closed. A newer
// version (which replaces the cached installer), a successful check that finds
// nothing (the release was pulled) or a failed install drops it.
export type UpdaterEvent =
  | { type: 'checking' }
  | { type: 'not-available' }
  | { type: 'available', version: string }
  | { type: 'error', installing: boolean }

export function afterEvent (downloaded: string | null, ev: UpdaterEvent): { show: boolean, downloaded: string | null } {
  if (!downloaded) return { show: true, downloaded: null }
  switch (ev.type) {
    case 'checking':
      return { show: false, downloaded }
    case 'not-available':
      return { show: true, downloaded: null }
    case 'available':
      return ev.version === downloaded ? { show: false, downloaded } : { show: true, downloaded: null }
    case 'error':
      return ev.installing ? { show: true, downloaded: null } : { show: false, downloaded }
  }
}

// Passed to the relaunched app after an installer failed to start, so it
// doesn't try the same automatic install again (and loop). It still installs
// on quit, and from Restart now.
export const NO_AUTO_INSTALL_ARG = '--woke-no-auto-install'

// The arguments for starting the app again: never the flag above, so it lasts
// one run only.
export function relaunchArgs (argv: string[], noAutoInstall: boolean): string[] {
  const args = argv.slice(1).filter(a => a !== NO_AUTO_INSTALL_ARG)
  return noAutoInstall ? [...args, NO_AUTO_INSTALL_ARG] : args
}

// An updater error is an install failure only when starting a program failed
// (the installer, or elevate.exe retrying it). A feed or download error that
// lands while the app waits to quit is not one.
export function isSpawnFailure (err: unknown, installerPath: string | null | undefined): boolean {
  const e = (err ?? {}) as { syscall?: unknown, path?: unknown }
  if (typeof e.syscall === 'string' && e.syscall.startsWith('spawn')) return true
  return installerPath != null && e.path === installerPath
}

// electron-updater handles some failed installer starts itself and sends no
// error event, only this log line. ENOENT: it then tries shell.openPath on the
// missing file, which fails silently, so the installer never runs. EACCES and
// UNKNOWN: it retries through elevate.exe; a failed retry arrives as a spawn
// error, a successful one runs the installer, so these lines aren't failures.
export function installerLogFailure (message: string): boolean {
  const m = /^Cannot run installer: error code: (\S+?),/.exec(message)
  return m != null && m[1] === 'ENOENT'
}

// electron-updater's install-on-quit: only with an update downloaded, never
// while a rollback is downloading, waiting or installing (its own installer
// runs; two at once would fight), and never on a plain restart (the new copy
// would start under the installer).
// Whether an install may start now. Nothing once the app is restarting or
// quitting (an install under way, a plain restart, a relaunch after a failed
// installer). The update never while a rollback is under way: the rollback's
// installer would run beside it, or the bad version would come back.
export function installGate (i: { job: 'update' | 'rollback', restarting: boolean, plainRestart: boolean, rollbackActive: boolean }): boolean {
  if (i.restarting || i.plainRestart) return false
  return i.job === 'rollback' || !i.rollbackActive
}

export function quitInstallAllowed (i: { downloaded: boolean, rollbackActive: boolean, plainRestart: boolean }): boolean {
  return i.downloaded && !i.rollbackActive && !i.plainRestart
}
