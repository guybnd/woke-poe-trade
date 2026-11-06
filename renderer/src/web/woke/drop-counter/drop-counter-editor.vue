<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <WSettingRow label="Hover card" hint="List shows names and rates. Strip is one row of item tiles, with the name under the row as you hover.">
      <WSegmented v-model="layout" :options="[{ value: 'list', label: 'List' }, { value: 'strip', label: 'Strip' }]" />
    </WSettingRow>
    <WSettingRow label="+1 the hovered item" hint="Hover an item in game and press this. It adds the item to the list if it isn't there yet.">
      <w-hotkey-cell v-model="hotkey" />
    </WSettingRow>
    <WSettingRow label="Count maps by themselves" hint="From Client.txt. Going back in through a portal doesn't count again, and neither do side areas or boss arenas.">
      <WToggle v-model="autoCountMaps" />
    </WSettingRow>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { WSegmented, WSettingRow, WToggle } from '../ui'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import { configModelValue, configProp } from '@/web/settings/utils'
import { pushHostConfig } from '@/web/Config'
import type { DropCounterWidget } from './drop-counter'

export default defineComponent({
  name: 'Drop counter',
  components: { WSegmented, WSettingRow, WToggle, WHotkeyCell },
  props: configProp<DropCounterWidget>(),
  setup (props) {
    const w = () => props.configWidget
    return {
      layout: configModelValue(w, 'layout'),
      autoCountMaps: configModelValue(w, 'autoCountMaps'),
      hotkey: computed({
        get: () => w().hotkey ?? null,
        set: (v: string | null) => { w().hotkey = v; pushHostConfig() }
      })
    }
  }
})
</script>
