import { screen, globalShortcut } from 'electron'
import { uIOhook, UiohookKey, UiohookWheelEvent } from 'uiohook-napi'
import { noteHotkeyFailures } from '../woke/hotkey-failures'
import { isModKey, KeyToElectron, mergeTwoHotkeys } from '../../../ipc/KeyToCode'
import { typeInChat, stashSearch } from './text-box'
import { WidgetAreaTracker } from '../windowing/WidgetAreaTracker'
import { HostClipboard } from './HostClipboard'
import { OcrWorker } from '../vision/link-main'
import type { ShortcutAction } from '../../../ipc/types'
import type { Logger } from '../RemoteLogger'
import type { OverlayWindow } from '../windowing/OverlayWindow'
import type { GameWindow } from '../windowing/GameWindow'
import type { GameConfig } from '../host-files/GameConfig'
import type { ServerEvents } from '../server'
import { perfRecord } from '../woke/perf'

type UiohookKeyT = keyof typeof UiohookKey
// woke: the heist gem OCR worker shuts down after this long unused.
const OCR_IDLE_MS = 5 * 60 * 1000
const UiohookToName = Object.fromEntries(Object.entries(UiohookKey).map(([k, v]) => ([v, k])))

export class Shortcuts {
  // woke: last key press anywhere, for whenKeysIdle.
  private lastKeyAt = 0

  private whenKeysIdle (run: () => void, idleMs = 1500, maxWaitMs = 30000) {
    const started = Date.now()
    const tick = () => {
      const idle = Date.now() - this.lastKeyAt
      if (idle >= idleMs || Date.now() - started >= maxWaitMs) run()
      else setTimeout(tick, Math.max(100, idleMs - idle))
    }
    tick()
  }

  private actions: ShortcutAction[] = []
  private stashScroll = false
  private logKeys = false
  private areaTracker: WidgetAreaTracker
  private clipboard: HostClipboard
  private ocrWorker: Promise<OcrWorker> | null = null
  private ocrLanguage = ''

  static async create (
    logger: Logger,
    overlay: OverlayWindow,
    poeWindow: GameWindow,
    gameConfig: GameConfig,
    server: ServerEvents
  ) {
    // woke: the OCR worker loads only once an OCR hotkey is registered
    const shortcuts = new Shortcuts(logger, overlay, poeWindow, gameConfig, server)
    return shortcuts
  }

  private constructor (
    private logger: Logger,
    private overlay: OverlayWindow,
    private poeWindow: GameWindow,
    private gameConfig: GameConfig,
    private server: ServerEvents
  ) {
    this.areaTracker = new WidgetAreaTracker(server, overlay)
    this.clipboard = new HostClipboard(logger)

    this.poeWindow.on('active-change', (isActive) => {
      process.nextTick(() => {
        if (isActive === this.poeWindow.isActive) {
          if (isActive) {
            this.register()
          } else {
            this.unregister()
          }
        }
      })
    })

    this.server.onEventAnyClient('CLIENT->MAIN::user-action', (e) => {
      if (e.action === 'stash-search') {
        stashSearch(e.text, this.clipboard, this.overlay)
      } else if (e.action === 'paste-in-chat') {
        // woke: wait for a pause in typing so the command never lands in the
        // middle of a chat message or a key you're holding.
        this.whenKeysIdle(() => {
          // A click in the overlay: give the game focus a moment to arrive
          // before typing into it.
          const wasOverlay = this.overlay.isInteractable
          this.overlay.assertGameActive()
          if (wasOverlay) setTimeout(() => typeInChat(e.text, true, this.clipboard), 120)
          else typeInChat(e.text, true, this.clipboard)
        }, e.immediate ? 0 : undefined)
      }
    })

    uIOhook.on('keydown', () => { this.lastKeyAt = Date.now() })
    uIOhook.on('keydown', (e) => {
      if (!this.logKeys) return
      const pressed = eventToString(e)
      this.logger.write(`debug [Shortcuts] Keydown ${pressed}`)
    })
    uIOhook.on('keyup', (e) => {
      if (!this.logKeys) return
      this.logger.write(`debug [Shortcuts] Keyup ${UiohookToName[e.keycode] || 'not_supported_key'}`)
    })

    uIOhook.on('wheel', (e) => {
      if (!e.ctrlKey || !this.poeWindow.isActive || !this.stashScroll) return

      if (!isStashArea(e, this.poeWindow)) {
        if (e.rotation > 0) {
          uIOhook.keyTap(UiohookKey.ArrowRight)
        } else if (e.rotation < 0) {
          uIOhook.keyTap(UiohookKey.ArrowLeft)
        }
      }
    })
  }

