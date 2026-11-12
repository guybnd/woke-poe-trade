// Pins: things you asked to keep on screen while you play (a dock card, a piece
// of a PoB build). Nothing else stays up on its own. Each pin floats where you
// drag it, has its own see-through level, and keeps a separate spot for towns
// and hideouts than for maps and the rest ("hideout repo", WOKEPOET-207).
// Stored like the theme: per origin in localStorage.
import { computed, shallowRef, watch } from 'vue'
import { zone } from '../shared/zone'
import type { ZoneKind } from '../shared/zone'

export type PinKind = 'dock' | 'pob-tree' | 'pob-slot' | 'pob-gems' | 'pob-next'

// Where a pin sits, in percent of the window, so a resolution change keeps it on screen.
export interface PinSpot { x: number, y: number }

// Towns and hideouts are where you shop and allocate; everything else is out
// in the field.
export type PinPlace = 'town' | 'field'

export interface Pin {
  // Unique per thing pinned: pinning it again unpins it.
  id: string
  kind: PinKind
  title: string
  // Font Awesome class shown in the pin's head.
  icon: string
  // 20 to 100.
  opacity: number
  spots: Partial<Record<PinPlace, PinSpot>>
  // What the pin shows, per kind (a dock id, a build path and slot...).
  data: Record<string, string>
}

export const MIN_PIN_OPACITY = 20
export const MAX_PIN_OPACITY = 100
export const DEFAULT_PIN_OPACITY = 85

export const MIN_PIN_SCALE = 50
export const MAX_PIN_SCALE = 100

const PINS_KEY = 'woke.pins'
const SCALE_KEY = 'woke.pinScale'

export function placeOf (kind: ZoneKind | null): PinPlace {
  return kind === 'town' || kind === 'hideout' ? 'town' : 'field'
}

export function clampOpacity (v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_PIN_OPACITY
  return Math.min(MAX_PIN_OPACITY, Math.max(MIN_PIN_OPACITY, Math.round(v)))
}

export function parsePinScale (v: string | null): number {
  const n = Number(v)
  if (!v || !Number.isFinite(n)) return MAX_PIN_SCALE
  return Math.min(MAX_PIN_SCALE, Math.max(MIN_PIN_SCALE, Math.round(n)))
}

function clampSpot (s: unknown): PinSpot | undefined {
  if (!s || typeof s !== 'object') return undefined
  const { x, y } = s as PinSpot
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined
  return { x: Math.min(98, Math.max(0, x)), y: Math.min(98, Math.max(0, y)) }
}

// Reads what was stored, dropping anything malformed.
export function parsePins (raw: string | null): Pin[] {
  if (!raw) return []
  let list: unknown
  try { list = JSON.parse(raw) } catch { return [] }
  if (!Array.isArray(list)) return []
  const out: Pin[] = []
  const seen = new Set<string>()
  for (const p of list) {
    if (!p || typeof p !== 'object') continue
    const { id, kind, title, icon, opacity, spots, data } = p as Pin
    if (typeof id !== 'string' || seen.has(id) || typeof kind !== 'string') continue
    seen.add(id)
    const town = clampSpot(spots?.town)
    const field = clampSpot(spots?.field)
    out.push({
      id,
      kind,
      title: typeof title === 'string' ? title : '',
      icon: typeof icon === 'string' ? icon : 'fas fa-thumbtack',
      opacity: clampOpacity(Number(opacity)),
      spots: { ...(town ? { town } : {}), ...(field ? { field } : {}) },
      data: data && typeof data === 'object'
        ? Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v === 'string'))
        : {}
    })
  }
  return out
}

function readPins (): Pin[] {
  try { return parsePins(localStorage.getItem(PINS_KEY)) } catch { return [] }
}
function readScale (): number {
  try { return parsePinScale(localStorage.getItem(SCALE_KEY)) } catch { return MAX_PIN_SCALE }
}

export const pins = shallowRef<Pin[]>(readPins())
// Size of pinned things, apart from the rest of the toolkit (pick B).
export const pinScale = shallowRef(readScale())

watch(pins, (list) => {
  try { localStorage.setItem(PINS_KEY, JSON.stringify(list)) } catch {}
})
watch(pinScale, (v) => {
  try { localStorage.setItem(SCALE_KEY, String(v)) } catch {}
})
window.addEventListener('storage', (e) => {
  if (e.key === PINS_KEY) pins.value = readPins()
  if (e.key === SCALE_KEY) pinScale.value = readScale()
})

export const place = computed<PinPlace>(() => placeOf(zone.kind))

export function isPinned (id: string): boolean {
  return pins.value.some(p => p.id === id)
}

// A new pin starts where it was opened, else down the left side.
export function defaultSpot (index: number): PinSpot {
  return { x: 2, y: Math.min(80, 18 + index * 6) }
}

export function addPin (pin: Omit<Pin, 'opacity' | 'spots'> & { at?: PinSpot }) {
  if (isPinned(pin.id)) return
  const { at, ...rest } = pin
  const spot = clampSpot(at) ?? defaultSpot(pins.value.length)
  pins.value = [...pins.value, { ...rest, opacity: DEFAULT_PIN_OPACITY, spots: { [place.value]: spot } }]
}

export function removePin (id: string) {
  pins.value = pins.value.filter(p => p.id !== id)
}

export function togglePin (pin: Omit<Pin, 'opacity' | 'spots'> & { at?: PinSpot }) {
  if (isPinned(pin.id)) removePin(pin.id)
  else addPin(pin)
}

function patch (id: string, f: (p: Pin) => Pin) {
  pins.value = pins.value.map(p => p.id === id ? f(p) : p)
}

export function setPinOpacity (id: string, opacity: number) {
  patch(id, p => ({ ...p, opacity: clampOpacity(opacity) }))
}

// Moving a pin only moves it here (town or field); the other place keeps its spot.
export function movePin (id: string, spot: PinSpot) {
  const s = clampSpot(spot)
  if (!s) return
  patch(id, p => ({ ...p, spots: { ...p.spots, [place.value]: s } }))
}

// Its spot here, else the other place's, else down the left side.
export function spotOf (pin: Pin, where: PinPlace, index: number): PinSpot {
  const other: PinPlace = where === 'town' ? 'field' : 'town'
  return pin.spots[where] ?? pin.spots[other] ?? defaultSpot(index)
}
