<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <div class="grid gap-2 items-center" style="grid-template-columns: auto 1fr;">
      <div class="w-dim">When you leave a map, show its time</div>
      <WSegmented v-model="chipPlace" :options="CHIP_OPTIONS" />
      <div class="w-dim">It goes away</div>
      <WSelect v-model="chipSeconds" :options="CHIP_TIMES" class="w-48" />
      <div class="w-dim">Key that closes it</div>
      <w-hotkey-cell v-model="chipKey" />
    </div>
    <w-toggle v-model="chipClick">Click the line in the middle of the screen to close it (it then takes the mouse while it's under the cursor)</w-toggle>
    <div class="w-dim text-sm">A close key is taken from the game while it's set, so pick one you don't play with: Space would stop reaching the game.</div>
    <div class="w-dim text-sm">The line shows map, tier, time against that map's average in the last hour and against your previous map, deaths, league NPCs met and level-ups. In the middle of the screen it never catches a click unless "Click" is on below, and then only while the cursor is over it.</div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import WSegmented from '../ui/WSegmented.vue'
import WSelect from '../ui/WSelect.vue'
import WToggle from '../ui/WToggle.vue'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import { pushHostConfig } from '@/web/Config'
import { configProp } from '@/web/settings/utils'
import type { ChipPlace, SessionStoryWidget } from './widget'

const CHIP_OPTIONS: Array<{ value: ChipPlace, label: string }> = [
  { value: 'dock', label: 'On the dock icon' },
  { value: 'center', label: 'Middle of the screen' },
  { value: 'off', label: 'Off' }
]

const CHIP_TIMES = [
  { value: '5', label: 'After 5 s' },
  { value: '8', label: 'After 8 s' },
  { value: '15', label: 'After 15 s' },
  { value: '30', label: 'After 30 s' },
  { value: '0', label: 'When you go into a map' }
]

export default defineComponent({
  name: 'SessionStory',
  components: { WSegmented, WSelect, WToggle, WHotkeyCell },
  props: configProp<SessionStoryWidget>(),
  setup (props) {
    const w = () => props.configWidget
    return {
      CHIP_OPTIONS,
      CHIP_TIMES,
      chipClick: computed({
        get: () => w().chipClick === true,
        set: (v: boolean) => { w().chipClick = v }
      }),
      chipKey: computed({
        get: () => w().chipKey ?? null,
        set: (v: string | null) => { w().chipKey = v; pushHostConfig() }
      }),
      chipSeconds: computed({
        get: () => String(w().chipSeconds ?? 8),
        set: (v: string) => { w().chipSeconds = Number(v) }
      }),
      chipPlace: computed({
        get: () => w().chipPlace ?? 'dock',
        set: (v: ChipPlace) => { w().chipPlace = v }
      })
    }
  }
})
</script>
