// woke: what a key does on the instant price card (InstantNinjaCard.vue). Pure, no Vue.

/** Controls that answer Enter and Space themselves. */
export const CARD_CONTROLS = 'button, a[href], input, textarea, select, [contenteditable], [role="button"]'

export type InstantCardKeyAction = 'live' | 'close' | null

/**
 * Space or Enter opens Live offers (a trade search), Escape closes the card. On a control
 * the player moved to with the keyboard (Tab), Space and Enter are that control's own.
 * A button the mouse last clicked doesn't count, so Space still opens Live offers after
 * a click elsewhere on the card.
 */
export function instantCardKey (key: string, onFocusedControl: boolean): InstantCardKeyAction {
  if (key === 'Escape') return 'close'
  if (key !== ' ' && key !== 'Enter') return null
  return onFocusedControl ? null : 'live'
}

/** The key's target is a control with keyboard focus (focus-visible). */
export function onKeyboardFocusedControl (target: Element | null): boolean {
  const control = target?.closest(CARD_CONTROLS)
  if (!control) return false
  try {
    return control.matches(':focus-visible')
  } catch {
    // No :focus-visible support: any focused control keeps its keys.
    return true
  }
}
