// Woke modules: personal tools layered on top of Awakened PoE Trade.
//
// Upstream files only call into this file (widget registry, settings window,
// host shortcuts), so merging upstream changes stays a small, predictable diff.
// To add a module: create `woke/<module>/`, then register its widget below, its
// settings editor in `editors.ts` and its page in `settings/pages.ts`, its
// hotkeys in `shortcuts.ts` (and `settings/hotkey-fields.ts`), and its switch
// in `modules.ts`.

import './shared/perf'
import './ui'
import './app/prefetch'
import WokeOverlayRoot from './WokeOverlay.vue'
import { defineAsyncComponent } from 'vue'
import type { Component } from 'vue'
import * as specs from './widget-specs'
import { pushHostConfig } from '@/web/Config'
import type { WidgetSpec } from '@/web/overlay/interfaces'

type WidgetComponent = Component & { widget: WidgetSpec }

// Each widget's code loads the first time one of its type is mounted. The
// overlay mounts only widgets of switched-on modules, so a tool that's off
// never loads. The spec stays at hand for the registry and config defaults.
function lazy (spec: WidgetSpec, load: () => Promise<{ default: Component }>): WidgetComponent {
  return Object.assign(defineAsyncComponent(() => load().then(m => { hostConfigAfterMount(); return m })), { widget: spec })
}

// A widget fills in config defaults (its hotkeys among them) when it mounts.
// The overlay sends main its hotkeys once at start, before a lazy widget is
// in; so send them again just after one mounts. Several at once send once.
let hostConfigQueued = false
function hostConfigAfterMount () {
  if (hostConfigQueued) return
  hostConfigQueued = true
  setTimeout(() => {
    hostConfigQueued = false
    pushHostConfig()
  }, 50)
}

export const wokeWidgets: WidgetComponent[] = [
  lazy(specs.widgetRegexLibrarySpec, () => import('./regex-library/WidgetRegexLibrary.vue')),
  lazy(specs.widgetTradeSearchesSpec, () => import('./trade-searches/WidgetTradeSearches.vue')),
  lazy(specs.widgetMarketTrackerSpec, () => import('./market/WidgetMarketTracker.vue')),
  lazy(specs.widgetPobBuildsSpec, () => import('./pob-builds/WidgetPobBuilds.vue')),
  lazy(specs.widgetCampaignSpec, () => import('./campaign/WidgetCampaign.vue')),
  lazy(specs.widgetRunTimerSpec, () => import('./campaign/WidgetRunTimer.vue')),
  lazy(specs.widgetAtlasSpec, () => import('./atlas/WidgetAtlas.vue')),
  lazy(specs.widgetLabSpec, () => import('./lab/WidgetLab.vue')),
  lazy(specs.widgetChallengesSpec, () => import('./challenges/WidgetChallenges.vue')),
  lazy(specs.widgetFarmingSpec, () => import('./farming/WidgetFarming.vue')),
  lazy(specs.widgetDropCounterSpec, () => import('./drop-counter/WidgetDropCounter.vue')),
  lazy(specs.widgetStackedDecksSpec, () => import('./stacked-decks/WidgetStackedDecks.vue')),
  lazy(specs.widgetMechanicsSpec, () => import('./mechanics/WidgetMechanics.vue')),
  lazy(specs.widgetMapModsSpec, () => import('./map-mods/WidgetMapMods.vue')),
  lazy(specs.widgetMapCheckSpec, () => import('./map-mods/WidgetMapCheck.vue')),
  lazy(specs.widgetMapScanSpec, () => import('./map-mods/WidgetMapScan.vue')),
  lazy(specs.widgetEssenceScanSpec, () => import('./essence-scan/WidgetEssenceScan.vue')),
  lazy(specs.widgetLabGemsSpec, () => import('./lab-gems/WidgetLabGems.vue')),
  lazy(specs.widgetLeagueInvestSpec, () => import('./league-invest/WidgetLeagueInvest.vue')),
  lazy(specs.widgetBossRunsSpec, () => import('./boss-runs/WidgetBossRuns.vue')),
  lazy(specs.widgetScarabFlipSpec, () => import('./scarab-flip/WidgetScarabFlip.vue')),
  lazy(specs.widgetLootFilterSpec, () => import('./loot-filter/WidgetLootFilter.vue')),
  lazy(specs.widgetSessionAnalyticsSpec, () => import('./analytics/WidgetSessionAnalytics.vue')),
  lazy(specs.widgetDeathRecapSpec, () => import('./death-recap/WidgetDeathRecap.vue')),
  lazy(specs.widgetTradeSpec, () => import('./trade/WidgetTrade.vue')),
  lazy(specs.widgetDisenchantSpec, () => import('./disenchant/WidgetDisenchant.vue')),
  lazy(specs.widgetSearchSpec, () => import('./search/WidgetSearch.vue')),
  lazy(specs.widgetWealthyExileSpec, () => import('./wealthy-exile/WidgetWealthyExile.vue')),
  lazy(specs.widgetPoeReSpec, () => import('./regex-library/WidgetPoeRe.vue'))
]

export { wokeSettingsFor } from './editors'

export { wokeShortcutsFor } from './shortcuts'

// The settings window (sidebar, search, every page). APT's SettingsWindow renders it.
export { default as WokeSettings } from './settings/SettingsShell.vue'

// Mounted once inside APT's overlay window: first-run module setup, the icon
// dock, the toolkit health icon, the shared menu / undo notes layer, and
// update / crash notices.
export const WokeOverlay = WokeOverlayRoot
