// Adds and removes the net worth module, widget, settings and hotkey. Loaded
// only once the stash reader is on (personal.ts).
import type { Component } from 'vue'
import type { WidgetSpec } from '@/web/overlay/interfaces'
import type { Widget } from '@/web/overlay/widgets'
import { registry } from '@/web/overlay/widget-registry'
import { AppConfig, pushHostConfig, saveConfig } from '@/web/Config'
import { addModule, removeModule } from '../modules'
import type { WokeModulesConfig } from '../modules'
import { addEditor, removeEditor } from '../editors'
import { addWidgetShortcuts, removeWidgetShortcuts } from '../shortcuts'
import { addPage, removePage } from '../settings/pages'
import { popupAnchor } from '../ui/window-anchor'
import WidgetNetWorth from './WidgetNetWorth.vue'
import NetWorthEditor from './net-worth-editor.vue'
import { NET_WORTH_MODULE, NET_WORTH_TYPE, netWorthShortcuts } from './widget'
import type { NetWorthWidget } from './widget'

const widget = WidgetNetWorth as unknown as Component & { widget: WidgetSpec }

type ConfigLike = { widgets: Widget[], woke?: WokeModulesConfig }

// place: also put a widget (hidden, with its dock icon) in config when there
// is none. Not at startup, where config may still be loading.
export function enableNetWorth (place: boolean) {
  addModule({
    id: NET_WORTH_MODULE,
    name: 'Net worth',
    description: 'Your stash value from your own tabs',
    group: 'economy',
    widgetTypes: [NET_WORTH_TYPE],
    icon: { fa: 'fas fa-scale-balanced', item: 'Mirror of Kalandra' },
    needs: ['log', 'prices', 'hotkeys', 'network'],
    optIn: true
  }, 'wealthy-exile')
  if (!registry.widgets.includes(widget)) registry.widgets.push(widget)
  addEditor(NET_WORTH_TYPE, NetWorthEditor)
  addWidgetShortcuts(NET_WORTH_TYPE, netWorthShortcuts)
  addPage({
    id: 'net-worth',
    name: 'Net worth',
    group: 'modules',
    sub: 'Trade & prices',
    icon: { item: 'Mirror of Kalandra', fa: 'fas fa-scale-balanced' },
    description: 'Stash value from your own tabs. Sign in under Game & league.',
    modules: [NET_WORTH_MODULE],
    widgets: [NET_WORTH_TYPE],
    find: ['Net worth', 'Stash reader', 'Stash value']
  }, 'market')
  if (place && placeWidget(AppConfig())) saveConfig()
}

// Main's hotkeys and Client.txt reading follow the overlay's modules.
export function syncHost () {
  pushHostConfig()
}

export function disableNetWorth () {
  removePage('net-worth')
  removeWidgetShortcuts(NET_WORTH_TYPE)
  removeEditor(NET_WORTH_TYPE)
  const at = registry.widgets.indexOf(widget)
  if (at >= 0) registry.widgets.splice(at, 1)
  // A placed widget stays in config (hotkey, place) but counts as off.
  removeModule(NET_WORTH_MODULE)
}

// True when config changed.
export function placeWidget (config: ConfigLike): boolean {
  if (config.widgets.some(w => w.wmType === NET_WORTH_TYPE)) return false
  const w: NetWorthWidget = {
    wmId: Math.max(0, ...config.widgets.map(w => w.wmId)) + 1,
    wmType: NET_WORTH_TYPE,
    wmTitle: 'Net worth',
    wmWants: 'hide',
    wmZorder: null,
    wmFlags: ['invisible-on-blur'],
    anchor: popupAnchor(),
    hotkey: null,
    dockIcon: true
  }
  config.widgets.push(w)
  return true
}
