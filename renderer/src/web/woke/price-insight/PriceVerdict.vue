<template>
  <div :class="[$style.card, $style[insight.confidence]]">
    <!-- One row with the answer; everything else opens from the chevron. -->
    <div :class="$style.row">
      <span v-if="!insight.range && loading">Reading listings…</span>
      <template v-else-if="!insight.range">
        <w-price v-if="headline" :class="$style.price" :title="blendTitle" :chaos="headline.chaos" :divine="divine" />
        <span :class="$style.badge">{{ blankSearch ? 'NO MODS' : (headline ? 'NO LISTINGS' : 'NO DATA') }}</span>
        <span v-if="!headline" :class="$style.rowNote" :title="emptyText">{{ emptyText }}</span>
      </template>
      <template v-else>
        <span v-if="lowValue" :class="$style.priceText" :title="blendTitle">Not worth listing</span>
        <w-price v-else :class="$style.price" :title="blendTitle" :chaos="headline?.chaos ?? insight.range.fair" :divine="divine" />
        <span :class="$style.badge" :title="CONFIDENCE_HINT[insight.confidence]">{{ CONFIDENCE_LABEL[insight.confidence] }}</span>
        <span v-if="!expanded" class="w-num" :class="$style.fact">Cheapest <w-price :class="$style.factPrice" :chaos="insight.range.low" :divine="divine" :unit="ninjaInfo ? 'auto' : rangeUnit" /></span>
      </template>
      <span v-if="!expanded && ninjaInfo" class="w-num" :class="$style.fact" :title="ninjaNotCounted ? 'poe.ninja isn\'t counted in this price' : undefined">
        <span :class="$style.ninjaName">poe.ninja</span>
        <w-price :class="[$style.ninjaPrice, { [$style.notCounted]: ninjaNotCounted }]" :chaos="ninjaInfo.chaos" :divine="divine" />
      </span>
      <button v-if="hasWarning" type="button" :class="[$style.warn, { [$style.warnHigh]: insight.range && insight.risk === 'high' }]" :title="warningTitle"
        @click="verdictExpanded = true">⚑<template v-if="riskLabel"> {{ riskLabel }}</template></button>
      <span class="flex-1" />
      <button type="button" class="w-icon-btn" :title="expanded ? 'Show less' : 'Show more detail and what drives the price'"
        @click="verdictExpanded = !verdictExpanded">
        <i class="fas text-xs" :class="expanded ? 'fa-chevron-up' : 'fa-chevron-down'" />
      </button>
    </div>

    <template v-if="expanded">
      <p v-if="!insight.range && !loading && headline" :class="$style.note">{{ emptyText }}</p>
      <div v-if="insight.range && insight.signals.length" :class="$style.signals">
        <div v-for="s in insight.signals" :key="s.kind" :class="$style.signal"><span :class="$style.flag">⚑</span> {{ s.text }}</div>
      </div>
      <div v-if="insight.range && !lowValue && notes.length" :class="$style.actions">
        <button v-for="n in notes" :key="n.key" type="button" :class="$style.note2"
          :title="'Copy the listing note: ' + n.text" @click="copy(n)">
          <span class="w-dim">{{ n.label }}</span>
          <span class="w-num">{{ copied === n.key ? 'Copied' : n.text }}</span>
        </button>
      </div>

      <div v-if="insight.range || ranges.length" :class="$style.line">
        <template v-if="insight.range">
          <span class="w-num" :class="$style.fact">Cheapest <w-price :class="$style.factPrice" :chaos="insight.range.low" :divine="divine" :unit="rangeUnit" /></span>
          <span v-if="insight.range.high > insight.range.low" class="w-num" :class="$style.fact">up to <w-price :class="$style.factPrice" :chaos="insight.range.high" :divine="divine" :unit="rangeUnit" /></span>
        </template>
        <button v-if="ranges.length" type="button" :class="[$style.sparkBtn, { [$style.on]: historyOpen }]"
          :title="(historyOpen ? 'Hide price history' : 'Show price history') + (ninjaNotCounted ? '. poe.ninja isn\'t counted in this price' : '')" @click="historyOpen = !historyOpen">
          <w-spark :values="sparkValues" :width="40" :height="14" />
          <span class="w-num" :class="$style.fact">
            <span :class="{ [$style.ninjaName]: ninjaInfo }">{{ ninjaInfo ? 'poe.ninja' : 'My checks' }}</span>
            <w-price v-if="ninjaInfo" :class="[$style.ninjaPrice, { [$style.notCounted]: ninjaNotCounted }]" :chaos="ninjaInfo.chaos" :divine="divine" />
            <span v-if="ninjaInfo && ninjaNotCounted">not counted</span>
            <span v-if="sparkChange != null" :class="sparkChange >= 0 ? 'w-up' : 'w-down'">{{ sparkChange >= 0 ? '+' : '' }}{{ Math.round(sparkChange * 100) }}%</span>
          </span>
        </button>
        <span class="flex-1" />
        <span v-if="insight.range" :class="$style.count" :title="droppedTitle">{{ countText }}</span>
      </div>

      <p v-if="age" :class="$style.note" :style="age.stale ? { color: 'var(--w-warn)' } : undefined">{{ age.text }}</p>
    </template>

    <price-history-chart v-if="expanded && historyOpen && ranges.length" :ranges="ranges" :series="series" :divine="divine"
      :from-ninja="Boolean(ninjaInfo)" :loading="leagueLoading" @range="onRange" />

    <div v-if="expanded && sourcesAddAnything(blend, headline?.from)" :class="$style.sources">
      <div v-if="blend.points.length > 1" :class="$style.agree">{{ AGREEMENT_SENTENCE[blend.agreement] }} <WInfo v-if="headline?.from === 'blend'" text="The headline blends them, listings count most." /></div>
      <div v-for="p in blend.points" :key="p.key" :class="[$style.source, { [$style.off]: p.weight === 0 }]" :title="p.note">
        <span :class="{ [$style.ninjaName]: p.key === 'ninja' }">{{ p.label }}</span>
        <span class="w-num" :class="$style.sourceNote" :title="p.key === 'ninja' && ninjaGapText ? 'Listings disagree with poe.ninja, which averages recent prices. Trust the listings for rolls and corruption, poe.ninja for the going rate.' : undefined">{{ p.weight === 0 ? 'not counted' : (p.key === 'ninja' ? ninjaGapText : '') }}</span>
        <span class="w-num" :class="$style.sourcePrice">
          <w-price :chaos="p.low" :divine="divine" /><template v-if="p.high > p.low">–<w-price :chaos="p.high" :divine="divine" /></template>
        </span>
      </div>
    </div>
    <p v-if="expanded && ninjaInfo" :class="$style.note"><a :class="$style.ninjaLink" :href="ninjaInfo.url" target="_blank">Open on poe.ninja ↗</a></p>
    <p v-if="expanded && insight.range && accountMissing" :class="$style.note">Your own listings may be counted here. Add your account name in settings to leave them out.</p>
    <p v-if="expanded && canAsk && usePoeprices && ppStatus" :class="$style.ppToggle">
      <span class="w-faint">poeprices.info: {{ ppStatus }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, toRef, watch } from 'vue'
