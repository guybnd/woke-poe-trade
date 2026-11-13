// Alert sounds: the game's own 1-16 (which can't be played outside the game),
// NeverSink's sound pack the app ships (MIT, public/sounds/neversink), and
// your own mp3/wav/ogg files in the filter folder (CustomAlertSound).
import { hostRequest } from '../shared/host'
import type { FilterDoc } from './parse'
import { groupName } from './groups'

export const NEVERSINK_SOUNDS = [
  { file: '6veryvaluable.mp3', label: 'Very valuable' },
  { file: '1maybevaluable.mp3', label: 'Maybe valuable' },
  { file: '2currency.mp3', label: 'Currency' },
  { file: '3uniques.mp3', label: 'Uniques' },
  { file: '4maps.mp3', label: 'Maps' },
  { file: '5highmaps.mp3', label: 'High maps' },
  { file: '7chancing.mp3', label: 'Chancing base' },
  { file: '12leveling.mp3', label: 'Leveling' }
] as const

export function isCustomSound (id: string): boolean {
  return /\.(mp3|wav|ogg)$/i.test(id)
}

export function isPackSound (id: string): boolean {
  return NEVERSINK_SOUNDS.some(s => s.file.toLowerCase() === id.toLowerCase())
}

export function soundLabel (id: string): string {
  if (!isCustomSound(id)) return `Game sound ${id}`
  const pack = NEVERSINK_SOUNDS.find(s => s.file.toLowerCase() === id.toLowerCase())
  return pack ? `NeverSink: ${pack.label}` : id.replace(/\.(mp3|wav|ogg)$/i, '')
}

// Which groups use each sound, so "Sound 2" reads as "the one currency
// t2 plays" even though the game's sounds can't be previewed here.
export function soundUses (doc: FilterDoc | null): Map<string, string[]> {
  const uses = new Map<string, Set<string>>()
  if (!doc) return new Map()
  for (const b of doc.blocks) {
    if (b.disabled || b.visibility === 'Hide') continue
    const a = b.actions.find(x => x.key === 'PlayAlertSound' || x.key === 'PlayAlertSoundPositional' || x.key === 'CustomAlertSound' || x.key === 'CustomAlertSoundOptional')
    if (!a?.args[0]) continue
    const set = uses.get(a.args[0]) ?? new Set()
    set.add(b.type ? groupName(b.type) : 'Other rules')
    uses.set(a.args[0], set)
  }
  return new Map([...uses].map(([id, set]) => [id, [...set]]))
}

export function packUrl (file: string): string {
  return `${import.meta.env.BASE_URL}sounds/neversink/${encodeURIComponent(file)}`
}

const dataUrls = new Map<string, string>()

async function urlOf (id: string, dir: string): Promise<string | null> {
  if (!isCustomSound(id)) return null
  const key = `${dir}|${id}`
  const cached = dataUrls.get(key)
  if (cached) return cached
  try {
    const got = await hostRequest('filter-sound-read', { dir, name: id })
    const url = `data:${got.mime};base64,${got.data}`
    dataUrls.set(key, url)
    return url
  } catch {
    // Not in the folder yet: a pack sound still plays from the app.
    return isPackSound(id) ? packUrl(NEVERSINK_SOUNDS.find(s => s.file.toLowerCase() === id.toLowerCase())!.file) : null
  }
}

let playing: HTMLAudioElement | null = null

// Plays a custom or pack sound at the filter's volume (0-300, 300 = full).
// Returns false for the game's own sounds, which only play in game.
export async function playSound (id: string, volume: number, dir: string): Promise<boolean> {
  const url = await urlOf(id, dir)
  if (!url) return false
  playing?.pause()
  const audio = new Audio(url)
  audio.volume = Math.max(0, Math.min(1, volume / 300))
  playing = audio
  try {
    await audio.play()
    return true
  } catch {
    return false
  }
}

function toBase64 (buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

// Copies the pack sounds a filter uses into the filter folder, where the game
// looks for them. Files already there are left alone.
export async function installPackSounds (ids: Iterable<string>, dir: string): Promise<number> {
  let written = 0
  for (const id of new Set(ids)) {
    const pack = NEVERSINK_SOUNDS.find(s => s.file.toLowerCase() === id.toLowerCase())
    if (!pack) continue
    const res = await fetch(packUrl(pack.file))
    if (!res.ok) continue
    const got = await hostRequest('filter-sound-install', { dir, name: pack.file, data: toBase64(await res.arrayBuffer()) })
    if (got.written) written++
  }
  return written
}

export function customSoundsIn (doc: FilterDoc): string[] {
  const out = new Set<string>()
  for (const b of doc.blocks) {
    if (b.disabled) continue
    for (const a of b.actions) {
      if ((a.key === 'CustomAlertSound' || a.key === 'CustomAlertSoundOptional') && a.args[0]) out.add(a.args[0])
    }
  }
  return [...out]
}

export async function listFolderSounds (dir: string): Promise<string[]> {
  try {
    return (await hostRequest('filter-sounds', { dir })).files.map(f => f.name)
  } catch {
    return []
  }
}
