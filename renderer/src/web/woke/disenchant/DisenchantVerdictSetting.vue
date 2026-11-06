<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <WSettingRow label="Disenchant or sell" hint="For a unique, price check shows its dust per chaos, and says to disenchant it when that's at the line or above.">
      <WToggle :model-value="on" @update:model-value="setOn">Show dust per chaos</WToggle>
    </WSettingRow>
    <WSettingRow v-if="on" label="Disenchant at" hint="Dust per chaos. 5,000 is a common line.">
      <WField :model-value="line" type="number" suffix="dust/c" style="width: 8rem;" @update:model-value="setLine" />
    </WSettingRow>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { WField, WSettingRow, WToggle } from '../ui'
import { configProp } from '@/web/settings/utils'
import { ensureWokeConfig } from '../modules'
import { DEFAULT_VERDICT_LINE } from './calc'

export default defineComponent({
  name: 'Disenchant or sell',
  components: { WField, WSettingRow, WToggle },
  props: configProp(),
  setup (props) {
    const setting = () => ensureWokeConfig(props.config).woke.disenchantVerdict ?? { on: false, line: DEFAULT_VERDICT_LINE }
    return {
      on: computed(() => props.config.woke?.disenchantVerdict?.on ?? false),
      line: computed(() => props.config.woke?.disenchantVerdict?.line ?? DEFAULT_VERDICT_LINE),
      setOn: (v: boolean) => { ensureWokeConfig(props.config).woke.disenchantVerdict = { ...setting(), on: v } },
      setLine: (v: string | number) => {
        const n = Number(v)
        if (Number.isFinite(n) && n > 0) ensureWokeConfig(props.config).woke.disenchantVerdict = { ...setting(), line: n }
      }
    }
  }
})
</script>
