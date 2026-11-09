import { computed } from 'vue'
import { AppConfig } from '@/web/Config'
import type { PriceCheckWidget } from '@/web/overlay/widgets'

// Settings > Price check > Window style. PoE (the default) draws the filters as the
// game's tooltip lines (poe-mode.css, FilterLinePoe.vue); Standard is the window as
// it always was. Only a pick is saved, so no stored value means PoE.
export const poeMode = computed(() =>
  AppConfig<PriceCheckWidget>('price-check')?.wokeWindowStyle !== 'standard')
