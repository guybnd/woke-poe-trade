<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <div class="grid gap-2 items-center" style="grid-template-columns: auto 1fr;">
      <span>Hotkey: turn scan mode on/off</span>
      <w-hotkey-cell v-model="hotkey" />
      <span>Hotkey: read every essence on screen once</span>
      <w-hotkey-cell v-model="onceHotkey" />
    </div>
    <WToggle v-model="autoInMaps">Start in maps: scan by itself in every map, stop in town and hideout. Uses about 430 MB more memory while in maps.</WToggle>
    <WToggle v-model="iconWhenOff">In maps, show the dock icon while the scan is off (click it to start)</WToggle>
    <div>
      <div class="mb-1">Corrupt when the monolith holds any of these</div>
      <div class="flex flex-wrap gap-1">
        <WChip v-for="t in types" :key="t" clickable :active="isFlagged(t)" @click="toggleType(t)">{{ t }}</WChip>
      </div>
      <div class="mt-1 flex gap-2 text-sm">
        <button type="button" class="btn" @click="setFlags(MEDS)">MEDS only</button>
        <button type="button" class="btn" @click="setFlags([])">None</button>
      </div>
    </div>
    <label class="flex items-center gap-2">
      <span>Also highlight a monolith worth at least</span>
      <input v-model.number="valueAlertChaos" type="number" min="0" step="10" class="rounded w-input px-1 block" style="width: 6rem;">
      <span>chaos (0 = off)</span>
    </label>
    <div class="flex items-center gap-2 text-sm" style="color: var(--w-dim);">
      How it decides
      <w-info :text="'Reads the essence monolith under your mouse, prices its essences from poe.ninja and says whether to corrupt it.\n- **Corrupt** when it holds an essence ticked here: Misery, Envy, Dread and Scorn can become Horror, Hysteria, Insanity or Delirium.\n- Under it: the best case after corrupting, minus a Vaal Orb. The odds aren\'t published, so it\'s not an average.\n- **Scan mode** reads only while your cursor rests on a label. **Start in maps** runs it in maps only.\n\nIt only reads the screen; you use the Remnant yourself. Needs Windows and the OCR files.'" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import WToggle from '../ui/WToggle.vue'
import { WChip, WInfo } from '../ui'
import { configProp, configModelValue } from '@/web/settings/utils'
import { ESSENCE_TYPES, MEDS } from './essences'
import type { EssenceScanWidget } from './widget'

export default defineComponent({
  name: 'Essence scan',
  components: { WHotkeyCell, WToggle, WChip, WInfo },
  props: configProp<EssenceScanWidget>(),
  setup (props) {
    const flagTypes = configModelValue(() => props.configWidget, 'flagTypes')
    return {
      MEDS,
      types: ESSENCE_TYPES,
      hotkey: configModelValue(() => props.configWidget, 'hotkey'),
      onceHotkey: configModelValue(() => props.configWidget, 'onceHotkey'),
      valueAlertChaos: configModelValue(() => props.configWidget, 'valueAlertChaos'),
      autoInMaps: configModelValue(() => props.configWidget, 'autoInMaps'),
      iconWhenOff: configModelValue(() => props.configWidget, 'iconWhenOff'),
      isFlagged: (t: string) => flagTypes.value.includes(t),
      toggleType: (t: string) => {
        flagTypes.value = flagTypes.value.includes(t)
          ? flagTypes.value.filter(x => x !== t)
          : [...flagTypes.value, t]
      },
      setFlags: (list: string[]) => { flagTypes.value = [...list] }
    }
  }
})
</script>
