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

export interface CountsBackup {
  maps: number
  drops: Array<{ name: string, drops: number[] }>
}

// Everything back to zero. Returns what restoreCounts needs to undo it. A save
// swaps the config for a new copy, so undo must be given the config of that
// moment, not hold on to this one.
export function resetCounts (w: Pick<DropCounterWidget, 'items' | 'maps'>): CountsBackup {
  const backup = { maps: w.maps, drops: w.items.map(l => ({ name: l.name, drops: [...l.drops] })) }
  w.maps = 0
  for (const l of w.items) l.drops = []
  return backup
}

export function restoreCounts (w: Pick<DropCounterWidget, 'items' | 'maps'>, backup: CountsBackup) {
  w.maps = backup.maps
  for (const d of backup.drops) {
    const line = findLine(w.items, d.name)
    if (line) line.drops = [...d.drops]
  }
}

// Takes one line off. Returns what restoreLine needs to put back only that one.
export function removeLine (w: Pick<DropCounterWidget, 'items'>, name: string): { line: DropLine, index: number } | null {
  const index = w.items.findIndex(l => sameName(l.name, name))
  if (index < 0) return null
  const [line] = w.items.splice(index, 1)
  return { line: { type: line.type, name: line.name, drops: [...line.drops] }, index }
}

export function restoreLine (w: Pick<DropCounterWidget, 'items'>, removed: { line: DropLine, index: number }) {
  if (findLine(w.items, removed.line.name)) return
  w.items.splice(Math.min(removed.index, w.items.length), 0, removed.line)
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
  return `${line.name} ${count}${before != null && before > 0 ? ` · ${mapsWord(before)} since the last` : ''}`
}
