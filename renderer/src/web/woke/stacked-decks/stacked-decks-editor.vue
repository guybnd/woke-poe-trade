<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <WSettingRow label="Big hit at" hint="A card worth this many divines or more is a big hit.">
      <WField :model-value="configWidget.hitDiv ?? 1" type="number" suffix="div" style="width: 6rem;" aria-label="Big hit at, in divines" @update:model-value="setHitDiv" />
    </WSettingRow>
    <WSettingRow label="Popup on a big hit" hint="Shows the card, its value, which deck it was and the session's result for a few seconds.">
      <WToggle v-model="hitPopup" />
    </WSettingRow>
    <WSettingRow label="Sound on a big hit" hint="A short chime.">
      <WToggle v-model="hitSound" />
    </WSettingRow>
    <div class="text-xs w-dim">
      A session starts with the first card and ends after 15 minutes without one, or when you start a new one from the icon.
      The price check of a Stacked Deck says whether to open or sell them.
    </div>
    <div class="text-xs w-faint">
      Expected values use the community's card weights from the
      <a :href="WEIGHTS_URL" target="_blank" class="underline">Prohibited Library</a> (patch {{ WEIGHTS.patch }}), with thanks.
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { WField, WSettingRow, WToggle } from '../ui'
import { configModelValue, configProp } from '@/web/settings/utils'
import type { StackedDecksWidget } from './deck'
import { WEIGHTS, WEIGHTS_URL } from './weights'

export default defineComponent({
  name: 'Stacked decks',
  components: { WField, WSettingRow, WToggle },
  props: configProp<StackedDecksWidget>(),
  setup (props) {
    const w = () => props.configWidget
    return {
      WEIGHTS,
      WEIGHTS_URL,
      hitPopup: configModelValue(w, 'hitPopup'),
      hitSound: configModelValue(w, 'hitSound'),
      // A blank or zero box keeps the last good value.
      setHitDiv: (v: string | number) => {
        const n = Number(v)
        if (Number.isFinite(n) && n > 0) w().hitDiv = n
      }
    }
  }
})
</script>
