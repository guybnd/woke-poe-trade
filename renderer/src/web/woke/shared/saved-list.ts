// What every saved list (Regex library, Trade searches, then Atlas strategies
// and PoB builds) does the same way: the row keys, removing with Undo, and
// renaming in place.
import { nextTick, shallowRef } from 'vue'

export interface RowKeyActions {
  remove?: () => void
  copy?: () => void
  rename?: () => void
}

// A row's keys: Delete removes, Ctrl + C copies, F2 renames. For @keydown on
// the row; a key the list has no action for passes on.
export function rowKeys (actions: RowKeyActions) {
  return (e: KeyboardEvent) => {
    const act = e.key === 'Delete' && !e.ctrlKey && !e.altKey
      ? actions.remove
      : (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'c'
          ? actions.copy
          : e.key === 'F2' ? actions.rename : undefined
    if (!act) return
    e.preventDefault()
    act()
  }
}

// Takes one entry out of a list; `restore` puts back just it, where it was, in
// whatever the list has become since (edits and adds stay). An entry added
// since may have taken its id: then it comes back under `freshId`.
export function removeEntry<T extends { id: number }> (list: readonly T[], id: number): { list: T[], restore: (now: readonly T[], freshId: () => number) => T[] } | null {
  const at = list.findIndex(e => e.id === id)
  if (at < 0) return null
  const removed = list[at]
  return {
    list: list.filter(e => e.id !== id),
    restore (now, freshId) {
      const back = now.some(e => e.id === removed.id) ? { ...removed, id: freshId() } : removed
      const i = Math.min(at, now.length)
      return [...now.slice(0, i), back, ...now.slice(i)]
    }
  }
}

// One name field at a time, by key ("entry:3", "folder:Gems", "new"): it
// takes focus with its text picked; Enter or leaving it keeps the name, Esc
// drops it. The field carries `data-draft`.
export function useDraftName (root: () => Element | null | undefined) {
  const editing = shallowRef<string | null>(null)
  const draft = shallowRef('')
  async function start (key: string, value = '') {
    draft.value = value
    editing.value = key
    await nextTick()
    const input = root()?.querySelector<HTMLInputElement>('[data-draft]')
    input?.focus()
    input?.select()
  }
  // The typed name, trimmed, when `key` is the field open (once).
  function finish (key: string): string | null {
    if (editing.value !== key) return null
    editing.value = null
    return draft.value.trim()
  }
  function cancel () { editing.value = null }
  return { editing, draft, start, finish, cancel }
}
