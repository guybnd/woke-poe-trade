// Every `title` hover in the overlay shows in the app's own card (HelpCard.vue),
// not the browser's grey tooltip. One listener for the whole page, so a plain
// `title="…"` anywhere just works, and nothing per element is needed.
//
// The browser draws its tooltip from the attribute, so while the pointer is on
// the element the title is taken off it and put back when the pointer leaves or
// presses (a click keeps the browser's tooltip away by itself). A title that
// changes while hovered (Vue updating `:title`) is taken again and the card follows.
//
// Opt out with `data-native-title` on the element or a parent.
import { hideHelp, helpTip, showHelp } from './help-tip'

// Elements that draw their own tooltip (v-item-tip): a title around them stays
// quiet while the pointer is on them.
export const ownTipEls = new WeakSet<Element>()

const COLD_MS = 450
// Moving from one title straight to the next shows it at once, like the system tooltip.
const WARM_MS = 600

export function installTitleTips (doc: Document = document): () => void {
  const owner = {}
  let held: HTMLElement | null = null
  // The title taken off `held`; null once Vue cleared it, so it isn't put back.
  let text: string | null = null
  let at = { x: 0, y: 0 }
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastShown = 0
  // Pressed: its title stays on until the pointer leaves.
  let pressed: HTMLElement | null = null

  const observer = new MutationObserver(() => {
    if (!held) return
    const now = held.getAttribute('title')
    if (now == null || now === '') {
      // Cleared while hovered: nothing to show or put back.
      text = null
      hideHelp(owner)
      return
    }
    text = now
    take(held)
    if (helpTip.value?.owner === owner) show()
  })

  function take (el: HTMLElement) {
    el.removeAttribute('title')
    observer.takeRecords()
  }

  function show () {
    if (!held || !text || !held.isConnected) return
    lastShown = Date.now()
    showHelp(owner, held, text, undefined, { at, fit: true, lines: true })
  }

  function release () {
    clearTimeout(timer)
    timer = undefined
    if (!held) return
    observer.disconnect()
    if (text != null && !held.hasAttribute('title')) held.setAttribute('title', text)
    if (helpTip.value?.owner === owner) lastShown = Date.now()
    hideHelp(owner)
    held = null
    text = null
  }

  // The element whose title the browser would show for this target. `quiet`:
  // the pointer is on something with its own tooltip inside it, so the title
  // stays off but the card doesn't show.
  function titled (target: EventTarget | null): { el: HTMLElement, quiet: boolean } | null {
    let node = target instanceof Element ? target : null
    let quiet = false
    while (node && node !== doc.documentElement) {
      if (ownTipEls.has(node)) quiet = true
      if (node.hasAttribute('data-native-title')) return null
      const t = node.getAttribute('title')
      if (t) return node instanceof HTMLElement && !(node instanceof HTMLIFrameElement) ? { el: node, quiet } : null
      // title="" (WInfo) silences any title further up, as in the browser.
      if (t === '') return null
      node = node.parentElement
    }
    return null
  }

  function onOver (e: MouseEvent) {
    at = { x: e.clientX, y: e.clientY }
    const found = titled(e.target)
    if (!found || found.el !== held) {
      release()
      if (!found || found.el === pressed) return
      held = found.el
      text = held.getAttribute('title')
      take(held)
      observer.observe(held, { attributes: true, attributeFilter: ['title'] })
    }
    if (found.quiet) {
      clearTimeout(timer)
      timer = undefined
      hideHelp(owner)
      return
    }
    if (helpTip.value?.owner === owner || timer) return
    if (Date.now() - lastShown < WARM_MS) show()
    else timer = setTimeout(() => { timer = undefined; show() }, COLD_MS)
  }

  function onMove (e: MouseEvent) {
    at = { x: e.clientX, y: e.clientY }
    // Removed from under the pointer (v-if, a list re-render): no mouseout comes.
    if (held && !held.isConnected) release()
  }

  function onOut (e: MouseEvent) {
    const to = e.relatedTarget as Node | null
    if (pressed && !(to && pressed.contains(to))) pressed = null
    if (!held || (to && held.contains(to))) return
    release()
  }

  function onDown () {
    if (!held) return
    pressed = held
    release()
  }

  doc.addEventListener('mouseover', onOver, true)
  doc.addEventListener('mousemove', onMove, { capture: true, passive: true })
  doc.addEventListener('mouseout', onOut, true)
  doc.addEventListener('pointerdown', onDown, true)
  return () => {
    release()
    doc.removeEventListener('mouseover', onOver, true)
    doc.removeEventListener('mousemove', onMove, true)
    doc.removeEventListener('mouseout', onOut, true)
    doc.removeEventListener('pointerdown', onDown, true)
  }
}
