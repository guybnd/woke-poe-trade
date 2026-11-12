<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <div class="grid gap-2 items-center" style="grid-template-columns: auto 1fr;">
      <span>Hotkey: show or hide net worth</span>
      <w-hotkey-cell v-model="hotkey" />
    </div>
    <w-toggle v-model="dockIcon">Show an icon in the dock</w-toggle>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import WToggle from '../ui/WToggle.vue'
import { configProp, configModelValue } from '@/web/settings/utils'
import type { NetWorthWidget } from './widget'

export default defineComponent({
  name: 'NetWorth',
  components: { WHotkeyCell, WToggle },
  props: configProp<NetWorthWidget>(),
  setup (props) {
    return {
      hotkey: configModelValue(() => props.configWidget, 'hotkey'),
      dockIcon: computed({
        get: () => props.configWidget.dockIcon !== false,
        set: (v: boolean) => { props.configWidget.dockIcon = v }
      })
    }
  }
})
</script>
