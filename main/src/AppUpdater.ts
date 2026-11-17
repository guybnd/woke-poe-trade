import { autoUpdater } from 'electron-updater'
import type { ServerEvents } from './server'
import type { Logger } from './RemoteLogger'
import type { UpdateInfo } from '../../ipc/types'
import { appPrefs, onRestartWithUpdate } from './woke/app-prefs'

export class AppUpdater {
  private _checkedAtStartup = false
  private isRestarting = false
  private _info: UpdateInfo = { state: 'initial' }

  public noAutoUpdatesReason:
    Extract<UpdateInfo, { state: 'update-available' }>['noDownloadReason'] = null

  get info () { return this._info }
  set info (info: UpdateInfo) {
    this._info = info
    this.server.sendEventTo('broadcast', {
      name: 'MAIN->CLIENT::updater-state',
      payload: info
    })
  }

  constructor (
    private server: ServerEvents,
    private logger: Logger
  ) {
    // woke: every 6 hours (APT: 16); the feed is this fork's GitHub releases
    // (publish settings in electron-builder.yml).
    setInterval(this.check, 6 * 60 * 60 * 1000)

    this.server.onEventAnyClient('CLIENT->MAIN::user-action', ({ action }) => {
      if (action === 'check-for-update') {
        this.check()
      } else if (action === 'update-and-restart') {
        // woke: quitting now waits for a save, so a second click can land before
        // it's done, and would start the installer twice.
        if (this.isRestarting) return
        this.isRestarting = true
        autoUpdater.quitAndInstall(false)
      }
    })

    // https://www.electron.build/configuration/nsis.html#portable
    autoUpdater.autoDownload = !process.env.PORTABLE_EXECUTABLE_DIR

    if (!autoUpdater.autoDownload || process.platform === 'darwin') {
      this.noAutoUpdatesReason = 'not-supported'
    } else if (process.argv.includes('--no-updates') || !appPrefs().autoUpdate) {
      // woke: also off when the player turned automatic updates off in setup.
      autoUpdater.autoDownload = false
      this.noAutoUpdatesReason = 'disabled-by-flag'
    }

    autoUpdater.on('checking-for-update', () => {
      this.info = { state: 'checking-for-update' }
    })
    autoUpdater.on('update-available', (info: { version: string }) => {
      this.info = { state: 'update-available', version: info.version, noDownloadReason: this.noAutoUpdatesReason }
    })
    autoUpdater.on('update-not-available', () => {
      this.info = { state: 'update-not-available', checkedAt: Date.now() }
    })
    autoUpdater.on('error', (err: Error) => {
      this.logger.write(`error [AppUpdater] ${err?.message ?? err}`)
      this.info = { state: 'error', checkedAt: Date.now() }
    })
    autoUpdater.on('update-downloaded', (info: { version: string }) => {
      this.info = { state: 'update-downloaded', version: info.version }
    })
    // A restart asked for in Settings or the tray installs the update and
    // starts the new version, instead of racing the installer.
    onRestartWithUpdate(() => {
      if (this._info.state !== 'update-downloaded') return false
      if (this.isRestarting) return true
      this.isRestarting = true
      autoUpdater.quitAndInstall(true, true)
      return true
    })
    // on('download-progress') https://github.com/electron-userland/electron-builder/issues/2521
  }

  // woke: the setup window's "Install updates automatically" switch.
  setAutoDownload (on: boolean) {
    if (this.noAutoUpdatesReason === 'not-supported' || process.argv.includes('--no-updates')) return
    autoUpdater.autoDownload = on
    this.noAutoUpdatesReason = on ? null : 'disabled-by-flag'
  }

  checkAtStartup () {
    if (!this._checkedAtStartup) {
      this._checkedAtStartup = true
      this.check()
    }
  }

  private check = async () => {
    try {
      await autoUpdater.checkForUpdates()
    } catch {
      // handled by event
    }
  }
}
