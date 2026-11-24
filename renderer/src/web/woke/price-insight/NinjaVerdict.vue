<template>
  <!-- The verdict for an exchange item before any search: poe.ninja's cached price (ninja-first.ts). -->
  <div v-if="info" :class="$style.card" data-testid="ninja-verdict">
    <div :class="$style.eyebrow">
      <span :class="$style.badge" :title="poeOn ? 'This is used to provide instant pricing without any delay. For live data, press:' : 'This is used to provide instant pricing without any delay. For live data, click Check live offers.'" :data-tip-keys="poeOn ? 'Enter' : null">POE.NINJA</span>
      <span>Cached price<template v-if="age">, updated {{ age }}</template></span>
      <span class="flex-1" />
      <template v-if="weekChange != null">
        <w-spark :values="spark" :width="32" :height="14" />
        <span :class="weekChange >= 0 ? 'w-up' : 'w-down'">{{ weekChange >= 0 ? '▲' : '▼' }}{{ Math.abs(weekChange) }}% 7d</span>
      </template>
    </div>
    <div :class="$style.value">
      <span :class="[$style.headline, { [$style.flip]: price?.flip }]" data-testid="ninja-verdict-price" :data-unit="price?.flip ? ninjaCheapUnit : null" :title="flipTitle(price)" @click="flipUnit(price)"><w-price-text :text="price?.main" /></span>
      <span :class="$style.each"><template v-if="price?.each">each</template><template v-if="stack">{{ price?.each ? ' · ' : '' }}<w-price-text :text="stack" /> for your {{ have }}</template><template v-if="price?.sub"> · <w-price-text :text="price.sub" /></template></span>
    </div>
    <!-- How sure poe.ninja's price is (ninja-trust.ts, WOKEPOET-534). -->
    <div v-if="doubtLine" :class="$style.doubt" data-testid="ninja-verdict-doubt" :data-doubt="doubt?.kind"><w-price-text :text="doubtLine" /></div>
    <!-- A gamble unique, unidentified: identify it or sell it unid (WOKEPOET-542). -->
    <div v-if="gamble" :class="$style.unid" data-testid="ninja-verdict-unid">
      <div v-if="unidQuote" data-unid-trade>Unid listings <b><w-price-text :text="fmt(unidQuote.chaos)" /></b> <span class="w-dim">· trade, {{ unidQuote.listings }} listed</span></div>
      <div v-else class="w-dim" data-unid-trade>Unid listings
        <span v-if="unidPending">…</span>
        <span v-else-if="unidNone">too few listed to price</span>
        <button v-else type="button" :class="$style.link" title="Uses one trade search: the middle of the cheapest unidentified listings" @click="askUnid">check on trade</button>
      </div>
      <template v-if="versions">
        <div>Identified <b><w-price-text :text="rangeText(versions.low, versions.high, xchgRate, num)" /></b>, median <w-price-text :text="fmt(versions.median)" /> <span class="w-dim">across {{ versions.count }} versions</span></div>
        <div class="w-dim" data-unid-read>{{ UNID_READ_TEXT[read] }}</div>
      </template>
      <div v-else class="w-dim" data-unid-identified>poe.ninja lists no identified versions of it.
        <button type="button" :class="$style.link" title="Opens the trade site in your browser: identified copies, cheapest first" @click="openIdentified">See identified on trade</button>
      </div>
    </div>
    <div :class="$style.row">
      <button type="button" class="btn w-pc-primary" :class="[$style.live, { 'w-pc-glow': doubt && doubt.kind !== 'thin' }]" data-testid="ninja-verdict-live" @click="search">
        Check live offers<w-kbd v-if="poeOn" keys="Enter" class="ml-2" />
      </button>
      <span class="w-dim">uses one {{ api === 'bulk' ? 'exchange' : 'trade' }} search</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ParsedItem } from '@/parser'
import type { ItemFilters } from '@/web/price-check/filters/interfaces'
import { usePoeninja } from '@/web/background/Prices'
import { ninjaPrice, ninjaTotal, chaosOrbRow, flipTitle } from './ninja-first'
import { ninjaCheapUnit, flipUnit } from './view'
import { WSpark, WKbd, WPriceText, agoPhrase } from '../ui'
import { exactDetailsId } from '@/web/price-check/trends/getDetailsId'
import { poeOn } from './window-style'
import { useNinjaDoubt } from './use-ninja-doubt'
import { isUnidUniqueJewel } from './ninja-first'
import { identifiedSpread, unidRead, rangeText, UNID_READ_TEXT } from './unid-compare'
import { VARIABLE_ITEMS, useTradePrices, identifiedTradeUrl } from '../shared/unid-prices'
import { doubtText } from './ninja-trust'

