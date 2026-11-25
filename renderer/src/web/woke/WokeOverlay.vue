<template>
  <HiddenNote />
  <Dock />
  <PinLayer />
  <ToolkitHealth />
  <WhatsNew v-if="newsUnseen" />
  <ClaudeSuggestions />
  <StashOutlines />
  <TreeOverlay />
  <AtlasOverlay />
  <OverlayLayer />
  <GameTooltip />
  <HelpCard />
  <AppNotices />
  <ReportDialog v-if="reportDialogOpen" />
  <!-- 3.30 Wickerman module (remove with the league). -->
  <WickermanDock v-if="wickermanOn" />
</template>

<script setup lang="ts">
import HiddenNote from './switchboard/HiddenNote.vue'
import Dock from './dock/Dock.vue'
import PinLayer from './pins/PinLayer.vue'
import ToolkitHealth from './dock/ToolkitHealth.vue'
import ClaudeSuggestions from './claude-link/ClaudeSuggestions.vue'
import OverlayLayer from './ui/OverlayLayer.vue'
import StashOutlines from './scarab-flip/StashOutlines.vue'
import TreeOverlay from './pob-builds/TreeOverlay.vue'
import AtlasOverlay from './atlas/AtlasOverlay.vue'
import GameTooltip from './ui/tooltip/GameTooltip.vue'
import HelpCard from './ui/HelpCard.vue'
import AppNotices from './app/AppNotices.vue'
import { reportDialogOpen } from './app/report'
import { MainProcess } from '@/web/background/IPC'
import { AppConfig, pushHostConfig, saveConfigQuietly } from '@/web/Config'
import { computed, defineAsyncComponent, onUnmounted, watch } from 'vue'
import { isModuleOn, isWidgetTypeOn } from './modules'
import type { WokeModulesConfig } from './modules'
import { toast } from './ui'
import { LOOT_FILTER_SAMPLE_TARGET } from './loot-filter/widget'
import { unseenNews } from './tab-bar/news'
import { dayOf, refreshWorth, worthLine } from './tab-bar/worth-knowing'
import { hintPlaceOk, overlayOpen } from './shared/hints'
import { zone } from './shared/zone'
import { personalOn } from './personal'

// What's new in the dock, loaded only after an update brings some, or with a
// Worth knowing line (tab-bar/worth-knowing.ts) due.
const WhatsNew = defineAsyncComponent(() => import('./dock/WhatsNew.vue'))
function worthCtx (woke: WokeModulesConfig) {
  return {
    unseenNews: new Set(unseenNews(woke, MainProcess.version.value).map(n => n.id)),
    byName: AppConfig().language === 'en',
    reader: personalOn.value,
    toolOn: (t: string) => isWidgetTypeOn(AppConfig(), t)
  }
}
const worthDue = computed(() => {
  const woke = AppConfig().woke
  return woke?.setupDone === true && !woke.newsOff && hintPlaceOk() && worthLine(woke.hints, worthCtx(woke)) != null
})
const newsUnseen = computed(() => unseenNews(AppConfig().woke, MainProcess.version.value).length > 0 || worthDue.value)
// The line of the day is picked at start, as the overlay opens, and on
// reaching town or a hideout (for players who only use hotkeys and the dock).
watch([overlayOpen, () => zone.kind], ([open, kind]) => {
  const woke = AppConfig().woke
  if (!(open || kind == null || kind === 'town' || kind === 'hideout') || !woke?.setupDone || woke.newsOff) return
  woke.hints ??= {}
  if (refreshWorth(woke.hints, dayOf(new Date()), worthCtx(woke))) saveConfigQuietly()
}, { immediate: true })

// Loaded when first opened: kept out of the startup JS (perf budget).
const ReportDialog = defineAsyncComponent(() => import('./app/ReportDialog.vue'))
const WickermanDock = defineAsyncComponent(() => import('./wickerman/WickermanDock.vue'))
const wickermanOn = computed(() => isModuleOn(AppConfig(), 'wickerman'))

// A hotkey that copies an item found nothing to copy. The loot filter's sample
// key has its own message.
const itemFailed = MainProcess.onEvent('MAIN->CLIENT::item-text-failed', ({ target }) => {
  if (target !== LOOT_FILTER_SAMPLE_TARGET) toast('No item under the mouse. Hover over an item and try again.')
})
onUnmounted(() => { itemFailed.abort() })

// The tray's way back when the overlay key doesn't work.
const trayReset = MainProcess.onEvent('MAIN->CLIENT::woke-event', ({ topic, data }) => {
  if (topic !== 'reset-overlay-key' || !MainProcess.isElectron) return
  AppConfig().overlayKey = (data as { key: string }).key
  pushHostConfig()
  saveConfigQuietly()
})
onUnmounted(() => { trayReset.abort() })
</script>
