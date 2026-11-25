// The shared profit line item (Guy's picks A4, S1, E2, N1): every list that
// adds up loot, costs or value (Net worth, Runs, ...) offers the same actions
// with the same words. The number itself is clicked to edit it (WLineNum),
// hover shows ⊘ leave out and ⋯ (WLineActs), right-click opens the same menu.
// Left-out rows stay in place, dimmed and struck; your numbers show in gold
// with a pin. Leave out and remove show a toast with Undo.
import type { MenuEntry } from './layer'
import { toast } from './layer'
import { retireHint } from '../shared/hints'

// The tip under Net worth's rows (NetWorthPanel.vue): gone once a number is
// clicked or a row left out.
export const LINE_HINT = 'line-item-clicks'

export interface LineState {
  out?: boolean
  edited?: boolean
  // Has numbers you can change (default true).
  editable?: boolean
  // Can be left out of the totals (default true).
  canLeaveOut?: boolean
  removable?: boolean
}

export interface LineHandlers {
  edit?: () => void
  reset?: () => void
  out?: (on: boolean) => void
  remove?: () => void
}

export interface LineWords {
  // "Edit how many and the price" (Runs) or "Set my price…" (Holdings).
  edit?: string
  // "Back to as read" (Runs) or "Back to poe.ninja's price" (Holdings).
  reset?: string
}

export const LEAVE_OUT = 'Leave out'
export const COUNT_AGAIN = 'Count it again'

// The menu (⋯ and right-click). Same lines, same order, everywhere.
export function lineMenu (s: LineState, on: LineHandlers, words: LineWords = {}, extra: MenuEntry[] = []): MenuEntry[] {
  const editable = s.editable !== false
  const canLeaveOut = s.canLeaveOut !== false
  const items: MenuEntry[] = []
  if (editable && !s.out && on.edit) items.push({ label: words.edit ?? 'Edit how many and the price', icon: 'fas fa-pen', keys: 'Enter', action: on.edit })
  if (s.edited && !s.out && on.reset) items.push({ label: words.reset ?? 'Back to as read', icon: 'fas fa-undo', action: on.reset })
  if (canLeaveOut && on.out) {
    const out = on.out
    items.push(s.out
      ? { label: COUNT_AGAIN, icon: 'fas fa-undo', keys: 'Del', action: () => { out(false) } }
      : { label: LEAVE_OUT, icon: 'fas fa-ban', keys: 'Del', action: () => { out(true) } })
  }
  if (s.removable && on.remove) items.push({ label: 'Remove', icon: 'fas fa-trash-alt', danger: true, action: on.remove })
  if (extra.length) items.push({ separator: true }, ...extra)
  return items
}

// The toast after a leave out or a remove, with Undo.
export function lineToast (what: 'out' | 'in' | 'remove', name: string, undo: () => void, anchor?: Element | null) {
  if (what === 'out') retireHint(LINE_HINT)
  const text = what === 'out' ? `Left out ${name}` : what === 'in' ? `${name} counts again` : `Removed ${name}`
  toast(text, { undo, anchor })
}

// A focused row's keys: Enter edits, Delete leaves out (or counts again).
// Only on the row itself, so a key in its inputs or buttons does its own thing.
export function lineKeys (e: KeyboardEvent, s: LineState, on: LineHandlers) {
  if (e.target !== e.currentTarget) return
  if (e.key === 'Enter' && s.editable !== false && !s.out && on.edit) { e.preventDefault(); on.edit() } else if (e.key === 'Delete' && s.canLeaveOut !== false && on.out) { e.preventDefault(); on.out(!s.out) }
}