const props = defineProps<{
  item: ParsedItem
  filters: ItemFilters
  api?: 'trade' | 'bulk'
}>()

const { findPriceByQuery, findPricesByName, xchgRate, updatedAt } = usePoeninja()
const search = inject<() => void>('price-check-search', () => {})

const info = computed(() => {
  const q = exactDetailsId(props.item)
  const row = chaosOrbRow(props.item, xchgRate.value) ?? (q ? findPriceByQuery(q) : null)
  return row && row.chaos > 0 ? row : null
})

const isDivine = computed(() => props.item.info.refName === 'Divine Orb')
const have = computed(() => props.filters.stackSize?.value ?? 1)
const price = computed(() => info.value ? ninjaPrice(info.value.chaos, xchgRate.value, isDivine.value, ninjaCheapUnit.value) : null)
const stack = computed(() => info.value && have.value > 1 ? ninjaTotal(info.value.chaos * have.value, isDivine.value ? undefined : xchgRate.value) : null)
const age = computed(() => agoPhrase(updatedAt.value))
const doubt = useNinjaDoubt(info)

// A gamble unique, unidentified: poe.ninja's identified versions beside the unid price.
const gamble = computed(() => isUnidUniqueJewel(props.item) && VARIABLE_ITEMS.has(props.item.info.refName))
const versions = computed(() => gamble.value
  // The headline row (the unid price, by base) isn't an identified version.
  ? identifiedSpread((findPricesByName('UNIQUE', props.item.info.refName) as Array<{ chaos: number, variant?: string }>).filter(r => (r.variant ?? '') !== (info.value?.variant ?? '')))
  : null)
const tradePrices = useTradePrices()
const league = computed(() => props.filters.trade.league)
const unidQuote = computed(() => gamble.value && league.value ? tradePrices.get(league.value, props.item.info.refName) : null)
const unidPending = computed(() => tradePrices.pending(props.item.info.refName))
const unidNone = computed(() => !!league.value && tradePrices.noneListed(league.value, props.item.info.refName))
function openIdentified () {
  if (league.value) window.open(identifiedTradeUrl(league.value, props.item.info.refName))
}
function num (v: number) {
  if (v >= 100) return String(Math.round(v))
  if (v >= 10) return String(Number(v.toFixed(1)))
  return String(Number(v.toPrecision(2)))
}
// The unid price: trade's when it was checked, else poe.ninja's (the headline).
const read = computed(() => versions.value ? unidRead(unidQuote.value?.chaos ?? info.value?.chaos ?? 0, versions.value) : 'even')
function askUnid () {
  if (league.value && xchgRate.value) tradePrices.ask(league.value, xchgRate.value, props.item.info.refName)
}
const fmt = (c: number) => ninjaTotal(c, xchgRate.value)
const doubtLine = computed(() => doubt.value ? doubtText(doubt.value, c => ninjaTotal(c, xchgRate.value)) : null)
const spark = computed(() => (info.value?.graph ?? []).filter((p): p is number => p != null))
// poe.ninja's line is the % change since the first day, so its last point is the week's change.
const weekChange = computed(() => spark.value.length ? Math.round(spark.value[spark.value.length - 1]) : null)
</script>

<style module>
.card {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
.badge {
  flex: none;
  font-size: var(--w-fs-xs);
  font-weight: 600;
  letter-spacing: .05em;
  line-height: calc(14px * var(--w-text-scale, 1));
  padding: 0 5px;
  border-radius: var(--w-r-sm);
  border: 1px solid currentColor;
  color: #7fb2e5;
}
.value { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; min-width: 0; }
.flip { cursor: pointer; }
.flip:hover { filter: brightness(1.2); }
.headline { font-family: var(--w-num); font-size: calc(28px * var(--w-text-scale, 1)); line-height: calc(32px * var(--w-text-scale, 1)); font-weight: 600; color: var(--w-accent); white-space: nowrap; }
.each { color: var(--w-dim); font-size: var(--w-fs-sm); }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; font-size: var(--w-fs-sm); }
.doubt { color: var(--w-warn); font-size: var(--w-fs-sm); }
.unid { display: flex; flex-direction: column; gap: 2px; font-size: var(--w-fs-sm); }
.link { color: var(--w-accent); text-decoration: underline; text-underline-offset: 2px; }
.live { display: inline-flex; align-items: center; }
</style>
