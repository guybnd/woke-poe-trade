// A downloaded update installs by itself only while Path of Exile is closed
// (main/src/woke/update-install.ts), and its errors log with context.
import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, it, expect } from 'vitest'
import {
  GAME_CLOSED_GRACE_MS, NO_AUTO_INSTALL_ARG, afterEvent, describeUpdateError, installVerdict, installerLogFailure,
  installGate, installerProblem, isSpawnFailure, quitInstallAllowed, relaunchArgs, stillClosed, tasklistHasGame, type InstallInputs
} from '../../main/src/woke/update-install'

const NOW = 1_000_000_000

function inputs (patch: Partial<InstallInputs> = {}): InstallInputs {
  return {
    updateReady: true,
    autoUpdate: true,
    canRestart: true,
    installing: false,
    gameRunning: false,
    gameSeenAt: NOW - GAME_CLOSED_GRACE_MS - 1,
    appFocused: false,
    now: NOW,
    ...patch
  }
}

describe('installVerdict', () => {
  it('installs when an update is ready and the game has been closed a while', () => {
    expect(installVerdict(inputs())).toBe('install')
  })

  it('never installs while the game runs', () => {
    expect(installVerdict(inputs({ gameRunning: true }))).toBe('game-running')
  })

  it('treats a failed process check as running', () => {
    expect(installVerdict(inputs({ gameRunning: null }))).toBe('game-unknown')
  })

  it('waits out the grace period after the game closes', () => {
    expect(installVerdict(inputs({ gameSeenAt: NOW - 1000 }))).toBe('game-just-closed')
    expect(installVerdict(inputs({ gameSeenAt: NOW - GAME_CLOSED_GRACE_MS }))).toBe('install')
  })

  it('does nothing without a downloaded update', () => {
    expect(installVerdict(inputs({ updateReady: false }))).toBe('no-update')
    expect(installVerdict(inputs({ updateReady: false, gameRunning: true }))).toBe('no-update')
  })

  it('waits while a window of the app has focus', () => {
    expect(installVerdict(inputs({ appFocused: true }))).toBe('app-in-use')
  })

  it('leaves dev and portable builds, and automatic updates off, to install on quit', () => {
    expect(installVerdict(inputs({ canRestart: false }))).toBe('cant-restart')
    expect(installVerdict(inputs({ autoUpdate: false }))).toBe('auto-update-off')
  })

  it('starts the installer only once', () => {
    expect(installVerdict(inputs({ installing: true }))).toBe('installing')
  })
})

describe('tasklistHasGame', () => {
  it('finds every game executable', () => {
    for (const exe of ['PathOfExile.exe', 'PathOfExile_x64.exe', 'PathOfExileSteam.exe', 'PathOfExile_x64Steam.exe', 'PathOfExile_KG.exe']) {
      expect(tasklistHasGame(`"${exe}","40828","Console","1","8,927,300 K"\r\n`)).toBe(true)
    }
  })

  it('reads the localized "no tasks" line as not running', () => {
    expect(tasklistHasGame('INFO: No tasks are running which match the specified criteria.\r\n')).toBe(false)
    expect(tasklistHasGame('INFORMATION: Es werden keine Tasks mit den angegebenen Kriterien ausgeführt.\r\n')).toBe(false)
    expect(tasklistHasGame('')).toBe(false)
  })

  it('ignores other programs with the name inside', () => {
    expect(tasklistHasGame('"PathOfExileHelper-notes.txt.lnk","1","Console","1","1 K"')).toBe(false)
    expect(tasklistHasGame('"MyPathOfExile.exe","1","Console","1","1 K"')).toBe(false)
  })
})

