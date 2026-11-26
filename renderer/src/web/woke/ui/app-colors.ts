// App colours: the player's own accent, background and text for the app's
// frame (Settings, the tab bar, the dock), apart from the theme the tool panels
// wear. Stored like the theme: per origin in localStorage, kept in step across
// windows by the storage event.
import { watch } from 'vue'
import { storedPref } from './stored-pref'
import { frameColorCss, parseAppColors } from './frame-colors'
import type { AppColors } from './frame-colors'
export { APP_COLOR_PRESETS, DEFAULT_APP_COLORS, sameColors } from './frame-colors'
export type { AppColors } from './frame-colors'

// null: the frame wears the theme like everything else (nothing stored).
export const appColors = storedPref<AppColors | null>('woke.appColors', parseAppColors, c => c ? JSON.stringify(c) : null)

let styleEl: HTMLStyleElement | null = null
function apply (c: AppColors | null) {
  if (!c) { styleEl?.remove(); styleEl = null; return }
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.dataset.wokeAppColors = ''
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = frameColorCss(c)
}

apply(appColors.value)
watch(appColors, apply)
