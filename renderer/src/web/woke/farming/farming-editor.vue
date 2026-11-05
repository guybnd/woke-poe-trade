<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <input class="w-input rounded px-1 w-48" placeholder="Widget title" v-model="title" />
    <div class="grid gap-2 items-center" style="grid-template-columns: auto 1fr;">
      <div class="w-dim">Add hovered item to loot</div>
      <w-hotkey-cell v-model="lootHotkey" />
      <div class="w-dim">Bulk items sell for</div>
      <div class="flex items-center gap-1">
        <input v-model.number="bulkPct" type="number" min="0" max="100" step="5" class="w-input rounded px-1 w-16"> % of poe.ninja
        <span class="w-dim text-sm">(currency, scarabs, fragments, cards… sold to bulk buyers)</span>
      </div>
      <div class="w-dim">Vendor junk below</div>
      <div class="flex items-center gap-1">
        <input v-model.number="junkBelow" type="number" min="0" step="1" class="w-input rounded px-1 w-16"> chaos each
        <span class="w-dim text-sm">(counted as 0)</span>
      </div>
    </div>
    <w-toggle v-model="autoCountMaps">Count maps from Client.txt</w-toggle>
    <w-toggle v-model="autoPause">Pause the session after 5 minutes without a zone change (resumes on the next zone)</w-toggle>
  </div>
</template>

<script lang="ts">
import WToggle from '../ui/WToggle.vue'
import { computed, defineComponent } from 'vue'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import { configProp, configModelValue } from '@/web/settings/utils'
import { pushHostConfig } from '@/web/Config'
import type { FarmingWidget } from './farming'

export default defineComponent({
  name: 'Farming',
  components: { WToggle, WHotkeyCell },
  props: configProp<FarmingWidget>(),
  setup (props) {
    const w = () => props.configWidget
    return {
      title: configModelValue(w, 'wmTitle'),
      lootHotkey: computed({
        get: () => w().lootHotkey ?? null,
        set: (v: string | null) => { w().lootHotkey = v; pushHostConfig() }
      }),
      bulkPct: computed({
        get: () => Math.round((w().bulkFactor ?? 0.8) * 100),
        set: (v: number) => { w().bulkFactor = Math.min(100, Math.max(0, Number(v) || 0)) / 100 }
      }),
      junkBelow: computed({
        get: () => w().junkBelow ?? 0,
        set: (v: number) => { w().junkBelow = Math.max(0, Number(v) || 0) }
      }),
      autoCountMaps: computed({
        get: () => w().autoCountMaps !== false,
        set: (v: boolean) => { w().autoCountMaps = v }
      }),
      autoPause: computed({
        get: () => w().autoPause !== false,
        set: (v: boolean) => { w().autoPause = v }
      })
    }
  }
})
</script>
