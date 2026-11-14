// One notch of a mouse wheel per step. A touchpad sends many small deltas,
// so they add up to a notch first; one step at most every WHEEL_GAP_MS.
const WHEEL_NOTCH = 50
const WHEEL_GAP_MS = 120
let wheelSum = 0
let wheelAt = 0
let lastEventAt = 0
export function wheelStep (e: Pick<WheelEvent, 'deltaY' | 'deltaMode'>, now = Date.now()): 1 | -1 | 0 {
  // deltaMode 1/2: lines or pages, already a notch each.
  const dy = e.deltaMode === 0 ? e.deltaY : Math.sign(e.deltaY) * WHEEL_NOTCH
  // A pause starts a new spin.
  if (now - lastEventAt > 400) wheelSum = 0
  lastEventAt = now
  wheelSum += dy
  if (Math.abs(wheelSum) < WHEEL_NOTCH || now - wheelAt < WHEEL_GAP_MS) return 0
  const dir = wheelSum > 0 ? 1 : -1
  wheelSum = 0
  wheelAt = now
  return dir
}