  updateActions (
    actions: ShortcutAction[],
    stashScroll: boolean,
    logKeys: boolean,
    restoreClipboard: boolean,
    language: string
  ) {
    this.stashScroll = stashScroll
    this.logKeys = logKeys
    this.clipboard.updateOptions(restoreClipboard)
    this.ocrLanguage = language
    // woke: the heist gem OCR worker (opencv + tesseract, 100-200 MB) used to
    // load at startup whenever the hotkey was set. It now loads on the first
    // press and shuts down after a few idle minutes; a loaded one follows a
    // language change.
    if (this.ocrWorker) {
      this.ocrWorker.then(w => w.updateOptions(language)).catch(() => {})
    }

    const allShortcuts = new Set([
      'Ctrl + C', 'Ctrl + V', 'Ctrl + A',
      'Ctrl + F',
      'Ctrl + Enter',
      'Home', 'Delete', 'Enter',
      'ArrowUp', 'ArrowRight', 'ArrowLeft'
    ])

    for (const action of actions) {
      if (allShortcuts.has(action.shortcut) && action.action.type !== 'test-only') {
        this.logger.write(`error [Shortcuts] Hotkey "${action.shortcut}" reserved by the game will not be registered.`)
      }
    }
    actions = actions.filter(action => !allShortcuts.has(action.shortcut))

    const duplicates = new Set<string>()
    for (const action of actions) {
      if (allShortcuts.has(action.shortcut)) {
        this.logger.write(`error [Shortcuts] It is not possible to use the same hotkey "${action.shortcut}" for multiple actions.`)
        duplicates.add(action.shortcut)
      } else {
        allShortcuts.add(action.shortcut)
      }
    }
    this.actions = actions.filter(action =>
      !duplicates.has(action.shortcut) ||
      action.action.type === 'toggle-overlay')
    // woke: hotkeys used to register only on the next game focus change, so
    // settings that arrived while the game had focus (e.g. the app starting
    // with the game already focused) left new hotkeys dead until an alt-tab.
    if (this.poeWindow.isActive) {
      this.unregister()
      this.register()
    }
  }

  private ocrIdleTimer: ReturnType<typeof setTimeout> | undefined

  private getOcrWorker () {
    const language = this.ocrLanguage
    if (!this.ocrWorker) {
      const starting = OcrWorker.create().then(async w => { await w.updateOptions(language); return w })
      // A worker that failed to start (OCR files not downloaded yet, say) is
      // tried again on the next press instead of failing until it idles out.
      starting.catch((err) => {
        this.logger.write(`error [Shortcuts] Heist gem OCR failed to start: ${(err as Error)?.message ?? err}`)
        if (this.ocrWorker === starting) this.ocrWorker = null
      })
      this.ocrWorker = starting
    }
    const current = this.ocrWorker
    // woke: free it once heist gems haven't been read for a while.
    clearTimeout(this.ocrIdleTimer)
    this.ocrIdleTimer = setTimeout(() => {
      const worker = this.ocrWorker
      this.ocrWorker = null
      worker?.then(async w => { await w.terminate() }).catch(() => {})
    }, OCR_IDLE_MS)
    return current
  }

