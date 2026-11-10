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
import type { Component } from 'vue'
import type { WidgetSpec } from '@/web/overlay/interfaces'

import WidgetRegexLibrary from './regex-library/WidgetRegexLibrary.vue'
import WidgetTradeSearches from './trade-searches/WidgetTradeSearches.vue'
import WidgetMarketTracker from './market/WidgetMarketTracker.vue'
import WidgetPobBuilds from './pob-builds/WidgetPobBuilds.vue'
import WidgetCampaign from './campaign/WidgetCampaign.vue'
import WidgetRunTimer from './campaign/WidgetRunTimer.vue'
import WidgetAtlas from './atlas/WidgetAtlas.vue'
import WidgetLab from './lab/WidgetLab.vue'
import WidgetChallenges from './challenges/WidgetChallenges.vue'
import WidgetFarming from './farming/WidgetFarming.vue'
import WidgetDropCounter from './drop-counter/WidgetDropCounter.vue'
import WidgetStackedDecks from './stacked-decks/WidgetStackedDecks.vue'
import WidgetMechanics from './mechanics/WidgetMechanics.vue'
import WidgetMapMods from './map-mods/WidgetMapMods.vue'
import WidgetMapCheck from './map-mods/WidgetMapCheck.vue'
import WidgetMapScan from './map-mods/WidgetMapScan.vue'
import WidgetEssenceScan from './essence-scan/WidgetEssenceScan.vue'
import WidgetLabGems from './lab-gems/WidgetLabGems.vue'
import WidgetLeagueInvest from './league-invest/WidgetLeagueInvest.vue'
import WidgetBossRuns from './boss-runs/WidgetBossRuns.vue'
import WidgetScarabFlip from './scarab-flip/WidgetScarabFlip.vue'
import WidgetLootFilter from './loot-filter/WidgetLootFilter.vue'
import WidgetSessionAnalytics from './analytics/WidgetSessionAnalytics.vue'
import WidgetDeathRecap from './death-recap/WidgetDeathRecap.vue'
import WidgetTrade from './trade/WidgetTrade.vue'
import WidgetDisenchant from './disenchant/WidgetDisenchant.vue'
import WidgetSearch from './search/WidgetSearch.vue'
import WidgetWealthyExile from './wealthy-exile/WidgetWealthyExile.vue'
import WidgetPoeRe from './regex-library/WidgetPoeRe.vue'

type WidgetComponent = Component & { widget: WidgetSpec }

export const wokeWidgets: WidgetComponent[] = [
  WidgetSearch as unknown as WidgetComponent,
  WidgetRegexLibrary as unknown as WidgetComponent,
  WidgetTradeSearches as unknown as WidgetComponent,
  WidgetMarketTracker as unknown as WidgetComponent,
  WidgetPobBuilds as unknown as WidgetComponent,
  WidgetCampaign as unknown as WidgetComponent,
  WidgetRunTimer as unknown as WidgetComponent,
  WidgetAtlas as unknown as WidgetComponent,
  WidgetLab as unknown as WidgetComponent,
  WidgetChallenges as unknown as WidgetComponent,
  WidgetFarming as unknown as WidgetComponent,
  WidgetDropCounter as unknown as WidgetComponent,
  WidgetStackedDecks as unknown as WidgetComponent,
  WidgetMechanics as unknown as WidgetComponent,
  WidgetMapMods as unknown as WidgetComponent,
  WidgetMapCheck as unknown as WidgetComponent,
  WidgetMapScan as unknown as WidgetComponent,
  WidgetEssenceScan as unknown as WidgetComponent,
  WidgetLabGems as unknown as WidgetComponent,
  WidgetLeagueInvest as unknown as WidgetComponent,
  WidgetBossRuns as unknown as WidgetComponent,
  WidgetScarabFlip as unknown as WidgetComponent,
  WidgetLootFilter as unknown as WidgetComponent,
  WidgetSessionAnalytics as unknown as WidgetComponent,
  WidgetDeathRecap as unknown as WidgetComponent,
  WidgetTrade as unknown as WidgetComponent,
  WidgetDisenchant as unknown as WidgetComponent,
  WidgetWealthyExile as unknown as WidgetComponent,
  WidgetPoeRe as unknown as WidgetComponent
]

export { wokeSettingsFor } from './editors'

export { wokeShortcutsFor } from './shortcuts'

// The settings window (sidebar, search, every page). APT's SettingsWindow renders it.
export { default as WokeSettings } from './settings/SettingsShell.vue'

// Mounted once inside APT's overlay window: first-run module setup, the icon
// dock, the toolkit health icon, the shared menu / undo notes layer, and
// update / crash notices.
export const WokeOverlay = WokeOverlayRoot
