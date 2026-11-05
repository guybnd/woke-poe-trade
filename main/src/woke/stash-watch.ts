// While Flips outlines are on screen, watches for anything that could leave them
// on the wrong slots: a click (swapping tabs, moving items), a scroll (Ctrl +
// scroll swaps tabs), or Esc or Space (closing the stash). Listens only while
// outlines are showing.
import { uIOhook, UiohookKey } from 'uiohook-napi'
import type { UiohookKeyboardEvent } from 'uiohook-napi'

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
    if (e.keycode === UiohookKey.Escape || e.keycode === UiohookKey.Space) this.clear()
  }
}
