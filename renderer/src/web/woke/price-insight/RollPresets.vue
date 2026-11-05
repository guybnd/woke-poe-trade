<template>
  <div v-if="show" :class="$style.row" data-roll-presets>
    <w-segmented :model-value="active" :options="options"
      :title="title"
      @update:model-value="pick" />
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch, onUnmounted } from 'vue'
import { ItemRarity, ParsedItem } from '@/parser'
import { useLeagues } from '@/web/background/Leagues'
import { WSegmented } from '../ui'
import type { FilterOrGroup } from '@/web/price-check/filters/interfaces'
import { applyRollPreset, activeRollPreset, canUseHighRolls, canUseRollPresets, RollPreset } from './roll-presets'
import { estimateWorth, valueChanges, applyValueChanges, WORTH_SOURCE_LABEL } from './mod-worth'
import { driverSeed } from './drivers'
import { priceView } from './view'
import { poepricesState, measuredDrivers, checkedFair, modWorth, loadPoeprices } from './check-state'

const props = defineProps<{ stats: FilterOrGroup[], item: ParsedItem, league: string }>()
const { selectedId } = useLeagues()
const emit = defineEmits<{ (e: 'apply', preset: RollPreset | 'value'): void }>()

const showValue = computed(() => priceView.value === 'improved' && props.item.rarity === ItemRarity.Rare)

const options = computed(() => [
  { value: 'low', label: 'Low' },
  { value: 'current', label: 'Approx' },
  ...(canUseHighRolls(props.stats) ? [{ value: 'high', label: 'High' }] : []),
  ...(showValue.value ? [{ value: 'value', label: sourceText.value === 'measured' ? 'By value' : 'By value ≈' }] : [])
])

const title = computed(() => 'For every ticked mod. Low: any roll of its range. Approx: a tight window around this item\'s roll, or this roll and better on map stats. High: the best quarter of its range.' +
  (showValue.value ? ' By value: tight on the mods that carry the price, loose on the rest, mods worth nothing unticked.' : '') +
  (showValue.value ? ' ' + sourceTitle.value : '') +
  ' Runs the search.')

const show = computed(() => canUseRollPresets(props.stats))

// poeprices is free, so ask as soon as a rare is opened; the worth tags use it.
watch(() => props.item, (it) => { if (showValue.value) loadPoeprices(it) }, { immediate: true })

const worth = computed(() => {
  if (!showValue.value) return null
  const it = props.item
  const pp = poepricesState.value
  const md = measuredDrivers.value
  const fair = checkedFair.value
  return estimateWorth(props.stats, {
    measured: md?.item === it ? md.list : undefined,
    // poeprices answered for the league picked in settings.
    explanation: pp?.item === it && pp.price && props.league === selectedId.value ? pp.price.explanation : undefined,
    seed: driverSeed.value,
    fair: fair?.item === it ? fair.chaos : null
  })
})

watch(worth, (map) => {
  modWorth.value = map ? { item: props.item, map } : null
}, { immediate: true })
onUnmounted(() => {
  if (modWorth.value?.item === props.item) modWorth.value = null
})

const sources = computed(() => new Set(Array.from(worth.value?.values() ?? []).map(w => w.source)))
const sourceText = computed(() => {
  if (sources.value.has('measured')) return 'measured'
  if (sources.value.has('poeprices')) return 'via poeprices'
  const pp = poepricesState.value
  if (pp?.item === props.item && pp.status === 'loading') return 'asking poeprices…'
  return 'rough guess'
})
// A ≈ on By value marks worth that isn't measured; the source itself is on hover.
const sourceTitle = computed(() => {
  const known = Array.from(sources.value).map(s => WORTH_SOURCE_LABEL[s]).join(', ')
  return 'By value now uses ' + (known ? `mod worth ${known}` : sourceText.value) +
    '. Measure in "What drives the price" for exact numbers.'
})

// "By value" stays highlighted until a box or tick is changed by hand.
const valueSig = shallowRef<string | null>(null)
const sig = () => JSON.stringify(props.stats)
watch(() => props.item, () => { valueSig.value = null })

const active = computed(() => {
  if (valueSig.value && valueSig.value === sig()) return 'value'
  return activeRollPreset(props.stats)
})

function pick (value: string) {
  if (value === 'value') {
    if (!worth.value) return
    applyValueChanges(props.stats, valueChanges(props.stats, worth.value))
    valueSig.value = sig()
    emit('apply', 'value')
    return
  }
  valueSig.value = null
  applyRollPreset(props.stats, value as RollPreset)
  emit('apply', value as RollPreset)
}
</script>

<style module>
.row {
  display: flex;
  align-items: center;
  margin-left: auto;
}
</style>
