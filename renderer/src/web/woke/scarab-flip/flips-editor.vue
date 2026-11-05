<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <WSettingRow label="Lifeforce per item for Harvest rerolls"
      :hint="`What one item costs at the Horticrafting bench, in the craft's colour. Blank uses ${defaultCost}, from the wiki. Flips multiplies this by poe.ninja's lifeforce price.`">
      <!-- A plain input: WField's number mode turns a cleared field into 0. -->
      <input :value="cost" type="number" min="1" :placeholder="String(defaultCost)" class="rounded w-input px-1 block" style="width: 6rem;" @input="setCost">
    </WSettingRow>
    <WSettingRow label="Sell discount" hint="What you lose selling results below the listed price.">
      <WSelect :model-value="String(configWidget.sellDiscount)" :options="discounts" @update:model-value="setDiscount" />
    </WSettingRow>
    <WSettingRow label="Reroll cheap results" hint="Flip results again when that is worth more than selling them.">
      <WToggle v-model="reroll" />
    </WSettingRow>
    <WSettingRow label="Hide untraded" :hint="`Hide items with under ${untradedChaos}c traded a day. Their price means little.`">
      <WToggle v-model="hideUntraded" />
    </WSettingRow>
    <WSettingRow label="Hotkey: outline flips in the open stash tab"
      hint="Works on the Scarab tab for now. Press once to draw the outlines. They clear on the next click, scroll or key press. Keep the mouse off the tab when you press it: a tooltip hides what's under it. Nothing reads the screen until you press it.">
      <w-hotkey-cell v-model="stashHotkey" />
    </WSettingRow>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { WSelect, WSettingRow, WToggle } from '../ui'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import { configModelValue, configProp } from '@/web/settings/utils'
import { UNTRADED_CHAOS } from './calc'
import { DEFAULT_LIFEFORCE_PER_ITEM, parseLifeforce } from './families'
import type { ScarabFlipWidget } from './widget'

export default defineComponent({
  name: 'Flips',
  components: { WSelect, WSettingRow, WToggle, WHotkeyCell },
  props: configProp<ScarabFlipWidget>(),
  setup (props) {
    const w = () => props.configWidget
    return {
      discounts: [0, 5, 10, 20].map(n => ({ value: String(n), label: `${n}%` })),
      untradedChaos: UNTRADED_CHAOS,
      setDiscount: (v: string) => { w().sellDiscount = Number(v) },
      reroll: configModelValue(w, 'reroll'),
      hideUntraded: configModelValue(w, 'hideUntraded'),
      defaultCost: DEFAULT_LIFEFORCE_PER_ITEM,
      stashHotkey: computed({
        get: () => props.configWidget.stashHotkey ?? null,
        set: (key: string | null) => { props.configWidget.stashHotkey = key }
      }),
      cost: computed(() => props.configWidget.lifeforcePerItem ?? ''),
      setCost: (e: Event) => { props.configWidget.lifeforcePerItem = parseLifeforce((e.target as HTMLInputElement).value) }
    }
  }
})
</script>
