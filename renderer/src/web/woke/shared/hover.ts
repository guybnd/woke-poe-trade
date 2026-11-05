// Hover that also works while the game has focus. The overlay window is
// click-through then, so the DOM sees no mouse; main/src/woke/hover.ts watches
// the global mouse against the rects we register here.
import { nextTick, shallowRef, watch, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { Host } from '@/web/background/IPC'

let nextOwner = 1

// Bumped when zones may have moved with no size change (dock icons shifting as
// one comes or goes): otherwise main has the old place for up to 2 s.
const zonesMoved = shallowRef(0)
export function hoverZonesMoved () { zonesMoved.value++ }

export function useHoverZone (
  el: Ref<HTMLElement | null | undefined>,
  opts: {
    // Make the overlay clickable after the mouse rests on the zone.
    activate?: () => boolean
    // Register only while this returns true.
    enabled: () => boolean
    // The left button went down on the zone, even while the game has focus
    // (the game gets that click too). `taken`: the mouse was already taken, so
    // the game did not get it.
    onClick?: (taken: boolean) => void
    // The right button went down on the zone, with the mouse already taken (so
    // the game didn't get it).
    onRightClick?: () => void
  }
): Ref<boolean> {
  const owner = `woke-hover-${nextOwner++}`
  const zoneId = `${owner}:0`
  const hostInside = shallowRef(false)
  const domInside = shallowRef(false)
  const inside = shallowRef(false)

  // In the app the main process always knows. The DOM doesn't: the window stops
  // seeing the mouse as it goes click-through, so a mouseleave can go missing.
  const sync = () => { inside.value = Host.isElectron ? hostInside.value : domInside.value }

  function send () {
    const node = el.value
    const enabled = opts.enabled() && node && Host.isElectron
    const zones = []
    if (enabled) {
      const r = node.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) {
        zones.push({
          id: zoneId,
          x: window.screenX + r.left,
          y: window.screenY + r.top,
          width: r.width,
          height: r.height,
          activate: opts.activate?.() ?? false
        })
      }
    }
    if (!zones.length) { hostInside.value = false; sync() }
    post(zones)
  }

  // Last zones the main process accepted; unchanged zones aren't resent.
  let lastSent: string | null = null

  function post (zones: Array<{ id: string, x: number, y: number, width: number, height: number, activate: boolean }>) {
    const key = JSON.stringify(zones)
    if (key === lastSent) return
    // The socket may not be open yet right after startup; the periodic check catches up.
    try {
      Host.sendEvent({ name: 'OVERLAY->MAIN::woke-hover-zones', payload: { owner, zones, dpr: window.devicePixelRatio } })
      lastSent = key
    } catch {}
  }

  const listener = Host.onEvent('MAIN->OVERLAY::woke-hover', (e) => {
    if (e.id !== zoneId) return
    hostInside.value = e.inside
    sync()
  })
  const clickListener = Host.onEvent('MAIN->OVERLAY::woke-hover-click', (e) => {
    if (e.id === zoneId) opts.onClick?.(e.taken)
  })

  const contextListener = Host.onEvent('MAIN->OVERLAY::woke-hover-context', (e) => {
    if (e.id === zoneId) opts.onRightClick?.()
  })

  const onEnter = () => { domInside.value = true; sync() }
  const onLeave = () => { domInside.value = false; sync() }

  let observer: ResizeObserver | null = null
  let bound: HTMLElement | null = null
  function bind (node: HTMLElement | null | undefined) {
    if (bound) {
      bound.removeEventListener('mouseenter', onEnter)
      bound.removeEventListener('mouseleave', onLeave)
      observer?.unobserve(bound)
    }
    bound = node ?? null
    if (bound) {
      bound.addEventListener('mouseenter', onEnter)
      bound.addEventListener('mouseleave', onLeave)
      observer?.observe(bound)
    }
  }

  // Widgets move by changing their anchor, which also changes the rect;
  // a cheap periodic check covers drags and window moves (sent only if changed).
  let timer: ReturnType<typeof setInterval> | null = null
  onMounted(() => {
    observer = new ResizeObserver(() => send())
    bind(el.value)
    send()
    timer = setInterval(send, 2000)
  })
  watch(el, (node) => { bind(node); send() })
  watch(() => [opts.enabled(), opts.activate?.()], () => send())
  watch(zonesMoved, () => { nextTick(send).catch(() => {}) })

  onUnmounted(() => {
    listener.abort()
    clickListener.abort()
    contextListener.abort()
    bind(null)
    observer?.disconnect()
    if (timer) clearInterval(timer)
    lastSent = null
    post([])
  })

  return inside
}
