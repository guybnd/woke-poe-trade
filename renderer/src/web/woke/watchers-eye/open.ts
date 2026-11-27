// Opens the Watcher's Eye finder (the search palette does).
import type { WidgetManager } from '@/web/overlay/interfaces'
import { AppConfig } from '@/web/Config'
import { showWithOverlay } from '../dock/dock'
import { ensureWokeConfig, isWidgetTypeOn, setModuleOn } from '../modules'
import { WATCHERS_EYE_TYPE, initWatchersEyeWidget } from './widget'
import type { WatchersEyeWidget } from './widget'

export function openWatchersEye (wm: WidgetManager, focus?: string) {
  const config = AppConfig()
  // Switched off: asking for it turns it back on.
  if (!isWidgetTypeOn(config, WATCHERS_EYE_TYPE)) setModuleOn(ensureWokeConfig(config), 'watchers-eye', true)
  let w = config.widgets.find(w => w.wmType === WATCHERS_EYE_TYPE) as WatchersEyeWidget | undefined
  if (!w) {
    config.widgets.push(initWatchersEyeWidget(Math.max(0, ...config.widgets.map(w => w.wmId)) + 1))
    w = config.widgets[config.widgets.length - 1] as WatchersEyeWidget
  }
  w.focus = focus ?? null
  showWithOverlay(wm, w.wmId)
  wm.bringToTop(w.wmId)
}
