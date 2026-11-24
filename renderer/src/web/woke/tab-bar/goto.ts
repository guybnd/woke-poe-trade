// The tool's side of What's new's Show me: open the tab a line names, and
// flash the spot on it when the line names one (goto-targets.ts).
import { shallowReactive, watch } from 'vue'
import type { Widget } from '@/web/overlay/widgets'
import type { GotoSpot, GotoTool, GotoTarget } from './goto-targets'
import { uiTrace } from '../app/ui-trace'

interface GotoRequest { target: string, spot?: string }
// Kept here, not in the window's flags: a new window's first mount resets those.
const pending = shallowReactive(new Map<number, GotoRequest>())

export function requestGoto (wmId: number, target: string, spot?: string): void {
  pending.set(wmId, { target, spot })
}

type Handlers<T extends GotoTool> = Record<GotoTarget<T>, () => void> &
  ([GotoSpot<T>] extends [never] ? unknown : { spots: Record<GotoSpot<T>, () => void> })

// Every tab of the tool's type needs a handler, and every spot one that opens
// what hides it (the type checks both). Runs on a request made before or after
// the window mounts, then forgets it.
export function useGoto<T extends GotoTool> (widget: Widget, _type: T, go: Handlers<T>): void {
  watch(() => pending.get(widget.wmId), req => {
    if (req == null) return
    pending.delete(widget.wmId)
    const all = go as unknown as Record<string, (() => void) | undefined> & { spots?: Record<string, (() => void) | undefined> }
    const fn = all[req.target]
    uiTrace(`goto ${widget.wmType} #${widget.wmId}: tab ${req.target}${fn ? '' : ' (no such tab)'}${req.spot ? `, spot ${req.spot}` : ''}`)
    fn?.()
    if (req.spot) {
      all.spots?.[req.spot]?.()
      flashSpot(widget.wmId, req.spot)
    }
  }, { immediate: true })
}

// Scrolled into view and flashed once it's drawn (a lazy panel, a section just
// unfolded); given up after a few seconds, when there's nothing to show yet.
function flashSpot (wmId: number, spot: string, tries = 40) {
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