import { ParsedItem } from '@/parser'
import { AppConfig } from '@/web/Config'
import { WInfo, WPrice, WSpark } from '../ui'
import { useCopy } from '../ui/copy'
import { nowMinute } from '../ui/format'
import { usePoeninja } from '@/web/background/Prices'
import { dataAge } from './data-age'
import PriceHistoryChart from './PriceHistoryChart.vue'
import { verdictExpanded, historyOpen, collapseForNewItem } from './view'
import { DROP_LABEL, DropReason, Insight, Confidence, FixRisk, notePrice, noteText } from './insight'
import { sourcesAddAnything } from './sources'
import type { Agreement } from './sources'
import { seriesChange, HistoryRange } from './history'
import { useSmartPrice } from './useSmartPrice'
import { canAskPoeprices, poepricesState, usePoeprices, loadPoeprices } from './check-state'

const props = defineProps<{
  item: ParsedItem
  insight: Insight
  divine: number | undefined
  loading: boolean
  total: number | null
  /** Identifies this search in the price log, or null before it runs. */
  logKey: string | null
  league: string
  /** A rare searched with no mods: any rare would match, so there's no price to give. */
  blankSearch?: boolean
  /** A rare searched without one of its top mods: the price may still be right, "worthless" isn't. */
  skipsTopMods?: boolean
  /** False when the search looks for something poe.ninja's price doesn't cover. */
  ninjaFits: boolean
}>()