describe('describeUpdateError', () => {
  it('names the stage, versions and HTTP status', () => {
    const err = Object.assign(new Error('Cannot find latest.yml in the latest release artifacts\nmore detail'), { statusCode: 404, code: 'ERR_UPDATER_CHANNEL_FILE_NOT_FOUND' })
    expect(describeUpdateError(err, 'checking for updates', '1.330.9', null))
      .toBe('Update failed while checking for updates (1.330.9) [HTTP 404, code ERR_UPDATER_CHANNEL_FILE_NOT_FOUND]: Cannot find latest.yml in the latest release artifacts')
  })

  it('shows the target version and a system error code', () => {
    const err = Object.assign(new Error('spawn EACCES'), { code: 'EACCES' })
    expect(describeUpdateError(err, 'installing', '1.330.9', '1.330.10'))
      .toBe('Update failed while installing (1.330.9 -> 1.330.10) [code EACCES]: spawn EACCES')
  })

  it('copes with a thrown string or nothing', () => {
    expect(describeUpdateError('offline', 'downloading', '1.0.0', '1.0.1')).toBe('Update failed while downloading (1.0.0 -> 1.0.1): offline')
    expect(describeUpdateError(undefined, 'downloading', '1.0.0', null)).toBe('Update failed while downloading (1.0.0): undefined')
  })
})

describe('stillClosed', () => {
  it('installs only when both checks say closed and the window is gone', () => {
    expect(stillClosed(false, false, false)).toBe(true)
    expect(stillClosed(false, true, false)).toBe(false)
    expect(stillClosed(false, null, false)).toBe(false)
    expect(stillClosed(true, false, false)).toBe(false)
    expect(stillClosed(null, false, false)).toBe(false)
    expect(stillClosed(false, false, true)).toBe(false)
  })
})

describe('installerProblem', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-installer-'))

  it('accepts a readable installer', () => {
    const file = path.join(dir, 'Woke-PoE-Trade-Setup-1.330.10.exe')
    fs.writeFileSync(file, 'MZ')
    expect(installerProblem(file)).toBeNull()
  })

  it('names a missing installer with its path, as after a quarantine', () => {
    const file = path.join(dir, 'gone.exe')
    expect(installerProblem(file)).toBe(`can't read the installer (ENOENT): ${file}`)
  })

  it('refuses an empty file or no path', () => {
    const file = path.join(dir, 'empty.exe')
    fs.writeFileSync(file, '')
    expect(installerProblem(file)).toBe(`installer is empty: ${file}`)
    expect(installerProblem(null)).toBe('no installer path')
    expect(installerProblem(undefined)).toBe('no installer path')
  })
})

describe('afterEvent', () => {
  it('keeps a downloaded update through later checks and failed checks', () => {
    for (const ev of [{ type: 'checking' }, { type: 'error', installing: false }, { type: 'available', version: '1.330.10' }] as const) {
      expect(afterEvent('1.330.10', ev)).toEqual({ show: false, downloaded: '1.330.10' })
    }
  })

  it('drops it for a newer version, a pulled release or a failed install', () => {
    expect(afterEvent('1.330.10', { type: 'not-available' })).toEqual({ show: true, downloaded: null })
    expect(afterEvent('1.330.10', { type: 'available', version: '1.330.11' })).toEqual({ show: true, downloaded: null })
    expect(afterEvent('1.330.10', { type: 'error', installing: true })).toEqual({ show: true, downloaded: null })
  })

  it('shows every event when nothing is downloaded', () => {
    expect(afterEvent(null, { type: 'error', installing: false })).toEqual({ show: true, downloaded: null })
    expect(afterEvent(null, { type: 'checking' })).toEqual({ show: true, downloaded: null })
  })
})

describe('relaunchArgs', () => {
  const argv = ['C:\\app\\Woke PoE Trade.exe', '--no-updates']

  it('adds the one-run flag only when asked', () => {
    expect(relaunchArgs(argv, true)).toEqual(['--no-updates', NO_AUTO_INSTALL_ARG])
    expect(relaunchArgs(argv, false)).toEqual(['--no-updates'])
  })

  it('never carries the flag on into a later restart', () => {
    expect(relaunchArgs([...argv, NO_AUTO_INSTALL_ARG], false)).toEqual(['--no-updates'])
    expect(relaunchArgs([...argv, NO_AUTO_INSTALL_ARG], true)).toEqual(['--no-updates', NO_AUTO_INSTALL_ARG])
  })
})

