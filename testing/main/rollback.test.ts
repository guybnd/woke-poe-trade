// Going back to the previous release (main/src/woke/rollback.ts): which
// version, which installer and hash, what stays skipped, and when the
// "Updated to X" note shows. The install guards it shares with updates are in
// update-install.test.ts.
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, it, expect } from 'vitest'
import {
  compareVersions, droppedRollback, fileSha512, installerUrl, isSkipped, noteToShow, parseLatestYml, parseVersion,
  previousVersion, skipAfterRollback, skipStillNeeded, trayEntry, ymlProblem
} from '../../main/src/woke/rollback'
import type { WokeRollbackState } from '../../ipc/woke-ops'

const rel = (tag: string, extra: { draft?: boolean, prerelease?: boolean } = {}) =>
  ({ tag_name: tag, draft: false, prerelease: false, ...extra })

describe('versions', () => {
  it('parses major.league.patch, with or without the tag v', () => {
    expect(parseVersion('1.330.9')).toEqual([1, 330, 9])
    expect(parseVersion('v1.330.10')).toEqual([1, 330, 10])
    expect(parseVersion('1.330.9-beta.1')).toBeNull()
    expect(parseVersion('0.0.0-test')).toBeNull()
  })

  it('compares by number, not text', () => {
    expect(compareVersions('1.330.10', '1.330.9')).toBeGreaterThan(0)
    expect(compareVersions('0.4.3', '1.330.0')).toBeLessThan(0)
    expect(compareVersions('1.330.9', 'v1.330.9')).toBe(0)
  })
})

describe('previousVersion', () => {
  it('picks the newest published release older than the running one', () => {
    const list = [rel('v1.330.10'), rel('v1.330.9'), rel('v1.330.7'), rel('v1.330.8'), rel('v0.4.3')]
    expect(previousVersion('1.330.9', list)).toBe('1.330.8')
    expect(previousVersion('1.330.10', list)).toBe('1.330.9')
  })

  it('leaves out drafts, prereleases and odd tags', () => {
    const list = [rel('v1.330.8', { draft: true }), rel('v1.330.7', { prerelease: true }), rel('nightly'), { tag_name: 5 }, rel('v1.330.6')]
    expect(previousVersion('1.330.9', list)).toBe('1.330.6')
  })

  it('never picks the version automatic updates skip', () => {
    const list = [rel('v1.330.9'), rel('v1.330.8'), rel('v1.330.7')]
    expect(previousVersion('1.330.10', list, '1.330.9')).toBe('1.330.8')
    expect(previousVersion('1.330.9', list, '1.330.11')).toBe('1.330.8')
  })

  it('has nothing to offer for the oldest release or a dev version', () => {
    expect(previousVersion('1.330.0', [rel('v1.330.0'), rel('v1.330.1')])).toBeNull()
    expect(previousVersion('0.0.0-test', [rel('v1.330.0')])).toBeNull()
    expect(previousVersion('1.330.9', [])).toBeNull()
  })
})

// The real 1.330.8 release's latest.yml.
const YML_8 = `version: 1.330.8
files:
  - url: Woke-PoE-Trade-Setup-1.330.8.exe
    sha512: 5j6uzQCztyKSpTdK80af5+veceSm51l8cwOldzIhde8mpY5KuFMWfbhjV/p3UmECuobglWYXoHgDUxJhj90ohQ==
    size: 125745886
path: Woke-PoE-Trade-Setup-1.330.8.exe
sha512: 5j6uzQCztyKSpTdK80af5+veceSm51l8cwOldzIhde8mpY5KuFMWfbhjV/p3UmECuobglWYXoHgDUxJhj90ohQ==
releaseDate: '2026-11-16T06:36:34.839Z'
`

describe('latest.yml', () => {
  it('reads the installer, its SHA-512 and size', () => {
    expect(parseLatestYml(YML_8)).toEqual({
      version: '1.330.8',
      file: 'Woke-PoE-Trade-Setup-1.330.8.exe',
      sha512: '5j6uzQCztyKSpTdK80af5+veceSm51l8cwOldzIhde8mpY5KuFMWfbhjV/p3UmECuobglWYXoHgDUxJhj90ohQ==',
      size: 125745886
    })
    expect(parseLatestYml(YML_8.replace(/\n/g, '\r\n'))?.size).toBe(125745886)
  })

  it('takes the top-level hash, not another file\'s', () => {
    const two = YML_8.replace('files:\n', 'files:\n  - url: other.exe\n    sha512: AAAA\n    size: 1\n')
    const yml = parseLatestYml(two)
    expect(yml?.sha512.startsWith('5j6uz')).toBe(true)
    expect(yml?.size).toBe(125745886)
  })

  it('accepts only a matching release with a Setup installer and a full hash', () => {
    expect(ymlProblem(parseLatestYml(YML_8), '1.330.8')).toBeNull()
    expect(ymlProblem(parseLatestYml(YML_8), '1.330.7')).toBe('latest.yml is for 1.330.8, not 1.330.7')
    expect(ymlProblem(parseLatestYml(YML_8.replace(/Woke-PoE-Trade-Setup-1\.330\.8\.exe/g, '../evil.exe')), '1.330.8')).toBe('unexpected installer name ../evil.exe')
    expect(ymlProblem(parseLatestYml(YML_8.replace(/Woke-PoE-Trade-Setup-1\.330\.8\.exe/g, 'Woke-PoE-Trade-1.330.8-portable.exe')), '1.330.8')).toMatch(/unexpected installer name/)
    expect(ymlProblem(parseLatestYml(YML_8.replace(/^sha512: .*$/m, 'sha512: short')), '1.330.8')).toBe('latest.yml has no SHA-512')
    expect(ymlProblem(parseLatestYml('nothing here'), '1.330.8')).toBe('the release has no readable latest.yml')
  })

  it('points at the release download', () => {
    expect(installerUrl('1.330.8', 'Woke-PoE-Trade-Setup-1.330.8.exe'))
      .toBe('https://github.com/guybnd/woke-poe-trade/releases/download/v1.330.8/Woke-PoE-Trade-Setup-1.330.8.exe')
  })

  it('hashes a file the way latest.yml writes it (base64 SHA-512)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-rollback-'))
    const file = path.join(dir, 'Setup.exe')
    const bytes = crypto.randomBytes(300_000)
    fs.writeFileSync(file, bytes)
    expect(await fileSha512(file)).toBe(crypto.createHash('sha512').update(bytes).digest('base64'))
  })
})

