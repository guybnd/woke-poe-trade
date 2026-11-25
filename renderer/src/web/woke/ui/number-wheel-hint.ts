// "Wheel: step it": clicking into a number box to type peeks, for a moment
// under the box, that the wheel steps it (hidden-features audit, F12). Gone for
// good once the wheel steps a box, or after a few peeks (shared/hints.ts).
import { WHEEL_GLYPH } from './mouse-glyph'
import { retireHint, takeShow } from '../shared/hints'

export const WHEEL_HINT = 'number-wheel'
const SHOWS = 3
const MS = 2500

let peek: HTMLElement | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let used = false

function hide () {
  clearTimeout(timer)
  peek?.remove()
  peek = null
}

function wheelable (box: HTMLInputElement): boolean {
  return box.type === 'number' && !box.disabled && !box.readOnly && box.dataset.noWheel == null
}

function onFocusIn (e: FocusEvent) {
  const box = e.target
  if (used || !(box instanceof HTMLInputElement) || !wheelable(box)) return
  const r = box.getBoundingClientRect()
  if (!r.width || !takeShow(WHEEL_HINT, SHOWS)) return
  hide()
  const el = document.createElement('div')
  el.className = 'w-wheel-peek'
  el.setAttribute('role', 'status')
  el.setAttribute('data-hint', WHEEL_HINT)
  const kbd = document.createElement('kbd')
  kbd.className = 'w-kbd'
  kbd.innerHTML = WHEEL_GLYPH // our own constant markup
  kbd.append('Wheel')
  el.append(kbd, ' steps it up or down')
  el.style.left = `${Math.max(4, r.left)}px`
  el.style.top = `${r.bottom + 4}px`
  document.body.append(el)
  peek = el
  timer = setTimeout(hide, MS)
  box.addEventListener('blur', hide, { once: true })
}

// The wheel stepped a box: the peek has nothing left to teach.
export function wheelUsed (): void {
  if (used) return
  used = true
  hide()
  retireHint(WHEEL_HINT)
}

let installed = false
export function installWheelHint (target: Window = window) {
  if (installed) return
  installed = true
  target.addEventListener('focusin', onFocusIn)
}