describe('isSpawnFailure', () => {
  const installer = 'C:\\Users\\x\\AppData\\Local\\woke-poe-trade-updater\\pending\\Setup.exe'

  it('counts failed starts of the installer or elevate.exe', () => {
    expect(isSpawnFailure(Object.assign(new Error('spawn EPERM'), { syscall: 'spawn', path: installer }), installer)).toBe(true)
    expect(isSpawnFailure(Object.assign(new Error('spawn elevate.exe ENOENT'), { syscall: 'spawn elevate.exe', path: 'elevate.exe' }), installer)).toBe(true)
    expect(isSpawnFailure({ path: installer }, installer)).toBe(true)
  })

  it('ignores feed and download errors that land while quitting', () => {
    expect(isSpawnFailure(Object.assign(new Error('net::ERR_INTERNET_DISCONNECTED'), { code: 'ERR_INTERNET_DISCONNECTED' }), installer)).toBe(false)
    expect(isSpawnFailure(Object.assign(new Error('HttpError: 503'), { statusCode: 503 }), installer)).toBe(false)
    expect(isSpawnFailure(undefined, installer)).toBe(false)
    expect(isSpawnFailure({ path: 'other' }, null)).toBe(false)
  })
})

describe('installerLogFailure', () => {
  const line = (code: string) => `Cannot run installer: error code: ${code}, error message: "spawn x ${code}", will be executed again using elevate if EACCES, and will try to use electron.shell.openItem if ENOENT`

  it('treats a missing installer as failed', () => {
    expect(installerLogFailure(line('ENOENT'))).toBe(true)
  })

  it('leaves the elevate.exe retry to its own spawn error', () => {
    expect(installerLogFailure(line('EACCES'))).toBe(false)
    expect(installerLogFailure(line('UNKNOWN'))).toBe(false)
  })

  it('ignores other log lines', () => {
    expect(installerLogFailure('Install: isSilent: true, isForceRunAfter: true')).toBe(false)
    expect(installerLogFailure('Executing: C:\\x\\Setup.exe with args: --updated,/S')).toBe(false)
  })
})

describe('quitInstallAllowed', () => {
  it('installs a downloaded update on quit', () => {
    expect(quitInstallAllowed({ downloaded: true, rollbackActive: false, plainRestart: false })).toBe(true)
  })

  it('never while a rollback is under way: two installers would run at once', () => {
    expect(quitInstallAllowed({ downloaded: true, rollbackActive: true, plainRestart: false })).toBe(false)
  })

  it('never on a plain restart, or with nothing downloaded', () => {
    expect(quitInstallAllowed({ downloaded: true, rollbackActive: false, plainRestart: true })).toBe(false)
    expect(quitInstallAllowed({ downloaded: false, rollbackActive: false, plainRestart: false })).toBe(false)
  })
})

describe('installGate', () => {
  const gate = (patch: Partial<Parameters<typeof installGate>[0]>) =>
    installGate({ job: 'update', restarting: false, plainRestart: false, rollbackActive: false, ...patch })

  it('lets an update or a rollback install when nothing else is going on', () => {
    expect(gate({})).toBe(true)
    expect(gate({ job: 'rollback', rollbackActive: true })).toBe(true)
  })

  it('refuses the update (Restart now, Install now, game closed) while going back', () => {
    expect(gate({ rollbackActive: true })).toBe(false)
  })

  it('starts nothing once the app is restarting or on a plain restart', () => {
    expect(gate({ restarting: true })).toBe(false)
    expect(gate({ plainRestart: true })).toBe(false)
    expect(gate({ job: 'rollback', rollbackActive: true, restarting: true })).toBe(false)
    expect(gate({ job: 'rollback', rollbackActive: true, plainRestart: true })).toBe(false)
  })
})
