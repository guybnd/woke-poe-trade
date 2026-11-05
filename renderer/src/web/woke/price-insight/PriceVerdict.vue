<template>
  <div :class="[$style.card, $style[insight.confidence]]">
    <div v-if="!insight.range" :class="$style.hero">
      <div :class="$style.main">
        <div :class="$style.eyebrow">
          <span :class="$style.badge">{{ loading ? '…' : 'NO DATA' }}</span>
          <span>{{ loading ? 'Reading listings…' : emptyText }}</span>
        </div>
        <div v-if="!loading && headline" :class="$style.value">
          <w-price :class="[$style.headline, $style.headlinePrice]" :chaos="headline.chaos" :divine="divine" />
          <span class="w-dim text-xs" :title="blendTitle">other sources say</span>
        </div>
        <div v-else-if="ninjaInfo" :class="$style.value">
          <ninja-line :chaos="ninjaInfo.chaos" :divine="divine" :url="ninjaInfo.url" />
        </div>
      </div>
      <div :class="$style.side">
        <button v-if="ranges.length" type="button" :class="[$style.sparkBtn, { [$style.on]: historyOpen }]" title="Price history" @click="historyOpen = !historyOpen">
          <w-spark :values="sparkValues" :width="46" :height="16" />
        </button>
      </div>
    </div>
    <template v-else>
      <div :class="$style.hero">
        <div :class="$style.main">
          <div :class="$style.eyebrow">
            <span :class="$style.badge" :title="CONFIDENCE_HINT[insight.confidence]">{{ CONFIDENCE_LABEL[insight.confidence] }}</span>
            <span class="whitespace-nowrap" :title="blendTitle">{{ lowValue ? `Under ${LOW_VALUE}c` : 'Likely sells for' }}</span>
          </div>
          <div :class="$style.value">
            <span v-if="lowValue" :class="$style.headline">Not worth listing</span>
            <w-price v-else :class="[$style.headline, $style.headlinePrice]" :chaos="headline?.chaos ?? insight.range.fair" :divine="divine" />
            <span v-if="!expanded && !showStrip" :class="$style.range" class="whitespace-nowrap">
              <w-price :chaos="insight.range.low" :divine="divine" :unit="rangeUnit" /> – <w-price :chaos="insight.range.high" :divine="divine" :unit="rangeUnit" />
            </span>
          </div>
        </div>
        <div :class="$style.side">
          <div :class="$style.sideRow">
            <button v-if="ranges.length" type="button" :class="[$style.sparkBtn, { [$style.on]: historyOpen }]"
              :title="historyOpen ? 'Hide price history' : 'Show price history'" @click="historyOpen = !historyOpen">
              <w-spark :values="sparkValues" :width="46" :height="16" />
              <span v-if="sparkChange != null && !historyOpen" class="text-xs w-num" :class="sparkChange >= 0 ? 'w-up' : 'w-down'">{{ sparkChange >= 0 ? '+' : '' }}{{ Math.round(sparkChange * 100) }}%</span>
            </button>
            <button type="button" class="w-icon-btn" :title="expanded ? 'Show less' : 'Show sources, listing notes and what drives the price'"
              @click="verdictExpanded = !verdictExpanded">
              <i class="fas text-xs" :class="expanded ? 'fa-chevron-up' : 'fa-chevron-down'" />
            </button>
          </div>
          <span v-if="insight.risk !== 'none'" :class="[$style.risk, $style['risk-' + insight.risk]]" :title="riskTitle"
            @click="verdictExpanded = true">⚑ {{ RISK_LABEL[insight.risk] }}</span>
          <span v-else-if="!expanded" :class="$style.count" :title="droppedTitle">{{ countText }}</span>
        </div>
      </div>
      <price-strip v-if="showStrip" :insight="insight" :blend="blend" :fair="headline?.chaos ?? null" :divine="divine" />
      <div v-if="showStrip && blend.points.length > 1" :class="$style.row" class="text-xs">
        <span :class="[$style.agree, $style['agree-' + blend.agreement]]" :title="blendTitle">{{ AGREEMENT_LABEL[blend.agreement] }}</span>
        <span v-if="headline?.from === 'blend'" class="w-faint">headline blends them, listings count most</span>
        <span v-if="blend.ninjaSuspect" class="w-warn">poe.ninja looks faked here, not counted</span>
      </div>
      <div v-if="expanded && insight.signals.length" :class="$style.signals">
        <div v-for="s in insight.signals" :key="s.kind" class="text-xs"><span :class="$style.flag">⚑</span> {{ s.text }}</div>
      </div>
      <div v-if="expanded" :class="$style.row" class="text-xs">
        <span class="w-dim">Range</span>
        <w-price :chaos="insight.range.low" :divine="divine" :unit="rangeUnit" />
        <span class="w-faint">–</span>
        <w-price :chaos="insight.range.high" :divine="divine" :unit="rangeUnit" />
        <span class="w-dim whitespace-nowrap" :title="droppedTitle">· {{ countText }}</span>
        <span class="flex-1" />
        <ninja-line v-if="ninjaInfo" :chaos="ninjaInfo.chaos" :divine="divine" :url="ninjaInfo.url" :fair="insight.range.fair" />
      </div>
      <div v-if="expanded && !lowValue && notes.length" :class="$style.row">
        <button v-for="n in notes" :key="n.key" type="button" :class="$style.note"
          :title="'Copy the listing note: ' + n.text" @click="copy(n)">
          <span class="w-dim">{{ n.label }}</span>
          <span class="w-num">{{ copied === n.key ? 'Copied' : n.text }}</span>
        </button>
      </div>
    </template>
    <price-history-chart v-if="historyOpen && ranges.length" :ranges="ranges" :series="series" :divine="divine"
      :loading="leagueLoading" @range="onRange" />
    <label v-if="expanded && canAsk" :class="$style.ppToggle">
      <input type="checkbox" v-model="usePoeprices">
      <span>Ask poeprices.info about rares</span>
      <span v-if="ppStatus" class="w-faint">· {{ ppStatus }}</span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, toRef, watch } from 'vue'
