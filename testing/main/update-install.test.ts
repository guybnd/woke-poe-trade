// A downloaded update installs by itself only while Path of Exile is closed
// (main/src/woke/update-install.ts), and its errors log with context.
import { describe, it, expect } from 'vitest'
import {
  GAME_CLOSED_GRACE_MS, describeUpdateError, installVerdict, tasklistHasGame, type InstallInputs
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
