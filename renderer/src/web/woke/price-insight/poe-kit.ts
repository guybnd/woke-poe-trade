// PoE mode's code, loaded only once a price check opens in PoE mode
// (window-style.ts loadPoeKit), so Standard and app startup never carry it.
export { poeLook, poeSection, poeTier, isTopTier, fracturedIds } from './poe-kind'
export { useDragNumber } from './drag-number'
export { default as FilterLinePoe } from '@/web/price-check/filters/FilterLinePoe.vue'
