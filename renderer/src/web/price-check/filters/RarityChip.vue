<template>
  <!-- woke: gear steps its rarity: Any, Magic (bases to recombine or fracture), Rare.
       Every label stays in the grid cell, so the chip keeps its width under the mouse. -->
  <button type="button" data-rarity-chip
    class="filter-name-corrupted filter-name-rarity" :data-step="now" :class="{ clash: !!clash }"
    :title="title"
    @click="nextRarity(rarity)">
    <w-icon item="Orb of Transmutation" size="sm" title="" />
    <span class="filter-name-corrupted-labels">
      <span v-for="step of RARITY_STEPS" :key="step.value"
        :class="{ shown: step.value === now }">{{ step.label }}</span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WIcon } from '@/web/woke/ui'
import type { FilterOrGroup, ItemFilters } from './interfaces'
import { RARITY_STEPS, rarityStep, nextRarity, magicAffixClash } from './rarity-chip'

const props = defineProps<{
  rarity: NonNullable<ItemFilters['rarity']>
  stats?: FilterOrGroup[]
}>()

const now = computed(() => rarityStep(props.rarity))
const clash = computed(() => now.value === 'magic' ? magicAffixClash(props.stats) : null)
const title = computed(() => {
  const step = RARITY_STEPS.find(s => s.value === now.value)!
  const base = `Rarity filter: searching ${step.what}. Click to change: Any, Magic (bases to recombine or fracture), Rare.`
  return clash.value ? `${clash.value} ${base}` : base
})
</script>

<style>
/* The chip takes the rarity's colour; amber when Magic can't match the ticked mods. */
.filter-name-rarity[data-step="magic"] { border-color: var(--w-r-magic); color: var(--w-r-magic); }
.filter-name-rarity[data-step="rare"] { border-color: var(--w-r-rare); color: var(--w-r-rare); }
.filter-name-rarity.clash { border-color: var(--w-warn); color: var(--w-warn); }
</style>
