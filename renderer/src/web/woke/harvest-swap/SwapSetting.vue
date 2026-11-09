<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <WSettingRow label="Swappable mods" hint="Price check puts a ⇄ on mods a Harvest craft or Genteel's Ducat can change, and adds a Flip tab with what the item sells for after each swap. Swap prices are only searched when you press a button.">
      <div class="flex flex-col gap-1">
        <WToggle v-for="f of families" :key="f.id" :model-value="isOn(f)" @update:model-value="v => setOn(f, v)">{{ f.label }}</WToggle>
      </div>
    </WSettingRow>
    <WSettingRow label="Highlight swaps under" hint="A ⇄ for a swap cheaper than this is lit; costlier ones are greyed out. It never starts a search.">
      <WField :model-value="limit" type="number" suffix="c" style="width: 8rem;" @update:model-value="setLimit" />
    </WSettingRow>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { WField, WSettingRow, WToggle } from '../ui'
import { configProp } from '@/web/settings/utils'
import { ensureWokeConfig } from '../modules'
import { DEFAULT_HIGHLIGHT_CHAOS, familyOn, SwapFamily, SWAP_FAMILIES } from './families'

export default defineComponent({
  name: 'Swappable mods',
  components: { WField, WSettingRow, WToggle },
  props: configProp(),
  setup (props) {
    const setting = () => ensureWokeConfig(props.config).woke.harvestSwap ?? {}
    return {
      families: SWAP_FAMILIES,
      isOn: (f: SwapFamily) => familyOn(f, props.config.woke?.harvestSwap),
      setOn: (f: SwapFamily, v: boolean) => {
        const cur = setting()
        ensureWokeConfig(props.config).woke.harvestSwap = { ...cur, on: { ...cur.on, [f.id]: v } }
      },
      limit: computed(() => props.config.woke?.harvestSwap?.highlightChaos ?? DEFAULT_HIGHLIGHT_CHAOS),
      setLimit: (v: string | number) => {
        const n = Number(v)
        if (Number.isFinite(n) && n >= 0) ensureWokeConfig(props.config).woke.harvestSwap = { ...setting(), highlightChaos: n }
      }
    }
  }
})
</script>
