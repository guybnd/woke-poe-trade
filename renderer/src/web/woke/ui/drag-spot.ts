// Dragging an on-screen pop-up by a handle (the big-hit popup): moves
// its top centre with the pointer, kept on screen, as a share of the screen so
// the spot holds at any resolution. `onMove` gets each step; `done` once, when
// the drag ends (pointer up, or the capture lost when the overlay closes).
export interface Spot { x: number, y: number }

// `el` takes the pointer (the handle); `box` is what moves (measured), by default the same.
export function dragSpot (e: PointerEvent, el: HTMLElement, onMove: (spot: Spot, done: boolean) => void, boxEl: HTMLElement = el): void {
  if (e.button !== 0) return
  e.preventDefault()
  const box = boxEl.getBoundingClientRect()
  const dx = e.clientX - (box.left + box.width / 2)
  const dy = e.clientY - box.top
  const halfW = Math.min(0.5, box.width / 2 / window.innerWidth)
  try { el.setPointerCapture(e.pointerId) } catch {}
  const at = (ev: PointerEvent): Spot => ({
    // Its centre, kept far enough in that no edge leaves the screen.
    x: Math.min(1 - halfW, Math.max(halfW, (ev.clientX - dx) / window.innerWidth)),
    y: Math.max(0, Math.min(1 - box.height / window.innerHeight, (ev.clientY - dy) / window.innerHeight))
  })
  let last: Spot | null = null
  const move = (ev: PointerEvent) => { last = at(ev); onMove(last, false) }
  const up = () => {
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', up)
    el.removeEventListener('pointercancel', up)
    el.removeEventListener('lostpointercapture', up)
    window.removeEventListener('pointerup', up)
    if (last) onMove(last, true)
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', up)
  el.addEventListener('lostpointercapture', up)
  window.addEventListener('pointerup', up)
}

// Fixed-position style for a spot; none keeps the pop-up's own default place.
export function spotStyle (spot: Spot | null | undefined): Record<string, string> | undefined {
  return spot ? { position: 'fixed', left: `${spot.x * 100}%`, top: `${spot.y * 100}%`, width: 'max-content', transform: 'translateX(-50%)' } : undefined
}
