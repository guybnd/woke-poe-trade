// poe.re in its own in-app window (pick P2): build a string there, save it
// straight into the Regex library.
import type { WidgetManager } from '@/web/overlay/interfaces'
import { AppConfig } from '@/web/Config'
import { Host } from '@/web/background/IPC'
import { showWithOverlay } from '../dock/dock'
import { POE_RE_TYPE, POE_RE_URL, anchorBeside, initPoeReWidget, isDefaultAnchor } from './poe-re-widget'
import type { PoeReWidget } from './poe-re-widget'

export { POE_RE_TYPE, POE_RE_URL, initPoeReWidget } from './poe-re-widget'
export type { PoeReWidget } from './poe-re-widget'

// The first time, it opens beside the library instead of over it (where every
// new window starts). Once it's been placed or moved it stays put.
export function openPoeReWindow (wm: WidgetManager, libraryId: number, beside?: Element | null) {
  if (!Host.isElectron) {
    window.open(POE_RE_URL)
    return
  }
  const config = AppConfig()
  let w = config.widgets.find(w => w.wmType === POE_RE_TYPE)
  if (!w) {
    config.widgets.push(initPoeReWidget(Math.max(0, ...config.widgets.map(w => w.wmId)) + 1))
    w = config.widgets[config.widgets.length - 1]
  }
  const poeRe = w as PoeReWidget
  poeRe.libraryId = libraryId
  if (beside && isDefaultAnchor(poeRe.anchor)) poeRe.anchor = anchorBeside(beside.getBoundingClientRect(), window.innerWidth, window.innerHeight)
  showWithOverlay(wm, w.wmId)
  wm.bringToTop(w.wmId)
}