const LOW_VALUE = 3
watch(() => props.item, collapseForNewItem, { immediate: true })
const expanded = computed(() => verdictExpanded.value)

// 'OK', not 'Fair': this rates the data, and 'fair' already means the price.
const CONFIDENCE_LABEL: Record<Confidence, string> = { high: 'SOLID', medium: 'OK', low: 'THIN', none: 'NO DATA' }
const CONFIDENCE_HINT: Record<Confidence, string> = {
  high: 'Plenty of listings that agree with each other',
  medium: 'Some listings, a bit spread out',
  low: 'Few or widely spread listings: treat the price as a rough guess',
  none: 'No usable listings'
}
const RISK_LABEL: Record<FixRisk, string> = { none: '', low: 'Fixing: low', medium: 'Fixing: medium', high: 'Fixing: high' }

const smart = useSmartPrice(toRef(props, 'item'), toRef(props, 'insight'), toRef(props, 'divine'), toRef(props, 'logKey'), toRef(props, 'league'), toRef(props, 'ninjaFits'))
onUnmounted(smart.stop)
const { ninjaInfo, blend, headline, ranges, series, leagueLoading } = smart

const { updatedAt, isLoading: ninjaLoading } = usePoeninja()
const age = computed(() => dataAge(props.divine, updatedAt.value, nowMinute.value, ninjaLoading.value))

// With divine listings left out, what's left may not be the real price: no advice on it.
const missingDivines = computed(() => props.insight.signals.some(s => s.kind === 'norate'))

const lowValue = computed(() => !props.skipsTopMods && !missingDivines.value && (headline.value?.chaos ?? props.insight.range?.fair ?? 0) < LOW_VALUE)

// A flag on the row, only for what changes what the price means. The text opens with the chevron.
// With no listings to go on, a price from other sources needs its reason flagged too.
const hasWarning = computed(() => Boolean(age.value?.stale) || (props.insight.range != null
  ? riskLabel.value !== '' ||
    props.insight.signals.some(s => s.kind === 'old' || s.kind === 'norate' || s.kind === 'snipe' || s.kind === 'oneseller')
  : !props.loading && headline.value != null))
const riskLabel = computed(() => props.insight.range && (props.insight.risk === 'medium' || props.insight.risk === 'high') ? RISK_LABEL[props.insight.risk] : '')
const warningTitle = computed(() => [
  ...(props.insight.range ? props.insight.signals.map(s => s.text) : (!props.loading && headline.value ? [emptyText.value] : [])),
  ...(age.value?.stale ? [age.value.text] : [])
].join('\n') || 'Some listings look placed to fake the price')

const accountMissing = computed(() => !AppConfig().accountName?.trim())

const ninjaNotCounted = computed(() => blend.value.points.some(p => p.key === 'ninja' && p.weight === 0))

// Only worth mentioning when listings and poe.ninja are a quarter or more apart.
const ninjaGapText = computed(() => {
  const fair = props.insight.range?.fair
  const ninja = ninjaInfo.value?.chaos
  if (!fair || !ninja) return ''
  const ratio = fair / ninja - 1
  if (Math.abs(ratio) < 0.25) return ''
  const pct = Math.round(ratio * 100)
  return `listings ${pct > 0 ? '+' : ''}${pct}%`
})

const AGREEMENT_SENTENCE: Record<Agreement, string> = {
  single: 'One source counted',
  agree: 'Sources agree',
  mixed: 'Sources differ a bit',
  disagree: 'Sources disagree'
}

