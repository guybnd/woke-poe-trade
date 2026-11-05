<template>
  <div v-if="show" :class="$style.row">
    <span :class="$style.lbl">Rolls</span>
    <w-segmented :model-value="active" :options="options"
      :title="title"
      @update:model-value="pick" />
    <span v-if="showValue" :class="$style.src" :title="sourceTitle">{{ sourceText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch, onUnmounted } from 'vue'
import { ItemRarity, ParsedItem } from '@/parser'
import { WSegmented } from '../ui'
import type { FilterOrGroup } from '@/web/price-check/filters/interfaces'
import { applyRollPreset, activeRollPreset, canUseRollPresets, RollPreset } from './roll-presets'
import { estimateWorth, valueChanges, applyValueChanges, WORTH_SOURCE_LABEL } from './mod-worth'
import { driverSeed } from './drivers'
import { priceView } from './view'
import { poepricesState, measuredDrivers, checkedFair, modWorth, loadPoeprices } from './check-state'

const props = defineProps<{ stats: FilterOrGroup[], item: ParsedItem }>()
const emit = defineEmits<{ (e: 'apply', preset: RollPreset | 'value'): void }>()

const showValue = computed(() => priceView.value === 'improved' && props.item.rarity === ItemRarity.Rare)

const options = computed(() => [
  { value: 'low', label: 'Low rolls' },
  { value: 'current', label: 'Current rolls' },
  ...(showValue.value ? [{ value: 'value', label: 'By value' }] : [])
])

const title = computed(() => 'Low rolls: any roll of each ticked mod\'s tier. Current rolls: a tight window around this item\'s rolls, or this roll and better on map stats.' +
  (showValue.value ? ' By value: tight on the mods that carry the price, loose on the rest, mods worth nothing unticked.' : '') +
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
    explanation: pp?.item === it && pp.price ? pp.price.explanation : undefined,
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
const sourceTitle = computed(() => 'Mod worth ' + Array.from(sources.value).map(s => WORTH_SOURCE_LABEL[s]).join(', ') +
  '. Measure in "What drives the price" for exact numbers.')

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
  gap: 8px;
  margin-bottom: 0.5rem;
}
.lbl {
  font-size: var(--w-fs-md);
  color: var(--w-dim);
}
.src {
  font-size: var(--w-fs-xs);
  color: var(--w-faint);
  white-space: nowrap;
}
</style>
