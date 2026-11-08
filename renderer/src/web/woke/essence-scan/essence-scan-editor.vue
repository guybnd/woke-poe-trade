<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <div class="grid gap-2 items-center" style="grid-template-columns: auto 1fr;">
      <span>Hotkey: turn scan mode on/off</span>
      <w-hotkey-cell v-model="hotkey" />
      <span>Hotkey: read every essence on screen once</span>
      <w-hotkey-cell v-model="onceHotkey" />
    </div>
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
      <w-info :text="'Essence scan reads the label of the essence monolith under your mouse with on-screen text recognition, prices its essences from poe.ninja and says whether to corrupt it.\n\nIt compares what the monolith is worth now with an estimate of its worth after corrupting (minus a Vaal Orb), and says CORRUPT only when the estimate is higher. The odds of each corrupt outcome aren\'t published, so the estimate treats them as equally likely.\n\nWithout prices it falls back to the essences ticked here: Misery, Envy, Dread or Scorn can turn into Horror, Hysteria, Insanity or Delirium, which only come from corrupting.\n\nIt only reads the screen; you still use the Remnant of Corruption yourself. It needs Windows and the OCR files.'" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import { WChip, WInfo } from '../ui'
import { configProp, configModelValue } from '@/web/settings/utils'
import { ESSENCE_TYPES, MEDS } from './essences'
import type { EssenceScanWidget } from './widget'

export default defineComponent({
  name: 'Essence scan',
  components: { WHotkeyCell, WChip, WInfo },
  props: configProp<EssenceScanWidget>(),
  setup (props) {
    const flagTypes = configModelValue(() => props.configWidget, 'flagTypes')
    return {
      MEDS,
      types: ESSENCE_TYPES,
      hotkey: configModelValue(() => props.configWidget, 'hotkey'),
      onceHotkey: configModelValue(() => props.configWidget, 'onceHotkey'),
      valueAlertChaos: configModelValue(() => props.configWidget, 'valueAlertChaos'),
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