describe('skip-version rule', () => {
  it('skips the version gone back from and anything older', () => {
    expect(isSkipped('1.330.9', '1.330.9')).toBe(true)
    expect(isSkipped('1.330.8', '1.330.9')).toBe(true)
  })

  it('lets newer versions install as usual', () => {
    expect(isSkipped('1.330.10', '1.330.9')).toBe(false)
    expect(isSkipped('1.331.0', '1.330.9')).toBe(false)
  })

  it('skips nothing without a skip, or for a version it can\'t read', () => {
    expect(isSkipped('1.330.9', null)).toBe(false)
    expect(isSkipped('weird', '1.330.9')).toBe(false)
  })

  it('ends once the app runs the skipped version or newer', () => {
    expect(skipStillNeeded('1.330.8', '1.330.9')).toBe(true)
    expect(skipStillNeeded('1.330.9', '1.330.9')).toBe(false)
    expect(skipStillNeeded('1.330.10', '1.330.9')).toBe(false)
    expect(skipStillNeeded('1.330.8', null)).toBe(false)
  })
})

describe('"Updated to X" note', () => {
  it('shows once the installed version runs', () => {
    expect(noteToShow({ version: '1.330.10' }, '1.330.10')).toBe('1.330.10')
  })

  it('stays quiet after a failed install or with no note', () => {
    expect(noteToShow({ version: '1.330.10' }, '1.330.9')).toBeNull()
    expect(noteToShow(null, '1.330.9')).toBeNull()
    expect(noteToShow({ version: 7 }, '1.330.9')).toBeNull()
  })
})

describe('tray entry', () => {
  const state = (patch: Partial<WokeRollbackState> = {}): WokeRollbackState => ({
    offered: true, current: '1.330.9', previous: '1.330.8', phase: 'idle', target: null, progress: null, error: null, skip: null, ...patch
  })

  it('offers going back to the previous release', () => {
    expect(trayEntry(state())).toEqual({ label: 'Go back to 1.330.8', action: 'start' })
    expect(trayEntry(state({ phase: 'failed', target: '1.330.8' }))).toEqual({ label: 'Go back to 1.330.8', action: 'start' })
  })

  it('offers stopping while downloading or waiting for the game to close', () => {
    expect(trayEntry(state({ phase: 'downloading', target: '1.330.8' }))).toEqual({ label: 'Stop going back to 1.330.8', action: 'cancel' })
    expect(trayEntry(state({ phase: 'ready', target: '1.330.8' }))).toEqual({ label: 'Stop going back to 1.330.8', action: 'cancel' })
  })

  it('hides for portable and dev builds, while installing, and with no earlier release', () => {
    expect(trayEntry(state({ offered: false }))).toBeNull()
    expect(trayEntry(state({ phase: 'installing', target: '1.330.8' }))).toBeNull()
    expect(trayEntry(state({ previous: null }))).toBeNull()
  })
})

describe('skip after going back', () => {
  it('skips the running version on a first rollback', () => {
    expect(skipAfterRollback(null, '1.330.9')).toBe('1.330.9')
  })

  it('keeps the first bad version skipped when going back twice', () => {
    // 1.330.9 was bad: back to 1.330.8 (skip 9), then back again to 1.330.7.
    expect(skipAfterRollback('1.330.9', '1.330.8')).toBe('1.330.9')
  })

  it('moves the skip up when the running version is newer', () => {
    expect(skipAfterRollback('1.330.8', '1.330.10')).toBe('1.330.10')
    expect(skipAfterRollback('junk', '1.330.10')).toBe('1.330.10')
  })
})

describe('leftover rollback installer at start', () => {
  it('is the version now running after a rollback that installed: no log', () => {
    expect(droppedRollback('Woke-PoE-Trade-Setup-1.330.8.exe', '1.330.8')).toBe(false)
  })

  it('is a dropped rollback when another version runs', () => {
    expect(droppedRollback('Woke-PoE-Trade-Setup-1.330.8.exe', '1.330.9')).toBe(true)
  })

  it('ignores other files', () => {
    expect(droppedRollback('Woke-PoE-Trade-Setup-1.330.8.exe.part', '1.330.9')).toBe(false)
  })
})
