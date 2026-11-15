// Every woke widget's spec (type, instances, defaults), kept apart from its
// component. The registry needs the spec at startup; the component loads
// only when a widget of that type is first mounted (index.ts), so a
// switched-off tool's code never loads.
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { ANALYTICS_TYPE } from './analytics/types'
import { ATLAS_TYPE } from './atlas/widget'
import { BOSS_RUNS_TYPE } from './boss-runs/widget'
import { RUN_TIMER_TYPE } from './campaign/run-timer'
import { CAMPAIGN_TYPE } from './campaign/widget'
import { CHALLENGES_TYPE } from './challenges/widget'
import { DEATH_RECAP_TYPE, initDeathRecapWidget } from './death-recap/widget'
import { DISENCHANT_TYPE } from './disenchant/widget'
import { DROP_COUNTER_TYPE } from './drop-counter/drop-counter'
import { ESSENCE_SCAN_TYPE } from './essence-scan/widget'
import { FARMING_TYPE } from './farming/farming'
import { LAB_GEMS_TYPE } from './lab-gems/widget'
import { LAB_TYPE } from './lab/lab'
import { LEAGUE_INVEST_TYPE } from './league-invest/widget'
import { LOOT_FILTER_TYPE } from './loot-filter/widget'
import { MAP_CHECK_TYPE, initMapCheckWidget } from './map-mods/map-check'
import { MAP_SCAN_TYPE } from './map-mods/scan'
import { MAP_MODS_TYPE } from './map-mods/widget'
import { MARKET_TRACKER_TYPE } from './market/widget'
import { MECHANICS_TYPE } from './mechanics/widget'
import { POB_BUILDS_TYPE } from './pob-builds/widget'
import { POE_RE_TYPE, initPoeReWidget } from './regex-library/poe-re-widget'
import { REGEX_LIBRARY_TYPE, RegexLibraryWidget, starterEntries } from './regex-library/widget'
import { SCARAB_FLIP_TYPE } from './scarab-flip/widget'
import { SEARCH_TYPE, initSearchWidget } from './search/widget'
import { STACKED_DECKS_TYPE, initStackedDecksWidget } from './stacked-decks/deck'
import { TRADE_SEARCHES_TYPE } from './trade-searches/widget'
import { TRADE_TYPE } from './trade/widget'
import { popupAnchor } from './ui/window-anchor'
import { WEALTHY_EXILE_TYPE } from './wealthy-exile/widget'

export const widgetRegexLibrarySpec = {
  type: REGEX_LIBRARY_TYPE,
  instances: 'multi',
  trNameKey: 'Regex library',
  defaultInstances: (): RegexLibraryWidget[] => [{
    wmId: 0,
    wmType: REGEX_LIBRARY_TYPE,
    wmTitle: 'Regex library',
    wmWants: 'hide',
    wmZorder: null,
    wmFlags: ['invisible-on-blur'],
    anchor: popupAnchor(),
    enableHotkeys: true,
    entries: starterEntries()
  }]
} satisfies WidgetSpec

export const widgetTradeSearchesSpec = {
  type: TRADE_SEARCHES_TYPE,
  instances: 'multi',
  trNameKey: 'Trade searches'
} satisfies WidgetSpec

export const widgetMarketTrackerSpec = {
  type: MARKET_TRACKER_TYPE,
  instances: 'multi',
  trNameKey: 'Market'
} satisfies WidgetSpec

export const widgetPobBuildsSpec = {
  type: POB_BUILDS_TYPE,
  instances: 'multi',
  trNameKey: 'PoB builds'
} satisfies WidgetSpec

export const widgetCampaignSpec = {
  type: CAMPAIGN_TYPE,
  instances: 'multi',
  trNameKey: 'Campaign'
} satisfies WidgetSpec

export const widgetRunTimerSpec = {
  type: RUN_TIMER_TYPE,
  instances: 'multi',
  trNameKey: 'Run timer'
} satisfies WidgetSpec

export const widgetAtlasSpec = {
  type: ATLAS_TYPE,
  instances: 'multi',
  trNameKey: 'Atlas strategies'
} satisfies WidgetSpec

