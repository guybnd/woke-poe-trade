import { uIOhook, UiohookKey } from 'uiohook-napi'

// woke: 3.30 copies nothing on Ctrl+Alt+C, so copying an item while the
// player holds Alt (an "Alt + D" price check, the loot filter's Alt+F) lets go
// of Alt first. The game and uIOhook's modifier flags then think Alt is up
// although the player still holds it. This keeps the real state, so the
// hold-to-show price check still sees Alt held. The app never presses Alt
// back down: a re-press the player had already let go of would leave Alt
// stuck down in the game.

let altHeld = false
let pendingAltUps = 0
let pendingUntil = 0

uIOhook.on('keydown', (e) => {
  if (e.keycode === UiohookKey.Alt || e.keycode === UiohookKey.AltRight) altHeld = true
})

uIOhook.on('keyup', (e) => {
  if (e.keycode !== UiohookKey.Alt && e.keycode !== UiohookKey.AltRight) return
  if (pendingAltUps > 0 && Date.now() < pendingUntil) {
    // The app's own release, not the player's.
    pendingAltUps--
    return
  }
  pendingAltUps = 0
  altHeld = false
})

export function liftAltForCopy (): void {
  pendingAltUps++
  pendingUntil = Date.now() + 500
  uIOhook.keyToggle(UiohookKey.Alt, 'up')
}

export function isAltHeld (): boolean {
  return altHeld
}
