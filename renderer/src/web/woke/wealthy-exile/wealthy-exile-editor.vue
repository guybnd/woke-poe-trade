<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <div class="grid gap-2 items-center" style="grid-template-columns: auto 1fr;">
      <span class="flex items-center gap-2">Hotkey: show or hide Wealthy Exile <w-info text="The hotkey lets you click and scroll right away. Press it again or Esc to go back to the game." /></span>
      <w-hotkey-cell v-model="hotkey" />
    </div>
    <w-toggle v-model="dockIcon">Show an icon in the dock that opens Wealthy Exile</w-toggle>
    <label class="flex flex-col gap-1">
      <span class="flex items-center gap-2">Site page <w-info text="Log in on the page once. The login is kept for next time." /></span>
      <input v-model="url" :placeholder="DEFAULT_SITE_URL" class="w-input rounded px-1 leading-6">
    </label>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import WInfo from '../ui/WInfo.vue'
import WToggle from '../ui/WToggle.vue'
import { configProp, configModelValue } from '@/web/settings/utils'
import { DEFAULT_SITE_URL } from './widget'
import type { WealthyExileWidget } from './widget'

export default defineComponent({
  name: 'WealthyExile',
  components: { WHotkeyCell, WInfo, WToggle },
  props: configProp<WealthyExileWidget>(),
  setup (props) {
    return {
      DEFAULT_SITE_URL,
      hotkey: configModelValue(() => props.configWidget, 'hotkey'),
      url: configModelValue(() => props.configWidget, 'url'),
      dockIcon: computed({
        get: () => props.configWidget.dockIcon === true,
        set: (v: boolean) => { props.configWidget.dockIcon = v }
      })
    }
  }
})
</script>
