<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <input class="w-input rounded px-1 w-48" placeholder="Widget title" v-model="title" />
    <label class="flex flex-col gap-1">
      <span>Builds folder</span>
      <input v-model="buildsDir" class="w-input rounded px-1 leading-6"
        placeholder="Leave empty for Documents\Path of Building\Builds">
    </label>
    <label class="flex flex-col gap-1">
      <span class="flex items-center gap-2">Path of Building executable (optional) <w-info text="&quot;Open in PoB&quot; starts this program with the build file. When it's empty, the file opens with whatever app is set for .xml files." /></span>
      <input v-model="pobExe" class="w-input rounded px-1 leading-6"
        placeholder="e.g. C:\Users\you\AppData\Roaming\Path of Building Community\Path of Building.exe">
    </label>
    <WSettingRow label="Hotkey: draw the build over the passive tree"
      hint="Open the passive tree in game and press it. Shows the active build's nodes you haven't taken yet. It follows when you drag the tree and snaps again after a scroll. Press again to hide it. Nothing reads the screen until you press it.">
      <w-hotkey-cell v-model="treeHotkey" />
    </WSettingRow>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { configProp, configModelValue } from '@/web/settings/utils'
import type { PobBuildsWidget } from './widget'
import { treeHotkeyOf } from './widget'
import { WSettingRow } from '../ui'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import WInfo from '../ui/WInfo.vue'

export default defineComponent({
  name: 'PoB builds',
  components: { WInfo, WSettingRow, WHotkeyCell },
  props: configProp<PobBuildsWidget>(),
  setup (props) {
    return {
      title: configModelValue(() => props.configWidget, 'wmTitle'),
      buildsDir: configModelValue(() => props.configWidget, 'buildsDir'),
      pobExe: configModelValue(() => props.configWidget, 'pobExe'),
      treeHotkey: computed({
        get: () => treeHotkeyOf(props.configWidget),
        set: (key: string | null) => { props.configWidget.treeHotkey = key }
      })
    }
  }
})
</script>
