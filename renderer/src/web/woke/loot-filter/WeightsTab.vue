<template>
  <div :class="$style.wrap" class="w-scroll">
    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <WToggle v-model="w.on">Decide unidentified endgame rares by weight</WToggle>
        <span :class="$style.beta">Beta</span>
        <WInfo text="Every unidentified rare of item level 68+ gets a weight: its base rank times each thing it has (drop tier, item level, links, influence...). Under the line it hides; over it, it shows, louder at +20, +40 and +60 points over. Only this profile, and off by default: NeverSink's rare rules stay as they are underneath. Your own rules, build rules and presets still go on top." />
      </div>
      <div class="w-faint text-xs">
        <template v-if="w.on">{{ store.weightRules.value.toLocaleString() }} rules, about {{ sizeText }} added above NeverSink's rare rules.</template>
        <template v-else>Off: NeverSink decides rares. The test rares below show what weights would do.</template>
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <span class="font-semibold">Line</span>
        <input v-model.number="needPoints" type="range" :min="NEED_LO" :max="NEED_HI" step="1" :class="$style.slider" aria-label="Weight a rare needs to show, in points">
        <span :class="$style.num">{{ pointsText(needPoints) }}</span>
        <WInfo text="Points: every +10 doubles. A rare shows when its points reach the line." />
      </div>
      <div class="flex flex-wrap gap-1">
        <WChip v-for="s in STAGES" :key="s.label" clickable :active="Math.abs(points(s.need) - needPoints) < 0.5" :title="`Line at ${pointsText(points(s.need))}`" @click="w.need = s.need">{{ s.label }}</WChip>
      </div>
      <div :class="$style.bar" aria-hidden="true">
        <span v-for="(n, s) in pileSteps" :key="s" :style="{ flexGrow: n, background: STEP_CSS[s] }" />
      </div>
      <div class="flex flex-wrap gap-3 text-xs">
        <span v-for="(n, s) in pileSteps" :key="s" class="flex items-center gap-1">
          <span :class="$style.dot" :style="{ background: STEP_CSS[s] }" />{{ STEP_NAMES[s] }} {{ pct(n) }}
        </span>
      </div>
      <div class="w-faint text-xs">Of {{ pile.length.toLocaleString() }} made-up map rares (rough odds for each mark).</div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <span class="font-semibold">Test rares</span>
        <WInfo text="The same rares every time, one of each kind. Chips are what counts, in points; a faded chip doesn't count (only the biggest mark does, and none on a corrupted or mirrored rare). Left: weights. Right: NeverSink now." />
      </div>
      <div v-if="!samples.length" class="w-faint text-sm">Load a NeverSink filter to see these.</div>
      <div v-for="s in samples" :key="s.spec.label" :class="$style.sample">
        <div class="flex flex-wrap items-center gap-1">
          <span class="w-dim text-xs" :class="$style.sampleName">{{ s.spec.label }}</span>
          <span v-for="t in s.terms" :key="t.key" :class="[$style.chip, { [$style.off]: !t.counts }]" :title="t.counts ? WEIGHT_LABEL[t.key] : `${WEIGHT_LABEL[t.key]}: doesn't count here`">
            {{ CHIP_LABEL[t.key] ?? WEIGHT_LABEL[t.key] }} {{ pointsText(points(w.mult[t.key])) }}
          </span>
          <span :class="$style.total">= {{ pointsText(s.pts) }}</span>
        </div>
        <div :class="$style.labels">
          <span v-item-tip="{ name: s.row.name }" class="flex items-center gap-2 min-w-0">
            <LabelPreview :text="s.row.name" :actions="stepActions(s.step)" :visibility="s.step === 0 ? 'Hide' : 'Show'" :default-text="RARE" />
            <span class="text-xs w-dim">{{ STEP_NAMES[s.step] }}</span>
            <span v-if="s.other" class="text-xs w-faint" :title="'A rule above the weights decides this rare'">· {{ s.other }}</span>
          </span>
          <span v-item-tip="{ name: s.row.name }" class="flex items-center gap-2 min-w-0" :class="$style.ns">
            <span class="text-xs w-faint">NeverSink</span>
            <LabelPreview :text="s.row.name" :actions="s.ns?.actions ?? []" :visibility="s.ns?.visibility ?? 'Show'" :default-text="RARE" :extras="false" />
          </span>
        </div>
      </div>
    </div>

    <div :class="$style.card">
      <div class="flex items-center gap-2">
        <span class="font-semibold">Multipliers</span>
        <WInfo text="Points each one adds or takes away (+10 doubles). Base rank, drop tier, item level, corruption, size and mirrored always count. Of the marks (links, influence, fractured...) only the biggest counts, and only on a rare that isn't corrupted or mirrored." />
        <span class="flex-1" />
        <WButton v-if="changed" size="sm" variant="ghost" icon="fas fa-undo" @click="reset">Defaults</WButton>
      </div>
      <div v-for="g in WEIGHT_GROUPS" :key="g.key" :class="$style.group">
        <div class="w-dim text-xs flex items-center gap-1"><i :class="g.icon" /> {{ g.label }}</div>
        <div v-for="r in g.rows" :key="r.key" :class="[$style.row, { [$style.moved]: w.mult[r.key] !== r.dflt }]">
          <span class="text-sm">{{ r.label }}</span>
          <button type="button" :class="$style.step" :aria-label="`Less for ${r.label}`" @click="nudge(r.key, -1)"><i class="fas fa-minus" /></button>
          <span :class="$style.num" :title="`×${w.mult[r.key]}`">{{ pointsText(points(w.mult[r.key])) }}</span>
          <button type="button" :class="$style.step" :aria-label="`More for ${r.label}`" @click="nudge(r.key, 1)"><i class="fas fa-plus" /></button>
          <span class="w-faint text-xs">×{{ w.mult[r.key] }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Rare weights (beta, weights.ts): the switch, the line, the test rares and
// the multipliers, all for this profile.
import { computed } from 'vue'
import { WButton, WChip, WInfo, WToggle, vItemTip } from '../ui'
import LabelPreview from './LabelPreview.vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import { matchItem } from './match'
import type { Colour } from './edits'
import { MULT_STEPS, NEED_MAX, NEED_MIN, STAGES, STEP_NAMES, WEIGHT_GROUPS, WEIGHT_LABEL, WEIGHT_TYPE, countedTerms, defaultWeights, filterBases, stepActions, stepOf, termsOf, weightOf } from './weights'
import type { Step, WeightKey } from './weights'
import { CHIP_LABEL, SAMPLES, factsOf, fromPoints, itemOf, points, pointsText, sampleBase, samplePile } from './weight-samples'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
}>()

