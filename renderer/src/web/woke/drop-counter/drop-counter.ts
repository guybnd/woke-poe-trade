// The streamer-style tally: items you chose, +1 when one drops, and how many
// maps you've run. PoE doesn't log pickups, so counts come from you; maps come
// from Client.txt (with the same rule as Farming) and can be corrected by hand.
import type { Widget, Anchor } from '@/web/overlay/widgets'

export const DROP_COUNTER_TYPE = 'woke-drop-counter'
// copy-item target for the "+1 the hovered item" hotkey.
export const DROP_COUNTER_TARGET = 'woke-drop-counter-item'

export interface DropLine {
  // poe.ninja category, for the art. Empty for a name you typed yourself.
  type: string
  name: string
  // The maps count at each drop, oldest first: its length is the count, and
  // taking one off also brings back the previous "last drop".
  drops: number[]
}

export type DropLayout = 'list' | 'strip'

export interface DropCounterWidget extends Widget {
  anchor: Anchor
  items: DropLine[]
  maps: number
  // Last map instance counted ("areaId:seed"), so a portal back in doesn't count.
  lastMapInstance?: string
  autoCountMaps: boolean
  layout: DropLayout
  hotkey: string | null
}

export function initDropCounter (w: DropCounterWidget) {
  w.items = []
  w.maps = 0
  w.autoCountMaps = true
  w.layout = 'list'
  w.hotkey = null
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export function findLine (items: DropLine[], name: string): DropLine | undefined {
  return items.find(l => sameName(l.name, name))
}

// Adds an item to the list, or returns the one already there. A blank name adds nothing.
export function addLine (w: Pick<DropCounterWidget, 'items'>, ref: { type: string, name: string }): DropLine | null {
  const name = ref.name.trim()
  if (!name) return null
  const had = findLine(w.items, name)
  if (had) return had
  w.items.push({ type: ref.type, name, drops: [] })
  // Vue hands back a reactive copy from the array, not the object just pushed.
  return w.items[w.items.length - 1]
}

export function plusOne (w: Pick<DropCounterWidget, 'maps'>, line: DropLine) {
  line.drops.push(w.maps)
}

export function minusOne (line: DropLine) {
  line.drops.pop()
}

export function changeMaps (w: Pick<DropCounterWidget, 'maps'>, delta: number) {
  w.maps = Math.max(0, w.maps + delta)
}

// Everything back to zero. Returns what undoes it.
export function resetCounts (w: Pick<DropCounterWidget, 'items' | 'maps'>): () => void {
  const maps = w.maps
  const drops = w.items.map(l => ({ name: l.name, drops: l.drops }))
  w.maps = 0
  for (const l of w.items) l.drops = []
  return () => {
    w.maps = maps
    for (const d of drops) {
      const line = findLine(w.items, d.name)
      if (line) line.drops = d.drops
    }
  }
}

function mapsWord (n: number): string {
  return `${n} ${n === 1 ? 'map' : 'maps'}`
}

// "14 maps ago · 1 in 35"
export function lineDetail (line: DropLine, maps: number): string {
  const count = line.drops.length
  if (!count) return maps ? `None in ${mapsWord(maps)}` : 'None yet'
  const ago = Math.max(0, maps - line.drops[count - 1])
  const when = ago === 0 ? 'This map' : `${mapsWord(ago)} ago`
  return maps ? `${when} · 1 in ${Math.max(1, Math.round(maps / count))}` : when
}

// What the icon says for a few seconds after a +1 (read after adding it).
export function peekText (line: DropLine, maps: number): string {
  const count = line.drops.length
  const before = count >= 2 ? maps - line.drops[count - 2] : null
  return `${line.name} ${count}${before ? ` · ${mapsWord(before)} since the last` : ''}`
}
