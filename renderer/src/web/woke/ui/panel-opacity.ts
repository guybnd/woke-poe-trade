// Panel opacity: how much of the game shows through overlay panel backgrounds.
// Text and icons stay solid; only the surface colours fade (see theme.css,
// "Panel opacity"). Stored like the theme and text size: per origin in
// localStorage, shared by the overlay and settings windows through the
// storage event.
import { shallowRef, watch } from 'vue'
import { MAX_PANEL_OPACITY, parsePanelOpacity } from './see-through'
export { MAX_PANEL_OPACITY, MIN_PANEL_OPACITY } from './see-through'

const OPACITY_KEY = 'woke.panelOpacity'
const HOVER_KEY = 'woke.panelSolidOnHover'

function readOpacity () {
  try { return parsePanelOpacity(localStorage.getItem(OPACITY_KEY)) } catch { return MAX_PANEL_OPACITY }
}
function readSolidOnHover () {
  try { return localStorage.getItem(HOVER_KEY) !== '0' } catch { return true }
}

export const panelOpacity = shallowRef(readOpacity())
export const panelSolidOnHover = shallowRef(readSolidOnHover())

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
watch(panelOpacity, (v) => {
  apply()
  try { localStorage.setItem(OPACITY_KEY, String(v)) } catch {}
})
watch(panelSolidOnHover, (v) => {
  apply()
  try { localStorage.setItem(HOVER_KEY, v ? '1' : '0') } catch {}
})
window.addEventListener('storage', (e) => {
  if (e.key === OPACITY_KEY) panelOpacity.value = readOpacity()
  if (e.key === HOVER_KEY) panelSolidOnHover.value = readSolidOnHover()
})
