import { shallowRef } from 'vue'

// What's new's Show me for Worth selling: the section shows for a minute even
// with nothing in it, so the jump lands on something.
export const SELL_REVEAL_MS = 60_000
export const sellingRevealedAt = shallowRef(0)
export function revealSelling () { sellingRevealedAt.value = Date.now() }