  private register () {
    // woke: keys another program holds, for the toolkit's clash warning.
    const failed: string[] = []
    for (const entry of this.actions) {
      const isOk = globalShortcut.register(shortcutToElectron(entry.shortcut), () => {
        if (this.logKeys) {
          this.logger.write(`debug [Shortcuts] Action type: ${entry.action.type}`)
        }

        if (entry.keepModKeys) {
          const nonModKey = entry.shortcut.split(' + ').filter(key => !isModKey(key))[0]
          uIOhook.keyToggle(UiohookKey[nonModKey as UiohookKeyT], 'up')
        } else {
          entry.shortcut.split(' + ').reverse().forEach(key => { uIOhook.keyToggle(UiohookKey[key as UiohookKeyT], 'up') })
        }

        if (entry.action.type === 'toggle-overlay') {
          this.areaTracker.removeListeners()
          this.overlay.toggleActiveState()
        } else if (entry.action.type === 'paste-in-chat') {
          typeInChat(entry.action.text, entry.action.send, this.clipboard)
        } else if (entry.action.type === 'trigger-event') {
          this.server.sendEventTo('broadcast', {
            name: 'MAIN->CLIENT::widget-action',
            payload: { target: entry.action.target }
          })
          if (entry.action.focusOverlay) this.overlay.assertOverlayActive()
        } else if (entry.action.type === 'stash-search') {
          stashSearch(entry.action.text, this.clipboard, this.overlay)
        } else if (entry.action.type === 'copy-item') {
          const { action } = entry

          const pressPosition = screen.getCursorScreenPoint()
          const pressTime = performance.now()

          this.clipboard.readItemText()
            .then(clipboard => {
              perfRecord('Item hotkey → item text copied', performance.now() - pressTime)
              this.areaTracker.removeListeners()
              this.server.sendEventTo('last-active', {
                name: 'MAIN->CLIENT::item-text',
                payload: { target: action.target, clipboard, position: pressPosition, focusOverlay: Boolean(action.focusOverlay) }
              })
              if (action.focusOverlay && this.overlay.wasUsedRecently) {
                this.overlay.assertOverlayActive()
              }
            }).catch(() => {
              // woke: nothing was under the mouse. Say so, not silence.
              this.server.sendEventTo('last-active', { name: 'MAIN->CLIENT::item-text-failed', payload: { target: action.target } })
            })

          pressKeysToCopyItemText(
            (entry.keepModKeys) ? entry.shortcut.split(' + ').filter(key => isModKey(key)) : undefined,
            this.gameConfig.showModsKey
          )
        } else if (entry.action.type === 'ocr-text' && entry.action.target === 'heist-gems') {
          if (process.platform !== 'win32') return

          const { action } = entry
          const pressTime = Date.now()
          const imageData = this.poeWindow.screenshot()
          const image = {
            width: this.poeWindow.bounds.width,
            height: this.poeWindow.bounds.height,
            data: imageData
          }
          this.getOcrWorker().then(w => w.findHeistGems(image)).then(result => {
            this.server.sendEventTo('last-active', {
              name: 'MAIN->CLIENT::ocr-text',
              payload: {
                target: action.target,
                pressTime,
                ocrTime: result.elapsed,
                paragraphs: result.recognized.map(p => p.text)
              }
            })
          }).catch(() => {})
        }
      })

      if (!isOk) {
        this.logger.write(`error [Shortcuts] Failed to register a shortcut "${entry.shortcut}". It is already registered by another application.`)
        failed.push(entry.shortcut)
      }

      if (entry.action.type === 'test-only') {
        globalShortcut.unregister(shortcutToElectron(entry.shortcut))
      }
    }
    noteHotkeyFailures(this.server, failed)
  }

  private unregister () {
    globalShortcut.unregisterAll()
  }
}

function pressKeysToCopyItemText (pressedModKeys: string[] = [], showModsKey: string) {
  // 3.29: Copying an item's text now always copies the advanced description format.
  showModsKey = 'Ctrl'

  let keys = mergeTwoHotkeys('Ctrl + C', showModsKey).split(' + ')
  keys = keys.filter(key => key !== 'C')
  if (process.platform !== 'darwin') {
    // On non-Mac platforms, don't toggle keys that are already being pressed.
    //
    // For unknown reasons, we need to toggle pressed keys on Mac for advanced
    // mod descriptions to be copied. You can test this by setting the shortcut
    // to "Alt + any letter". They'll work with this line, but not if it's
    // commented out.
    keys = keys.filter(key => !pressedModKeys.includes(key))
  }

  for (const key of keys) {
    uIOhook.keyToggle(UiohookKey[key as UiohookKeyT], 'down')
  }

  // finally press `C` to copy text
  uIOhook.keyTap(UiohookKey.C)

  keys.reverse()
  for (const key of keys) {
    uIOhook.keyToggle(UiohookKey[key as UiohookKeyT], 'up')
  }
}

function isStashArea (mouse: UiohookWheelEvent, poeWindow: GameWindow): boolean {
  if (!poeWindow.bounds ||
      mouse.x > (poeWindow.bounds.x + poeWindow.uiSidebarWidth)) return false

  return (mouse.y > (poeWindow.bounds.y + poeWindow.bounds.height * 154 / 1600) &&
          mouse.y < (poeWindow.bounds.y + poeWindow.bounds.height * 1192 / 1600))
}

function eventToString (e: { keycode: number, ctrlKey: boolean, altKey: boolean, shiftKey: boolean }) {
  const { ctrlKey, shiftKey, altKey } = e

  let code = UiohookToName[e.keycode]
  if (!code) return 'not_supported_key'

  if (code === 'Shift' || code === 'Alt' || code === 'Ctrl') return code

  if (ctrlKey && shiftKey && altKey) code = `Ctrl + Shift + Alt + ${code}`
  else if (shiftKey && altKey) code = `Shift + Alt + ${code}`
  else if (ctrlKey && shiftKey) code = `Ctrl + Shift + ${code}`
  else if (ctrlKey && altKey) code = `Ctrl + Alt + ${code}`
  else if (altKey) code = `Alt + ${code}`
  else if (ctrlKey) code = `Ctrl + ${code}`
  else if (shiftKey) code = `Shift + ${code}`

  return code
}

function shortcutToElectron (shortcut: string) {
  return shortcut
    .split(' + ')
    .map(k => KeyToElectron[k as keyof typeof KeyToElectron])
    .join('+')
}
