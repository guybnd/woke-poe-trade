<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <div class="grid gap-2 items-center" style="grid-template-columns: auto 1fr;">
      <span>Hotkey: open in overlay</span>
      <w-hotkey-cell v-model="hotkeyOverlay" />
      <span>Hotkey: open in your browser</span>
      <w-hotkey-cell v-model="hotkeyExternal" />
      <span>Usual difficulty</span>
      <w-select v-model="defaultDifficulty" :options="DIFFICULTIES.map(d => ({ value: d, label: labLabel(d) }))" class="w-40" />
    </div>
    <div class="w-dim text-sm">Pressing the overlay hotkey again closes the layout.</div>
    <w-toggle v-model="autoOpen">Load the layout into the lab icon when I enter Aspirants' Plaza (the difficulty below, then the real one from the first room)</w-toggle>
    <label class="flex flex-col gap-1">
      <span>Lab notes</span>
      <textarea v-model="notes" rows="4" class="w-input rounded px-1"
        placeholder="Gems you're after, trial status, tips…" />
    </label>
    <div>
      <div class="mb-1 flex items-center gap-2">Layout pages <w-info text="Leave empty to use poelab.com's daily pages." /></div>
      <div class="grid gap-1 items-center" style="grid-template-columns: 6rem 1fr;">
        <template v-for="d in DIFFICULTIES" :key="d">
          <span class="w-dim">{{ labLabel(d) }}</span>
          <input :value="configWidget.urls[d]" @input="setUrl(d, $event)" :placeholder="DEFAULT_LAB_URLS[d]"
            class="w-input rounded px-1 leading-6">
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import WToggle from '../ui/WToggle.vue'
import WSelect from '../ui/WSelect.vue'
import { computed, defineComponent } from 'vue'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import WInfo from '../ui/WInfo.vue'
import { configProp, configModelValue } from '@/web/settings/utils'
import { DEFAULT_LAB_URLS, DIFFICULTIES, labLabel } from './lab'
import type { LabDifficulty, LabWidget } from './lab'

export default defineComponent({
  name: 'Labyrinth',
  components: { WToggle, WSelect, WHotkeyCell, WInfo },
  props: configProp<LabWidget>(),
  setup (props) {
    return {
      autoOpen: computed({
        get: () => props.configWidget.autoOpen !== false,
        set: (v: boolean) => { props.configWidget.autoOpen = v }
      }),
      DIFFICULTIES,
      DEFAULT_LAB_URLS,
      labLabel,
      hotkeyOverlay: configModelValue(() => props.configWidget, 'hotkeyOverlay'),
      hotkeyExternal: configModelValue(() => props.configWidget, 'hotkeyExternal'),
      defaultDifficulty: configModelValue(() => props.configWidget, 'defaultDifficulty'),
      notes: configModelValue(() => props.configWidget, 'notes'),
      setUrl (d: LabDifficulty, e: Event) {
        props.configWidget.urls = { ...props.configWidget.urls, [d]: (e.target as HTMLInputElement).value }
      }
    }
  }
})
</script>