const w = computed(() => props.config.presets.weights)
const RARE: Colour = [255, 255, 119, 255]
const NEED_LO = Math.round(points(NEED_MIN))
const NEED_HI = Math.round(points(NEED_MAX))
const STEP_CSS = ['#3a3a3a', '#8a8a8a', '#d8d877', '#29d2a0', '#e04848']

const needPoints = computed({
  get: () => points(w.value.need),
  set: (p: number) => { if (Number.isFinite(p)) w.value.need = Math.min(NEED_MAX, Math.max(NEED_MIN, Number(fromPoints(p).toPrecision(4)))) }
})

const bases = computed(() => {
  const doc = props.store.doc.value
  return doc ? filterBases(doc) : []
})
const pile = computed(() => samplePile(bases.value))
const pileSteps = computed(() => {
  const out = [0, 0, 0, 0, 0]
  for (const p of pile.value) out[stepOf(weightOf(p.it, w.value.mult), w.value.need)]++
  return out
})
const pct = (n: number) => pile.value.length ? `${(100 * n / pile.value.length).toFixed(n && n * 1000 < pile.value.length ? 1 : 0)}%` : ''

const sizeText = computed(() => {
  const kb = props.store.weightChars.value / 1024
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`
})

const samples = computed(() => {
  const doc = props.store.doc.value
  if (!doc) return []
  // NeverSink as it is now: the same filter without the weights' rules.
  const ns = { ...doc, blocks: doc.blocks.filter(b => b.type !== WEIGHT_TYPE) }
  const m = w.value.mult
  return SAMPLES.flatMap(spec => {
    const row = sampleBase(spec, bases.value)
    if (!row) return []
    const it = itemOf(row, spec.item)
    const counted = new Set(countedTerms(it, m))
    const terms = termsOf(it).map(key => ({ key, counts: counted.has(key) }))
    const weight = weightOf(it, m)
    const facts = factsOf(row, it)
    const nsHit = matchItem(ns, facts)
    let other = ''
    if (w.value.on) {
      const hit = matchItem(doc, facts).final?.block
      if (hit && hit.type !== WEIGHT_TYPE) other = hit.type ? `decided by ${hit.type}` : 'decided by a rule above'
    }
    return [{
      spec,
      row,
      terms,
      pts: points(weight),
      step: stepOf(weight, w.value.need) as Step,
      other,
      ns: nsHit.final ? { actions: nsHit.final.block.actions, visibility: nsHit.visibility } : null
    }]
  })
})

function nudge (key: WeightKey, dir: 1 | -1) {
  const v = w.value.mult[key]
  const next = dir > 0 ? MULT_STEPS.find(x => x > v + 1e-9) : [...MULT_STEPS].reverse().find(x => x < v - 1e-9)
  if (next != null) w.value.mult[key] = next
}

const changed = computed(() => {
  const d = defaultWeights()
  return w.value.need !== d.need || (Object.keys(d.mult) as WeightKey[]).some(k => w.value.mult[k] !== d.mult[k])
})
function reset () {
  const d = defaultWeights()
  w.value.need = d.need
  Object.assign(w.value.mult, d.mult)
}
</script>

<style module>
.wrap {
  max-height: min(36rem, calc(70vh / var(--w-ui-scale, 1)));
  flex: 1 1 auto;
  min-height: 0;
  padding: 8px var(--w-pad) 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
:global([data-w-sized]) .wrap { max-height: none; }
.card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  background: var(--w-panel-2);
  border-radius: var(--w-r-sm);
}
.beta {
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  padding: 0 4px;
}
.slider { flex: 1 1 auto; min-width: 8rem; }
.num { min-width: 2.6rem; text-align: right; font-variant-numeric: tabular-nums; }
.bar {
  display: flex;
  height: 8px;
  border-radius: var(--w-r-sm);
  overflow: hidden;
  background: var(--w-panel);
}
.bar > span { flex-basis: 0; min-width: 0; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.sample {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 5px 0;
  border-top: 1px solid var(--w-line);
}
.sampleName { min-width: 9rem; }
.chip {
  font-size: var(--w-fs-xs);
  padding: 0 5px;
  border-radius: var(--w-r-sm);
  background: var(--w-panel);
  color: var(--w-fg);
  white-space: nowrap;
}
.chip.off { opacity: 0.45; text-decoration: line-through; }
.total { font-size: var(--w-fs-xs); font-variant-numeric: tabular-nums; color: var(--w-dim); }
.labels {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
}
.ns { justify-self: end; }
.group { display: flex; flex-direction: column; gap: 2px; padding-top: 4px; }
.row {
  display: grid;
  grid-template-columns: 1fr auto auto auto 3.2rem;
  gap: 6px;
  align-items: center;
  padding: 1px 4px;
  border-radius: var(--w-r-sm);
}
.row.moved { background: var(--w-panel); }
.step {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--w-r-sm);
  color: var(--w-dim);
}
.step:hover { color: var(--w-fg); background: var(--w-panel); }
</style>
