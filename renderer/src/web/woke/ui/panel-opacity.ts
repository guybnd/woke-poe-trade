// Panel opacity: how much of the game shows through overlay panel backgrounds.
// Text and icons stay solid; only the surface colours fade (see theme.css,
// "Panel opacity"). Stored like the theme and text size: per origin in
// localStorage, shared by the overlay and settings windows through the
// storage event.
import { watch } from 'vue'
import { storedPref } from './stored-pref'
import { MAX_PANEL_OPACITY, parsePanelOpacity } from './see-through'
export { MAX_PANEL_OPACITY, MIN_PANEL_OPACITY } from './see-through'

export const panelOpacity = storedPref('woke.panelOpacity', parsePanelOpacity)
export const panelSolidOnHover = storedPref('woke.panelSolidOnHover', v => v !== '0', v => v ? '1' : '0')

function apply () {
  const root = document.documentElement
  root.style.setProperty('--w-panel-opacity', String(panelOpacity.value / 100))
  // At 100% the per-element rules stay off, so they cost nothing.
  if (panelOpacity.value < MAX_PANEL_OPACITY) root.dataset.wokePanelSee = ''
  else delete root.dataset.wokePanelSee
  if (panelSolidOnHover.value) root.dataset.wokePanelHover = 'solid'
  else delete root.dataset.wokePanelHover
}

apply()
watch([panelOpacity, panelSolidOnHover], apply)
