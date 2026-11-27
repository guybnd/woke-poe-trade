<template>
  <WPanel title="Item score" size-key="score" width="25rem" max-height="85vh">
    <template #actions><span class="w-faint text-xs">Rare weights</span></template>
    <div v-if="got" :class="$style.body">
      <div :class="$style.top">
        <LabelPreview :text="facts.baseType ?? facts.name" :actions="match.actions" :visibility="match.visibility" :scale="1.15" />
        <span class="grow" />
        <span :class="$style.verdict" :style="{ color: STEP_CSS[step] }">{{ STEP_NAMES[step] }}</span>
      </div>

      <div :class="$style.sum">
        Score <b :style="{ color: STEP_CSS[Math.max(1, step)] }">{{ pointsText(pts) }}</b>
        <span class="w-dim">· line {{ pointsText(points(w.need)) }}{{ pinnedBy ? ` · always shown: ${WEIGHT_LABEL[pinnedBy].toLowerCase()}` : '' }}</span>
      </div>
      <div :class="$style.meter" aria-hidden="true">
        <span v-for="z in zones" :key="z.step" :style="{ left: `${z.from}%`, width: `${z.to - z.from}%`, background: STEP_CSS[z.step] }" />
        <i :style="{ left: `${xOf(pts)}%` }" />
      </div>
      <div :class="$style.meterLegend">
        <span v-for="z in zones.slice(1)" :key="z.step" :style="{ left: `${z.from}%` }">{{ STEP_NAMES[z.step].split(',')[0] }}</span>
      </div>

      <div :class="$style.terms" data-no-item-tip="the parts of the item's score; the item itself is named in the card title">
        <div v-for="t in terms" :key="t.key" :class="[$style.term, { [$style.off]: !t.counts }]" :title="t.counts ? WEIGHT_LABEL[t.key] : `${WEIGHT_LABEL[t.key]}: doesn't count here (only the biggest mark counts, and none on a corrupted or mirrored item)`">
          <i :class="ICON_OF[t.key]" />
          <span class="grow">{{ WEIGHT_LABEL[t.key] }}<small v-if="t.group"> · {{ t.group }}</small></span>
          <span :class="[$style.pts, $style[signOf(t.key)]]">{{ pointsText(points(w.mult[t.key])) }}</span>
        </div>
        <div :class="$style.total"><span class="grow">Total</span><b>{{ pointsText(pts) }}</b></div>
      </div>

      <div :class="$style.rank">
        <div class="flex items-center gap-2">
          <span class="text-xs w-dim grow">Base rank of {{ got.row.name }}<template v-if="got.row.was"> (yours; the filter says {{ WEIGHT_LABEL[got.row.was] }})</template></span>
        </div>
        <div class="flex flex-wrap gap-1">
          <button v-for="r in RANK_KEYS" :key="r" type="button" :class="[$style.lane, got.row.rank === r && $style.laneOn]" :aria-pressed="got.row.rank === r"
            :title="`${WEIGHT_LABEL[r]} (${pointsText(points(w.mult[r]))})`" @click="setWeightRank(config, got.row, r)">{{ WEIGHT_LABEL[r] }}</button>
        </div>
      </div>

      <div :class="$style.keys" role="toolbar" aria-label="Quick changes">
        <button v-for="q in quick" :key="q.key" type="button" :class="[$style.key, { [$style.keyOff]: q.disabled }]" :disabled="q.disabled" :title="q.title" @click="q.run()">
          <span :class="$style.cap">{{ q.key }}</span><span>{{ q.label }}</span>
        </button>
      </div>
    </div>
    <div v-else class="w-faint text-sm">Rare weights don't decide this item.</div>
  </WPanel>
</template>

<script setup lang="ts">
// Alt+F for an item Rare weights decide: its score, part by part, where it
// lands against the line, and its base's rank.
import { computed, onMounted, onUnmounted } from 'vue'
import { WPanel } from '../ui'
import LabelPreview from './LabelPreview.vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import type { ItemFacts } from './item-facts'
import type { MatchResult } from './match'
import { RANK_KEYS, STEP_NAMES, WEIGHT_GROUPS, WEIGHT_LABEL, WEIGHT_TYPE, countedTerms, stepFor, termsOf, weightOf } from './weights'
import type { WeightKey } from './weights'
import { points, pointsText } from './weight-samples'
import { rankStep, setWeightRank, weightRow } from './weight-rank'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
  facts: ItemFacts
  match: MatchResult
}>()
const emit = defineEmits<{
  (e: 'open-editor', at?: { type: string, tier: string }): void
  (e: 'neversink'): void
}>()

const STEP_CSS = ['#8a8a8a', '#a8a8a8', '#d8d877', '#29d2a0', '#e04848']
const w = computed(() => props.config.presets.weights)
const got = computed(() => weightRow(props.store, props.config, props.facts))
const pts = computed(() => got.value ? points(weightOf(got.value.it, w.value.mult)) : 0)
const step = computed(() => got.value ? stepFor(got.value.it, w.value) : 0)
const GROUP_OF = Object.fromEntries(WEIGHT_GROUPS.flatMap(g => g.rows.map(r => [r.key, g]))) as Record<WeightKey, typeof WEIGHT_GROUPS[number]>
const ICON_OF = Object.fromEntries(WEIGHT_GROUPS.flatMap(g => g.rows.map(r => [r.key, g.icon]))) as Record<WeightKey, string>
const terms = computed(() => {
  if (!got.value) return []
  const counted = new Set(countedTerms(got.value.it, w.value.mult))
  return termsOf(got.value.it).map(key => ({ key, counts: counted.has(key), group: GROUP_OF[key]?.label ?? '' }))
})
const pinnedBy = computed(() => step.value === 1 && got.value && pts.value < points(w.value.need) ? terms.value.find(t => w.value.always.includes(t.key))?.key ?? null : null)
const signOf = (k: WeightKey) => w.value.mult[k] > 1 ? 'plus' : w.value.mult[k] < 1 ? 'minus' : 'zero'

