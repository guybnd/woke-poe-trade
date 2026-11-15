<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <input class="w-input rounded px-1 w-48" placeholder="Widget title" v-model="title" />
    <label class="flex flex-col gap-1">
      <span>Builds folder</span>
      <input v-model="buildsDir" class="w-input rounded px-1 leading-6"
        placeholder="Leave empty for Documents\Path of Building\Builds">
    </label>
    <label class="flex flex-col gap-1">
      <span class="flex items-center gap-2">Path of Building executable (optional) <w-info text="&quot;Open in PoB&quot; starts this program on the build. Leave it empty to use the Path of Building installed on this PC." /></span>
      <input v-model="pobExe" class="w-input rounded px-1 leading-6"
        placeholder="e.g. C:\Users\you\AppData\Roaming\Path of Building Community\Path of Building.exe">
    </label>
    <WSettingRow label="Hotkey: draw the build over the passive tree"
      hint="Open the passive tree in game and press it. Shows the active build's nodes you haven't taken yet. It follows when you drag the tree and snaps again after a scroll. Press again to hide it. Nothing reads the screen until you press it.">
      <w-hotkey-cell v-model="treeHotkey" />
    </WSettingRow>
    <WSettingRow label="Dock icon click draws on the passive tree"
      hint="With the tree open in game, a click on the build's dock icon draws the build over it (a second click hides it). Anywhere else the click opens this window as before. Its right-click menu and hover card have the same option.">
      <WToggle v-model="treeOnIconClick" />
    </WSettingRow>
    <WSettingRow label="Mark nodes to refund on the passive tree"
      hint="The build drawing also marks, in red, nodes you've taken in game that this tree doesn't have. Only what's on screen and joined to your taken nodes is checked; masteries and the ascendancy aren't.">
      <WToggle v-model="treeRefunds" />
    </WSettingRow>
    <template v-if="personalOn">
      <WSettingRow label="Mark gems against your character"
        hint="In the build window, your level/quality in amber beside a gem where yours is lower, 'none' where you don't socket it. Hover a gem for your numbers. Also on the Links heading.">
        <WToggle v-model="characterGemMarks" />
      </WSettingRow>
      <WSettingRow label="Read your character on area changes"
        hint="For the build window's Character tab, which compares the character you play with a build. At most every 5 minutes. Off, it's read only when you press Read now. Reading never changes the build.">
        <WToggle v-model="characterAutoRead" />
      </WSettingRow>
    </template>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { configProp, configModelValue } from '@/web/settings/utils'
import type { PobBuildsWidget } from './widget'
import { treeHotkeyOf } from './widget'
import { WSettingRow, WToggle } from '../ui'
import { personalOn } from '../personal'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import WInfo from '../ui/WInfo.vue'

export default defineComponent({
  name: 'PoB builds',
  components: { WInfo, WSettingRow, WHotkeyCell, WToggle },
  props: configProp<PobBuildsWidget>(),
  setup (props) {
    return {
      title: configModelValue(() => props.configWidget, 'wmTitle'),
      buildsDir: configModelValue(() => props.configWidget, 'buildsDir'),
      pobExe: configModelValue(() => props.configWidget, 'pobExe'),
      treeHotkey: computed({
        get: () => treeHotkeyOf(props.configWidget),
        set: (key: string | null) => { props.configWidget.treeHotkey = key }
      }),
      treeRefunds: computed({
        get: () => props.configWidget.treeRefunds !== false,
        set: (on: boolean) => { props.configWidget.treeRefunds = on }
      }),
      personalOn,
      characterGemMarks: computed({
        get: () => props.configWidget.characterGemMarks === true,
        set: (on: boolean) => { props.configWidget.characterGemMarks = on }
      }),
      characterAutoRead: computed({
        get: () => props.configWidget.characterAutoRead === true,
        set: (on: boolean) => { props.configWidget.characterAutoRead = on }
      }),
      treeOnIconClick: computed({
        get: () => props.configWidget.treeOnIconClick !== false,
        set: (on: boolean) => { props.configWidget.treeOnIconClick = on }
      })
    }
  }
})
</script>
