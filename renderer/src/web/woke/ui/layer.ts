// Overlay-wide layer for the shared right-click menu (pick C1) and the
// done/undo notes (pick T1). Both render in OverlayLayer.vue, mounted once.
import { shallowRef } from 'vue'

export type MenuEntry =
  | {
    label: string
    action: () => void
    icon?: string // Font Awesome class, for UI actions (P18)
    gameIcon?: string // image URL, for game things
    keys?: string // shown as a key cap, e.g. "Ctrl + C" (P8)
    danger?: boolean
    disabled?: boolean
    labelStyle?: Record<string, string> // draws the label as what it stands for
  }
  | { separator: true }

export interface MenuState { items: MenuEntry[], x: number, y: number }

export const menuState = shallowRef<MenuState | null>(null)

// Open at the mouse (or a point). Destructive items go last, after a separator.
export function openMenu (at: MouseEvent | { x: number, y: number }, items: MenuEntry[]) {
  const x = 'clientX' in at ? at.clientX : at.x
  const y = 'clientY' in at ? at.clientY : at.y
  if ('preventDefault' in at) at.preventDefault()
  menuState.value = { items, x, y }
}
export function closeMenu () { menuState.value = null }

export interface Toast {
  id: number
  text: string
  undo?: () => void
  // Where it wants to be, in screen pixels: centred on x, with its top at y. The
  // note fits itself to the window once it knows its size (see ToastRow).
  x: number
  y: number
  // A dock icon's top and bottom: the note stands above it if there's room,
  // else hangs below it.
  beside?: { top: number, bottom: number }
  // Takes the mouse while it's over it, so Undo can be clicked in game.
  clickable: boolean
}

export const toasts = shallowRef<Toast[]>([])
let nextId = 1

// Short note after an action, with Undo when given (P9: no "are you sure").
// Shown at the bottom of `anchor` (usually the panel), else the screen; 5 s.
// `dock`: from a dock icon's menu, while you may be playing. Sits clear of the
// row, so nothing moves under it, and Undo can be clicked.
export function toast (text: string, opts: { undo?: () => void, anchor?: Element | null, ms?: number, dock?: boolean } = {}) {
  const box = opts.anchor?.getBoundingClientRect()
  // A hidden panel has no size: its corner would put the note off screen.
  const r = box && box.width > 0 && box.height > 0 ? box : undefined
  const t: Toast = {
    id: nextId++,
    text,
    undo: opts.undo,
    x: r ? r.left + r.width / 2 : window.innerWidth / 2,
    y: r ? r.bottom - 10 : window.innerHeight - 80,
    beside: r && opts.dock ? { top: r.top, bottom: r.bottom } : undefined,
    clickable: opts.dock === true && opts.undo != null
  }
  toasts.value = [...toasts.value.filter(o => Math.abs(o.y - t.y) > 4 || Math.abs(o.x - t.x) > 4), t]
  setTimeout(() => dismissToast(t.id), opts.ms ?? 5000)
  return t.id
}

export function dismissToast (id: number) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

// After jumping through history, an older note's Undo would put back old settings.
export function clearUndoToasts () {
  toasts.value = toasts.value.filter(t => !t.undo)
}

export function hasUndoToast (): boolean {
  return toasts.value.some(t => t.undo)
}

export function undoToast (id?: number) {
  const t = id != null ? toasts.value.find(o => o.id === id) : [...toasts.value].reverse().find(o => o.undo)
  if (!t?.undo) return false
  t.undo()
  dismissToast(t.id)
  return true
}
