// Settings editor for each woke widget type (shown on its module's settings page).
import type { Component } from 'vue'
import RegexLibraryEditor from './regex-library/regex-library-editor.vue'
import TradeSearchesEditor from './trade-searches/trade-searches-editor.vue'
import PobBuildsEditor from './pob-builds/pob-builds-editor.vue'
import CampaignEditor from './campaign/campaign-editor.vue'
import RunTimerEditor from './campaign/run-timer-editor.vue'
import AtlasEditor from './atlas/atlas-editor.vue'
import LabEditor from './lab/lab-editor.vue'
import ChallengesEditor from './challenges/challenges-editor.vue'
import FarmingEditor from './farming/farming-editor.vue'
import DropCounterEditor from './drop-counter/drop-counter-editor.vue'
import StackedDecksEditor from './stacked-decks/stacked-decks-editor.vue'
import MechanicsEditor from './mechanics/mechanics-editor.vue'
import MapModsEditor from './map-mods/map-mods-editor.vue'
import MapScanEditor from './map-mods/map-scan-editor.vue'
import EssenceScanEditor from './essence-scan/essence-scan-editor.vue'
import LootFilterEditor from './loot-filter/loot-filter-editor.vue'
import TradeEditor from './trade/trade-editor.vue'
import FlipsEditor from './scarab-flip/flips-editor.vue'
import LabGemsEditor from './lab-gems/lab-gems-editor.vue'
import BossRunsEditor from './boss-runs/boss-runs-editor.vue'
import MarketEditor from './market/market-editor.vue'
import LeagueInvestEditor from './league-invest/league-invest-editor.vue'
import DisenchantEditor from './disenchant/disenchant-editor.vue'
import WealthyExileEditor from './wealthy-exile/wealthy-exile-editor.vue'
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
