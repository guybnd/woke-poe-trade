import { shallowRef, watch } from 'vue'
// Bundled so text looks the same on every PC and works offline (P19).
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/jetbrains-mono/400.css'
import './theme.css'
import './controls.css'
import './game-look.css'
import './scale'
import './density'
import './panel-opacity'

export type WokeTheme = 'hybrid' | 'native' | 'modern' | 'classic'

export const WOKE_THEMES: Array<{ id: WokeTheme, label: string, hint: string }> = [
  { id: 'hybrid', label: 'Hybrid', hint: 'The game look: bronze frames, bevelled buttons, Fontin text' },
  { id: 'native', label: 'PoE-native', hint: 'The game look on darker bronze, roomier rows' },
  { id: 'modern', label: 'Modern', hint: 'Frosted glass, rounded, cool accent' },
  { id: 'classic', label: 'Classic APT', hint: 'Leave APT widgets as upstream ships them' }
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

function apply (theme: WokeTheme) {
  document.documentElement.dataset.wokeTheme = theme
  document.documentElement.dataset.wokeLook = lookOf(theme)
}

apply(wokeTheme.value)
watch(wokeTheme, (theme) => {
  apply(theme)
  try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
})
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) wokeTheme.value = readStored()
})
