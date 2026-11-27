// The keys of a search box with a list of items under it (WItemPicker.vue):
// arrows move the highlight (wrapping round), Enter picks it, Esc closes
// (empties the box).

export type PickerStep =
  | { kind: 'move', hl: number }
  | { kind: 'pick', hl: number }
  | { kind: 'close' }

export function pickerKey (key: string, hl: number, count: number, hasQuery = false): PickerStep | null {
  // Esc closes the list, or empties the box when nothing matched (as WField does).
  if (key === 'Escape') return count || hasQuery ? { kind: 'close' } : null
  if (!count) return null
  const at = Math.min(Math.max(hl, 0), count - 1)
  if (key === 'ArrowDown') return { kind: 'move', hl: (at + 1) % count }
  if (key === 'ArrowUp') return { kind: 'move', hl: (at - 1 + count) % count }
  if (key === 'Enter') return { kind: 'pick', hl: at }
  return null
}
