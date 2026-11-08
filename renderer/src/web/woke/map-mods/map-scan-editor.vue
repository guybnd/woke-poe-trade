<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <div class="grid gap-2 items-center" style="grid-template-columns: auto 1fr;">
      <span>Hotkey: turn scan mode on/off</span>
      <w-hotkey-cell v-model="hotkey" />
      <span>Hotkey: rolling mode (lock onto the hovered map)</span>
      <w-hotkey-cell v-model="rollHotkey" />
    </div>
    <label class="flex items-center gap-2">
      <input type="checkbox" v-model="alertOnPass">
      <span>Flash when a reroll turns a map into a "run"</span>
    </label>
    <div class="flex items-center gap-2 text-sm" style="color: var(--w-dim);">
      How it works
      <w-info :text="'Scan mode reads the tooltip of the map under your mouse with on-screen text recognition, so no key press is needed per map. It re-reads whenever the tooltip changes, so rerolling the same map (chaos spamming) updates the verdict. Ratings come from the active profile in the Map mods widget.\n\nFor long reroll sessions, hover the map and press the rolling hotkey: it finds the tooltip once, then reads only that box (faster) until you press the hotkey again.\n\nIt only reads once the cursor rests on a map, and stops by itself after 3 minutes with nothing to read. A map that would pass but had lines it couldn\'t read clearly shows &quot;?&quot; instead of RUN; use the Map mods hotkey on it for an exact read.\n\nIt needs Windows and the OCR files; the widget says if they\'re missing.'" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import WInfo from '../ui/WInfo.vue'
import { configProp, configModelValue } from '@/web/settings/utils'
import type { MapScanWidget } from './scan'

export default defineComponent({
  name: 'Map scan',
  components: { WHotkeyCell, WInfo },
  props: configProp<MapScanWidget>(),
  setup (props) {
    return {
      hotkey: configModelValue(() => props.configWidget, 'hotkey'),
      rollHotkey: configModelValue(() => props.configWidget, 'rollHotkey'),
      alertOnPass: configModelValue(() => props.configWidget, 'alertOnPass')
    }
  }
})
</script>