import { ParsedItem } from '@/parser'
import { WPrice, WSpark } from '../ui'
import { useCopy } from '../ui/copy'
import NinjaLine from './NinjaLine.vue'
import PriceStrip from './PriceStrip.vue'
import PriceHistoryChart from './PriceHistoryChart.vue'
import { verdictExpanded, historyOpen } from './view'
import { DROP_LABEL, DropReason, Insight, Confidence, FixRisk, notePrice, noteText } from './insight'
import { AGREEMENT_LABEL } from './sources'
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
}>()

const LOW_VALUE = 3
const expanded = computed(() => verdictExpanded.value)

// 'OK', not 'Fair': this rates the data, and 'fair' already means the price.
const CONFIDENCE_LABEL: Record<Confidence, string> = { high: 'SOLID', medium: 'OK', low: 'THIN', none: 'NO DATA' }
const CONFIDENCE_HINT: Record<Confidence, string> = {
  high: 'Plenty of listings that agree with each other',
  medium: 'Some listings, a bit spread out',
  low: 'Few or widely spread listings: treat the price as a rough guess',
  none: 'No usable listings'
}
const RISK_LABEL: Record<FixRisk, string> = { none: '', low: 'fixing risk: low', medium: 'fixing risk: medium', high: 'fixing risk: high' }

const smart = useSmartPrice(toRef(props, 'item'), toRef(props, 'insight'), toRef(props, 'divine'), toRef(props, 'logKey'), toRef(props, 'league'))
onUnmounted(smart.stop)
const { ninjaInfo, blend, headline, ranges, series, leagueLoading } = smart

const lowValue = computed(() => (headline.value?.chaos ?? props.insight.range?.fair ?? 0) < LOW_VALUE)

// The strip shows when expanded, and on its own when the cheap end looks faked.
const showStrip = computed(() => expanded.value || props.insight.risk === 'medium' || props.insight.risk === 'high')

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
  if (props.total === 0) return 'Nobody is selling this with these filters'
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

const riskTitle = computed(() => props.insight.signals.map(s => s.text).join('\n') || 'Some listings look placed to fake the price')

const blendTitle = computed(() => {
  const lines = blend.value.points.map(p =>
    `${p.label}: ${Math.round(p.low)}${p.high > p.low ? '–' + Math.round(p.high) : ''}c${p.weight === 0 ? ' (not counted)' : ''}. ${p.note}`)
  if (headline.value?.from === 'blend') lines.unshift('Blend of every source, listings count most:')
  else lines.unshift('What it is likely to sell for: the middle of the cheapest trusted listings, counting online and recent sellers more.')
  return lines.join('\n')
})

