// The card behind a WInfo "?". One at a time, drawn by HelpCard.vue (mounted once
// in the overlay), so a panel's edge can't cut it off.
import { shallowRef } from 'vue'

export const helpTip = shallowRef<{ owner: object, text: string, anchor: DOMRect } | null>(null)

export function showHelp (owner: object, target: HTMLElement, text: string) {
  helpTip.value = { owner, text, anchor: target.getBoundingClientRect() }
}

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
