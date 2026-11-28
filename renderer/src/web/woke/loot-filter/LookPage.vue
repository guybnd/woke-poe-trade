<template>
  <!-- Look & sound (Guy 2026-11-28): settings for the whole filter, not one
       class. A row of the Loot rail, not a tab of its own. -->
  <div :class="$style.wrap" class="w-scroll" data-loot-look>
    <LookStrip :store="store" :config="config" />
    <PresetsTab :store="store" :config="config" :only="LOOK_PRESETS" />
  </div>
</template>

<script setup lang="ts">
import LookStrip from './LookStrip.vue'
import PresetsTab from './PresetsTab.vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import type { Presets } from './presets'

defineProps<{ store: LootFilterStore, config: LootFilterWidget }>()
const LOOK_PRESETS: ReadonlyArray<keyof Presets> = ['bigger', 'colourBlind', 'volume', 'beams', 'quiet']
</script>

<style module>
.wrap { flex: 1 1 auto; min-height: 0; padding: 8px var(--w-pad) 12px; display: flex; flex-direction: column; gap: 8px; }
</style>
