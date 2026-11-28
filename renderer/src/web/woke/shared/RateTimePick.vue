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

const SYNCED = 'Every per hour in the app uses this.'
const OPTIONS = [
  { value: 'play', label: 'Play', title: `Maps and other areas. Hideout, town, AFK and game closed left out.\n${SYNCED}` },
  { value: 'hub', label: '+ Hideout', title: `Hideout and town count too. AFK and game closed left out.\n${SYNCED}` },
  { value: 'all', label: 'All', title: `All time, AFK and game closed included.\n${SYNCED}` }
]
const now = computed(() => rateTimeOf(AppConfig() as unknown as RateTimeHolder))
function pick (t: RateTime) {
  ensureWokeConfig(AppConfig()).woke.rateTime = t
  saveConfig()
}
</script>
