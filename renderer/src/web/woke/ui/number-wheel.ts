// The mouse wheel over any number box steps it: up adds one step, down takes
// one away. Chromium only does this for a box that has focus, so most boxes
// in the app ignored the wheel until clicked. This covers every
// <input type="number">, now and later, with nothing to add per box.
//
// A box that handles the wheel itself (a handler that calls preventDefault())
// keeps doing so; one wrapped in something that steps it marks the wrapper
// data-own-wheel. Opt a box out with data-no-wheel. data-wheel-from="<n>" is where an empty
// box starts (price check's roll boxes start from the item's own roll).
//
// Stepping a box stops the panel behind it scrolling, the same as the chips
// that already took the wheel, unless a scroll is already going on.

import { installWheelHint, wheelUsed } from './number-wheel-hint'

// A touchpad sends many small deltas; they add up to one notch first.
// 25 px: Chrome gives about 33 px a notch with Windows set to scroll 1 line.
const NOTCH = 25

export interface WheelBox {
  value: string
  step?: string
  min?: string
  max?: string
  from?: string
}

function num (s: string | undefined): number | undefined {
  if (s == null || s.trim() === '') return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

function decimals (n: number): number {
  const s = String(n)
  if (s.includes('e-')) return Number(s.split('e-')[1])
  const dot = s.indexOf('.')
  return dot < 0 ? 0 : s.length - dot - 1
}

// The box's next value one step up (1) or down (-1), as text, or null when it
// stays put. An empty box takes its start (data-wheel-from) as is; without one
// it starts from the bound it moves away from, else 0.
export function wheelValue (box: WheelBox, dir: 1 | -1): string | null {
  const min = num(box.min)
  const max = num(box.max)
  // step="any" has no grid: a notch adds or takes one from whatever is there.
  const free = box.step === 'any'
  const step = (box.step == null || box.step === '' || free) ? 1 : (num(box.step) ?? 1)
  const size = step > 0 ? step : 1
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))

  const current = num(box.value)
  if (current == null) {
    const from = num(box.from)
    if (from != null) return String(clamp(from))
    const start = dir > 0 ? (min ?? 0) : (max ?? min ?? 0)
    return String(clamp(start))
  }
  // Already past the bound it moves towards: leave a typed value alone.
  if (dir > 0 && max != null && current >= max) return null
  if (dir < 0 && min != null && current <= min) return null
  // No min given: a box at 0 or above never wheels into negatives (counts,
  // prices, chaos per 10k). A negative value typed in still steps.
  if (dir < 0 && min == null && current >= 0 && current - size < 0) return current === 0 ? null : '0'

  // Land on the step grid (counted from min, like Chromium), so 0.01 steps
  // never drift into 0.30000000000000004.
  const base = free ? current : (min ?? 0)
  const places = Math.max(decimals(size), decimals(base), decimals(current))
  const k = (current - base) / size
  const onGrid = Math.abs(k - Math.round(k)) < 1e-9
  const nextK = onGrid ? Math.round(k) + dir : (dir > 0 ? Math.ceil(k) : Math.floor(k))
  const next = clamp(Number((base + nextK * size).toFixed(places)))
  return next === current ? null : String(next)
}

// A notch fires input at once (v-model follows) and one change once the
// wheel rests, so handlers that save or rebuild on change (the loot filter)
// run once per spin, not once per notch.
const CHANGE_AFTER_MS = 300
// A wheel that landed on something else this recently is a scroll going on:
// a box the pointer drifts onto lets it carry on instead of taking it.
const SCROLL_GAP_MS = 500

let sum = 0
let sumAt = 0
let sumFor: EventTarget | null = null
let lastWheelAt = -Infinity
let lastWheelOn: EventTarget | null = null
let pending: { box: HTMLInputElement, timer: ReturnType<typeof setTimeout> } | null = null

function flushChange () {
  if (!pending) return
  const { box, timer } = pending
  pending = null
  clearTimeout(timer)
  box.dispatchEvent(new Event('change', { bubbles: true }))
}

function onBoxWheel (e: WheelEvent) {
  const box = e.currentTarget as HTMLInputElement
  if (e.defaultPrevented || e.ctrlKey || e.deltaY === 0 || !e.cancelable) return
  if (box.type !== 'number' || box.disabled || box.readOnly || box.dataset.noWheel != null) return
  // Something around the box steps it itself (price check chips, Hide <).
  if (box.closest('[data-own-wheel]')) return
  if (lastWheelOn !== box && e.timeStamp - lastWheelAt < SCROLL_GAP_MS) return

  // Over the box, the wheel belongs to it: no panel scroll, no Chromium step.
  e.preventDefault()

  const dy = e.deltaMode === 0 ? e.deltaY : Math.sign(e.deltaY) * NOTCH
  if (box !== sumFor || e.timeStamp - sumAt > 400) sum = 0
  sumFor = box
  sumAt = e.timeStamp
  sum += dy
  if (Math.abs(sum) < NOTCH) return
  const dir = sum < 0 ? 1 : -1
  sum = 0

  const next = wheelValue({
    value: box.value,
    step: box.getAttribute('step') ?? undefined,
    min: box.getAttribute('min') ?? undefined,
    max: box.getAttribute('max') ?? undefined,
    from: box.dataset.wheelFrom
  }, dir)
  if (next == null) return
  if (pending && pending.box !== box) flushChange()
  box.value = next
  wheelUsed()
  box.dispatchEvent(new Event('input', { bubbles: true }))
  if (pending) clearTimeout(pending.timer)
  pending = { box, timer: setTimeout(flushChange, CHANGE_AFTER_MS) }
}

// The wheel listener goes on each box the pointer reaches, not the window: a
// blocking wheel listener on the window would make Chromium wait for this
// page on every scroll anywhere.
const hooked = new WeakSet<HTMLInputElement>()
function onPointerOver (e: PointerEvent) {
  const box = e.target
  if (!(box instanceof HTMLInputElement) || box.type !== 'number' || hooked.has(box)) return
  hooked.add(box)
  box.addEventListener('wheel', onBoxWheel, { passive: false })
  box.addEventListener('pointerleave', () => { if (pending?.box === box) flushChange() })
}

// Every wheel, wherever it lands (after the box's own listener has seen it).
function onAnyWheel (e: WheelEvent) {
  lastWheelAt = e.timeStamp
  lastWheelOn = e.target
}

let installed = false
export function installNumberWheel (target: Window = window) {
  if (installed) return
  installed = true
  installWheelHint(target)
  target.addEventListener('pointerover', onPointerOver, { passive: true })
  target.addEventListener('wheel', onAnyWheel, { passive: true })
}
