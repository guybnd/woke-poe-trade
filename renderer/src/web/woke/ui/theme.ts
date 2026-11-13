import { shallowRef, watch } from 'vue'
// Bundled so text looks the same on every PC and works offline (P19).
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/jetbrains-mono/400.css'
import './theme.css'
import './controls.css'
import './game-look.css'
import './patterns.css'
import './art-sets.css'
import './poe-frame.css'
import './poe-options.css'
import './poe-content.css'
import './poe-price.css'
import './scale'
import './density'
import './panel-opacity'
import './app-colors'

export type WokeTheme = 'hybrid' | 'native' | 'modern' | 'classic'

// `short` is for tight spots, like the rail's layout popup.
export const WOKE_THEMES: Array<{ id: WokeTheme, label: string, short: string, hint: string }> = [
  { id: 'hybrid', label: 'Hybrid', short: 'Hybrid', hint: 'The game look: bronze frames, bevelled buttons, Fontin text' },
  { id: 'native', label: 'PoE-native', short: 'Native', hint: 'The game look on darker bronze, roomier rows' },
  { id: 'modern', label: 'Modern', short: 'Modern', hint: 'Frosted glass, rounded, cool accent' },
  { id: 'classic', label: 'Classic APT', short: 'Classic', hint: 'Leave APT widgets as upstream ships them' }
]

const STORAGE_KEY = 'woke.theme'

function readStored (): WokeTheme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v && WOKE_THEMES.some(t => t.id === v)) return v as WokeTheme
  } catch {}
  return 'hybrid'
}

// Stored per window in localStorage; the overlay and settings windows share an
// origin, and the storage event keeps them in sync.
export const wokeTheme = shallowRef<WokeTheme>(readStored())

// Hybrid and Native wear the game look (pick S3 + T1, WOKEPOET-181): bronze frames,
// bevelled controls, Fontin text. Modern and Classic keep their own.
export function lookOf (theme: WokeTheme): 'game' | 'plain' {
  return theme === 'hybrid' || theme === 'native' ? 'game' : 'plain'
}

// The game look's art: Path of Exile 1's interface, Path of Exile 2's, or none
// (the original frames and controls). Only the game look uses it.
export type UiArt = 'poe1' | 'poe2' | 'simple'
export const UI_ARTS: Array<{ value: UiArt, label: string }> = [
  { value: 'poe1', label: 'PoE 1' },
  { value: 'poe2', label: 'PoE 2' },
  { value: 'simple', label: 'Simple' }
]
const ART_KEY = 'woke.uiArt'

function readArt (): UiArt {
  try {
    const v = localStorage.getItem(ART_KEY)
    if (v && UI_ARTS.some(a => a.value === v)) return v as UiArt
  } catch {}
  return 'poe1'
}

export const uiArt = shallowRef<UiArt>(readArt())

/** Every look the pickers offer, in one list: the game look with PoE 1's or
 * PoE 2's window art first, then the themes. Hybrid and PoE-native are the game
 * look without art. Settings, the price check's palette and the rail all use it. */
export interface WokeLook { id: string, label: string, short: string, hint: string, theme: WokeTheme, art?: UiArt }
export const WOKE_LOOKS: WokeLook[] = [
  { id: 'poe1', label: 'PoE 1', short: 'PoE 1', hint: 'The default UI theme of Path of Exile 1', theme: 'hybrid', art: 'poe1' },
  { id: 'poe2', label: 'PoE 2', short: 'PoE 2', hint: 'The default UI theme of Path of Exile 2', theme: 'hybrid', art: 'poe2' },
  ...WOKE_THEMES.map(t => ({ ...t, theme: t.id, art: t.id === 'hybrid' || t.id === 'native' ? 'simple' as UiArt : undefined }))
]
export function isLookPicked (l: WokeLook): boolean {
  return wokeTheme.value === l.theme && (l.art === undefined || uiArt.value === l.art)
}
export function pickLook (l: WokeLook): void {
  wokeTheme.value = l.theme
  if (l.art) uiArt.value = l.art
}

/** Whether windows wear the game's art: the game look with PoE 1's or PoE 2's art picked. */
export function artShown (): boolean {
  return lookOf(wokeTheme.value) === 'game' && uiArt.value !== 'simple'
}
/** The space the art keeps clear inside each side of a window (--w-frame-inset in poe-frame.css). */
export const ART_FRAME_INSET = 11

function apply () {
  const root = document.documentElement
  root.dataset.wokeTheme = wokeTheme.value
  root.dataset.wokeLook = lookOf(wokeTheme.value)
  if (artShown()) root.dataset.wokeArt = uiArt.value
  else delete root.dataset.wokeArt
}

apply()
watch(wokeTheme, (theme) => {
  apply()
  try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
})
watch(uiArt, (art) => {
  apply()
  try { localStorage.setItem(ART_KEY, art) } catch {}
})
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) wokeTheme.value = readStored()
  if (e.key === ART_KEY) uiArt.value = readArt()
})
