// Registers the net worth module, widget, settings and hotkey. Loaded only
// when personal.flag is on (personal.ts), before the overlay mounts.
import type { Component } from 'vue'
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { registry } from '@/web/overlay/widget-registry'
import { addModule } from '../modules'
import { addEditor } from '../editors'
import { addWidgetShortcuts } from '../shortcuts'
import { addPage } from '../settings/pages'
import WidgetNetWorth from './WidgetNetWorth.vue'
import NetWorthEditor from './net-worth-editor.vue'
import { NET_WORTH_MODULE, NET_WORTH_TYPE, netWorthShortcuts } from './widget'

export function enableNetWorth () {
  addModule({
    id: NET_WORTH_MODULE,
    name: 'Net worth',
    description: 'Your stash value from your own tabs (personal)',
    group: 'economy',
    widgetTypes: [NET_WORTH_TYPE],
    icon: { fa: 'fas fa-scale-balanced', item: 'Mirror of Kalandra' },
    needs: ['log', 'prices', 'hotkeys', 'network']
  }, 'wealthy-exile')
  const widget = WidgetNetWorth as unknown as Component & { widget: WidgetSpec }
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
}
