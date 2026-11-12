<template>
  <HiddenNote />
  <Dock />
  <PinLayer />
  <ToolkitHealth />
  <StashOutlines />
  <OverlayLayer />
  <GameTooltip />
  <HelpCard />
  <AppNotices />
</template>

<script setup lang="ts">
import HiddenNote from './switchboard/HiddenNote.vue'
import Dock from './dock/Dock.vue'
import PinLayer from './pins/PinLayer.vue'
import ToolkitHealth from './dock/ToolkitHealth.vue'
import OverlayLayer from './ui/OverlayLayer.vue'
import StashOutlines from './scarab-flip/StashOutlines.vue'
import GameTooltip from './ui/tooltip/GameTooltip.vue'
import HelpCard from './ui/HelpCard.vue'
import AppNotices from './app/AppNotices.vue'
import { MainProcess } from '@/web/background/IPC'
import { AppConfig, pushHostConfig, saveConfigQuietly } from '@/web/Config'
import { onUnmounted } from 'vue'
import { toast } from './ui'
import { LOOT_FILTER_SAMPLE_TARGET } from './loot-filter/widget'

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