const sparkSeries = computed(() => ranges.value.length ? series(ranges.value[0]) : [])
const sparkValues = computed(() => sparkSeries.value.map(p => p.chaos))
const sparkChange = computed(() => seriesChange(sparkSeries.value))

function onRange (r: HistoryRange) {
  if (r === 'league') smart.loadLeague()
}

const canAsk = computed(() => canAskPoeprices(props.item))
watch(usePoeprices, (on) => { if (on) loadPoeprices(props.item) })
const ppStatus = computed(() => {
  const s = poepricesState.value
  if (!s || s.item !== props.item) return ''
  if (s.status === 'loading') return 'asking…'
  if (s.status === 'error') return s.error ?? 'failed'
  return ''
})

const rangeUnit = computed(() => {
  const r = props.insight.range
  if (!r || !props.divine) return 'chaos'
  return r.high >= props.divine ? 'div' : 'chaos'
})

const emptyText = computed(() => {
  if (props.blankSearch) return 'No mods are ticked, so these listings can\'t price this rare. Tick the mods that matter, then search.'
  if (props.total === 0) return 'Nobody is selling this with these filters'
  const noRate = props.insight.signals.find(s => s.kind === 'norate')
  if (noRate) return noRate.text
  if (props.insight.dropped.size) return 'All listings looked unreliable'
  return 'No listings yet'
})

const countText = computed(() => {
  const used = props.insight.kept.length
  const skipped = props.insight.dropped.size
  return skipped ? `${used} trusted · ${skipped} ignored` : `${used} trusted`
})

const droppedTitle = computed(() => {
  const counts = new Map<DropReason, number>()
  for (const reason of props.insight.dropped.values()) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1)
  }
  if (!counts.size) return 'Every fetched listing was used'
  return Array.from(counts, ([reason, n]) => `${n} × ${DROP_LABEL[reason]}`).join('\n')
})

const blendTitle = computed(() => {
  const lines = blend.value.points.map(p =>
    `${p.label}: ${Math.round(p.low)}${p.high > p.low ? '–' + Math.round(p.high) : ''}c${p.weight === 0 ? ' (not counted)' : ''}. ${p.note}`)
  if (headline.value?.from === 'blend') lines.unshift('Blend of every source, listings count most:')
  else if (headline.value?.chaos === props.insight.range?.low) lines.unshift('What sellers ask, since the trade site shows no sales: the cheapest trusted listing.')
  else lines.unshift('What sellers ask, since the trade site shows no sales: the middle of the cheapest trusted listings, counting online and recent sellers more.')
  return lines.join('\n')
})

const notes = computed(() => {
  const s = props.insight.suggest
  if (!s || missingDivines.value) return []
  const fast = noteText(notePrice(s.fast, props.divine))
  // Listings nobody has bought say little: being patient means asking the blended price.
  const oldOnly = props.insight.signals.some(sig => sig.kind === 'old')
  const patient = noteText(notePrice(oldOnly ? Math.max(headline.value?.chaos ?? s.patient, s.patient) : s.patient, props.divine))
  if (fast === patient) return [{ key: 'fast', label: 'List', text: fast }]
  return [
    { key: 'fast', label: 'Sell fast', text: fast },
    { key: 'patient', label: 'Patient', text: patient }
  ]
})

const { copied, copy: copyText } = useCopy(1500)
async function copy (n: { key: string, text: string }) {
  await copyText(n.text, n.key)
}
</script>

