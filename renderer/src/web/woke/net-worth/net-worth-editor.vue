<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <div class="grid gap-2 items-center" style="grid-template-columns: auto 1fr;">
      <span>Hotkey: show or hide net worth</span>
      <w-hotkey-cell v-model="hotkey" />
      <span>"Hide &lt;" in divines</span>
      <w-field v-model="hideBelow" type="number" suffix="div" />
      <span>"Hide &lt;" in chaos</span>
      <w-field v-model="hideChaos" type="number" suffix="c" />
      <span>Goal name</span>
      <w-field v-model="goalName" placeholder="e.g. Mirror" />
      <span>Goal</span>
      <w-field v-model="goalDiv" type="number" suffix="div" />
    </div>
    <w-toggle v-model="dockIcon">Show an icon in the dock</w-toggle>
    <div class="flex flex-col gap-1">
      <span>Sections in the window</span>
      <w-toggle v-for="s in SECTIONS" :key="s.id" :model-value="sectionOn(configWidget, s.id)" @update:model-value="setSection(configWidget, s.id, $event)">{{ s.label }}</w-toggle>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import WField from '../ui/WField.vue'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import WToggle from '../ui/WToggle.vue'
import { configProp, configModelValue } from '@/web/settings/utils'
import { SECTIONS, hideBelowChaosOf, hideBelowOf, sectionOn, setSection } from './widget'
import type { NetWorthWidget } from './widget'

export default defineComponent({
  name: 'NetWorth',
  components: { WField, WHotkeyCell, WToggle },
  props: configProp<NetWorthWidget>(),
  setup (props) {
    const w = () => props.configWidget
    return {
      SECTIONS,
      sectionOn,
      setSection,
      hotkey: configModelValue(() => props.configWidget, 'hotkey'),
      dockIcon: computed({
        get: () => w().dockIcon !== false,
        set: (v: boolean) => { w().dockIcon = v }
      }),
      hideBelow: computed({
        get: () => hideBelowOf(w()),
        set: (v: string | number) => { const n = Number(v); w().hideBelowDiv = Number.isFinite(n) && n >= 0 ? n : 1 }
      }),
      hideChaos: computed({
        get: () => hideBelowChaosOf(w()),
        set: (v: string | number) => { const n = Number(v); w().hideBelowChaos = Number.isFinite(n) && n >= 0 ? n : 10 }
      }),
      // No goal: an empty or zero target.
      goalName: computed({
        get: () => w().goal?.name ?? '',
        set: (v: string | number) => { w().goal = { name: String(v), div: w().goal?.div ?? 0 } }
      }),
      goalDiv: computed({
        get: () => w().goal?.div ?? 0,
        set: (v: string | number) => { const n = Number(v); w().goal = { name: w().goal?.name ?? '', div: Number.isFinite(n) && n > 0 ? n : 0 } }
      })
    }
  }
})
</script>
