<template>
  <!-- The price check's one-off tour (tour-steps.ts), on the shared tour card. -->
  <TourCard :steps="TOUR_STEPS" :tour="PRICE_CHECK_TOUR" label="Price check tour" :held="held" data-pc-tour @shown="countShow" />
</template>

<script setup lang="ts">
// Mounted by PriceCheckWindow only while the window shows and the tour may
// still run; one mount per check. A showing counts once per check (not per
// overlay open, as window tips do): checks from the hotkey don't open it.
import { AppConfig } from '@/web/Config'
import { tourHeld } from '../shared/hints'
import TourCard from '../shared/TourCard.vue'
import { PRICE_CHECK_TOUR, TOUR_SHOWS, TOUR_STEPS } from './tour-steps'

// A sample check from What's new: not now.
const held = tourHeld()

// One showing per check; after TOUR_SHOWS checks it stops coming.
function countShow () {
  const woke = AppConfig().woke
  if (!woke) return
  woke.hints ??= {}
  woke.hints.shows = { ...woke.hints.shows, [PRICE_CHECK_TOUR]: Math.min(TOUR_SHOWS, (woke.hints.shows?.[PRICE_CHECK_TOUR] ?? 0) + 1) }
}
</script>
