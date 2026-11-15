import { onMounted, onUnmounted } from 'vue'

// The mouse's back and forward side buttons (XButton1 and XButton2) on a window.
// Only presses on that window's own element count: windows stay mounted while
// hidden, and two open windows would otherwise both go back. The default is
// stopped so the page itself never steps back through its history.
export const MOUSE_BACK = 3
export const MOUSE_FORWARD = 4

export function useMouseNav (el: () => Element | null | undefined, nav: { back: () => void, forward?: () => void }) {
  function inside (e: MouseEvent) {
    return (e.button === MOUSE_BACK || e.button === MOUSE_FORWARD) && !!el()?.contains(e.target as Node)
  }
  function onDown (e: MouseEvent) {
    if (inside(e)) e.preventDefault()
  }
  function onUp (e: MouseEvent) {
    if (!inside(e)) return
    e.preventDefault()
    if (e.button === MOUSE_BACK) nav.back()
    else nav.forward?.()
  }
  onMounted(() => {
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
  })
  onUnmounted(() => {
    window.removeEventListener('mousedown', onDown)
    window.removeEventListener('mouseup', onUp)
  })
}
