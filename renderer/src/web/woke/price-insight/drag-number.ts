// PoE mode: drag a min box sideways to change it, as the number chips do. A press
// that doesn't move types in the box instead. A box already being typed in keeps
// its caret and selection.

const START_PX = 3

export function useDragNumber (opts: {
  get: () => number
  set: (value: number) => void
  step: () => number
  /** Pixels per step. */
  px?: number
}) {
  const px = opts.px ?? 8
  let drag: { x: number, start: number, applied: number, el: HTMLInputElement, moved: boolean } | null = null

  const resting = (t: EventTarget | null): t is HTMLInputElement =>
    t instanceof HTMLInputElement && document.activeElement !== t

  return {
    onMouseDown (e: MouseEvent) {
      // Focusing on press would start a text selection under the drag.
      if (e.button === 0 && resting(e.target)) e.preventDefault()
    },
    onPointerDown (e: PointerEvent) {
      drag = (e.button === 0 && resting(e.target))
        ? { x: e.clientX, start: opts.get(), applied: 0, el: e.target, moved: false }
        : null
    },
    onPointerMove (e: PointerEvent) {
      if (!drag) return
      if (!(e.buttons & 1)) { drag = null; return }
      const dx = e.clientX - drag.x
      if (!drag.moved) {
        if (Math.abs(dx) < START_PX) return
        drag.moved = true
        drag.el.setPointerCapture(e.pointerId)
      }
      const steps = Math.trunc(dx / px)
      if (steps !== drag.applied) {
        drag.applied = steps
        const step = opts.step()
        // Rounded to the step, so 0.1 steps don't collect float noise.
        const decimals = (String(step).split('.')[1] ?? '').length
        opts.set(Number((drag.start + steps * step).toFixed(decimals)))
      }
    },
    onPointerUp (e: PointerEvent) {
      const d = drag
      drag = null
      if (e.type === 'pointerup' && d && !d.moved) d.el.focus()
    }
  }
}
