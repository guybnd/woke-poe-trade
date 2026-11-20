// The card behind a WInfo "?". One at a time, drawn by HelpCard.vue (mounted once
// in the overlay), so a panel's edge can't cut it off.
import { shallowRef } from 'vue'

// A key row: boxed keys, then what they do.
export interface HelpKey { keys: string, label: string }

// `lines`: each line break in a paragraph starts a new line (item mods, one per line).
// `at`: the pointer, for a card placed under it (title hovers) rather than beside
// the target. `fit`: the card is only as wide as its text, up to the usual width.
export interface HelpOpts { lines?: boolean, at?: { x: number, y: number }, fit?: boolean }

export const helpTip = shallowRef<{ owner: object, text: string, keys?: HelpKey[], anchor: DOMRect } & HelpOpts | null>(null)

export function showHelp (owner: object, target: HTMLElement, text: string, keys?: HelpKey[], opts: HelpOpts = {}) {
  helpTip.value = { owner, text, keys, anchor: target.getBoundingClientRect(), ...opts }
}

// Elements that draw their own tooltip (v-item-tip): a title around them stays
// quiet (title-tip.ts) while the pointer is on them.
export const ownTipEls = new WeakSet<Element>()

export function hideHelp (owner?: object) {
  if (!owner || helpTip.value?.owner === owner) helpTip.value = null
}

// A blank line starts a new paragraph.
export function helpParagraphs (text: string): string[] {
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
}

// Where the card goes, in screen pixels: right of the "?", else left of it, kept
// inside the window.
export function placeHelp (
  anchor: { left: number, right: number, top: number },
  card: { width: number, height: number },
  screen: { width: number, height: number }
): { left: number, top: number } {
  const GAP = 8
  const fitsRight = anchor.right + GAP + card.width <= screen.width - GAP
  const left = fitsRight ? anchor.right + GAP : Math.max(GAP, anchor.left - GAP - card.width)
  const top = Math.max(GAP, Math.min(anchor.top - 4, screen.height - card.height - GAP))
  return { left, top }
}

// Under the pointer, the way the system tooltip sits; above it when there's no
// room below. Kept inside the window.
export function placeAtPointer (
  at: { x: number, y: number },
  card: { width: number, height: number },
  screen: { width: number, height: number }
): { left: number, top: number } {
  const GAP = 8
  const left = Math.max(GAP, Math.min(at.x - 8, screen.width - card.width - GAP))
  const below = at.y + 20
  const top = below + card.height <= screen.height - GAP
    ? below
    : Math.max(GAP, at.y - 8 - card.height)
  return { left, top }
}