// The meter: hidden, small, normal, big, beam along the score.
const range = computed(() => {
  const ps = [pts.value, points(w.value.need), ...w.value.loud.map(points)]
  return { lo: Math.min(...ps) - 15, hi: Math.max(...ps) + 15 }
})
const xOf = (p: number) => 100 * (p - range.value.lo) / (range.value.hi - range.value.lo)
const zones = computed(() => {
  const at = [range.value.lo, points(w.value.need), ...w.value.loud.map(l => Math.max(points(l), points(w.value.need))), range.value.hi]
  return [0, 1, 2, 3, 4].map(s => ({ step: s, from: xOf(at[s]), to: xOf(at[s + 1]) })).filter(z => z.to > z.from)
})

const quick = computed(() => {
  const row = got.value?.row
  const lower = row ? rankStep(row.rank, 1) : null
  const higher = row ? rankStep(row.rank, -1) : null
  return [
    { key: '1', label: "Don't care", title: 'Rank this base as Don\'t care (a strong mark still shows it)', disabled: !row || row.rank === 'rj', run: () => row && setWeightRank(props.config, row, 'rj') },
    { key: '2', label: 'Lower rank', title: lower ? `Down to ${WEIGHT_LABEL[lower]}` : 'Already the lowest rank', disabled: !lower, run: () => row && lower && setWeightRank(props.config, row, lower) },
    { key: '3', label: 'Raise rank', title: higher ? `Up to ${WEIGHT_LABEL[higher]}` : 'Already the top rank', disabled: !higher, run: () => row && higher && setWeightRank(props.config, row, higher) },
    { key: '4', label: 'Tune', title: 'Open Rare weights in the editor', disabled: false, run: () => emit('open-editor', { type: WEIGHT_TYPE, tier: 'weights' }) },
    { key: '5', label: 'NeverSink view', title: 'The filter rule card, as without weights', disabled: false, run: () => emit('neversink') }
  ]
})

// Keys reach the overlay only while it has focus, so they never drink a flask.
function onKey (e: KeyboardEvent) {
  if (e.ctrlKey || e.altKey || e.metaKey || e.repeat) return
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
  const q = quick.value.find(x => x.key === e.key)
  if (!q) return
  e.preventDefault()
  if (!q.disabled) q.run()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style module>
.body { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; }
.top { display: flex; align-items: center; gap: 8px; }
.verdict { font-size: var(--w-fs-lg); }
.sum { font-size: var(--w-fs-sm, 13px); }
.sum b { font-size: var(--w-fs-lg); }
.meter { position: relative; height: 8px; border-radius: 4px; overflow: visible; background: var(--w-panel); }
.meter span { position: absolute; top: 0; bottom: 0; opacity: 0.75; }
.meter span:first-child { border-radius: 4px 0 0 4px; }
.meter i { position: absolute; top: -4px; bottom: -4px; width: 3px; margin-left: -1.5px; background: #fff; border-radius: 2px; box-shadow: 0 0 4px #000; }
.meterLegend { position: relative; height: 14px; font-size: var(--w-fs-xs); color: var(--w-faint); }
.meterLegend span { position: absolute; top: 0; white-space: nowrap; }
.terms { display: flex; flex-direction: column; gap: 1px; background: var(--w-panel-2); border-radius: var(--w-r-sm); padding: 4px 6px; }
.term { display: flex; align-items: center; gap: 6px; font-size: var(--w-fs-sm, 13px); line-height: 1.6; }
.term i { width: 14px; text-align: center; color: var(--w-faint); font-size: var(--w-fs-xs); }
.term small { color: var(--w-faint); font-size: var(--w-fs-xs); }
.term.off { opacity: 0.5; }
.term.off .pts { text-decoration: line-through; }
.total { display: flex; align-items: center; gap: 6px; border-top: 1px solid var(--w-line); margin-top: 3px; padding-top: 3px; font-size: var(--w-fs-sm, 13px); }
.pts { font-variant-numeric: tabular-nums; min-width: 2.6rem; text-align: right; padding: 0 6px; border-radius: 9px; font-size: var(--w-fs-xs); }
.pts.plus { color: #8fd18a; background: rgba(143, 209, 138, 0.12); }
.pts.minus { color: #e08a8a; background: rgba(224, 138, 138, 0.12); }
.pts.zero { color: var(--w-faint); }
.rank { display: flex; flex-direction: column; gap: 5px; }
.lane { height: 1.6rem; padding: 0 8px; font-size: var(--w-fs-xs, 12px); border-radius: var(--w-r-sm); border: 1px solid var(--w-border); background: rgb(0 0 0 / 20%); color: var(--w-text-dim); cursor: pointer; }
.lane:hover { color: var(--w-text); }
.laneOn { border-color: #e0b860; background: rgb(224 184 96 / 16%); color: #f3d48a; }
.keys { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
.key { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 5px 2px; border: 1px solid var(--w-border); border-radius: var(--w-r-sm); background: rgb(0 0 0 / 20%); color: var(--w-text); font-size: var(--w-fs-xs); cursor: pointer; text-align: center; }
.key:hover { border-color: #e0b860; }
.keyOff { opacity: 0.4; cursor: default; }
.cap { display: inline-grid; place-items: center; min-width: 1.2rem; height: 1.2rem; border: 1px solid var(--w-border); border-radius: 3px; font-size: var(--w-fs-xs); }
</style>
