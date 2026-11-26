<template>
  <!-- A thin market's price: a "!" right after the price, the reason on hover.
       The one marker on every screen (shared/price-trust.ts decides what is thin). -->
  <span class="w-thin" :title="title" :aria-label="title" data-thin>!</span>
</template>

<script setup lang="ts">
import { THIN_MARKET } from './format'

withDefaults(defineProps<{
  // A longer reason, when the screen knows more (how many days).
  title?: string
}>(), { title: THIN_MARKET })
</script>

<style>
.w-thin { display: inline-block; margin-left: 2px; color: var(--w-warn); font-weight: 700; font-family: var(--w-num); font-size: 0.9em; line-height: 1; cursor: help; }
</style>
