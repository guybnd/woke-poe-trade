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
// Checked when the handler runs, so long enough to outlast a busy main thread.
const EXPIRE_MS = 5000

let altHeld = false
// The Alt the player last pressed: left, or right on layouts without AltGr.
let altKey: number = UiohookKey.Alt
let pending: Array<{ kind: Kind, key: number, at: number }> = []
let lastWasOurs = false

function isAlt (keycode: number) {
  return keycode === UiohookKey.Alt || keycode === UiohookKey.AltRight
}

function takeOurs (kind: Kind, key: number): boolean {
  const now = Date.now()
  pending = pending.filter(p => now - p.at < EXPIRE_MS)
  if (pending[0]?.kind !== kind || pending[0].key !== key) return false
  pending.shift()
  return true
}

function inject (kind: Kind, key: number) {
  pending.push({ kind, key, at: Date.now() })
  uIOhook.keyToggle(key, kind)
}

uIOhook.on('keydown', (e) => {
  lastWasOurs = false
  if (!isAlt(e.keycode)) return
  if (takeOurs('down', e.keycode)) {
    lastWasOurs = true
    // The player let go before this press of ours landed: undo it.
    if (!altHeld) inject('up', e.keycode)
    return
  }
  altHeld = true
  altKey = e.keycode
})

uIOhook.on('keyup', (e) => {
  lastWasOurs = false
  if (!isAlt(e.keycode)) return
  if (takeOurs('up', e.keycode)) {
    lastWasOurs = true
    return
  }
  altHeld = false
})

// The Alt pressed again is the one lifted, even if the player pressed the
// other since: the correction above and the player's own release match it.
let liftedKey: number = UiohookKey.Alt

// Only left Alt is lifted. Whether an injected right Alt comes back through
// the hook as right Alt is untested, and a miss there would leave left Alt
// stuck down; a right Alt copy just fails as before.
export function liftAltForCopy (): boolean {
  if (altKey !== UiohookKey.Alt) return false
  // altHeld is left as the hook last saw it: a release already seen must
  // count, or the re-press below would never be undone.
  liftedKey = altKey
  inject('up', liftedKey)
  return true
}

export function restoreAltAfterCopy (): void {
  inject('down', liftedKey)
}

// For other key listeners: the event being handled is the app's own Alt.
// This module's listeners are registered first (at import), so the flag is
// set by the time theirs run.
export function isOwnAltEvent (): boolean {
  return lastWasOurs
}
