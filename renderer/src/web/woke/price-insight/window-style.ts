import { computed, markRaw, shallowRef } from 'vue'
import { AppConfig } from '@/web/Config'
import type { PriceCheckWidget } from '@/web/overlay/widgets'

// Settings > Price check > Window style. PoE (the default) draws the filters as the
// game's tooltip lines (poe-mode.css, FilterLinePoe.vue); Standard is the window as
// it always was. Only a pick is saved, so no stored value means PoE.
export const poeMode = computed(() =>
  AppConfig<PriceCheckWidget>('price-check')?.wokeWindowStyle !== 'standard')

// PoE mode's code is its own chunk (poe-kit.ts), loaded when a price check opens.
export type PoeKit = typeof import('./poe-kit')
export const poeKit = shallowRef<PoeKit | null>(null)
let loading: Promise<void> | null = null
export function loadPoeKit (): Promise<void> {
  loading ??= import('./poe-kit').then(kit => { poeKit.value = markRaw(kit) })
  return loading
}

/** PoE mode is picked and its code has arrived: what the window draws by. */
export const poeOn = computed(() => poeMode.value && poeKit.value != null)
