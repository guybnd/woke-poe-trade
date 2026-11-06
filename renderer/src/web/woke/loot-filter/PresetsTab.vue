<template>
  <div :class="$style.wrap" class="w-scroll">
    <div class="w-dim text-sm flex items-center gap-2">
      <span>{{ store.presetChanges.value ? `Adjusting ${store.presetChanges.value} of NeverSink's rules` : 'Common changes in one click' }}</span>
      <WInfo text="They're kept across NeverSink updates and never touch your own rules or the safety net." />
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.cheapCurrency.on">Hide currency worth under</WToggle>
        <WField v-model.number="cheapChaos" type="number" suffix="c" style="width: 5rem;" aria-label="Cheap currency line in chaos" />
        <span class="w-dim text-sm">once you're in maps</span>
      </div>
      <div class="w-faint text-xs">
        <template v-if="!store.prices.lookup.value">Waiting for poe.ninja prices.</template>
        <template v-else-if="cheap.length">{{ cheap.length }} base{{ cheap.length === 1 ? '' : 's' }}: {{ cheap.slice(0, 8).join(', ') }}<template v-if="cheap.length > 8"> and {{ cheap.length - 8 }} more</template>. A stack hides too.</template>
        <template v-else>Nothing in your filter's currency is that cheap today.</template>
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.chaosRecipe.on">Chaos recipe: unidentified item level 60-74 rares</WToggle>
        <WInfo text="One colour per slot. Click a slot to drop it once you have enough." />
      </div>
      <div class="flex flex-wrap gap-1">
        <WChip v-for="s in RECIPE_SLOTS" :key="s.key" clickable :active="p.chaosRecipe.slots.includes(s.key)"
          :title="p.chaosRecipe.slots.includes(s.key) ? `Stop showing ${s.label.toLowerCase()} (that slot is full)` : `Show ${s.label.toLowerCase()} again`"
          @click="toggleSlot(s.key)">
          <span :class="$style.swatch" :style="{ background: `rgb(${s.colour.join(',')})` }" /> {{ s.label }}
        </WChip>
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.quiet.on">Quiet mode: sounds only for tiers 1 to</WToggle>
        <WSelect :model-value="String(p.quiet.keepTiers)" :options="[1, 2, 3, 4, 5].map(n => ({ value: String(n), label: String(n) }))" style="width: 4rem;"
          aria-label="Loudest tiers kept" @update:model-value="v => p.quiet.keepTiers = Number(v)" />
        <WInfo text="Lower tiers keep their look and beam, just no alert sound." />
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.bigger.on">Bigger labels: never smaller than</WToggle>
        <WField v-model.number="biggerSize" type="number" style="width: 4.5rem;" aria-label="Smallest label font size" />
        <LabelPreview text="Orb of Alteration" :style-override="{ fontSize: p.bigger.size }" :extras="false" />
      </div>
    </div>

    <div :class="$style.card">
      <WToggle v-model="p.colourBlind.on">Colour-blind safe beams and map icons</WToggle>
      <div class="flex items-center gap-2 text-xs w-dim">
        <span v-for="(to, from) in SWAPS" :key="from" class="flex items-center gap-1">
          <span :class="$style.dot" :style="{ background: poeColour(from) }" /> {{ from }} <i class="fas fa-arrow-right w-faint" />
          <span :class="$style.dot" :style="{ background: poeColour(to) }" /> {{ to }}
        </span>
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.dust.on">Show uniques worth disenchanting for dust</WToggle>
        <WInfo text="Switches on NeverSink's three dust tiers, which ship switched off. They list bases with a high dust value, whatever the price." />
      </div>
      <div v-if="p.dust.on" class="w-faint text-xs">{{ neverSinkDust ? `NeverSink's ${neverSinkDust} dust tier${neverSinkDust === 1 ? '' : 's'} switched on.` : 'This NeverSink file has no dust tiers.' }}</div>
      <div v-if="p.dust.on" class="flex items-center gap-2">
        <WToggle v-model="p.dust.fromPrices">Also from today's prices, at</WToggle>
        <WField v-model.number="dustLine" type="number" suffix="dust/c" style="width: 7.5rem;" aria-label="Dust per chaos line" />
        <WInfo :text="`Adds bases where every unique gives that much dust per chaos or more, as a drop of item level ${DUST_ILVL}+. A base with any valuable or unpriced unique is left out.`" />
      </div>
      <div v-if="p.dust.on && p.dust.fromPrices" class="w-faint text-xs">
        <template v-if="!store.prices.lookup.value">Waiting for poe.ninja prices.</template>
        <template v-else-if="dustList.length">{{ dustList.length }} base{{ dustList.length === 1 ? '' : 's' }}: {{ dustList.slice(0, 6).join(', ') }}<template v-if="dustList.length > 6"> and {{ dustList.length - 6 }} more</template>.</template>
        <template v-else>No base passes that line today.</template>
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="p.sixSockets.on">Show 6-socket items for the vendor</WToggle>
        <WInfo text="Seven Jeweller's Orbs each, in grey, above NeverSink's rules." />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WChip, WField, WInfo, WSelect, WToggle } from '../ui'
import LabelPreview from './LabelPreview.vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import { DUST_ILVL, RECIPE_SLOTS, cheapCurrencyBases, isNeverSinkDustTier } from './presets'
import { dustBases } from '../disenchant/calc'
import { basesWithoutDust, dustUniques } from '../disenchant/data'
import { poeColour } from './colours'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
}>()

const p = computed(() => props.config.presets)
const SWAPS: Record<string, string> = { Green: 'Blue', Brown: 'Yellow', Red: 'Orange', Pink: 'Purple' }

const cheap = computed(() => {
  const doc = props.store.doc.value
  const lookup = props.store.prices.lookup.value
  return doc && lookup ? cheapCurrencyBases(doc, lookup, p.value.cheapCurrency.chaos) : []
})

const cheapChaos = computed({
  get: () => p.value.cheapCurrency.chaos,
  set: (v: number) => { if (Number.isFinite(v) && v > 0 && v <= 50) p.value.cheapCurrency.chaos = v }
})

// Counted on the file as built: switched on, they are no longer commented out.
const neverSinkDust = computed(() => (props.store.doc.value?.blocks ?? []).filter(isNeverSinkDustTier).length)
const dustList = computed(() => {
  const items = props.store.prices.items.value
  return items.length ? dustBases(dustUniques(), items, p.value.dust.line, DUST_ILVL, basesWithoutDust()) : []
})
const dustLine = computed({
  get: () => p.value.dust.line,
  set: (v: number) => { if (Number.isFinite(v) && v >= 100 && v <= 1_000_000) p.value.dust.line = Math.round(v) }
})

const biggerSize = computed({
  get: () => p.value.bigger.size,
  set: (v: number) => { if (Number.isInteger(v) && v >= 25 && v <= 45) p.value.bigger.size = v }
})

function toggleSlot (key: string) {
  const slots = p.value.chaosRecipe.slots
  p.value.chaosRecipe.slots = slots.includes(key) ? slots.filter(s => s !== key) : [...slots, key]
}
</script>

<style module>
.wrap {
  max-height: min(36rem, calc(70vh / var(--w-ui-scale, 1)));
  padding: 8px var(--w-pad) 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  background: var(--w-panel-2);
  border-radius: var(--w-r-sm);
}
.swatch {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
</style>
