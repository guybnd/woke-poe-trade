import { shallowRef, watch } from 'vue'

// Which price check view to show. 'classic' is APT's listing table untouched;
// 'improved' adds the verdict card and marks listings the verdict ignored.
export type PriceView = 'classic' | 'improved'

const STORAGE_KEY = 'woke.priceView'

function readStored (): PriceView {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'classic' || v === 'improved') return v
  } catch {}
  return 'improved'
}

export const priceView = shallowRef<PriceView>(readStored())

watch(priceView, (v) => {
  try { localStorage.setItem(STORAGE_KEY, v) } catch {}
})

window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY && (e.newValue === 'classic' || e.newValue === 'improved')) {
    priceView.value = e.newValue
  }
})

// Verdict card: one line by default; expanded shows notes, poe.ninja and
// the price drivers. The chart opens from the sparkline.
export const verdictExpanded = shallowRef(false)
export const historyOpen = shallowRef(false)

// Every new item starts collapsed. Changing a filter on the same item doesn't
// count, even if that rebuilds the verdict.
let lastItem: unknown = null
export function collapseForNewItem (item: unknown): void {
  if (item === lastItem) return
  lastItem = item
  verdictExpanded.value = false
  historyOpen.value = false
}

// The poe.ninja card above the filters (before a search): folded into a chip on
// the name row by default, so it costs no height. Remembered between checks and restarts.
const NINJA_KEY = 'woke.ninjaCardOpen'
function readNinjaOpen (): boolean {
  try { return localStorage.getItem(NINJA_KEY) === '1' } catch { return false }
}
export const ninjaCardOpen = shallowRef(readNinjaOpen())
watch(ninjaCardOpen, (v) => {
  try { localStorage.setItem(NINJA_KEY, v ? '1' : '0') } catch {}
})
window.addEventListener('storage', (e) => {
  if (e.key === NINJA_KEY) ninjaCardOpen.value = e.newValue === '1'
})
