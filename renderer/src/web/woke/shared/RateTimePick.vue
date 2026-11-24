<template>
  <!-- The Per hour setting (rate-time.ts), the same one in every tool. -->
  <WSegmented :model-value="now" :options="OPTIONS" data-rate-time-pick @update:model-value="pick($event as RateTime)" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AppConfig, saveConfig } from '@/web/Config'
import WSegmented from '../ui/WSegmented.vue'
import { ensureWokeConfig } from '../modules'
import { rateTimeOf } from './rate-time'
import type { RateTime, RateTimeHolder } from './rate-time'

const SYNCED = 'Every per hour uses this choice: Net worth, strategy runs, Session story, Session analytics and Ctrl+Space'
const OPTIONS = [
  { value: 'play', label: 'Play', title: `Per hour of maps and other areas: hideout, town, AFK and game closed left out.\n${SYNCED}` },
  { value: 'hub', label: '+ Hideout', title: `Per hour counts hideout and town too: AFK and game closed left out.\n${SYNCED}` },
  { value: 'all', label: 'All', title: `Per hour of all time, AFK and game closed included.\n${SYNCED}` }
]
const now = computed(() => rateTimeOf(AppConfig() as unknown as RateTimeHolder))
function pick (t: RateTime) {
  ensureWokeConfig(AppConfig()).woke.rateTime = t
  saveConfig()
}
</script>
