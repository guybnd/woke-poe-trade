// The updater's wiring (main/src/AppUpdater.ts): what electron-updater's
// events show in the overlay, and when an install starts. The decisions
// themselves are in update-install.test.ts and rollback.test.ts; the fake
// game replaces the updater, so nothing else covers this glue.
import fs from 'fs'
import os from 'os'
import path from 'path'
import { EventEmitter } from 'events'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const h = vi.hoisted(() => ({
  restartHook: null as null | (() => boolean),
  skipped: null as string | null
}))

// main's own copy: testing/ has no electron-updater to resolve by name.
vi.mock('../../main/node_modules/electron-updater/out/main.js', async () => {
  const { EventEmitter } = await import('events')
  const autoUpdater = Object.assign(new EventEmitter(), {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    logger: null as unknown,
    installerPath: null as string | null,
    quitAndInstallCalled: false,
    checkForUpdates: async () => null,
    downloadUpdate: async () => [] as string[],
    quitAndInstall (_silent: boolean, _runAfter: boolean) { this.quitAndInstallCalled = true }
  })
  return { autoUpdater }
})
vi.mock('electron', async (orig) => {
  const real = await orig<Record<string, unknown>>()
  return { ...real, BrowserWindow: { getFocusedWindow: () => null } }
})
vi.mock('../../main/src/woke/app-prefs', () => ({
  appPrefs: () => ({ autoUpdate: true }),
  canRestartApp: () => true,
  onRestartWithUpdate: (fn: () => boolean) => { h.restartHook = fn }
}))
vi.mock('../../main/src/woke/rollback', async (orig) => {
  const real = await orig<typeof import('../../main/src/woke/rollback')>()
  class Rollback {
    active = false
    readyFile = null
    state = { phase: 'idle' }
    get skipped () { return h.skipped }
    async refresh () {}
    async install () { return false }
  }
  return {
    ...real,
    Rollback,
    writeUpdateNote: () => {},
    clearUpdateNote: () => {},
    takeUpdateNote: () => null
  }
})
// The game is "running", so nothing installs by itself while a test runs.
vi.mock('../../main/src/woke/update-install', async (orig) => ({
  ...await orig<typeof import('../../main/src/woke/update-install')>(),
  isGameRunning: async () => true
}))

const { autoUpdater } = await import('../../main/node_modules/electron-updater/out/main.js') as unknown as {
  autoUpdater: EventEmitter & {
    autoDownload: boolean
    installerPath: string | null
    quitAndInstallCalled: boolean
    downloadUpdate: () => Promise<string[]>
    quitAndInstall: (silent: boolean, runAfter: boolean) => void
  }
}
const { AppUpdater } = await import('../../main/src/AppUpdater')

type Info = { state: string, version?: string }

function makeUpdater () {
  const sent: Info[] = []
  const actions = new Map<string, (p: { action: string }) => void>()
  const server = {
    sendEventTo: (_to: string, e: { name: string, payload: unknown }) => {
      if (e.name === 'MAIN->CLIENT::updater-state') sent.push(e.payload as Info)
    },
    onEventAnyClient: (name: string, cb: (p: { action: string }) => void) => { actions.set(name, cb) }
  }
  const log: string[] = []
  const updater = new AppUpdater(server as never, { write: (l: string) => { log.push(l) } } as never)
  const click = (action: string) => actions.get('CLIENT->MAIN::user-action')!({ action })
  return { updater, sent, log, click, last: () => sent[sent.length - 1] }
}

