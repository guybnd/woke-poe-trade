<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <ChipSettings :config="configWidget">
      <template #key><w-hotkey-cell v-model="chipKey" /></template>
    </ChipSettings>
    <div class="w-dim text-sm">The line shows the map's time, against that map's average in the last hour and your previous map, with deaths, league NPCs met and level-ups.</div>
    <div class="flex flex-col gap-1" data-skip-areas>
      <span class="w-dim text-sm">Not counted as maps, one area per line</span>
      <textarea v-model="skipText" class="w-field" rows="4" spellcheck="false"
        @input="takeSkip" @focus="editing = true" @blur="editing = false" @change="saveSkip" />
      <div class="flex items-center gap-2">
        <span class="w-faint text-xs flex-1">From now on, left out of the map toast, the night's maps, map and hideout time, averages and the strip. Use the name the game shows when you enter the area.</span>
        <WButton size="sm" variant="ghost" :disabled="isDefault" @click="resetSkip">Use the defaults</WButton>
      </div>
    </div>
    <div class="w-dim text-sm">In the middle of the screen it takes the mouse only once you rest the pointer on it, so clicks to move across it still reach the game. A click on it closes it, its bottom-right corner resizes it, and it waits while the pointer is on it. It also goes when you enter a map. A close key is taken from the game while it's set, so pick one you don't play with (Space would stop reaching the game).</div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import { configProp } from '@/web/settings/utils'
import ChipSettings from './ChipSettings.vue'
import WButton from '../ui/WButton.vue'
import { DEFAULT_SKIP_AREAS, parseSkipAreas } from './skip-areas'
import type { SessionStoryWidget } from './widget'

export default defineComponent({
  name: 'SessionStory',
  components: { ChipSettings, WButton, WHotkeyCell },
  props: configProp<SessionStoryWidget>(),
  setup (props) {
    const w = () => props.configWidget
    const listOf = () => w().skipAreas ?? [...DEFAULT_SKIP_AREAS]
    // Saved as you type (Settings can close on Esc before the box loses focus),
    // but the text is only tidied once it does.
    const lines = (list: readonly string[]) => list.join('\n')
    const skipText = ref(lines(listOf()))
    const editing = ref(false)
    const takeSkip = () => { w().skipAreas = parseSkipAreas(skipText.value) }
    // An Undo in Settings swaps the config under the box.
    watch(() => w().skipAreas, (l) => { if (!editing.value) skipText.value = lines(l ?? DEFAULT_SKIP_AREAS) })
    const saveSkip = () => {
      const list = parseSkipAreas(skipText.value)
      w().skipAreas = list
      skipText.value = lines(list)
    }
    const resetSkip = () => {
      w().skipAreas = undefined
      skipText.value = lines(DEFAULT_SKIP_AREAS)
    }
    const isDefault = computed(() => w().skipAreas == null)
    return {
      skipText,
      editing,
      takeSkip,
      saveSkip,
      resetSkip,
      isDefault,
      chipKey: computed({
        get: () => w().chipKey ?? null,
        set: (v: string | null) => { w().chipKey = v }
      })
    }
  }
})
</script>
