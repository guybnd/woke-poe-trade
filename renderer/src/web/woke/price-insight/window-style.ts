import { computed } from 'vue'
import { AppConfig } from '@/web/Config'
import type { PriceCheckWidget } from '@/web/overlay/widgets'

// Settings > Prices > Window style. Standard is the window as it always was; PoE
// draws the filters as the game's tooltip lines (poe-mode.css, FilterLinePoe.vue).
export const poeMode = computed(() =>
  AppConfig<PriceCheckWidget>('price-check')?.wokeWindowStyle === 'poe')
