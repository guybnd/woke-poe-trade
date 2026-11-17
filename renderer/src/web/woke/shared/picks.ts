// Picking several rows with Ctrl and Shift, one way for every list: the loot
// filter's item chips, the Gear tab's lanes, the Prices tab's ticked rows and
// the Atlas strategies list. Each list keeps its own picks; these decide
// what a click does to them.

export interface PickClick { shift: boolean, ctrl: boolean }

export function clickOf (e: MouseEvent | KeyboardEvent): PickClick {
  return { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey }
}

// The rows from one to the other, either way round; null when either left.
export function runOf<K> (list: readonly K[], from: K, to: K): K[] | null {
  const a = list.indexOf(from)
  const b = list.indexOf(to)
  if (a < 0 || b < 0) return null
  return list.slice(Math.min(a, b), Math.max(a, b) + 1)
}

// Toggle lists (chips, lane buttons, check boxes): a click or Ctrl+click
// picks or unpicks one and keeps the others; Shift+click adds the run from
// the last one clicked (the anchor). With no anchor in the list, Shift is a
// plain click.
export function togglePick<K> (list: readonly K[], picked: readonly K[], k: K, click: PickClick, anchor: K | null): K[] {
  const run = click.shift && anchor != null ? runOf(list, anchor, k) : null
  if (run) return [...new Set([...picked, ...run])]
  return picked.includes(k) ? picked.filter(x => x !== k) : [...picked, k]
}

// File lists (Atlas strategies): a click opens one and drops the picks;
// Ctrl+click picks or unpicks one, starting from the open one; Shift+click
// picks the run from the open one, which stays open. `anchor` is the open one.
export function selectPick<K> (list: readonly K[], picked: readonly K[], k: K, click: PickClick, anchor: K | null): { picked: K[], anchor: K | null } {
  if (click.ctrl) {
    const now = picked.length ? picked : (anchor != null && list.includes(anchor) ? [anchor] : [])
    const next = now.includes(k) ? now.filter(x => x !== k) : [...now, k]
    return { picked: next, anchor: next.includes(k) ? k : anchor }
  }
  const run = click.shift && anchor != null ? runOf(list, anchor, k) : null
  if (run) return { picked: run, anchor }
  return { picked: [], anchor: k }
}
