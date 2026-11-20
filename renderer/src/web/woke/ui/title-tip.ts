// Every `title` hover in the overlay shows in the app's own card (HelpCard.vue),
// not the browser's grey tooltip. One listener for the whole page, so a plain
// `title="…"` anywhere just works, and nothing per element is needed.
//
// The browser draws its tooltip from the attribute, so while the pointer is on
// the element the title is taken off it, and put back when the pointer leaves.
// A press hides the card until the pointer leaves, with the title still off (put
// back, the browser would show it on the next nudge). A title that changes while
// hovered (Vue updating `:title`) is taken again and the card follows.
//
// HelpCard loads this after startup (it isn't needed for the first paint).
//
// Opt out with `data-native-title` on the element or a parent. The e2e harness
// turns it off (window.__wokeNativeTitles) so getByTitle finds hovered elements.
import { watch } from 'vue'
import { hideHelp, helpTip, ownTipEls, showHelp } from './help-tip'
import { tip as gameTip } from './tooltip/tooltip'

const COLD_MS = 450
// Moving from one title straight to the next shows it at once, like the system tooltip.
const WARM_MS = 600

export interface TitleTips {
  // Hide the card and drop a pending one until the pointer leaves (overlay
  // closed, scroll, drag).
  cancel: () => void
  stop: () => void
}

export function installTitleTips (doc: Document = document): TitleTips {
  if ((window as unknown as { __wokeNativeTitles?: boolean }).__wokeNativeTitles) {
    return { cancel () {}, stop () {} }
  }
  const owner = {}
  let held: HTMLElement | null = null
  // The title taken off `held`; null once Vue cleared it, so it isn't put back.
  let text: string | null = null
  let at = { x: 0, y: 0 }
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastShown = 0
  // No card for `held` until the pointer leaves it (pressed, or cancelled).
  let muted = false

  const observer = new MutationObserver(() => {
    if (!held) return
    const now = held.getAttribute('title')
    if (now == null || !now.trim()) {
      // Cleared while hovered: nothing to show or put back.
      if (now == null) text = null
      else { text = now; take(held) }
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
    if (!held || muted || !text?.trim() || !held.isConnected) return
    // Never over another card (a WInfo, a chip's own help) or the item tooltip.
    if (helpTip.value && helpTip.value.owner !== owner) return
    if (gameTip.value) return
    lastShown = Date.now()
    showHelp(owner, held, text, undefined, { at, fit: true, lines: true })
  }

  function stopTimer () {
    clearTimeout(timer)
    timer = undefined
  }

  function hide () {
    stopTimer()
    if (helpTip.value?.owner === owner) {
      lastShown = Date.now()
      hideHelp(owner)
    }
  }

  function release () {
    hide()
    if (!held) return
    observer.disconnect()
    if (text != null && !held.hasAttribute('title')) held.setAttribute('title', text)
    held = null
    text = null
    muted = false
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
      if (t?.trim()) return node instanceof HTMLElement && !(node instanceof HTMLIFrameElement) ? { el: node, quiet } : null
      // title="" (WInfo) silences any title further up, as in the browser.
      if (t != null) return null
      node = node.parentElement
    }
    return null
  }

  function onOver (e: MouseEvent) {
    at = { x: e.clientX, y: e.clientY }
    // Dragging (a number, a pin, the rail grip): no tooltips, as in the browser.
    if (e.buttons !== 0 && !held) return
    const found = titled(e.target)
    if (!found || found.el !== held) {
      release()
      if (!found || e.buttons !== 0) return
      held = found.el
      text = held.getAttribute('title')
      take(held)
      observer.observe(held, { attributes: true, attributeFilter: ['title'] })
    }
    if (found.quiet || muted) {
      hide()
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
    if (!held || (to && held.contains(to))) return
    release()
  }

  // A drag ended over a title: no mouseover comes until the pointer moves on.
  function onUp (e: PointerEvent) {
    if (!held) onOver(e)
  }

  // The item tooltip came up after the card (its data loads on first hover).
  const stopGameWatch = watch(gameTip, (t) => { if (t) hide() })

  function cancel () {
    if (!held) return
    muted = true
    hide()
  }

  doc.addEventListener('mouseover', onOver, true)
  doc.addEventListener('mousemove', onMove, { capture: true, passive: true })
  doc.addEventListener('mouseout', onOut, true)
  doc.addEventListener('pointerdown', cancel, true)
  doc.addEventListener('pointerup', onUp, true)
  return {
    cancel,
    stop () {
      release()
      doc.removeEventListener('mouseover', onOver, true)
      doc.removeEventListener('mousemove', onMove, true)
      doc.removeEventListener('mouseout', onOut, true)
      doc.removeEventListener('pointerdown', cancel, true)
      doc.removeEventListener('pointerup', onUp, true)
      stopGameWatch()
    }
  }
}
