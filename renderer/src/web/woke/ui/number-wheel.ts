// The mouse wheel over any number box steps it: up adds one step, down takes
// one away. Chromium only does this for a box that has focus, so most boxes
// in the app ignored the wheel until clicked. One listener on the window
// covers every <input type="number">, now and later.
//
// A box (or something around it) that handles the wheel itself keeps doing so:
// its handler calls preventDefault() or stopPropagation(), and this skips it.
// Opt a box out with data-no-wheel. data-wheel-from="<n>" is where an empty
// box starts (price check's roll boxes start from the item's own roll).
//
// Stepping a box stops the panel behind it scrolling, the same as the chips
// that already took the wheel. The step fires input and change, as typing and
// Chromium's own stepping do, so v-model and @change handlers both see it.

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

let sum = 0
let sumAt = 0
let sumFor: EventTarget | null = null

function onWheel (e: WheelEvent) {
  if (e.defaultPrevented || e.ctrlKey || e.deltaY === 0) return
  const box = e.target
  if (!(box instanceof HTMLInputElement) || box.type !== 'number') return
  if (box.disabled || box.readOnly || box.dataset.noWheel != null) return

  // Over the box, the wheel belongs to it: no panel scroll, no Chromium step.
  e.preventDefault()

  const dy = e.deltaMode === 0 ? e.deltaY : Math.sign(e.deltaY) * NOTCH
  const now = e.timeStamp
  if (box !== sumFor || now - sumAt > 400) sum = 0
  sumFor = box
  sumAt = now
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
  box.value = next
  box.dispatchEvent(new Event('input', { bubbles: true }))
  box.dispatchEvent(new Event('change', { bubbles: true }))
}

let installed = false
export function installNumberWheel (target: Window = window) {
  if (installed) return
  installed = true
  // Not passive: a window wheel listener is passive by default and could not
  // stop the scroll.
  target.addEventListener('wheel', onWheel, { passive: false })
}
