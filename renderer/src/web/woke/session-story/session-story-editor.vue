<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <div class="grid gap-2 items-center" style="grid-template-columns: auto 1fr;">
      <div class="w-dim">When you leave a map, show its time</div>
      <WSegmented v-model="chipPlace" :options="CHIP_OPTIONS" />
    </div>
    <div class="w-dim text-sm">The line shows for 8 seconds: map, tier, time against your last 10 maps, deaths, league NPCs met and level-ups. In the middle of the screen it never catches a click.</div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import WSegmented from '../ui/WSegmented.vue'
import { configProp } from '@/web/settings/utils'
import type { ChipPlace, SessionStoryWidget } from './widget'

const CHIP_OPTIONS: Array<{ value: ChipPlace, label: string }> = [
  { value: 'dock', label: 'On the dock icon' },
  { value: 'center', label: 'Middle of the screen' },
  { value: 'off', label: 'Off' }
]

export default defineComponent({
  name: 'SessionStory',
  components: { WSegmented },
  props: configProp<SessionStoryWidget>(),
  setup (props) {
    const w = () => props.configWidget
    return {
      CHIP_OPTIONS,
      chipPlace: computed({
        get: () => w().chipPlace ?? 'dock',
        set: (v: ChipPlace) => { w().chipPlace = v }
      })
    }
  }
})
</script>
