// Ticked rows in a list you review in bulk (the Prices tab's lists): pick all
// or none, pick where, and shift + click to set a run of rows like a file list.
import { computed, reactive, watch } from 'vue'

export function usePicks<T> (list: () => T[], key: (t: T) => string, initial: (t: T) => boolean = () => false) {
  const ticked = reactive(new Map<string, boolean>())
  // The row shift + click counts from; cleared when the list changes under it.
  let last: number | null = null
  watch(list, (rows) => {
    last = null
    for (const t of rows) if (!ticked.has(key(t))) ticked.set(key(t), initial(t))
  }, { immediate: true })

  const isPicked = (t: T) => ticked.get(key(t)) === true
  const picked = computed(() => list().filter(isPicked))
  const all = computed(() => list().length > 0 && picked.value.length === list().length)
  const some = computed(() => picked.value.length > 0 && !all.value)

  function where (want: (t: T) => boolean) {
    for (const t of list()) ticked.set(key(t), want(t))
    last = null
  }

  // Read once: `all` changes as the loop ticks rows.
  function allOrNone (e: Event) {
    const on = !all.value
    where(() => on)
    ;(e.target as HTMLInputElement).checked = on
  }

  // Shift + click sets every row from the last box clicked to this one to this
  // box's new state.
  function click (e: MouseEvent, n: number) {
    const on = (e.target as HTMLInputElement).checked
    const rows = list()
    if (n >= rows.length) return
    if (e.shiftKey && last != null && last < rows.length) {
      const [a, b] = last < n ? [last, n] : [n, last]
      for (let i = a; i <= b; i++) ticked.set(key(rows[i]), on)
    } else {
      ticked.set(key(rows[n]), on)
    }
    last = n
  }

  // Rows that left the list (acted on) start fresh if they come back.
  function forget (rows: T[]) {
    for (const t of rows) ticked.delete(key(t))
  }

  return { isPicked, picked, all, some, where, allOrNone, click, forget }
}
