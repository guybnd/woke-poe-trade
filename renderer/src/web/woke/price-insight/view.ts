import { shallowRef } from 'vue'
import { storedPref } from '../ui/stored-pref'
import type { CheapUnit } from './ninja-first'

// Which price check view to show. 'classic' is APT's listing table untouched;
// 'improved' adds the verdict card and marks listings the verdict ignored.
export type PriceView = 'classic' | 'improved'

export const priceView = storedPref<PriceView>('woke.priceView', v => v === 'classic' ? 'classic' : 'improved')

// Verdict card: one line by default; expanded shows notes, poe.ninja and
// the price drivers. The chart opens from the sparkline.
export const verdictExpanded = shallowRef(false)
export const historyOpen = shallowRef(false)

// Every new item starts collapsed. Changing a filter on the same item doesn't
// count, even if that rebuilds the verdict.
let lastItem: unknown = null
export function collapseForNewItem (item: unknown): void {
  if (item === lastItem) return
  lastItem = item
  verdictExpanded.value = false
  historyOpen.value = false
}

// The poe.ninja card above the filters (before a search): folded into a chip on
// the name row by default, so it costs no height. Remembered between checks and restarts.
export const ninjaCardOpen = storedPref('woke.ninjaCardOpen', v => v === '1', v => v ? '1' : '0')

// The instant poe.ninja card is showing (PriceCheckWindow.vue): the overlay
// leaves the game undarkened behind it, as for the quick key.
export const instantCardShown = shallowRef(false)

// How poe.ninja's price of an item under a divine reads on the instant card and
// the verdict: in chaos, or per divine (ninja-first.ts CheapUnit). A click on
// the price switches it (Guy, 2026-11-24); remembered between checks and restarts.
export const ninjaCheapUnit = storedPref<CheapUnit>('woke.ninjaCheapUnit', v => v === 'div' ? 'div' : 'c')

/** A click on a poe.ninja price: show prices under a divine the other way. */
export function flipUnit (price: { flip: CheapUnit | null } | null | undefined): void {
  if (price?.flip) ninjaCheapUnit.value = price.flip
}
