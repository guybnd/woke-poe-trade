// Settings editor for each woke widget type (shown on its module's settings page).
// Each loads when its page first opens, to keep them out of the startup JS.
import { defineAsyncComponent } from 'vue'
import type { Component } from 'vue'
import { REGEX_LIBRARY_TYPE } from './regex-library/widget'
import { TRADE_SEARCHES_TYPE } from './trade-searches/widget'
import { POB_BUILDS_TYPE } from './pob-builds/widget'
import { CAMPAIGN_TYPE } from './campaign/widget'
import { RUN_TIMER_TYPE } from './campaign/run-timer'
import { ATLAS_TYPE } from './atlas/widget'
import { LAB_TYPE } from './lab/lab'
import { CHALLENGES_TYPE } from './challenges/widget'
import { FARMING_TYPE } from './farming/farming'
import { DROP_COUNTER_TYPE } from './drop-counter/drop-counter'
import { STACKED_DECKS_TYPE } from './stacked-decks/deck'
import { MECHANICS_TYPE } from './mechanics/widget'
import { MAP_MODS_TYPE } from './map-mods/widget'
import { MAP_SCAN_TYPE } from './map-mods/scan'
import { ESSENCE_SCAN_TYPE } from './essence-scan/widget'
import { LOOT_FILTER_TYPE } from './loot-filter/widget'
import { TRADE_TYPE } from './trade/widget'
import { SCARAB_FLIP_TYPE } from './scarab-flip/widget'
import { LAB_GEMS_TYPE } from './lab-gems/widget'
import { BOSS_RUNS_TYPE } from './boss-runs/widget'
import { MARKET_TRACKER_TYPE } from './market/widget'
import { LEAGUE_INVEST_TYPE } from './league-invest/widget'
import { DISENCHANT_TYPE } from './disenchant/widget'
import { WEALTHY_EXILE_TYPE } from './wealthy-exile/widget'
const RegexLibraryEditor = defineAsyncComponent(() => import('./regex-library/regex-library-editor.vue'))
const TradeSearchesEditor = defineAsyncComponent(() => import('./trade-searches/trade-searches-editor.vue'))
const PobBuildsEditor = defineAsyncComponent(() => import('./pob-builds/pob-builds-editor.vue'))
const CampaignEditor = defineAsyncComponent(() => import('./campaign/campaign-editor.vue'))
const RunTimerEditor = defineAsyncComponent(() => import('./campaign/run-timer-editor.vue'))
const AtlasEditor = defineAsyncComponent(() => import('./atlas/atlas-editor.vue'))
const LabEditor = defineAsyncComponent(() => import('./lab/lab-editor.vue'))
const ChallengesEditor = defineAsyncComponent(() => import('./challenges/challenges-editor.vue'))
const FarmingEditor = defineAsyncComponent(() => import('./farming/farming-editor.vue'))
const DropCounterEditor = defineAsyncComponent(() => import('./drop-counter/drop-counter-editor.vue'))
const StackedDecksEditor = defineAsyncComponent(() => import('./stacked-decks/stacked-decks-editor.vue'))
const MechanicsEditor = defineAsyncComponent(() => import('./mechanics/mechanics-editor.vue'))
const MapModsEditor = defineAsyncComponent(() => import('./map-mods/map-mods-editor.vue'))
const MapScanEditor = defineAsyncComponent(() => import('./map-mods/map-scan-editor.vue'))
const EssenceScanEditor = defineAsyncComponent(() => import('./essence-scan/essence-scan-editor.vue'))
const LootFilterEditor = defineAsyncComponent(() => import('./loot-filter/loot-filter-editor.vue'))
const TradeEditor = defineAsyncComponent(() => import('./trade/trade-editor.vue'))
const FlipsEditor = defineAsyncComponent(() => import('./scarab-flip/flips-editor.vue'))
const LabGemsEditor = defineAsyncComponent(() => import('./lab-gems/lab-gems-editor.vue'))
const BossRunsEditor = defineAsyncComponent(() => import('./boss-runs/boss-runs-editor.vue'))
const MarketEditor = defineAsyncComponent(() => import('./market/market-editor.vue'))
const LeagueInvestEditor = defineAsyncComponent(() => import('./league-invest/league-invest-editor.vue'))
const DisenchantEditor = defineAsyncComponent(() => import('./disenchant/disenchant-editor.vue'))
const WealthyExileEditor = defineAsyncComponent(() => import('./wealthy-exile/wealthy-exile-editor.vue'))

const editors: Record<string, Component> = {
  [REGEX_LIBRARY_TYPE]: RegexLibraryEditor,
  [TRADE_SEARCHES_TYPE]: TradeSearchesEditor,
  [POB_BUILDS_TYPE]: PobBuildsEditor,
  [CAMPAIGN_TYPE]: CampaignEditor,
  [RUN_TIMER_TYPE]: RunTimerEditor,
  [ATLAS_TYPE]: AtlasEditor,
  [LAB_TYPE]: LabEditor,
  [CHALLENGES_TYPE]: ChallengesEditor,
  [MAP_MODS_TYPE]: MapModsEditor,
  [MAP_SCAN_TYPE]: MapScanEditor,
  [ESSENCE_SCAN_TYPE]: EssenceScanEditor,
  [MECHANICS_TYPE]: MechanicsEditor,
  [LOOT_FILTER_TYPE]: LootFilterEditor,
  [FARMING_TYPE]: FarmingEditor,
  [DROP_COUNTER_TYPE]: DropCounterEditor,
  [STACKED_DECKS_TYPE]: StackedDecksEditor,
  [TRADE_TYPE]: TradeEditor,
  [SCARAB_FLIP_TYPE]: FlipsEditor,
  [LAB_GEMS_TYPE]: LabGemsEditor,
  [BOSS_RUNS_TYPE]: BossRunsEditor,
  [MARKET_TRACKER_TYPE]: MarketEditor,
  [LEAGUE_INVEST_TYPE]: LeagueInvestEditor,
  [DISENCHANT_TYPE]: DisenchantEditor,
  [WEALTHY_EXILE_TYPE]: WealthyExileEditor
}

// Opt-in widgets (the stash reader, personal.ts) add theirs when turned on.
export function addEditor (wmType: string, editor: Component) {
  editors[wmType] = editor
}

export function removeEditor (wmType: string) {
  delete editors[wmType] // eslint-disable-line @typescript-eslint/no-dynamic-delete
}

export function wokeSettingsFor (wmType: string | undefined): Component | undefined {
  return wmType ? editors[wmType] : undefined
}
