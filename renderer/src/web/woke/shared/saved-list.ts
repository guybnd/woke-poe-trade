// What every saved list (Regex library, Trade searches, then Atlas strategies
// and PoB builds) does the same way: the row keys and removing with Undo.

export interface RowKeyActions {
  remove?: () => void
  copy?: () => void
  rename?: () => void
}

// A row's keys: Delete (or Backspace) removes, Ctrl + C copies, F2 renames. For @keydown on
// the row; a key the list has no action for passes on.
// `backspace`: Backspace removes too (Vue's @keydown.delete took both).
export function rowKeys (actions: RowKeyActions, opts: { backspace?: boolean } = {}) {
  const backspace = opts.backspace ?? true
  return (e: KeyboardEvent) => {
    // Backspace too, as the lists' old @keydown.delete did.
    const act = (e.key === 'Delete' || (backspace && e.key === 'Backspace')) && !e.ctrlKey && !e.altKey
      ? actions.remove
      : (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'c'
          ? actions.copy
          : e.key === 'F2' ? actions.rename : undefined
    if (!act) return
    e.preventDefault()
    act()
  }
}

// Takes entries out of a list; `restore` puts back just them, each where it
// was, in whatever the list has become since (edits and adds stay). One whose
// id an entry added since took comes back under `freshId` (given the list).
export function removeEntries<T extends { id: number }> (list: readonly T[], ids: Iterable<number>): { list: T[], removed: T[], restore: (now: readonly T[], freshId: (list: readonly T[]) => number) => T[] } | null {
  const want = new Set(ids)
  const at = list.map((e, i) => want.has(e.id) ? i : -1).filter(i => i >= 0)
  if (!at.length) return null
  const removed = at.map(i => list[i])
  return {
    list: list.filter(e => !want.has(e.id)),
    removed,
    restore (now, freshId) {
      let out = [...now]
      removed.forEach((r, k) => {
        const back = out.some(e => e.id === r.id) ? { ...r, id: freshId(out) } : r
        const i = Math.min(at[k], out.length)
        out = [...out.slice(0, i), back, ...out.slice(i)]
      })
      return out
    }
  }
}

// One entry: removeEntries for one id.
export function removeEntry<T extends { id: number }> (list: readonly T[], id: number) {
  return removeEntries(list, [id])
}

// The rows a saved list's window "?" lists (shared/SavedTree's keys).
export function savedListKeys (opts: { copy: boolean }): Array<{ keys: string, label: string }> {
  return [
    { keys: 'F2', label: 'Rename' },
    { keys: 'Delete', label: 'Remove (Undo for a moment after)' },
    ...(opts.copy ? [{ keys: 'Ctrl + C', label: 'Copy' }] : []),
    { keys: 'Ctrl + Click', label: 'Pick another row' },
    { keys: 'Shift + Click', label: 'Pick the rows between' },
    { keys: 'Alt + Up', label: 'Move it up (Alt + Down: down)' }
  ]
}
