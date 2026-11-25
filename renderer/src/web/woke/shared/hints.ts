// Tips that teach a hidden gesture where it's used (Guy's picks, hidden-features
// audit 2026-11-25): a tip line at a window's foot, a key line in a tooltip.
//
// The rules every tip follows:
// - Never in a map: only with the overlay open, or in town / hideout.
// - Gone for good the first time you do what it teaches (retireHint), or after
//   a few overlay opens if you never do.
// - One window tip at a time (tooltip lines don't take the slot).
// - One switch: Settings › Look & icon row › Tips.
//
// Small and Vue-only, so it can sit in startup JS.
import { computed, onScopeDispose, shallowRef, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { zone } from './zone'

export interface HintsConfig {
  // Tips switched off.
  off?: boolean
  // Overlay opens each tip has shown in.
  shows?: Record<string, number>
  // Tips retired: used once, or closed with ×.
  done?: string[]
}

export const DEFAULT_SHOWS = 3

// The overlay is open (it has focus). Set by OverlayWindow.
export const overlayOpen = shallowRef(false)
// Bumps every time the overlay opens: a tip counts one showing per open.
const session = shallowRef(0)
export function setOverlayOpen (open: boolean): void {
  if (open && !overlayOpen.value) session.value++
  overlayOpen.value = open
}

// The window tip on screen, by id. Tooltip lines don't take it.
const slot = shallowRef<string | null>(null)
// The session each tip was last counted in.
const counted = new Map<string, number>()

// Where the state lives (the app config's woke.hints). Set by OverlayWindow,
// so this file needs no Config import (it loads in plain-node unit tests).
let wokeOf: () => { hints?: HintsConfig } | undefined = () => undefined
export function bindHintsConfig (fn: () => { hints?: HintsConfig } | undefined): void {
  wokeOf = fn
}

function hintsOf (): HintsConfig | undefined {
  return wokeOf()?.hints
}

function ensureHints (): HintsConfig | null {
  const woke = wokeOf()
  if (!woke) return null
  woke.hints ??= {}
  return woke.hints
}

export function hintsOff (): boolean {
  return hintsOf()?.off === true
}

export function isHintDone (id: string): boolean {
  return hintsOf()?.done?.includes(id) === true
}

// The player did what the tip teaches (or closed it): never shown again.
export function retireHint (id: string): void {
  if (slot.value === id) slot.value = null
  const h = ensureHints()
  if (!h || h.done?.includes(id)) return
  h.done = [...(h.done ?? []), id]
}

// Where tips may show: with the overlay open, or out of combat.
export function hintPlaceOk (): boolean {
  if (overlayOpen.value) return true
  const kind = zone.kind
  return kind == null || kind === 'town' || kind === 'hideout'
}

function countShow (id: string): void {
  if (counted.get(id) === session.value) return
  counted.set(id, session.value)
  const h = ensureHints()
  if (!h) return
  h.shows = { ...h.shows, [id]: (h.shows?.[id] ?? 0) + 1 }
}

// The pure part of whether a tip may show, for tests.
export function hintEligible (h: HintsConfig | undefined, id: string, max: number, countedThisOpen: boolean): boolean {
  if (h?.off || h?.done?.includes(id)) return false
  return (h?.shows?.[id] ?? 0) < max || countedThisOpen
}

export interface HintOptions {
  // Overlay opens it shows in before it gives up (default 3).
  shows?: number
  // false: a tooltip line, which doesn't take the one window slot.
  slot?: boolean
  // Shown only while this is true (the thing it teaches is on screen).
  when?: () => boolean
}

export interface Hint {
  show: ComputedRef<boolean>
  // × on the tip, or the gesture used: gone for good.
  retire: () => void
}

// For a component that shows a tip. Call in setup.
export function useHint (id: string, opts: HintOptions = {}): Hint {
  const max = opts.shows ?? DEFAULT_SHOWS
  const usesSlot = opts.slot !== false
  const eligible = computed(() => {
    if (opts.when && !opts.when()) return false
    if (!hintPlaceOk()) return false
    return hintEligible(hintsOf(), id, max, counted.get(id) === session.value)
  })
  watch([eligible, slot], ([on, held]) => {
    if (!usesSlot) return
    if (on && held == null) slot.value = id
    else if (!on && held === id) slot.value = null
  }, { immediate: true })
  const show = computed(() => eligible.value && (!usesSlot || slot.value === id))
  watch([show, session], ([on]) => { if (on) countShow(id) }, { immediate: true })
  onScopeDispose(() => { if (slot.value === id) slot.value = null })
  return { show, retire: () => retireHint(id) }
}