export const widgetLabSpec = {
  type: LAB_TYPE,
  instances: 'multi',
  trNameKey: 'Labyrinth'
} satisfies WidgetSpec

export const widgetChallengesSpec = {
  type: CHALLENGES_TYPE,
  instances: 'multi',
  trNameKey: 'Challenges'
} satisfies WidgetSpec

export const widgetFarmingSpec = {
  type: FARMING_TYPE,
  instances: 'multi',
  trNameKey: 'Farming'
} satisfies WidgetSpec

export const widgetDropCounterSpec = {
  type: DROP_COUNTER_TYPE,
  instances: 'multi',
  trNameKey: 'Drop counter'
} satisfies WidgetSpec

export const widgetStackedDecksSpec = {
  type: STACKED_DECKS_TYPE,
  instances: 'single',
  trNameKey: 'Stacked decks',
  initInstance: () => initStackedDecksWidget(0)
} satisfies WidgetSpec

export const widgetMechanicsSpec = {
  type: MECHANICS_TYPE,
  instances: 'multi',
  trNameKey: 'League mechanics'
} satisfies WidgetSpec

export const widgetMapModsSpec = {
  type: MAP_MODS_TYPE,
  instances: 'multi',
  trNameKey: 'Map mods'
} satisfies WidgetSpec

export const widgetMapCheckSpec = {
  type: MAP_CHECK_TYPE,
  instances: 'single',
  initInstance: () => initMapCheckWidget(0)
} satisfies WidgetSpec

export const widgetMapScanSpec = {
  type: MAP_SCAN_TYPE,
  instances: 'multi',
  trNameKey: 'Map scan'
} satisfies WidgetSpec

export const widgetEssenceScanSpec = {
  type: ESSENCE_SCAN_TYPE,
  instances: 'multi',
  trNameKey: 'Essence scan'
} satisfies WidgetSpec

export const widgetLabGemsSpec = {
  type: LAB_GEMS_TYPE,
  instances: 'multi',
  trNameKey: 'Lab gems'
} satisfies WidgetSpec

export const widgetLeagueInvestSpec = {
  type: LEAGUE_INVEST_TYPE,
  instances: 'multi',
  trNameKey: 'League investments'
} satisfies WidgetSpec

export const widgetBossRunsSpec = {
  type: BOSS_RUNS_TYPE,
  instances: 'multi',
  trNameKey: 'Boss runs'
} satisfies WidgetSpec

export const widgetScarabFlipSpec = {
  type: SCARAB_FLIP_TYPE,
  instances: 'multi',
  trNameKey: 'Flips'
} satisfies WidgetSpec

export const widgetLootFilterSpec = {
  type: LOOT_FILTER_TYPE,
  instances: 'multi',
  trNameKey: 'Loot filter'
} satisfies WidgetSpec

export const widgetSessionAnalyticsSpec = {
  type: ANALYTICS_TYPE,
  instances: 'multi',
  trNameKey: 'Session analytics'
} satisfies WidgetSpec

export const widgetDeathRecapSpec = {
  type: DEATH_RECAP_TYPE,
  instances: 'single',
  trNameKey: 'Death recap',
  initInstance: () => initDeathRecapWidget(0)
} satisfies WidgetSpec

export const widgetTradeSpec = {
  type: TRADE_TYPE,
  instances: 'multi',
  trNameKey: 'Trades'
} satisfies WidgetSpec

export const widgetDisenchantSpec = {
  type: DISENCHANT_TYPE,
  instances: 'multi',
  trNameKey: 'Disenchant'
} satisfies WidgetSpec

export const widgetSearchSpec = {
  type: SEARCH_TYPE,
  instances: 'single',
  trNameKey: 'Search',
  initInstance: () => initSearchWidget(0)
} satisfies WidgetSpec

export const widgetWealthyExileSpec = {
  type: WEALTHY_EXILE_TYPE,
  instances: 'multi',
  trNameKey: 'Wealthy Exile'
} satisfies WidgetSpec

export const widgetPoeReSpec = {
  type: POE_RE_TYPE,
  instances: 'single',
  initInstance: () => initPoeReWidget(0)
} satisfies WidgetSpec