<style module>
.card {
  display: flex;
  flex-direction: column;
  color: var(--w-fg);
  background: var(--w-pc-well, var(--w-panel-solid));
  border-bottom: 1px solid var(--w-line);
  font-family: var(--w-body);
  font-size: var(--w-text);
  font-variant-numeric: tabular-nums;
}
/* The answer, on one row. It only wraps when the text is scaled past the window. */
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 10px; min-height: 32px; padding: 2px calc(1rem - 4px) 2px 1rem; font-size: calc(12px * var(--w-text-scale, 1)); color: var(--w-dim); white-space: nowrap; }
/* Stays on the row: a second line would push the mods down when a search finds nothing. */
.rowNote { flex: 1 1 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.price { justify-content: flex-start; font-family: var(--w-num); font-size: calc(16px * var(--w-text-scale, 1)); font-weight: 600; color: var(--w-accent); }
.price img { width: calc(16px * var(--w-text-scale, 1)); height: calc(16px * var(--w-text-scale, 1)); }
.priceText { font-family: var(--w-head); font-size: calc(16px * var(--w-text-scale, 1)); color: var(--w-accent); }
.warn { color: var(--w-warn); }
.warnHigh { color: var(--w-down); }
.count { color: var(--w-dim); font-size: var(--w-fs-xs); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.note { margin: 0; padding: 0 1rem 8px; color: var(--w-dim); font-size: calc(12px * var(--w-text-scale, 1)); line-height: calc(17px * var(--w-text-scale, 1)); }
/* One line of facts, for whoever wants them. */
.line { display: flex; flex-wrap: wrap; align-items: center; gap: 0 10px; min-height: 28px; padding: 2px calc(1rem - 4px) 2px 1rem; border-top: 1px solid var(--w-line-soft); font-size: calc(12px * var(--w-text-scale, 1)); color: var(--w-dim); white-space: nowrap; }
.fact { display: inline-flex; align-items: center; gap: 4px; }
.factPrice { color: var(--w-fg); font-weight: 600; }
.ninjaPrice { color: var(--w-ninja); font-weight: 600; }
.notCounted { opacity: .6; }
.badge {
  flex: none;
  font-size: var(--w-fs-xs);
  font-weight: 600;
  letter-spacing: .05em;
  line-height: calc(14px * var(--w-text-scale, 1));
  padding: 0 5px;
  border-radius: 3px;
  border: 1px solid var(--w-line);
  color: var(--w-dim);
}
.high .badge { color: var(--w-up); border-color: currentColor; }
.medium .badge { color: var(--w-accent); border-color: currentColor; }
.low .badge { color: var(--w-warn); border-color: currentColor; }
.sparkBtn { display: inline-flex; align-items: center; gap: 6px; flex: none; padding: 1px 4px; margin: 0 -4px; border-radius: var(--w-r-sm); border: 1px solid transparent; }
.sparkBtn:hover, .sparkBtn.on { border-color: var(--w-line-strong); background: var(--w-panel-3); }
.signals { display: flex; flex-direction: column; gap: 2px; padding: 6px 1rem; color: var(--w-fg); background: color-mix(in srgb, var(--w-down) 10%, transparent); border-top: 1px solid color-mix(in srgb, var(--w-down) 35%, transparent); }
.signal { font-size: calc(12px * var(--w-text-scale, 1)); line-height: calc(17px * var(--w-text-scale, 1)); }
.flag { color: var(--w-down); }
.actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(calc(160px * var(--w-text-scale, 1)), 1fr)); gap: 4px 8px; padding: 6px 1rem; border-top: 1px solid var(--w-line-soft); }
.note2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 3px 8px;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line);
  background: var(--w-panel-3);
  font-size: calc(12px * var(--w-text-scale, 1));
  white-space: nowrap;
}
.note2:hover { border-color: var(--w-accent); }
.sources { display: flex; flex-direction: column; gap: 2px; padding: 6px 1rem; border-top: 1px solid var(--w-line-soft); font-size: calc(12px * var(--w-text-scale, 1)); color: var(--w-dim); }
.agree { color: var(--w-dim); margin-bottom: 2px; }
.source { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 12px; align-items: center; }
.source.off { opacity: .6; }
.sourceNote { color: var(--w-faint); }
.sourcePrice { display: inline-flex; align-items: center; gap: 2px; color: var(--w-fg); font-weight: 600; }
.ninjaName { color: var(--w-ninja); }
.ninjaLink { color: var(--w-ninja); justify-self: start; }
.ninjaLink:hover { text-decoration: underline; }
.ppToggle { display: flex; align-items: center; gap: 6px; padding: 0 1rem 8px; font-size: calc(12px * var(--w-text-scale, 1)); color: var(--w-dim); }
</style>
