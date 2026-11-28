<template>
  <!-- woke: poe.ninja's price of this item's base (base type, item level, influence), free on open.
       A click runs the roll strip's Base step for live listings (Guy's pick D, 2026-11-28). -->
  <button v-if="row" type="button" :class="$style.chip" data-base-ninja
    :title="title" @click="emit('search')">
    <span :class="$style.label">Base</span>
    <span :class="$style.value">{{ priceText }}</span>
    <img :class="$style.coin" :src="row.price.currency === 'div' ? '/images/divine.png' : '/images/chaos.png'" :alt="row.price.currency">
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ParsedItem } from '@/parser'
import { usePoeninja, displayRounding } from '@/web/background/Prices'
import { useLeagues } from '@/web/background/Leagues'
import { getDetailsId, isValuableBasetype } from '@/web/price-check/trends/getDetailsId'
import { canUseBasePreset } from './base-preset-gate'

const props = defineProps<{ item: ParsedItem, league: string }>()
const emit = defineEmits<{ (e: 'search'): void }>()
const { findPriceByQuery, autoCurrency, updatedAt } = usePoeninja()
const { selectedId } = useLeagues()

// poe.ninja prices plain bases only: no fractured, synthesised or corrupted copies.
const row = computed(() => {
  const it = props.item
  // Read first, so the chip shows once prices load after the item opened.
  if (updatedAt.value == null) return null
  if (!canUseBasePreset(it) || !isValuableBasetype(it) || it.isFractured || it.isSynthesised || it.isCorrupted) return null
  // poe.ninja only holds the league picked in settings.
  if (props.league !== selectedId.value) return null
  const id = getDetailsId(it)
  const found = id && findPriceByQuery(id)
  if (!found || !id) return null
  return { price: autoCurrency(found.chaos), variant: id.variant ?? '' }
})

const priceText = computed(() => {
  const p = row.value?.price
  if (!p) return ''
  return p.min === p.max ? displayRounding(p.min) : `${displayRounding(p.min)} ~ ${displayRounding(p.max)}`
})

const title = computed(() => {
  const v = row.value?.variant.split(', ') ?? []
  const what = [props.item.info.refName, v[0] ? `item level ${v[0]}` : '', v[1] ?? ''].filter(Boolean).join(', ')
  return `poe.ninja price of the base: ${what}. Click to search listings by base.`
})
</script>

<style lang="postcss" module>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: calc(24px * var(--w-text-scale, 1));
  padding: 0 6px;
  border: 1px solid var(--w-line-soft);
  border-radius: var(--w-radius-sm);
  font-size: calc(12px * var(--w-text-scale, 1));
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  &:hover { border-color: var(--w-line); background: var(--w-panel-3); }
}
.label { color: var(--w-dim); }
.value { font-size: calc(13px * var(--w-text-scale, 1)); font-weight: 600; color: var(--w-fg); }
.coin { width: calc(14px * var(--w-text-scale, 1)); height: calc(14px * var(--w-text-scale, 1)); object-fit: contain; }
</style>
