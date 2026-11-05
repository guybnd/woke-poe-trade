// While Flips outlines are on screen, watches for anything that could leave them
// on the wrong slots: a click (swapping tabs, moving items), a scroll (Ctrl +
// scroll swaps tabs), or any key but a modifier (panel keys can be rebound, so
// no fixed list covers closing the stash). Listens only while outlines show.
import { uIOhook, UiohookKey } from 'uiohook-napi'
import type { UiohookKeyboardEvent } from 'uiohook-napi'

const MODIFIERS = new Set<number>([
  UiohookKey.Ctrl, UiohookKey.CtrlRight,
  UiohookKey.Alt, UiohookKey.AltRight,
  UiohookKey.Shift, UiohookKey.ShiftRight,
  UiohookKey.Meta, UiohookKey.MetaRight
])

export class StashWatch {
  private watching = false

  constructor (private readonly onClear: () => void) {}

  start () {
    if (this.watching) return
    this.watching = true
    uIOhook.on('mousedown', this.clear)
    uIOhook.on('wheel', this.clear)
    uIOhook.on('keydown', this.onKey)
  }

  stop () {
    if (!this.watching) return
    this.watching = false
    uIOhook.removeListener('mousedown', this.clear)
    uIOhook.removeListener('wheel', this.clear)
    uIOhook.removeListener('keydown', this.onKey)
  }

  private readonly clear = () => {
    this.stop()
    this.onClear()
  }

  private readonly onKey = (e: UiohookKeyboardEvent) => {
    if (!MODIFIERS.has(e.keycode)) this.clear()
  }
}
