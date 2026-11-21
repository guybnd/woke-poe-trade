// Every `title` hover in the overlay shows in the app's own card, the same look
// as the WInfo card (HelpCard.vue), not the browser's grey tooltip. One listener
// for the whole page, so a plain `title="…"` anywhere just works.
//
// The browser draws its tooltip from the attribute, so while the pointer is on
// the element the title is taken off it, and put back when the pointer leaves.
// A press hides the card until the pointer leaves, with the title still off (put
// back, the browser would show it on the next nudge). A title that changes while
// hovered (Vue updating `:title`) is taken again and the card follows.
//
// Installed by page-hooks.ts, outside startup JS. The card draws itself (no
// Vue) and never covers a WInfo card or the item tooltip (v-item-tip).
//
// `data-tip-keys="Ctrl + Enter"` on the element adds its shortcut under the
// text as boxed keys, like WKbd.
//
// Opt out with `data-native-title` on the element or a parent. The e2e harness
// turns it off (window.__wokeNativeTitles) so getByTitle finds hovered elements.
import { watch } from 'vue'
import { helpTip } from './help-tip'
import { tip as gameTip } from './tooltip/tooltip'
import { hotkeyParts } from './key-label'

const COLD_MS = 450
// Moving from one title straight to the next shows it at once, like the system tooltip.
const WARM_MS = 600

const CARD_STYLE = [
  'position:fixed', 'z-index:1002', 'zoom:var(--w-ui-scale,1)', 'left:0', 'top:0',
  'width:max-content', 'max-width:300px', 'padding:8px 10px', 'pointer-events:none',
  'background:var(--w-tip-bg)', 'border:1px solid var(--w-line-strong)', 'border-radius:var(--w-r-sm)',
  'box-shadow:var(--w-shadow)', 'color:var(--w-fg)', 'font-size:var(--w-fs-sm)', 'font-weight:400',
  'line-height:1.45', 'white-space:pre-line', 'text-align:left', 'overflow-wrap:anywhere'
].join(';')
const KEYS_STYLE = 'display:flex;gap:3px;margin-top:5px'
const KBD_STYLE = [
  'font-family:var(--w-num)', 'font-size:var(--w-fs-xs)', 'line-height:calc(14px * var(--w-text-scale, 1))', 'padding:0 5px',
  'border:1px solid var(--w-line-strong)', 'border-bottom-width:2px', 'border-radius:var(--w-r-sm)', 'color:var(--w-fg)'
].join(';')

// The card's content: the text, then the shortcut's keys if the element names one.
export function fillTipCard (card: HTMLElement, text: string, keys: string | null) {
  card.textContent = text.trim()
  const parts = hotkeyParts(keys)
  if (!parts.length) return
  const row = card.ownerDocument.createElement('div')
  row.setAttribute('style', KEYS_STYLE)
  for (const k of parts) {
    const kbd = card.ownerDocument.createElement('kbd')
    kbd.setAttribute('style', KBD_STYLE)
    kbd.textContent = k
    row.appendChild(kbd)
  }
  card.appendChild(row)
}

export function installTitleTips (doc: Document = document): () => void {
  const win = doc.defaultView
  if (!win || (win as unknown as { __wokeNativeTitles?: boolean }).__wokeNativeTitles) return () => {}
  let card: HTMLElement | null = null
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
    if (now != null) take(held)
    text = now
    if (!now?.trim()) hide()
    else if (card) show()
  })

  function take (el: HTMLElement) {
    el.removeAttribute('title')
    observer.takeRecords()
  }

  function show () {
    if (!held || muted || !text?.trim() || !held.isConnected) return
    // Never over a WInfo card or the item tooltip.
    if (helpTip.value || gameTip.value) return
    lastShown = Date.now()
    if (!card) {
      card = doc.createElement('div')
      card.setAttribute('role', 'tooltip')
      card.setAttribute('data-w-popup', '')
      card.setAttribute('style', CARD_STYLE + ';visibility:hidden')
      doc.body.appendChild(card)
    }
    fillTipCard(card, text, held.getAttribute('data-tip-keys'))
    // With CSS zoom, left and top are in zoomed units.
    const scale = parseFloat(win!.getComputedStyle(doc.documentElement).getPropertyValue('--w-ui-scale')) || 1
    const r = card.getBoundingClientRect()
    const p = placeAtPointer(at, r, { width: win!.innerWidth, height: win!.innerHeight })
    card.style.left = `${p.left / scale}px`
    card.style.top = `${p.top / scale}px`
    card.style.visibility = 'visible'
  }

  function hide () {
    clearTimeout(timer)
    timer = undefined
    if (card) {
      lastShown = Date.now()
      card.remove()
      card = null
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

  // The element whose title the browser would show for this target.
  function titled (target: EventTarget | null): HTMLElement | null {
    let node = target instanceof Element ? target : null
    while (node && node !== doc.documentElement) {
      if (node.hasAttribute('data-native-title')) return null
      const t = node.getAttribute('title')
      if (t?.trim()) return node instanceof HTMLElement && !(node instanceof HTMLIFrameElement) ? node : null
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
    if (found !== held) {
      release()
      if (!found || e.buttons !== 0) return
      held = found
      text = held.getAttribute('title')
      take(held)
      observer.observe(held, { attributes: true, attributeFilter: ['title'] })
    }
    if (muted || card || timer) return
    if (Date.now() - lastShown < WARM_MS) show()
    else timer = setTimeout(() => { timer = undefined; show() }, COLD_MS)
  }

  // Installed mid-hover: the pointer's element had its mouseover before this ran.
  let primed = false
  function onMove (e: MouseEvent) {
    if (!primed) {
      primed = true
      onOver(e)
    }
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

  // Pressed, focus to the game, a scroll or a drag: no card, and none pending,
  // until the pointer leaves.
  function cancel () {
    if (!held) return
    muted = true
    hide()
  }

  // A WInfo card or the item tooltip came up (the item's data loads on first hover).
  const stopWatch = watch([helpTip, gameTip], ([h, g]) => { if (h || g) hide() })

  const listen: Array<[EventTarget, string, EventListener, AddEventListenerOptions | boolean]> = [
    [doc, 'mouseover', onOver as EventListener, true],
    [doc, 'mousemove', onMove as EventListener, { capture: true, passive: true }],
    [doc, 'mouseout', onOut as EventListener, true],
    [doc, 'pointerdown', cancel, true],
    [doc, 'pointerup', onUp as EventListener, true],
    [win, 'blur', cancel, false],
    [win, 'scroll', cancel, true],
    [win, 'dragstart', cancel, true]
  ]
  for (const [t, type, fn, opts] of listen) t.addEventListener(type, fn, opts)
  return () => {
    release()
    stopWatch()
    for (const [t, type, fn, opts] of listen) t.removeEventListener(type, fn, opts)
  }
}

// Under the pointer, the way the system tooltip sits; above it when there's no
// room below. Kept inside the window.
export function placeAtPointer (
  at: { x: number, y: number },
  card: { width: number, height: number },
  screen: { width: number, height: number }
): { left: number, top: number } {
  const GAP = 8
  const left = Math.max(GAP, Math.min(at.x - 8, screen.width - card.width - GAP))
  const below = at.y + 20
  const top = below + card.height <= screen.height - GAP
    ? below
    : Math.max(GAP, at.y - 8 - card.height)
  return { left, top }
}
