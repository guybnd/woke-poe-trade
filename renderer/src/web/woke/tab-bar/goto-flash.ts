// Show me's spot (goto.ts): scrolled to and flashed.
import { uiTrace } from '../app/ui-trace'

// Scrolled into view and flashed once it's drawn (a lazy panel, a section just
// unfolded); given up after a few seconds, when there's nothing to show yet.
export function flashSpot (wmId: number, spot: string, tries = 40) {
  if (typeof document === 'undefined') return
  const el = document.querySelector<HTMLElement>(`#widget-${wmId} [data-goto-spot="${spot}"]`)
  if (!el || el.offsetParent == null) {
    if (tries > 0) setTimeout(() => { flashSpot(wmId, spot, tries - 1) }, 100)
    else uiTrace(`goto #${wmId}: spot ${spot} not on screen (nothing to show there yet?)`)
    return
  }
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  el.dataset.gotoFlashed = ''
  el.animate?.([
    { outline: '2px solid var(--w-accent)', outlineOffset: '2px' },
    { outline: '2px solid transparent', outlineOffset: '2px' }
  ], { duration: 700, iterations: 3 })
}
