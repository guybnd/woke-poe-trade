import path from 'path'
import { app, Tray, Menu, shell, nativeImage, dialog } from 'electron'
import type { ServerEvents } from './server'
import { appIconFile } from './woke/app-icon'

export class AppTray {
  public overlayKey = 'Shift + Space'
  private tray: Tray
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
    // woke: makes a dev copy easy to tell apart from the packaged build.
    this.tray.setToolTip(process.env.VITE_DEV_SERVER_URL
      ? `Woke PoE Trade DEV (${process.env.WOKE_DEV_BRANCH ?? 'no launcher'})`.slice(0, 127)
      : `Woke PoE Trade v${app.getVersion()}`)
    this.rebuildMenu()

    server.onEventAnyClient('CLIENT->MAIN::user-action', ({ action }) => {
      if (action === 'quit') {
        app.quit()
      }
    })
  }

  rebuildMenu () {
    const contextMenu = Menu.buildFromTemplate([
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
        label: 'Run setup again',
        click: () => { this.onRunSetup?.() }
      },
      { type: 'separator' },
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
