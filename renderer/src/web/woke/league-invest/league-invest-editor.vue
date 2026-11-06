<template>
  <div class="max-w-xl p-2 flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-2">Changed this league <w-info text="Items a patch changed this league (drop rates, crafting use, new sources). Their past-league history is unreliable. One per line. Part of a name works too, like &quot;Scarab of&quot;. The panel ignores lines that start with #." /></div>
      <textarea :value="configWidget.changedItems ?? ''" rows="5" class="w-input rounded px-1 w-full" placeholder="# 3.xx changes&#10;Scarab of"
        @change="setChanged" />
      <w-toggle v-model="hideChanged">Hide changed items instead of flagging them</w-toggle>
    </div>
    <div class="flex flex-col gap-1">
      <div>Past leagues</div>
      <div class="w-dim text-sm flex items-center gap-1">
        <span>Import poe.ninja league dumps from
          <a href="https://poe.ninja/poe1/data" target="_blank" class="w-accent hover:underline">poe.ninja/poe1/data</a></span>
        <w-info text="Use the .zip, or the &lt;League&gt;.items.csv and .currency.csv files. Only challenge softcore leagues are kept. A few past leagues ship with the app. Your own imports of the same league replace them." />
      </div>
      <div class="flex items-center gap-2">
        <WButton variant="primary" size="sm" icon="fas fa-file-import" :disabled="importing" @click="fileInput?.click()">
          {{ importing ? 'Importing…' : 'Import files' }}
        </WButton>
        <span v-if="importMsg" class="text-xs" :class="importError ? 'w-down' : 'w-dim'">{{ importMsg }}</span>
        <input ref="fileInput" type="file" multiple accept=".zip,.csv" class="hidden" @change="onFiles">
      </div>
      <div v-for="h in histories" :key="h.league" class="w-row px-0" style="grid-template-columns: minmax(0, 1fr) auto 22px;">
        <span class="w-trunc">{{ h.league }}</span>
        <span class="w-faint text-xs">from {{ h.start }} · {{ h.days }} days · {{ h.items.length }} items</span>
        <span v-if="!h.imported" class="w-faint text-xs" title="Ships with the app">built in</span>
        <button v-else class="w-icon-btn" title="Remove. You can undo." @click="removeHistory(h)"><i class="fas fa-times" /></button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, shallowRef } from 'vue'
import { WButton, WInfo, WToggle } from '../ui'
import { configProp } from '@/web/settings/utils'
import { histories, importError, importMsg, importing, onFiles, reloadHistories, removeHistory } from './league-data'
import type { LeagueInvestWidget } from './widget'

export default defineComponent({
  name: 'League investments',
  components: { WButton, WInfo, WToggle },
  props: configProp<LeagueInvestWidget>(),
  setup (props) {
    const w = () => props.configWidget
    onMounted(reloadHistories)
    return {
      histories,
      importing,
      importMsg,
      importError,
      onFiles,
      removeHistory,
      fileInput: shallowRef<HTMLInputElement | null>(null),
      setChanged: (e: Event) => { w().changedItems = (e.target as HTMLTextAreaElement).value },
      hideChanged: computed({ get: () => !!w().hideChanged, set: (v: boolean) => { w().hideChanged = v } })
    }
  }
})
</script>
