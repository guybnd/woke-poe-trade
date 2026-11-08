import { screen, globalShortcut } from 'electron'
import { uIOhook, UiohookKey, UiohookWheelEvent } from 'uiohook-napi'
import { noteHotkeyFailures } from '../woke/hotkey-failures'
import { pickActions } from './pick-actions'
import { makeRepeatGuard } from './repeat-guard'
import { isModKey, KeyToElectron, mergeTwoHotkeys, RESERVED_SHORTCUTS } from '../../../ipc/KeyToCode'
import { typeInChat, stashSearch } from './text-box'
import { WidgetAreaTracker } from '../windowing/WidgetAreaTracker'
import { HostClipboard } from './HostClipboard'
import type { ShortcutAction } from '../../../ipc/types'
import type { Logger } from '../RemoteLogger'
import type { OverlayWindow } from '../windowing/OverlayWindow'
import type { GameWindow } from '../windowing/GameWindow'
import type { GameConfig } from '../host-files/GameConfig'
import type { ServerEvents } from '../server'
import { perfRecord } from '../woke/perf'

type UiohookKeyT = keyof typeof UiohookKey
const FOCUS_SETTLE_MS = 120
const FOCUS_WAIT_MS = 600
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

  // woke: injected keys go to whichever window has focus, so a command asked for
  // from the overlay must never type into Discord or a browser. Dropped if
  // neither the game nor the overlay has focus, or the game never takes it.
  private typeIntoGame (what: string, type: () => void, onDropped?: () => void) {
    const dropped = () => {
      this.logger.write(`warn [Shortcuts] Dropped a ${what}: the game doesn't have focus.`)
      onDropped?.()
    }
    if (this.poeWindow.hasFocus && !this.overlay.isInteractable) {
      type()
      return
    }
    if (this.overlay.isInteractable) {
      if (!this.overlay.isFocused) {
        dropped()
        return
      }
      this.overlay.assertGameActive()
    } else if (!this.poeWindow.isActive) {
      dropped()
      return
    }
    // Focus is on its way. Give the game a moment after it arrives.
    const started = Date.now()
    let focusedAt: number | undefined
    const tick = () => {
      const now = Date.now()
      if (this.poeWindow.hasFocus) {
        focusedAt ??= now
        if (now - focusedAt >= FOCUS_SETTLE_MS) {
          type()
          return
        }
      } else {
        focusedAt = undefined
      }
      if (focusedAt === undefined && now - started >= FOCUS_WAIT_MS) dropped()
      else setTimeout(tick, 20)
    }
    setTimeout(tick, 20)
  }

  private isKeyRepeat = makeRepeatGuard()
  private actions: ShortcutAction[] = []
  private stashScroll = false
  private logKeys = false
  private areaTracker: WidgetAreaTracker
  private clipboard: HostClipboard

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
        this.typeIntoGame('stash search', () => { stashSearch(e.text, this.clipboard, this.overlay) })
      } else if (e.action === 'paste-in-chat') {
        // woke: wait for a pause in typing so the command never lands in the
        // middle of a chat message or a key you're holding.
        this.whenKeysIdle(() => {
          this.typeIntoGame('chat command', () => { typeInChat(e.text, true, this.clipboard) }, () => {
            this.server.sendEventTo('broadcast', { name: 'MAIN->CLIENT::woke-event', payload: { topic: 'chat-dropped', data: { text: e.text } } })
          })
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
    restoreClipboard: boolean
  ) {
    this.stashScroll = stashScroll
    this.logKeys = logKeys
    this.clipboard.updateOptions(restoreClipboard)

    const allShortcuts = new Set(RESERVED_SHORTCUTS)

    for (const action of actions) {
      if (allShortcuts.has(action.shortcut) && action.action.type !== 'test-only') {
        this.logger.write(`error [Shortcuts] Hotkey "${action.shortcut}" reserved by the game will not be registered.`)
      }
    }
    actions = actions.filter(action => !allShortcuts.has(action.shortcut))

    this.actions = pickActions(actions, (shortcut) => {
      this.logger.write(`error [Shortcuts] Hotkey "${shortcut}" is on more than one action; only one will work.`)
    })
    // woke: hotkeys used to register only on the next game focus change, so
    // settings that arrived while the game had focus (e.g. the app starting
    // with the game already focused) left new hotkeys dead until an alt-tab.
    if (this.poeWindow.isActive) {
      this.unregister()
      this.register()
    }
  }

  private register () {
    // woke: keys another program holds, for the toolkit's clash warning.
    const failed: string[] = []
    for (const entry of this.actions) {
      const isOk = globalShortcut.register(shortcutToElectron(entry.shortcut), () => {
        if (this.isKeyRepeat(entry.shortcut)) return

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
          if (entry.action.focusOverlay) {
            // woke: a price check's tracker would pull focus back to the game
            // on the next mouse move.
            this.areaTracker.removeListeners()
            this.overlay.assertOverlayActive()
          }
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
