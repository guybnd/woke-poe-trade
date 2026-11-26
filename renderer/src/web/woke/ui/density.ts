// Row density (pick D1): comfortable 28px rows by default, compact 24px for
// big screens. Stored like the theme, per origin in localStorage.
import { watch } from 'vue'
import { storedPref } from './stored-pref'

export type Density = 'comfortable' | 'compact'

export const density = storedPref<Density>('woke.density', v => v === 'compact' ? 'compact' : 'comfortable')

function apply (d: Density) {
  if (d === 'compact') document.documentElement.dataset.wokeDensity = 'compact'
  else delete document.documentElement.dataset.wokeDensity
}

apply(density.value)
watch(density, apply)
