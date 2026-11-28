// Show me's spot (goto.ts): scrolled to and flashed.
import { uiTrace } from '../app/ui-trace'

// Scrolled into view and flashed once it's drawn (a lazy panel, a section just
// unfolded); given up after a few seconds, when there's nothing to show yet.
// Flashed only once it has stayed put a moment: a panel still settling (a
// price check filling in) can redraw it, which would drop the flash.
export function flashSpot (wmId: number | null, spot: string, tries = 40): void {
  // null: anywhere (a sample price check, whose parts other tools draw).
  flashAt(`${wmId == null ? '' : `#widget-${wmId} `}[data-goto-spot="${spot}"]`, `goto #${wmId}: spot ${spot}`, tries)
}

// The same for any element (the loot filter's How it works › Show me).
export function flashAt (selector: string, what = selector, tries = 40, seen: HTMLElement | null = null): void {
  if (typeof document === 'undefined') return
  // The first one drawn: a hidden copy (another window's) doesn't count.
  const el = [...document.querySelectorAll<HTMLElement>(selector)]
    .find(e => e.getClientRects().length > 0) ?? null
  const ready = el != null
  if (!ready || el !== seen) {
    if (tries > 0) setTimeout(() => { flashAt(selector, what, tries - 1, ready ? el : null) }, ready ? 300 : 100)
    else uiTrace(`${what} not on screen (nothing to show there yet?)`)
    return
  }
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  el.dataset.gotoFlashed = ''
  el.animate?.([
    { outline: '2px solid var(--w-accent)', outlineOffset: '2px' },
    { outline: '2px solid transparent', outlineOffset: '2px' }
  ], { duration: 700, iterations: 3 })
}
