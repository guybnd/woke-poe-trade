import path from 'path'
import { app, Tray, Menu, shell, nativeImage, dialog } from 'electron'
import type { ServerEvents } from './server'
import { appIconFile } from './woke/app-icon'
import { appPrefs, canRestartApp, onAppPrefsChange, restartApp, setAppPrefs } from './woke/app-prefs'

// woke: the overlay can't be seen until it's attached, so the tray says.
export type TrayStatus = 'waiting' | 'attached' | 'needs-admin'
export const DEFAULT_OVERLAY_KEY = 'Shift + Space'

export class AppTray {
  private _overlayKey = DEFAULT_OVERLAY_KEY
  private status: TrayStatus = 'waiting'
  // woke: a way back when the overlay key doesn't work.
  onResetOverlayKey?: () => void
  private tray: Tray

  get overlayKey () { return this._overlayKey }
  set overlayKey (key: string) {
    if (key === this._overlayKey) return
    this._overlayKey = key
    this.rebuildMenu()
  }

  setStatus (status: TrayStatus) {
    if (status === this.status) return
    this.status = status
    this.rebuildMenu()
  }

  private statusText () {
    if (this.status === 'attached') return `Attached: press ${this._overlayKey} in game`
    if (this.status === 'needs-admin') return 'PoE runs as admin: restart this app as admin'
    return 'Waiting for Path of Exile'
  }

  notify (title: string, content: string) {
    if (process.platform !== 'win32') return
    this.tray.displayBalloon({ iconType: 'info', title, content })
  }
  serverPort = 0
  // woke: opens the first-run setup window.
  onRunSetup?: () => void

  private loadImage () {
    const image = nativeImage.createFromPath(appIconFile(process.platform === 'win32' ? 'ico' : 'png'))
    // Mac image size needs to be smaller, or else it looks huge. Size
    // guideline is from https://iconhandbook.co.uk/reference/chart/osx/
    return process.platform === 'darwin' ? image.resize({ width: 22, height: 22 }) : image
  }

  // woke: the player picked another icon.
  refreshIcon () {
    const image = this.loadImage()
    if (!image.isEmpty()) this.tray.setImage(image)
  }

  constructor (server: ServerEvents) {
    this.tray = new Tray(this.loadImage())
    // woke: its tooltip also makes a dev copy easy to tell apart.
    this.rebuildMenu()
    onAppPrefsChange(() => { this.rebuildMenu() })

    server.onEventAnyClient('CLIENT->MAIN::user-action', ({ action }) => {
      if (action === 'quit') {
        app.quit()
      }
    })
  }

  // woke: a second launch quits at once; say why, or it just looks broken.
  notifyAlreadyRunning () {
    this.notify('Woke PoE Trade is already running', `It's in the tray. Press ${this.overlayKey} in game to open it.`)
  }

  rebuildMenu () {
    this.tray.setToolTip(process.env.VITE_DEV_SERVER_URL
      ? `Woke PoE Trade DEV (${process.env.WOKE_DEV_BRANCH ?? 'no launcher'})`.slice(0, 127)
      : `Woke PoE Trade v${app.getVersion()}: ${this.statusText()}`.slice(0, 127))
    const contextMenu = Menu.buildFromTemplate([
      { label: this.statusText(), enabled: false },
      { type: 'separator' },
      {
        label: 'Settings/League',
        click: () => {
          dialog.showMessageBox({
            title: 'Settings',
            message: `Open Path of Exile and press "${this.overlayKey}". Click on the button with cog icon there.`
          })
        }
      },
      {
        label: 'Open in Browser',
        click: () => {
          shell.openExternal(`http://localhost:${this.serverPort}`)
        }
      },
      {
        label: `Reset overlay key to ${DEFAULT_OVERLAY_KEY}`,
        click: () => { this.onResetOverlayKey?.() }
      },
      {
        label: 'Run setup again',
        click: () => { this.onRunSetup?.() }
      },
      { type: 'separator' },
      // woke: also here, because a black overlay (see app-prefs gpuDrawing)
      // can't be used to switch it back.
      {
        label: 'Draw with the graphics card (restarts)',
        type: 'checkbox',
        checked: appPrefs().gpuDrawing,
        click: () => {
          setAppPrefs({ gpuDrawing: !appPrefs().gpuDrawing })
          if (canRestartApp()) restartApp()
        }
      },
      {
        label: 'Open config folder',
        click: () => {
          shell.openPath(path.join(app.getPath('userData'), 'apt-data'))
        }
      },
      {
        label: 'Quit',
        click: () => {
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }
}
