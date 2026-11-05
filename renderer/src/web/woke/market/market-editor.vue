<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <WSettingRow label="Lowest price in Movers" hint="Items below this are left out of Movers.">
      <WField :model-value="configWidget.minChaos" type="number" suffix="c" style="width: 6rem;" @update:model-value="setMin" />
    </WSettingRow>
    <WSettingRow label="Show thin items" hint="Include items poe.ninja barely saw trade on. Their prices are easy to fix.">
      <WToggle v-model="showThin" />
    </WSettingRow>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { WField, WSettingRow, WToggle } from '../ui'
import { configProp } from '@/web/settings/utils'
import type { MarketTrackerWidget } from './widget'

export default defineComponent({
  name: 'Market',
  components: { WField, WSettingRow, WToggle },
  props: configProp<MarketTrackerWidget>(),
  setup (props) {
    const w = () => props.configWidget
    return {
      setMin: (v: string | number) => { w().minChaos = Number(v) || 0 },
      showThin: computed({ get: () => !!w().showThin, set: (v: boolean) => { w().showThin = v } })
    }
  }
})
</script>
