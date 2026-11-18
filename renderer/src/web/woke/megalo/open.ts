// Opens the Megalomaniac searcher window (the search palette and the PoB
// builds window both do).
import type { WidgetManager } from '@/web/overlay/interfaces'
import { AppConfig } from '@/web/Config'
import { showWithOverlay } from '../dock/dock'
import { MEGALO_TYPE, initMegaloWidget } from './widget'

export function openMegalo (wm: WidgetManager, opts: { pobPath?: string } = {}) {
  const config = AppConfig()
  let w = config.widgets.find(w => w.wmType === MEGALO_TYPE)
  if (!w) {
    config.widgets.push(initMegaloWidget(Math.max(0, ...config.widgets.map(w => w.wmId)) + 1))
    w = config.widgets[config.widgets.length - 1]
  }
  if (opts.pobPath) Object.assign(w, { source: 'pob', pobPath: opts.pobPath })
  showWithOverlay(wm, w.wmId)
  wm.bringToTop(w.wmId)
}
