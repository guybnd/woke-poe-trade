<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <WSettingRow label="Gems shown per colour">
      <WSelect :model-value="String(configWidget.topN)" :options="TOP_OPTIONS" @update:model-value="setTop" />
    </WSettingRow>
    <WSettingRow label="Runner: lab" hint="The lab you run. The Runner chip in the panel turns these on.">
      <WSelect :model-value="configWidget.runnerLab ?? 'merciless'" :options="LAB_OPTIONS" @update:model-value="setLab" />
    </WSettingRow>
    <WSettingRow label="Runner: gem cost" hint="What the gem you put in the font costs, in chaos.">
      <WField :model-value="configWidget.runnerGemCost ?? 1" type="number" suffix="c" style="width: 6rem;" @update:model-value="setGemCost" />
    </WSettingRow>
    <WSettingRow label="Runner: minutes per run">
      <WField :model-value="configWidget.runnerMinutes ?? 6" type="number" suffix="min" style="width: 6rem;" @update:model-value="setMinutes" />
    </WSettingRow>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { WField, WSelect, WSettingRow } from '../ui'
import { configProp } from '@/web/settings/utils'
import type { LabGemsWidget } from './widget'

export default defineComponent({
  name: 'Lab gems',
  components: { WField, WSelect, WSettingRow },
  props: configProp<LabGemsWidget>(),
  setup (props) {
    const w = () => props.configWidget
    return {
      TOP_OPTIONS: [3, 5, 8].map(n => ({ value: String(n), label: `Top ${n}` })),
      LAB_OPTIONS: [{ value: 'merciless', label: 'Merciless (free entry)' }, { value: 'eternal', label: 'Eternal (Offering)' }],
      setTop: (v: string) => { w().topN = Number(v) },
      setLab: (v: string) => { w().runnerLab = v === 'eternal' ? 'eternal' : 'merciless' },
      setGemCost: (v: string | number) => { w().runnerGemCost = Number(v) || 0 },
      setMinutes: (v: string | number) => { w().runnerMinutes = Number(v) || 0 }
    }
  }
})
</script>
