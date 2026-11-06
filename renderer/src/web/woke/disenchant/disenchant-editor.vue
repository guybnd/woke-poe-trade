<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <WSettingRow label="Disenchant: trade link item level" hint="Dust in the list is for item level 84. Lower items give less: about 90% at 82 and 65% at 77.">
      <WSelect :model-value="String(configWidget.tradeIlvl ?? 84)" :options="ILVL_OPTIONS" @update:model-value="setIlvl" />
    </WSettingRow>
    <WSettingRow label="Disenchant: what 10,000 gold is worth" hint="Used by the With gold ranking, which adds the trade fee to the price.">
      <WField :model-value="configWidget.goldChaosPer10k ?? 5" type="number" suffix="c" style="width: 6rem;" @update:model-value="setGold" />
    </WSettingRow>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { WField, WSelect, WSettingRow } from '../ui'
import { configProp } from '@/web/settings/utils'
import type { DisenchantWidget } from './widget'

export default defineComponent({
  name: 'Disenchant',
  components: { WField, WSelect, WSettingRow },
  props: configProp<DisenchantWidget>(),
  setup (props) {
    const w = () => props.configWidget
    return {
      ILVL_OPTIONS: [84, 83, 82, 80, 75].map(n => ({ value: String(n), label: `${n}+` })),
      setIlvl: (v: string) => { w().tradeIlvl = Number(v) || 84 },
      setGold: (v: string | number) => { w().goldChaosPer10k = Math.max(0, Number(v) || 0) }
    }
  }
})
</script>
