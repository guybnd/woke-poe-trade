import { shallowReactive, type Component } from 'vue'
import type { WidgetSpec } from './interfaces'
import WidgetTimer from '../stopwatch/WidgetTimer.vue'
import WidgetMenu from './WidgetMenu.vue'
import PriceCheckWindow from '@/web/price-check/PriceCheckWindow.vue'
import WidgetItemCheck from '@/web/item-check/WidgetItemCheck.vue'
import WidgetImageStrip from './WidgetImageStrip.vue'
import WidgetDelveGrid from './WidgetDelveGrid.vue'
import WidgetItemSearch from '../item-search/WidgetItemSearch.vue'
import WidgetSettings from '../settings/SettingsWindow.vue'
import { wokeWidgets } from '../woke'

type WidgetComponent = Component & { widget: WidgetSpec }

export const registry = {
  // woke: reactive, so a widget type turned on or off at runtime (the stash
  // reader) shows up in or leaves the launcher right away.
  widgets: shallowReactive<WidgetComponent[]>([]),

  getWidgetComponent (wmType: string) {
    return this.widgets.find(component => component.widget.type === wmType)
  }
}

// Core
registry.widgets.push(WidgetMenu as unknown as WidgetComponent)
registry.widgets.push(WidgetSettings as unknown as WidgetComponent)
// Extra
registry.widgets.push(WidgetItemSearch as unknown as WidgetComponent)
registry.widgets.push(WidgetTimer as unknown as WidgetComponent)
// woke: APT's Stash search is gone: Config.ts moves its strings into the Regex library.
registry.widgets.push(PriceCheckWindow as unknown as WidgetComponent)
registry.widgets.push(WidgetItemCheck as unknown as WidgetComponent)
registry.widgets.push(WidgetImageStrip as unknown as WidgetComponent)
registry.widgets.push(WidgetDelveGrid as unknown as WidgetComponent)
// Woke modules
registry.widgets.push(...wokeWidgets)
