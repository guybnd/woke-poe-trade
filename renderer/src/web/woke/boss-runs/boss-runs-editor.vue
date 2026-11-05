<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <WSettingRow label="Planned runs" hint="Drops rarer than 1 in this many runs stay out of the loot, so a short session is not judged on a jackpot it will probably never see. 0 counts every drop.">
      <WField :model-value="configWidget.plannedRuns" type="number" style="width: 6rem;" @update:model-value="setRuns" />
    </WSettingRow>
    <WSettingRow label="I own the entry items" hint="Count the entry cost as free.">
      <WToggle v-model="ownEntry" />
    </WSettingRow>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { WField, WSettingRow, WToggle } from '../ui'
import { configModelValue, configProp } from '@/web/settings/utils'
import type { BossRunsWidget } from './widget'

export default defineComponent({
  name: 'Boss runs',
  components: { WField, WSettingRow, WToggle },
  props: configProp<BossRunsWidget>(),
  setup (props) {
    const w = () => props.configWidget
    return {
      ownEntry: configModelValue(w, 'ownEntry'),
      setRuns: (v: string | number) => { w().plannedRuns = Math.max(0, Number(v) || 0) }
    }
  }
})
</script>