let installer: string
beforeEach(() => {
  vi.useFakeTimers()
  autoUpdater.removeAllListeners()
  autoUpdater.quitAndInstallCalled = false
  h.skipped = null
  h.restartHook = null
  installer = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'woke-updater-')), 'setup.exe')
  fs.writeFileSync(installer, 'MZ')
  autoUpdater.installerPath = installer
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('what the overlay is told', () => {
  it('follows a check: checking, available, then none', () => {
    const u = makeUpdater()
    autoUpdater.emit('checking-for-update')
    expect(u.last()).toEqual({ state: 'checking-for-update' })
    autoUpdater.emit('update-available', { version: '1.330.5' })
    expect(u.last()).toMatchObject({ state: 'update-available', version: '1.330.5' })
    autoUpdater.emit('update-not-available')
    expect(u.last()).toMatchObject({ state: 'update-not-available' })
  })

  it('a downloaded update stays on show through a later failed check', () => {
    const u = makeUpdater()
    autoUpdater.emit('update-downloaded', { version: '1.330.5' })
    expect(u.last()).toMatchObject({ state: 'update-downloaded', version: '1.330.5' })
    autoUpdater.emit('checking-for-update')
    autoUpdater.emit('error', new Error('net::ERR_INTERNET_DISCONNECTED'))
    expect(u.last()).toMatchObject({ state: 'update-downloaded', version: '1.330.5' })
    expect(u.log.some(l => l.includes('net::ERR_INTERNET_DISCONNECTED'))).toBe(true)
  })

  it('an error with nothing downloaded shows as an error', () => {
    const u = makeUpdater()
    autoUpdater.emit('error', new Error('404'))
    expect(u.last()).toMatchObject({ state: 'error' })
  })
})

describe('a version gone back from', () => {
  it('stays skipped, and a newer one downloads by hand', () => {
    h.skipped = '1.330.5'
    const download = vi.spyOn(autoUpdater, 'downloadUpdate')
    const u = makeUpdater()
    expect(autoUpdater.autoDownload).toBe(false)
    autoUpdater.emit('update-available', { version: '1.330.5' })
    expect(u.last()).toMatchObject({ state: 'update-not-available' })
    expect(download).not.toHaveBeenCalled()
    autoUpdater.emit('update-available', { version: '1.330.6' })
    expect(u.last()).toMatchObject({ state: 'update-available', version: '1.330.6' })
    expect(download).toHaveBeenCalledTimes(1)
  })
})

describe('installing from the overlay', () => {
  it('starts the installer once, however many clicks', () => {
    const u = makeUpdater()
    const install = vi.spyOn(autoUpdater, 'quitAndInstall')
    autoUpdater.emit('update-downloaded', { version: '1.330.5' })
    u.click('update-and-restart')
    u.click('update-and-restart')
    expect(install).toHaveBeenCalledTimes(1)
    expect(install).toHaveBeenCalledWith(false, false)
  })

  it('does nothing with no update downloaded', () => {
    const u = makeUpdater()
    const install = vi.spyOn(autoUpdater, 'quitAndInstall')
    u.click('update-and-restart')
    expect(install).not.toHaveBeenCalled()
  })

  it('refuses an installer it can\'t read, and says why', () => {
    const u = makeUpdater()
    const install = vi.spyOn(autoUpdater, 'quitAndInstall')
    autoUpdater.emit('update-downloaded', { version: '1.330.5' })
    fs.writeFileSync(installer, '')
    u.click('update-and-restart')
    expect(install).not.toHaveBeenCalled()
    expect(u.log.some(l => l.includes('Not installing 1.330.5: installer is empty'))).toBe(true)
  })

  it('a restart from Settings installs the update and starts it again', () => {
    makeUpdater()
    const install = vi.spyOn(autoUpdater, 'quitAndInstall')
    autoUpdater.emit('update-downloaded', { version: '1.330.5' })
    expect(h.restartHook!()).toBe(true)
    expect(install).toHaveBeenCalledWith(true, true)
  })

  it('a restart with nothing downloaded is a plain restart', () => {
    makeUpdater()
    const install = vi.spyOn(autoUpdater, 'quitAndInstall')
    expect(h.restartHook!()).toBe(false)
    expect(install).not.toHaveBeenCalled()
  })
})
