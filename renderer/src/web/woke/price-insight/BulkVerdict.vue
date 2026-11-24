<template>
  <div :class="[$style.card, insight ? $style[insight.confidence] : undefined]">
    <template v-if="insight">
      <div :class="$style.eyebrow">
        <span :class="$style.badge" :title="CONFIDENCE_HINT[insight.confidence]">{{ CONFIDENCE_LABEL[insight.confidence] }}</span>
        <span>{{ unit === 'c' ? 'Chaos' : 'Divine' }} offers<template v-if="need > 1 && !insight.fewWithStock">, with stock for your {{ need }}</template></span>
        <span class="flex-1" />
        <span :class="$style.count">{{ insight.sellers }} {{ insight.sellers === 1 ? 'seller' : 'sellers' }}</span>
      </div>
      <div :class="$style.value">
        <span :class="$style.headline" data-testid="bulk-verdict-price"><w-price-text :text="amount(insight.fair)" /></span>
        <span :class="$style.each">each<template v-if="unit !== 'c' && divineInChaos"> ≈ <w-price-text :text="`${bulkAmount(insight.fair * divineInChaos)}c`" /></template><template v-if="need > 1 && !insight.fewWithStock"> · <w-price-text :text="amount(insight.fair * need)" /> for {{ need }}</template><template v-if="insight.fewWithStock && need > 1"> · small stacks counted</template><WInfo v-if="insight.fewWithStock && need > 1" class="ml-1" :text="`Few of the cheapest offers have stock for ${need}, so smaller ones are counted too.`" /></span>
      </div>
      <!-- What sellers ask, not only the price picked from it (WOKEPOET-540). -->
      <div v-if="spreadLine" :class="$style.spread" data-testid="bulk-verdict-spread"><w-price-text :text="spreadLine" /></div>
      <div v-if="insight.floor > insight.low" :class="$style.note">An offer at <w-price-text :text="amount(insight.low)" /> sits far under the rest, so it may be worth buying</div>
      <div v-if="insight.lowStock" :class="$style.note">{{ insight.lowStock }} {{ insight.lowStock === 1 ? 'offer' : 'offers' }} with under {{ need }} in stock left out</div>
      <div :class="$style.prices">
        <span><span class="w-dim">Sell fast</span> <w-price-text :text="amount(fast)" /> each</span>
        <span v-if="amount(insight.fair) !== amount(fast)"><span class="w-dim">Patient</span> <w-price-text :text="amount(insight.fair)" /> each</span>
      </div>
      <div v-if="otherNote" :class="$style.other" data-testid="bulk-verdict-other"><span><w-price-text :text="otherNote" /></span></div>
      <div v-if="ninjaNote" :class="$style.note" data-testid="bulk-verdict-ninja"><w-price-text :text="ninjaNote" /></div>
    </template>
    <div v-else :class="$style.eyebrow">
      <span :class="$style.badge">{{ loading ? '…' : 'NO DATA' }}</span>
      <span>{{ loading ? 'Reading offers…' : 'No offers that can be filled' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import WInfo from '../ui/WInfo.vue'
import WPriceText from '../ui/WPriceText.vue'
import { computed } from 'vue'
import type { Confidence } from './insight'
import { bulkAmount, spreadText } from './bulk-insight'
import type { BulkInsight } from './bulk-insight'

const props = defineProps<{
  insight: BulkInsight | null
  /** The currency of the offers: 'c' or 'div'. */
  unit: string
  need: number
  loading: boolean
  /** poe.ninja's price each, in the same currency, to compare with (WOKEPOET-479). */
  ninja?: number | null
  /** The other currency's offers, to show next to these (WOKEPOET-487). */
  other?: { unit: string, fair?: number, sellers?: number, failed?: boolean, unsearched?: boolean } | null
  /** One divine in chaos, from poe.ninja. */
  divineInChaos?: number | null
}>()

const CONFIDENCE_LABEL: Record<Confidence, string> = { high: 'SOLID', medium: 'OK', low: 'THIN', none: 'NO DATA' }
const CONFIDENCE_HINT: Record<Confidence, string> = {
  high: 'Several sellers ask about the same',
  medium: 'A few sellers, a bit spread out',
  low: 'Few or widely spread sellers: treat the price as a rough guess',
  none: 'No usable offers'
}

function amountIn (value: number, unit: string) {
  return `${bulkAmount(value)}${unit === 'c' ? 'c' : ' div'}`
}
function amount (value: number) {
  return amountIn(value, props.unit)
}

const spreadLine = computed(() => props.insight ? spreadText(props.insight.spread, props.insight.sellers, amount) : null)

// The other currency's price, in both currencies, and how it compares.
const otherNote = computed(() => {
  const other = props.other
  const fair = props.insight?.fair
  const rate = props.divineInChaos
  if (!other || !fair) return null
  const name = other.unit === 'c' ? 'Chaos' : 'Divine'
  if (other.failed) return `${name} offers didn't load, so this may not be the cheaper side. Click its button above to try again.`
  if (other.unsearched) return `${name} offers weren't searched yet, so this may not be the cheaper side. Click its button above to load them.`
  if (other.fair == null || other.sellers == null) return null
  const price = amountIn(other.fair, other.unit)
  if (!rate) return `${name} offers ask ${price} each`
  const otherChaos = other.unit === 'c' ? other.fair : other.fair * rate
  const shownChaos = props.unit === 'c' ? fair : fair * rate
  const conv = other.unit === 'c' ? amountIn(other.fair / rate, 'div') : amountIn(otherChaos, 'c')
  const ratio = otherChaos / shownChaos
  const gap = ratio >= 1.15
    ? (ratio >= 3 ? `${Math.round(ratio)}× as much` : `${Math.round((ratio - 1) * 100)}% more`)
    : ratio > 0.87
      ? 'about the same'
      : other.sellers < 3
        ? `cheaper, but only ${other.sellers} ${other.sellers === 1 ? 'seller' : 'sellers'}`
        : ratio <= 1 / 3
          ? `1/${Math.round(1 / ratio)} of the price`
          : `${Math.round((1 - ratio) * 100)}% cheaper`
  return `${name} offers ask ${price} each (≈ ${conv}), ${gap}`
})

// poe.ninja's price next to the live one, and how far apart they are.
const ninjaNote = computed(() => {
  const ninja = props.ninja
  const fair = props.insight?.fair
  if (!ninja || !fair) return null
  const pct = Math.round((fair / ninja - 1) * 100)
  const gap = pct === 0 ? 'the same as live' : `live is ${Math.abs(pct)}% ${pct < 0 ? 'under' : 'over'} it`
  return `poe.ninja ${amount(ninja)} each · ${gap}`
})

// Just under the floor. Under 10 a cut of 3% isn't a price anyone types.
const fast = computed(() => {
  const floor = props.insight?.floor ?? 0
  return floor >= 10 ? floor * 0.97 : floor
})
</script>

<style module>
.card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0 -1rem 8px;
  padding: 10px 1rem;
  border-top: 1px solid var(--w-line-soft);
  border-bottom: 1px solid var(--w-line);
  background: var(--w-pc-well, var(--w-panel-solid));
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
  font-variant-numeric: tabular-nums;
}
.eyebrow { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; min-width: 0; color: var(--w-dim); font-size: var(--w-fs-sm); line-height: calc(16px * var(--w-text-scale, 1)); }
.count { color: var(--w-dim); font-size: var(--w-fs-xs); white-space: nowrap; }
.badge {
  flex: none;
  font-size: var(--w-fs-xs);
  font-weight: 600;
  letter-spacing: .05em;
  line-height: calc(14px * var(--w-text-scale, 1));
  padding: 0 5px;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line);
  color: var(--w-dim);
}
.high .badge { color: var(--w-up); border-color: currentColor; }
.medium .badge { color: var(--w-accent); border-color: currentColor; }
.low .badge { color: var(--w-warn); border-color: currentColor; }
.value { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.headline { font-family: var(--w-num); font-size: calc(28px * var(--w-text-scale, 1)); line-height: calc(32px * var(--w-text-scale, 1)); font-weight: 600; color: var(--w-accent); white-space: nowrap; }
.each { color: var(--w-dim); font-size: var(--w-fs-sm); }
.note { color: var(--w-dim); font-size: var(--w-fs-sm); line-height: calc(17px * var(--w-text-scale, 1)); }
.spread { font-size: var(--w-fs-sm); line-height: calc(17px * var(--w-text-scale, 1)); }
.other { display: flex; align-items: center; gap: 4px; color: var(--w-dim); font-size: var(--w-fs-sm); line-height: calc(17px * var(--w-text-scale, 1)); border-top: 1px dashed var(--w-line-soft); padding-top: 5px; }
.prices { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: var(--w-fs-sm); }
</style>
