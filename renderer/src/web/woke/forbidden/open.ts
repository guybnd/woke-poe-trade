// Opens the Forbidden pair finder (the search palette and the PoB builds
// window both do).
import type { WidgetManager } from '@/web/overlay/interfaces'
import { AppConfig } from '@/web/Config'
import { showWithOverlay } from '../dock/dock'
import { ensureWokeConfig, isWidgetTypeOn, setModuleOn } from '../modules'
import { FORBIDDEN_TYPE, initForbiddenWidget } from './widget'
import type { ForbiddenWidget } from './widget'

export function openForbidden (wm: WidgetManager, opts: { pobPath?: string, focus?: string } = {}) {
  const config = AppConfig()
  // Switched off: asking for it turns it back on.
  if (!isWidgetTypeOn(config, FORBIDDEN_TYPE)) setModuleOn(ensureWokeConfig(config), 'forbidden', true)
  let w = config.widgets.find(w => w.wmType === FORBIDDEN_TYPE) as ForbiddenWidget | undefined
  if (!w) {
    config.widgets.push(initForbiddenWidget(Math.max(0, ...config.widgets.map(w => w.wmId)) + 1))
    w = config.widgets[config.widgets.length - 1] as ForbiddenWidget
  }
  if (opts.pobPath) Object.assign(w, { source: 'pob', pobPath: opts.pobPath })
  w.focus = opts.focus ?? null
  showWithOverlay(wm, w.wmId)
  wm.bringToTop(w.wmId)
}
