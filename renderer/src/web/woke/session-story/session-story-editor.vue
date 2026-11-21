<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <ChipSettings :config="configWidget">
      <template #key><w-hotkey-cell v-model="chipKey" /></template>
    </ChipSettings>
    <div class="w-dim text-sm">The line shows the map's time, against that map's average in the last hour and your previous map, with deaths, league NPCs met and level-ups.</div>
    <div class="w-dim text-sm">In the middle of the screen it takes the mouse only once you rest the pointer on it, so clicks to move across it still reach the game. A click on it closes it, its bottom-right corner resizes it, and it waits while the pointer is on it. It also goes when you enter a map. A close key is taken from the game while it's set, so pick one you don't play with (Space would stop reaching the game).</div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import { configProp } from '@/web/settings/utils'
import ChipSettings from './ChipSettings.vue'
import type { SessionStoryWidget } from './widget'

export default defineComponent({
  name: 'SessionStory',
  components: { ChipSettings, WHotkeyCell },
  props: configProp<SessionStoryWidget>(),
  setup (props) {
    const w = () => props.configWidget
    return {
      chipKey: computed({
        get: () => w().chipKey ?? null,
        set: (v: string | null) => { w().chipKey = v }
      })
    }
  }
})
</script>