const notes = computed(() => {
  const s = props.insight.suggest
  if (!s) return []
  const fast = noteText(notePrice(s.fast, props.divine))
  const patient = noteText(notePrice(s.patient, props.divine))
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 7px 8px 7px 11px;
  margin: 0 0 8px;
  border-radius: var(--w-r-md);
  border: 1px solid var(--w-line);
  background: var(--w-panel);
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-text);
  overflow: hidden;
}
/* The confidence reads from the edge of the card, at a glance. */
.card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--w-panel-3);
}
.high::before { background: var(--w-up); }
.medium::before { background: var(--w-accent); }
.low::before { background: var(--w-warn); }
.low { border-color: color-mix(in srgb, var(--w-warn) 45%, transparent); }

.hero { display: flex; align-items: center; gap: 10px; min-width: 0; }
.main { display: flex; flex-direction: column; gap: 1px; flex: 1 1 auto; min-width: 0; }
.side { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex: none; }
.sideRow { display: flex; align-items: center; gap: 2px; }
.eyebrow { display: flex; align-items: center; gap: 6px; min-width: 0; color: var(--w-dim); font-size: var(--w-fs-sm); line-height: 16px; }
.value { display: flex; align-items: center; gap: 8px; min-width: 0; overflow: hidden; line-height: 24px; }
.range { display: inline-flex; align-items: center; gap: 3px; color: var(--w-dim); font-size: var(--w-fs-sm); }
.count { color: var(--w-faint); font-size: var(--w-fs-xs); white-space: nowrap; padding-right: 4px; }
.row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.badge {
  flex: none;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 14px;
  padding: 0 5px;
  border-radius: 3px;
  background: var(--w-panel-3);
  color: var(--w-dim);
}
.high .badge { background: color-mix(in srgb, var(--w-up) 18%, transparent); color: var(--w-up); }
.medium .badge { background: var(--w-accent-soft); color: var(--w-accent); }
.low .badge { background: color-mix(in srgb, var(--w-warn) 18%, transparent); color: var(--w-warn); }
.headline {
  font-family: var(--w-head);
  font-size: 20px;
  font-weight: 400;
  letter-spacing: var(--w-head-track);
  color: var(--w-accent);
  white-space: nowrap;
}
/* Fontin's old-style digits dip and rise: a price wants even figures. */
.headlinePrice { font-family: var(--w-num); font-size: var(--w-fs-xl); font-weight: 600; letter-spacing: 0; }
.risk {
  flex: none;
  font-size: var(--w-fs-xs);
  padding: 0 6px;
  border-radius: var(--w-r-pill);
  border: 1px solid var(--w-line);
  white-space: nowrap;
  cursor: default;
}
.risk-low { color: var(--w-dim); }
.risk-medium { color: var(--w-warn); border-color: color-mix(in srgb, var(--w-warn) 55%, transparent); }
.risk-high { color: var(--w-down); border-color: color-mix(in srgb, var(--w-down) 55%, transparent); }
.sparkBtn {
  display: inline-flex; align-items: center; gap: 4px; flex: none;
  padding: 1px 4px; border-radius: var(--w-r-sm); border: 1px solid transparent;
}
.sparkBtn:hover, .sparkBtn.on { border-color: var(--w-line-strong); background: var(--w-panel-2); }
.agree { padding: 0 6px; border-radius: var(--w-r-pill); border: 1px solid var(--w-line); color: var(--w-dim); white-space: nowrap; }
.agree-agree { color: var(--w-up); border-color: color-mix(in srgb, var(--w-up) 55%, transparent); }
.agree-mixed { color: var(--w-accent); }
.agree-disagree { color: var(--w-warn); border-color: color-mix(in srgb, var(--w-warn) 55%, transparent); }
.signals { display: flex; flex-direction: column; gap: 1px; color: var(--w-dim); }
.flag { color: var(--w-warn); }
.note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line);
  background: var(--w-panel-2);
  font-size: var(--w-fs-md);
}
.note:hover { border-color: var(--w-line-strong); background: var(--w-accent-soft); }
.ppToggle { display: flex; align-items: center; gap: 6px; font-size: var(--w-fs-sm); color: var(--w-dim); }
</style>
