// Follows the pointer from a press until it's let go: every drag in the
// toolkit (the dock, pins, the Settings window's edges) ends the same way.
// It ends on pointerup, on pointercancel, when the window loses focus, and on
// a move with no button held (let go where the window never heard it: the
// game took the mouse back, or the overlay went click-through). `end` runs once.
// Returns a stop function, for a component unmounted mid-drag.
export function followPointer (move: (e: PointerEvent) => void, end: () => void = () => {}): () => void {
  let done = false
  const onMove = (e: PointerEvent) => {
    if (!e.buttons) { stop(); return }
    move(e)
  }
  function stop () {
    if (done) return
    done = true
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', stop)
    window.removeEventListener('pointercancel', stop)
    window.removeEventListener('blur', stop)
    end()
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', stop)
  window.addEventListener('pointercancel', stop)
  window.addEventListener('blur', stop)
  return stop
}
