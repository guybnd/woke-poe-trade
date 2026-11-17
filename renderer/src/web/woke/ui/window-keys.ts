// A window's own keys, the same in every window, and the list its "?" shows:
//   Ctrl + Z undo, Ctrl + Y or Ctrl + Shift + Z redo, Ctrl + S save,
//   Esc close, mouse back / forward buttons.
// A key counts when it comes from inside the window (or from the page, right
// after a click inside: a clicked thing that goes away drops focus there).
// Undo and redo skip text fields (they have their own) and leave Ctrl + Z to
// an Undo note on screen, which ends in the same place; a window that took
// the key stops the note's Ctrl + Z too. In the app Esc goes to
// the game first; there it only reaches a window outside the app (browser).
import { onMounted, onUnmounted } from 'vue'
import type { HelpKey } from './help-tip'
import { hasUndoToast } from './layer'
import { useMouseNav } from './mouse-nav'

export interface WindowKeyActions {
  undo?: () => void
  redo?: () => void
  // `repeat`: the key is held down.
  save?: (repeat: boolean) => void
  close?: () => void
  back?: () => void
  forward?: () => void
}

export interface WindowKeyOptions {
  // The window is up (hidden windows stay mounted).
  shown?: () => boolean
  // Undo and redo from anywhere while the window is up, not only from inside:
  // the window is what you're editing (the loot filter).
  undoAnywhere?: boolean
  // Esc also when focus is outside the window (Settings).
  closeAnywhere?: boolean
}

function typing (t: EventTarget | null): boolean {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

// The rows a window's "?" lists for the keys it has.
export function windowKeyHelp (actions: WindowKeyActions): HelpKey[] {
  const out: HelpKey[] = []
  if (actions.undo) out.push({ keys: 'Ctrl + Z', label: 'Undo' })
  if (actions.redo) out.push({ keys: 'Ctrl + Y', label: 'Redo' })
  if (actions.save) out.push({ keys: 'Ctrl + S', label: 'Save' })
  if (actions.close) out.push({ keys: 'Esc', label: 'Close' })
  if (actions.back) out.push({ keys: 'Mouse back', label: 'Back' })
  if (actions.forward) out.push({ keys: 'Mouse forward', label: 'Forward' })
  return out
}

// What a key does in a window, apart from the page: the action to run, or
// null. Exported for tests.
export function windowKeyAction (
  e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey' | 'defaultPrevented' | 'target'>,
  actions: WindowKeyActions,
  where: { inside: boolean, shown: boolean, toast: boolean },
  opts: WindowKeyOptions = {}
): keyof WindowKeyActions | null {
  if (e.defaultPrevented || e.altKey || !where.shown) return null
  const key = e.key.toLowerCase()
  if (key === 'escape') {
    // A field that wants Esc for itself stops it first.
    return actions.close && (where.inside || opts.closeAnywhere) ? 'close' : null
  }
  if (!(e.ctrlKey || e.metaKey)) return null
  if (key === 's' && !e.shiftKey) return actions.save && where.inside ? 'save' : null
  if (typing(e.target) || !(where.inside || opts.undoAnywhere)) return null
  if (key === 'z' && !e.shiftKey) return actions.undo && !where.toast ? 'undo' : null
  if (key === 'y' || (key === 'z' && e.shiftKey)) return actions.redo ? 'redo' : null
  return null
}

export function useWindowKeys (el: () => Element | null | undefined, actions: WindowKeyActions, opts: WindowKeyOptions = {}) {
  let lastClickInside = false
  function onPointer (e: PointerEvent) {
    lastClickInside = !!el()?.contains(e.target as Node)
  }
  function onKey (e: KeyboardEvent) {
    const root = el()
    const inside = !!root && (root.contains(e.target as Node) || (e.target === document.body && lastClickInside))
    const what = windowKeyAction(e, actions, { inside, shown: opts.shown?.() ?? true, toast: hasUndoToast() }, opts)
    if (!what) return
    e.preventDefault()
    if (what === 'save') actions.save!(e.repeat)
    else actions[what]!()
  }
  // Only a window with keys listens for them (perf: listeners add up).
  if (actions.undo || actions.redo || actions.save || actions.close) {
    onMounted(() => {
      window.addEventListener('pointerdown', onPointer, true)
      window.addEventListener('keydown', onKey)
    })
    onUnmounted(() => {
      window.removeEventListener('pointerdown', onPointer, true)
      window.removeEventListener('keydown', onKey)
    })
  }
  if (actions.back || actions.forward) useMouseNav(el, { back: () => actions.back?.(), forward: actions.forward })
  return { help: windowKeyHelp(actions) }
}
