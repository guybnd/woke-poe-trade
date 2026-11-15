import { uIOhook, UiohookKey } from 'uiohook-napi'

// woke: 3.30 copies nothing on Ctrl+Alt+C, so copying an item while the
// player holds Alt (an "Alt + D" price check, the loot filter's Alt+F) lets go
// of Alt for the copy and presses it again after: the player still holds it,
// and Windows must think so too, or the next D of a held Alt+D reaches the
// game as a bare D.
//
// The re-press must not leave Alt stuck down when the player let go in the
// meantime. The hook reports key events in the order Windows saw them, so
// when the app's own Alt-down turns up after a real release, the player's
// release came first and the app lets go of Alt again.

type Kind = 'up' | 'down'
const EXPIRE_MS = 1000

let altHeld = false
let pending: Array<{ kind: Kind, at: number }> = []
let lastWasOurs = false

function isAlt (keycode: number) {
  return keycode === UiohookKey.Alt || keycode === UiohookKey.AltRight
}

function takeOurs (kind: Kind): boolean {
  const now = Date.now()
  pending = pending.filter(p => now - p.at < EXPIRE_MS)
  if (pending[0]?.kind !== kind) return false
  pending.shift()
  return true
}

function inject (kind: Kind) {
  pending.push({ kind, at: Date.now() })
  uIOhook.keyToggle(UiohookKey.Alt, kind)
}

uIOhook.on('keydown', (e) => {
  lastWasOurs = false
  if (!isAlt(e.keycode)) return
  if (e.keycode === UiohookKey.Alt && takeOurs('down')) {
    lastWasOurs = true
    // The player let go before this press of ours landed: undo it.
    if (!altHeld) inject('up')
    return
  }
  altHeld = true
})

uIOhook.on('keyup', (e) => {
  lastWasOurs = false
  if (!isAlt(e.keycode)) return
  if (e.keycode === UiohookKey.Alt && takeOurs('up')) {
    lastWasOurs = true
    return
  }
  altHeld = false
})

export function liftAltForCopy (): void {
  // The hotkey only fires with Alt down.
  altHeld = true
  inject('up')
}

export function restoreAltAfterCopy (): void {
  inject('down')
}

// For other key listeners: the event being handled is the app's own Alt.
// This module's listeners are registered first (at import), so the flag is
// set by the time theirs run.
export function isOwnAltEvent (): boolean {
  return lastWasOurs
}
