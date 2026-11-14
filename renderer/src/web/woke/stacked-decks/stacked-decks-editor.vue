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
    <WSettingRow label="Hide cards under" hint="Cards worth less than this fold into one line under the card list. 0 lists every card.">
      <span @change="setCheapUnder"><WField :model-value="cheapUnder" type="number" suffix="c" style="width: 6rem;" aria-label="Hide cards under, in chaos" /></span>
    </WSettingRow>
    <WSettingRow label="Count them in Got and Result" hint="Off: Got, Result and the chart only count cards worth the amount above or more, as if you never sold the cheap ones.">
      <WToggle v-model="countCheap" />
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
import { computed, defineComponent } from 'vue'
import { WField, WSettingRow, WToggle } from '../ui'
import { configModelValue, configProp } from '@/web/settings/utils'
import { cardFilterOf } from './deck'
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
      cheapUnder: computed(() => cardFilterOf(w()).under),
      countCheap: computed({
        get: () => cardFilterOf(w()).count,
        set: (v: boolean) => { w().countCheap = v }
      }),
      // Saved when the box is left (the input's change event, caught on the
      // wrapper), so a box cleared while typing isn't read as 0.
      // A blank box keeps the last good value; 0 lists every card.
      setCheapUnder: (e: Event) => {
        const v = (e.target as HTMLInputElement).value.trim()
        const n = Number(v)
        if (v !== '' && Number.isFinite(n) && n >= 0) w().cheapUnder = n
        else (e.target as HTMLInputElement).value = String(cardFilterOf(w()).under)
      },
      // A blank or zero box keeps the last good value.
      setHitDiv: (v: string | number) => {
        const n = Number(v)
        if (Number.isFinite(n) && n > 0) w().hitDiv = n
      }
    }
  }
})
</script>
