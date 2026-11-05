// What the Flips outlines draw: one mark per filled stash slot worth a look.
// Shown from the shortcut, gone on the next click, scroll or shortcut press.
import { shallowRef } from 'vue'

export interface StashSlot {
  name: string
  x: number
  y: number
  width: number
  height: number
  filled: boolean
}

export type StashRead = { found: false } | { found: true, slots: StashSlot[] }

export interface StashMark {
  name: string
  x: number
  y: number
  width: number
  height: number
  color: string
  text: string
}

// Per item put in. Inside this either way counts as about break-even.
export const CLOSE_EACH = 1 / 3
const CLOSE_COLOR = 'rgb(240, 190, 70)'
const PALE = [196, 226, 178]
const BRIGHT = [40, 255, 70]
// A little past linear, so only the best flips look fully bright.
const GRADE_CURVE = 1.3

export function buildMarks (slots: StashSlot[], profitEach: Map<string, number>): StashMark[] {
  const filled = slots.filter(s => s.filled && profitEach.has(s.name))
  const worth = filled.map(s => profitEach.get(s.name)!).filter(p => p >= CLOSE_EACH)
  const lo = Math.min(...worth)
  const hi = Math.max(...worth)
  const marks: StashMark[] = []
  for (const s of filled) {
    const p = profitEach.get(s.name)!
    if (p <= -CLOSE_EACH) continue
    marks.push({
      name: s.name,
      x: s.x,
      y: s.y,
      width: s.width,
      height: s.height,
      color: p >= CLOSE_EACH ? grade(hi > lo ? (p - lo) / (hi - lo) : 1) : CLOSE_COLOR,
      text: profitText(p)
    })
  }
  return marks
}

// One decimal always, so every label fits a slot.
function profitText (p: number): string {
  const shown = Math.abs(p).toFixed(1)
  if (Number(shown) === 0) return '0c'
  return `${p < 0 ? '-' : '+'}${shown}c`
}

function grade (t: number): string {
  const k = Math.pow(t, GRADE_CURVE)
  const [r, g, b] = PALE.map((v, i) => Math.round(v + (BRIGHT[i] - v) * k))
  return `rgb(${r}, ${g}, ${b})`
}

export const stashMarks = shallowRef<StashMark[]>([])

let clears = 0
let lastClearAt = 0

export function clearStashMarks () {
  if (!stashMarks.value.length) return
  clears++
  lastClearAt = performance.now()
  stashMarks.value = []
}

// Bumped by each clear, so a read that finishes late can tell it's out of date.
export function stashClearCount () {
  return clears
}

// The shortcut's own key press also clears the outlines, a moment before the
// shortcut arrives. That press means "off", not "draw them again".
const SAME_PRESS_MS = 400
export function justCleared () {
  return performance.now() - lastClearAt < SAME_PRESS_MS
}
