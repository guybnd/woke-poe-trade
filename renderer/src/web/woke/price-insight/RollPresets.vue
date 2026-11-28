<template>
  <div v-if="show" :class="$style.row" data-roll-presets :data-goto-spot="showBase ? 'base-preset' : undefined">
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
import type { FilterOrGroup, ItemFilters } from '@/web/price-check/filters/interfaces'
import { applyRollPreset, activeRollPreset, canUseHighRolls, canUseRollPresets, RollPreset } from './roll-presets'
import { estimateWorth, valueChanges, applyValueChanges, WORTH_SOURCE_LABEL } from './mod-worth'
import { driverSeed } from './drivers'
import { priceView } from './view'
import { poepricesState, measuredDrivers, checkedFair, modWorth, loadPoeprices } from './check-state'
import { canUseBasePreset, baseSignature } from './base-preset-gate'
import type { BaseSnapshot } from './base-preset'

const props = defineProps<{ stats: FilterOrGroup[], item: ParsedItem, league: string, filters?: ItemFilters }>()
const { selectedId } = useLeagues()
const emit = defineEmits<{ (e: 'apply', preset: RollPreset | 'value' | 'base'): void }>()

const showValue = computed(() => priceView.value === 'improved' && props.item.rarity === ItemRarity.Rare)

const showBase = computed(() => props.filters != null && canUseBasePreset(props.item))
const BASE_TITLE = 'Price it as its base: base type, item level, influence and quality over 20 on, every mod off. Fractured, synthesised and Exceptional or better eldritch mods stay on. Click again for your old ticks.'

const options = computed(() => [
  ...(showBase.value ? [{ value: 'base', label: 'Base', title: BASE_TITLE, attrs: { 'data-base-preset': '' } }] : []),
  { value: 'low', label: 'Low' },
  { value: 'current', label: 'Approx' },
  ...(canUseHighRolls(props.stats) ? [{ value: 'high', label: 'High' }] : []),
  ...(showValue.value ? [{ value: 'value', label: sourceText.value === 'measured' ? 'By value\u00a0\u00a0' : 'By value ≈' }] : [])
])

const title = computed(() => 'For every ticked mod. Low: any roll of its range. Approx: a tight window around this item\'s roll, or this roll and better on map stats. High: the best quarter of its range.' +
  (showValue.value ? ' By value: tight on the mods that carry the price, loose on the rest, mods worth nothing unticked.' : '') +
  (showValue.value ? ' ' + sourceTitle.value : '') +
  ' Runs the search.')

const show = computed(() => showBase.value || canUseRollPresets(props.stats))

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
watch(() => props.item, () => { valueSig.value = null; base.value = null })

// "Base" stays lit until a box or tick is changed by hand; a second click puts the old ticks back.
const base = shallowRef<{ snap: BaseSnapshot, sig: string } | null>(null)
const baseOn = computed(() => base.value != null && props.filters != null && base.value.sig === baseSignature(props.filters, props.stats))

const active = computed(() => {
  if (baseOn.value) return 'base'
  if (valueSig.value && valueSig.value === sig()) return 'value'
  return activeRollPreset(props.stats)
})

let baseBusy = false
async function pickBase () {
  const filters = props.filters
  if (!filters || baseBusy) return
  const item = props.item
  baseBusy = true
  let mod: typeof import('./base-preset')
  try { mod = await import('./base-preset') } finally { baseBusy = false }
  const { applyBasePreset, restoreBasePreset } = mod
  // Another item or preset came up while the code loaded.
  if (props.item !== item || props.filters !== filters) return
  if (baseOn.value) {
    restoreBasePreset(filters, base.value!.snap)
    base.value = null
  } else {
    const snap = applyBasePreset(item, filters, props.stats)
    base.value = { snap, sig: baseSignature(filters, props.stats) }
  }
  valueSig.value = null
  emit('apply', 'base')
}

// The base price chip's click: turn the Base step on (never off) and search.
defineExpose({
  runBase () {
    if (baseOn.value) emit('apply', 'base')
    else pickBase().catch(() => {})
  }
})

function pick (value: string) {
  if (value === 'base') {
    pickBase().catch(() => {})
    return
  }
  base.value = null
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
