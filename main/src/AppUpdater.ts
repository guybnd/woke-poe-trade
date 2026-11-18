import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { ServerEvents } from './server'
import type { Logger } from './RemoteLogger'
import type { UpdateInfo } from '../../ipc/types'
import type { GameWindow } from './windowing/GameWindow'
import { appPrefs, canRestartApp, onRestartWithUpdate } from './woke/app-prefs'
import {
  GAME_CLOSED_GRACE_MS, RECHECK_MS, VERDICT_TEXT, describeUpdateError, installVerdict, isGameRunning,
  type InstallVerdict
} from './woke/update-install'

export class AppUpdater {
  private _checkedAtStartup = false
  private isRestarting = false
  private _info: UpdateInfo = { state: 'initial' }
  // woke: what the updater was doing, and towards which version, for the log.
  private stage = 'checking for updates'
  private target: string | null = null
  // woke: installing while the game is closed (update-install.ts).
  private gameAttached = false
  private gameSeenAt = Date.now()
  private recheck: ReturnType<typeof setInterval> | undefined
  private lastVerdict: InstallVerdict | null = null

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
        this.stage = 'installing'
        this.logger.write(`info [AppUpdater] Installing ${this.target ?? 'the update'}: asked from the overlay.`)
        autoUpdater.quitAndInstall(false)
      }
    })

    // woke: electron-updater's own steps (feed, download, installer) in the
    // app's log. Its errors come with the stack.
    autoUpdater.logger = {
      info: (m?: unknown) => { this.logger.write(`info [AppUpdater] ${String(m)}`) },
      warn: (m?: unknown) => { this.logger.write(`warn [AppUpdater] ${String(m)}`) },
      error: (m?: unknown) => { this.logger.write(`error [AppUpdater] ${String(m)}`) },
      debug: () => {}
    }

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
      this.stage = 'checking for updates'
      this.info = { state: 'checking-for-update' }
    })
    autoUpdater.on('update-available', (info: { version: string }) => {
      this.target = info.version
      if (autoUpdater.autoDownload) this.stage = 'downloading'
      this.info = { state: 'update-available', version: info.version, noDownloadReason: this.noAutoUpdatesReason }
    })
    autoUpdater.on('update-not-available', () => {
      this.info = { state: 'update-not-available', checkedAt: Date.now() }
    })
    autoUpdater.on('error', (err: Error) => {
      this.logger.write(`error [AppUpdater] ${describeUpdateError(err, this.stage, app.getVersion(), this.target)}`)
      // An installer that didn't start leaves the app running: let a later
      // try (quit, restart, the game closing) run it again.
      if (this.stage === 'installing') this.isRestarting = false
      this.info = { state: 'error', checkedAt: Date.now() }
    })
    autoUpdater.on('update-downloaded', (info: { version: string }) => {
      this.target = info.version
      this.stage = 'waiting to install'
      this.info = { state: 'update-downloaded', version: info.version }
      this.waitForGameClosed()
    })
    // A restart asked for in Settings or the tray installs the update and
    // starts the new version, instead of racing the installer.
    onRestartWithUpdate(() => {
      if (this._info.state !== 'update-downloaded') return false
      if (this.isRestarting) return true
      this.isRestarting = true
      this.stage = 'installing'
      this.logger.write(`info [AppUpdater] Installing ${this.target ?? 'the update'}: restart asked for.`)
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

  // woke: the game window, the quick signal that the game is open. The process
  // check below still runs, since the window is only found by its title.
  watchGame (poeWindow: GameWindow) {
    poeWindow.onAttach(() => {
      this.gameAttached = true
      this.gameSeenAt = Date.now()
    })
    poeWindow.onDetach(() => {
      this.gameAttached = false
      this.gameSeenAt = Date.now()
      if (this._info.state === 'update-downloaded') {
        setTimeout(() => { void this.tryInstall() }, GAME_CLOSED_GRACE_MS + 5_000)
      }
    })
  }

  private waitForGameClosed () {
    if (this.recheck) return
    this.recheck = setInterval(() => { void this.tryInstall() }, RECHECK_MS)
    void this.tryInstall()
  }

  // Installs a downloaded update if the game is closed and nobody is using the
  // overlay; otherwise logs why not (once per reason) and waits.
  private tryInstall = async () => {
    if (this._info.state !== 'update-downloaded' || this.isRestarting) return
    const gameRunning = this.gameAttached ? true : await isGameRunning()
    if (gameRunning !== false) this.gameSeenAt = Date.now()
    const verdict = installVerdict({
      updateReady: this._info.state === 'update-downloaded',
      autoUpdate: autoUpdater.autoDownload,
      canRestart: canRestartApp(),
      installing: this.isRestarting,
      gameRunning,
      gameSeenAt: this.gameSeenAt,
      appFocused: BrowserWindow.getFocusedWindow() != null,
      now: Date.now()
    })
    if (verdict !== this.lastVerdict) {
      this.lastVerdict = verdict
      this.logger.write(`info [AppUpdater] ${this.target ?? 'Update'} downloaded: ${VERDICT_TEXT[verdict]}.`)
    }
    if (verdict !== 'install') return
    clearInterval(this.recheck)
    this.recheck = undefined
    this.isRestarting = true
    this.stage = 'installing'
    try {
      autoUpdater.quitAndInstall(true, true)
    } catch (e) {
      this.isRestarting = false
      this.logger.write(`error [AppUpdater] ${describeUpdateError(e, this.stage, app.getVersion(), this.target)}`)
    }
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
