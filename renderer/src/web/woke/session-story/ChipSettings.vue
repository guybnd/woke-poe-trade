<template>
  <div :class="$style.grid" data-chip-settings>
    <span class="w-dim">After a map, show its time</span>
    <WSegmented v-model="place" :options="CHIP_OPTIONS" />
    <template v-if="place !== 'off'">
      <span class="w-dim">Goes away</span>
      <WSelect v-model="seconds" :options="CHIP_TIMES" />
    </template>
    <template v-if="place !== 'off'">
      <span class="w-dim">Close key</span>
      <slot name="key">
        <span class="text-xs">{{ config.chipKey || 'None' }} <span class="w-faint">(set in Settings › Sessions)</span></span>
      </slot>
    </template>
    <span class="w-dim">While in a map</span>
    <WToggle v-model="glance" title="A thin bar at the top with the map, its time so far and the run's or tonight's maps and profit (pick below), and each map's result once you leave it. While you play it never takes the mouse; with the overlay open, drag it to move it.">Glance bar</WToggle>
    <GlanceSettings v-if="glance" :config="config" />
    <template v-if="showMe">
      <span />
      <WButton size="sm" :disabled="place === 'off' || !canShow" @click="showMe">Show me with your last map</WButton>
    </template>
  </div>
</template>

<script setup lang="ts">
// The map line's settings, the same block in the dock card, the window's gear
// and Settings › Sessions.
import { computed } from 'vue'
import { pushHostConfig } from '@/web/Config'
import WButton from '../ui/WButton.vue'
import WSegmented from '../ui/WSegmented.vue'
import WSelect from '../ui/WSelect.vue'
import WToggle from '../ui/WToggle.vue'
import { chipPlaceOf, glanceOn } from './glance'
import type { ChipPlace, SessionStoryWidget } from './widget'
import GlanceSettings from './GlanceSettings.vue'

const props = defineProps<{
  config: SessionStoryWidget
  // The preview; left out where there's nothing to show it with (Settings).
  showMe?: () => void
  canShow?: boolean
  // In Settings the change is saved with the page; elsewhere it applies now.
  live?: boolean
}>()

const ALL_OPTIONS: Array<{ value: ChipPlace, label: string }> = [
  { value: 'bar', label: 'Glance bar' },
  { value: 'dock', label: 'Dock icon' },
  { value: 'center', label: 'Middle of the screen' },
  { value: 'off', label: 'Off' }
]
// The glance bar is a place only while it's on.
const CHIP_OPTIONS = computed(() => glanceOn(props.config) ? ALL_OPTIONS : ALL_OPTIONS.filter(o => o.value !== 'bar'))
const CHIP_TIMES = [
  { value: '5', label: 'After 5 s' },
  { value: '8', label: 'After 8 s' },
  { value: '15', label: 'After 15 s' },
  { value: '30', label: 'After 30 s' },
  { value: '0', label: 'When you go into a map' }
]

const place = computed({
  get: () => chipPlaceOf(props.config),
  set: (v: ChipPlace) => {
    props.config.chipPlace = v
    // The close key is registered only while the line shows somewhere.
    if (props.live) pushHostConfig()
  }
})
const glance = computed({
  get: () => glanceOn(props.config),
  set: (v: boolean) => {
    props.config.glance = v
    if (props.live) pushHostConfig()
  }
})
const seconds = computed({
  get: () => String(props.config.chipSeconds ?? 8),
  set: (v: string) => { props.config.chipSeconds = Number(v) }
})
</script>

<style module>
.grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 10px;
  align-items: center;
  font-size: var(--w-fs-sm);
}
.grid > * { justify-self: start; }
</style>
