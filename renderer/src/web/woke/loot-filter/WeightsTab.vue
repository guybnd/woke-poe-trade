<template>
  <div :class="$style.wrap" class="w-scroll" @paste="onPaste">
    <div :class="$style.top">
      <WToggle v-model="w.on">Weights decide endgame gear</WToggle>
      <span :class="$style.beta">Beta</span>
      <WInfo text="Every white, unidentified magic and unidentified rare gear item of item level 68+ gets points: its rarity and base rank, times each thing it has (drop tier, item level, corruption, size, and its biggest mark: links, influence, fractured...). Under the line it hides; over it, it shows, louder at +20, +40 and +60 over. Only this profile. Your own rules, build rules and presets still go on top." />
      <span class="w-faint text-xs">{{ w.on ? `${store.weightRules.value.toLocaleString()} rules · ${sizeText}` : 'Off: NeverSink decides' }}</span>
      <span class="flex-1" />
      <WButton v-if="changed" size="sm" variant="ghost" icon="fas fa-undo" @click="reset">Defaults</WButton>
    </div>

    <div :class="$style.grid">
      <div v-for="g in WEIGHT_GROUPS" :key="g.key" :class="$style.group">
        <div :class="$style.groupHead"><i :class="g.icon" /> {{ g.label }}</div>
        <div v-for="r in g.rows" :key="r.key" :class="[$style.row, { [$style.moved]: w.mult[r.key] !== r.dflt }]" :title="`${r.label}: ×${w.mult[r.key]}${w.mult[r.key] !== r.dflt ? ` (default ×${r.dflt})` : ''}`">
          <button v-if="PIN_ROWS.has(r.key)" type="button" :class="[$style.pin, { [$style.pinned]: w.always.includes(r.key) }]" :aria-pressed="w.always.includes(r.key)"
            :title="w.always.includes(r.key) ? `Always shown (at least Small): ${r.label}. Click to let the score decide.` : `Always show ${r.label.toLowerCase()}, whatever its score`" @click="togglePin(r.key)"><i class="fas fa-thumbtack" /></button>
          <span v-else :class="$style.pin" />
          <span :class="$style.rowName">{{ r.label }}</span>
          <button type="button" :class="$style.step" :aria-label="`Less for ${r.label}`" @click="nudge(r.key, -1)"><i class="fas fa-minus" /></button>
          <span :class="$style.num">{{ pointsText(points(w.mult[r.key])) }}</span>
          <button type="button" :class="$style.step" :aria-label="`More for ${r.label}`" @click="nudge(r.key, 1)"><i class="fas fa-plus" /></button>
        </div>
      </div>
    </div>

    <div :class="$style.line">
      <span class="font-semibold text-sm">Line</span>
      <input v-model.lazy.number="needPoints" type="range" :min="NEED_LO" :max="NEED_HI" step="1" :class="$style.slider" aria-label="Points a rare needs to show">
      <span :class="$style.num">{{ pointsText(needPoints) }}</span>
      <WChip v-for="st in STAGES" :key="st.label" clickable :active="Math.abs(points(st.need) - needPoints) < 0.5" :title="`Line at ${pointsText(points(st.need))}`" @click="w.need = st.need">{{ st.label }}</WChip>
    </div>
    <div :class="$style.shares">
      <div :class="$style.bar" aria-hidden="true">
        <span v-for="(n, k) in pileSteps" :key="k" :style="{ flexGrow: n, background: STEP_CSS[k] }" />
      </div>
      <span v-for="(n, k) in pileSteps" :key="k" class="flex items-center gap-1 text-xs" :title="`Of ${pile.length.toLocaleString()} made-up map rares`">
        <span :class="$style.dot" :style="{ background: STEP_CSS[k] }" />{{ STEP_NAMES[k] }} {{ pct(n) }}
      </span>
    </div>

    <div :class="$style.source">
      <WChip clickable :active="source === 'set'" title="One of each kind of mark, and the mixes" @click="source = 'set'">Test set</WChip>
      <WChip clickable :active="source === 'random'" title="Random map rares, with rough odds for each mark" @click="source === 'random' ? reroll() : (source = 'random')">Random</WChip>
      <WButton v-if="source === 'random'" size="sm" variant="ghost" icon="fas fa-dice" @click="reroll">Reroll</WButton>
      <WButton size="sm" variant="ghost" icon="fas fa-paste" title="Copy a rare in game (Ctrl+C), then paste here (Ctrl+V)" @click="pasteFromClipboard">Paste item</WButton>
      <span v-if="pasted.length" class="text-xs w-dim">{{ pasted.length }} pasted</span>
      <WButton v-if="pasted.length" size="sm" variant="ghost" icon="fas fa-times" @click="pasted = []">Clear pasted</WButton>
      <span v-if="pasteNote" class="text-xs w-faint">{{ pasteNote }}</span>
    </div>
    <div v-if="!samples.length" class="w-faint text-sm">Load a NeverSink filter to see the test rares.</div>
    <div v-else :class="$style.grounds">
      <div v-for="side in grounds" :key="side.key" :class="$style.side">
        <div class="text-xs w-dim">{{ side.title }} · {{ side.shown }} of {{ samples.length }} shown</div>
        <div :ref="el => setGround(side.key, el as HTMLElement | null)" :class="$style.ground" :style="{ height: `${side.height}px` }">
          <template v-for="d in side.placed" :key="'b' + d.i">
            <span v-if="d.beam" :class="$style.beam" :style="{ left: `${d.x + d.w / 2 - 1}px`, height: `${d.y + 2}px`, background: `linear-gradient(to bottom, transparent, ${d.beam})` }" />
          </template>
          <span v-for="d in side.placed" :key="d.i" v-item-tip="samples[d.i].tip" :class="[$style.drop, { [$style.ghost]: d.hidden, [$style.on]: d.i === focus }]"
            :style="{ left: `${d.x}px`, top: `${d.y}px`, width: `${d.w}px` }" @mouseenter="focus = d.i" @click="pinned = pinned === d.i ? null : d.i">
            <span :class="$style.tags" data-no-item-tip="marks of the rare below, which has its tooltip">
              <span :class="[$style.tag, $style.score]" :style="{ color: STEP_CSS[Math.max(1, samples[d.i].step)], borderColor: STEP_CSS[Math.max(1, samples[d.i].step)] }" :title="`Score ${pointsText(samples[d.i].pts)}, line ${pointsText(needPoints)}: ${STEP_NAMES[samples[d.i].step]}`">{{ pointsText(samples[d.i].pts) }}</span>
              <span v-for="t in samples[d.i].tags" :key="t.key" :class="[$style.tag, $style[signOf(t.key)], { [$style.off]: !t.counts }]"><i :class="ICON_OF[t.key]" />{{ t.text }}</span>
            </span>
            <span :class="$style.labelRow">
              <span :class="[$style.deco, $style[signOf(samples[d.i].rankKey)]]" :title="WEIGHT_LABEL[samples[d.i].rankKey]">{{ RANK_TEXT[samples[d.i].rankKey] }}</span>
              <LabelPreview :text="samples[d.i].row.name" :actions="d.actions" :visibility="d.hidden ? 'Hide' : 'Show'" :default-text="TEXT_OF[samples[d.i].it.rarity ?? 'Rare']" :extras="false" :scale="SCALE" />
              <span :class="$style.deco" :title="samples[d.i].tierText">{{ samples[d.i].tierShort }}</span>
            </span>
          </span>
        </div>
      </div>
    </div>
    <div v-if="shown" :class="$style.why" data-no-item-tip="the rare's name is on the ground above, with its tooltip">
      <span class="text-xs w-dim">{{ shown.spec.label }}:</span>
      <span v-for="t in shown.terms" :key="t.key" :class="[$style.chip, $style[signOf(t.key)], { [$style.off]: !t.counts }]" :title="t.counts ? WEIGHT_LABEL[t.key] : `${WEIGHT_LABEL[t.key]}: doesn't count here (only the biggest mark counts, and none on a corrupted or mirrored rare)`">
        <i :class="ICON_OF[t.key]" /> {{ CHIP_LABEL[t.key] ?? WEIGHT_LABEL[t.key] }} <b>{{ pointsText(points(w.mult[t.key])) }}</b>
      </span>
      <span :class="$style.total">= <b>{{ pointsText(shown.pts) }}</b> · <span :style="{ color: STEP_CSS[shown.step] }">{{ STEP_NAMES[shown.step] }}</span></span>
      <span v-if="shown.other" class="text-xs w-faint">· {{ shown.other }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// Rare weights (beta, weights.ts): the switch, the line, the test rares and
// the multipliers, all for this profile.
import { computed, reactive, ref, shallowRef } from 'vue'
import { WButton, WChip, WInfo, WToggle, vItemTip } from '../ui'
import LabelPreview from './LabelPreview.vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import { matchItem } from './match'
import { labelBox, layoutLabels } from './shower'
import { readStyle } from './edits'
import { poeColour } from './colours'
import { ruleLabel } from './parse'
import type { Colour } from './edits'
import { MULT_STEPS, NEED_MAX, multRange, NEED_MIN, STAGES, STEP_NAMES, WEIGHT_GROUPS, WEIGHT_LABEL, WEIGHT_TYPE, countedTerms, defaultWeights, filterBases, weightLook, stepFor, PIN_ROWS, termsOf, weightOf } from './weights'
import type { BaseRow, WeightItem, WeightKey } from './weights'
import { itemFacts } from './item-facts'
import type { ItemFacts } from './item-facts'
import { CHIP_LABEL, SAMPLES, pastedRare, sampleTip, factsOf, fromPoints, itemOf, points, pointsText, sampleBase, samplePile } from './weight-samples'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
}>()

const w = computed(() => props.config.presets.weights)
// The game's label colour for each rarity.
const TEXT_OF: Record<string, Colour> = { Rare: [255, 255, 119, 255], Magic: [136, 136, 255, 255], Normal: [200, 200, 200, 255] }
const NEED_LO = Math.round(points(NEED_MIN))
const NEED_HI = Math.round(points(NEED_MAX))
const STEP_CSS = ['#3a3a3a', '#8a8a8a', '#d8d877', '#29d2a0', '#e04848']

const needPoints = computed({
  get: () => points(w.value.need),
  set: (p: number) => { if (Number.isFinite(p)) w.value.need = Math.min(NEED_MAX, Math.max(NEED_MIN, Number(fromPoints(p).toPrecision(4)))) }
})

// The bases the filter's rules were written from; while off, read from the
// filter as it is.
const bases = computed(() => {
  if (props.store.weightBases.value.length) return props.store.weightBases.value
  const doc = props.store.doc.value
  return doc ? filterBases(doc) : []
})
const pile = computed(() => samplePile(bases.value))
const pileSteps = computed(() => {
  const out = [0, 0, 0, 0, 0]
  for (const p of pile.value) out[stepFor(p.it, w.value)]++
  return out
})
const pct = (n: number) => pile.value.length ? `${(100 * n / pile.value.length).toFixed(n && n * 1000 < pile.value.length ? 1 : 0)}%` : ''

const sizeText = computed(() => {
  const kb = props.store.weightChars.value / 1024
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`
})

// What lies on the ground: the fixed test set, or a random roll, plus
// whatever was pasted.
const source = ref<'set' | 'random'>('set')
const seed = ref(11)
const RANDOM_N = 40
interface Drop { row: BaseRow, it: WeightItem, label: string, facts?: ItemFacts }
const pasted = shallowRef<Drop[]>([])
const pasteNote = ref('')
function reroll () {
  source.value = 'random'
  seed.value = (seed.value * 48271) % 2147483647
}
const drops = computed<Drop[]>(() => {
  const base: Drop[] = source.value === 'set'
    ? SAMPLES.flatMap(spec => {
        const row = sampleBase(spec, bases.value)
        return row ? [{ row, it: itemOf(row, spec.item), label: spec.label }] : []
      })
    : samplePile(bases.value, RANDOM_N, seed.value).map(p => ({ ...p, label: 'Random rare' }))
  return [...pasted.value, ...base]
})
function addPasted (text: string) {
  const facts = itemFacts(text, null)
  const got = pastedRare(facts, bases.value)
  if (!got) {
    pasteNote.value = facts.baseType ? `${facts.rarity !== 'Rare' ? 'Not a rare' : 'Base not in the table'}: ${facts.baseType}` : 'No item text on the clipboard'
    return
  }
  pasteNote.value = ''
  pasted.value = [{ ...got, label: 'Pasted', facts: { ...facts, areaLevel: 83 } }, ...pasted.value].slice(0, 20)
}
function onPaste (e: ClipboardEvent) {
  const t = (e.target as HTMLElement | null)?.tagName
  if (t === 'INPUT' || t === 'TEXTAREA') return
  const text = e.clipboardData?.getData('text/plain') ?? ''
  if (text) { e.preventDefault(); addPasted(text) }
}
async function pasteFromClipboard () {
  try { addPasted(await navigator.clipboard.readText()) } catch { pasteNote.value = 'Could not read the clipboard: press Ctrl+V here instead' }
}

const samples = computed(() => {
  const doc = props.store.doc.value
  if (!doc) return []
  // NeverSink as it is now: the same filter without the weights' rules.
  const ns = { ...doc, blocks: doc.blocks.filter(b => b.type !== WEIGHT_TYPE) }
  const m = w.value.mult
  return drops.value.flatMap(d => {
    const { row, it, label } = d
    const spec = { label }
    const counted = new Set(countedTerms(it, m))
    const terms = termsOf(it).map(key => ({ key, counts: counted.has(key) }))
    const weight = weightOf(it, m)
    const facts = d.facts ?? factsOf(row, it)
    const nsHit = matchItem(ns, facts)
    let other = ''
    if (w.value.on) {
      const hit = matchItem(doc, facts).final?.block
      if (hit && hit.type !== WEIGHT_TYPE) other = `decided by ${ruleLabel(hit.type, hit.tier)}`
    }
    const tags = terms.filter(t => TAG_TEXT[t.key] != null).map(t => ({ ...t, text: TAG_TEXT[t.key] === '' ? String(it.itemLevel) : TAG_TEXT[t.key] as string }))
    return [{
      tip: sampleTip(row, it),
      tags,
      rankKey: it.rank as WeightKey,
      tierShort: it.tier ? `T${it.tier}` : 'T–',
      tierText: it.tier ? `Unidentified (Tier ${it.tier})` : 'No drop tier (counted as tier 1)',
      it,
      spec,
      row,
      terms,
      pts: points(weight),
      step: stepFor(it, w.value),
      other,
      ns: nsHit.final ? { actions: nsHit.final.block.actions, visibility: nsHit.visibility } : null
    }]
  })
})

// ---- The ground: the test rares dropped like the Preview tab's pile ----------

const SCALE = 0.95
const focus = ref(0)
const pinned = ref<number | null>(null)
const shown = computed(() => samples.value[pinned.value ?? focus.value] ?? null)

const widths = reactive<Record<string, number>>({})
const observers = new Map<string, ResizeObserver>()
function setGround (key: string, el: HTMLElement | null) {
  observers.get(key)?.disconnect()
  observers.delete(key)
  if (!el) return
  const ro = new ResizeObserver(() => { widths[key] = el.clientWidth })
  ro.observe(el)
  observers.set(key, ro)
  widths[key] = el.clientWidth
}
const ctx = document.createElement('canvas').getContext('2d')
function measure (text: string, px: number): number {
  if (!ctx) return text.length * px * 0.68
  ctx.font = `${px}px FontinSmallCaps, FrizQuadrataC, Georgia, serif`
  return ctx.measureText(text).width
}
const BEAM_ROOM = 34
// What sits around each label: marks above (item level, links, influence...),
// the base rank before the name and the drop tier after it.
const TAG_H = 13
const DECO_W = 22
// '' = the item level itself.
const TAG_TEXT: Partial<Record<WeightKey, string>> = {
  wm: 'Magic',
  wn: 'White',
  w86: 'Craft 86',
  i68: '',
  i75: '',
  i83: '',
  i86: '',
  cp: 'Corr',
  ci: 'Corr imp',
  dc: 'Corr ×2',
  l4: '4L',
  l5: '5L',
  l6: '6L',
  rgb: 'RGB',
  infl: 'Infl',
  eld: 'Eldritch',
  qual: 'Q',
  fract: 'Frac',
  synth: 'Synth',
  fated: 'Fated',
  ench: 'Ench',
  strand: 'Strands',
  cruc: 'Crucible',
  abyss: 'Abyss',
  mirr: 'Mirror',
  old: 'Old',
  big: 'Big',
  tiny: 'Tiny'
}
const RANK_TEXT: Partial<Record<WeightKey, string>> = { x1: 'X1', x2: 'X2', r1: 'R1', r2: 'R2', r3: 'R3', r0: 'R–' }

// Places stay put while you tune: each rare gets a slot sized for the
// biggest label, so only its look changes.
function layout (key: string) {
  const width = widths[key] || 420
  const boxes = samples.value.map(x => {
    const b = labelBox(x.row.name, 45, SCALE, measure)
    const tagsW = x.tags.reduce((n, t) => n + measure(t.text, 9) + 18, 30)
    return { w: Math.ceil(Math.max(b.w + DECO_W * 2, tagsW)), h: b.h + TAG_H }
  })
  return layoutLabels(boxes, width, 220, 3, BEAM_ROOM)
}
const grounds = computed(() => {
  const list = samples.value
  return [
    { key: 'weights', title: 'Weights', look: (i: number) => ({ actions: weightLook(list[i].it, w.value.mult, list[i].step), hidden: list[i].step === 0 }) },
    { key: 'ns', title: 'NeverSink now', look: (i: number) => ({ actions: list[i].ns?.actions ?? [], hidden: list[i].ns?.visibility === 'Hide' }) }
  ].map(side => {
    const { rects, height } = layout(side.key)
    const placed = list.map((_, i) => {
      const l = side.look(i)
      const effect = readStyle(l.actions).effect
      return { i, ...rects[i], actions: l.actions, hidden: l.hidden, beam: !l.hidden && effect ? poeColour(effect.color) : '' }
    })
    return { key: side.key, title: side.title, height, placed, shown: placed.filter(d => !d.hidden).length }
  })
})

// Each chip wears its group's icon, green when it adds and red when it takes away.
const ICON_OF = Object.fromEntries(WEIGHT_GROUPS.flatMap(g => g.rows.map(x => [x.key, g.icon]))) as Record<WeightKey, string>
const signOf = (k: WeightKey) => w.value.mult[k] > 1 ? 'plus' : w.value.mult[k] < 1 ? 'minus' : 'zero'

function togglePin (key: WeightKey) {
  const a = w.value.always
  w.value.always = a.includes(key) ? a.filter(k => k !== key) : [...a, key]
}

function nudge (key: WeightKey, dir: 1 | -1) {
  const v = w.value.mult[key]
  const [lo, hi] = multRange(w.value.mult, key)
  const next = dir > 0 ? MULT_STEPS.find(x => x > v + 1e-9) : [...MULT_STEPS].reverse().find(x => x < v - 1e-9)
  if (next != null) w.value.mult[key] = Math.min(hi, Math.max(lo, next))
}

const changed = computed(() => {
  const d = defaultWeights()
  return w.value.need !== d.need || w.value.always.length > 0 || (Object.keys(d.mult) as WeightKey[]).some(k => w.value.mult[k] !== d.mult[k])
})
function reset () {
  const d = defaultWeights()
  w.value.need = d.need
  Object.assign(w.value.mult, d.mult)
  w.value.always = []
}
</script>

<style module>
.wrap {
  max-height: min(40rem, calc(78vh / var(--w-ui-scale, 1)));
  flex: 1 1 auto;
  min-height: 0;
  padding: 6px var(--w-pad) 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
:global([data-w-sized]) .wrap { max-height: none; }
.top { display: flex; align-items: center; gap: 8px; }
.beta {
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  padding: 0 4px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 6px;
  align-items: start;
}
.group {
  background: var(--w-panel-2);
  border-radius: var(--w-r-sm);
  padding: 4px 6px;
}
.groupHead {
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  display: flex;
  align-items: center;
  gap: 4px;
  padding-bottom: 2px;
}
.row {
  display: grid;
  grid-template-columns: 14px 1fr 16px 2.2rem 16px;
  align-items: center;
  gap: 2px;
  font-size: var(--w-fs-xs);
  line-height: 1.5;
  border-radius: var(--w-r-sm);
}
.rowName { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row.moved { background: var(--w-panel); }
.row.moved .num { color: var(--w-accent); }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.step {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--w-r-sm);
  color: var(--w-faint);
  font-size: var(--w-fs-xs);
}
.step:hover { color: var(--w-fg); background: var(--w-panel); }
.line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.slider { flex: 1 1 10rem; min-width: 8rem; }
.shares { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.bar {
  display: flex;
  flex: 1 1 8rem;
  height: 6px;
  border-radius: var(--w-r-sm);
  overflow: hidden;
  background: var(--w-panel);
}
.bar > span { flex-basis: 0; min-width: 0; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.grounds { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.side { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.ground {
  position: relative;
  overflow: hidden;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line);
  background:
    radial-gradient(ellipse at 30% 60%, rgba(90, 80, 60, 0.35), transparent 60%),
    radial-gradient(ellipse at 75% 30%, rgba(60, 70, 80, 0.3), transparent 55%),
    linear-gradient(160deg, #24221d, #191814 60%, #1f1d18);
}
.pin {
  flex: 0 0 auto;
  width: 14px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--w-faint);
  opacity: 0.35;
  cursor: pointer;
  font-size: var(--w-fs-xs);
}
.pin:hover { opacity: 0.8; }
.pin.pinned { color: var(--w-accent); opacity: 1; }
.source { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.drop {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}
.tags { display: flex; justify-content: center; gap: 2px; height: 13px; line-height: calc(12px * var(--w-text-scale, 1)); white-space: nowrap; }
.tag {
  font-size: var(--w-fs-xs);
  padding: 0 3px;
  border-radius: var(--w-r-sm);
  background: rgba(0, 0, 0, 0.55);
  color: var(--w-dim);
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.tag i { font-size: var(--w-fs-xs); opacity: 0.8; }
.tag.plus { color: #8fd18a; }
.score { font-weight: 600; border: 1px solid; }
.tag.minus { color: #e08a7a; }
.tag.off { opacity: 0.5; text-decoration: line-through; }
.labelRow { display: flex; align-items: center; justify-content: center; gap: 2px; min-width: 0; }
.deco {
  flex: 0 0 auto;
  width: 20px;
  text-align: center;
  font-size: var(--w-fs-xs);
  line-height: calc(13px * var(--w-text-scale, 1));
  border-radius: var(--w-r-sm);
  background: rgba(0, 0, 0, 0.6);
  color: var(--w-fg);
  font-variant-numeric: tabular-nums;
}
.deco.plus { color: #8fd18a; }
.deco.zero { color: var(--w-dim); }
.drop:hover, .drop.on { filter: brightness(1.25); z-index: 2; }
.drop.on { outline: 1px solid var(--w-accent); outline-offset: 1px; }
.ghost { filter: grayscale(0.6); opacity: 0.55; }
.beam {
  position: absolute;
  top: 0;
  width: 3px;
  opacity: 0.85;
  pointer-events: none;
}
.why { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; min-height: 1.4rem; }
.chip {
  font-size: var(--w-fs-xs);
  padding: 0 5px;
  border-radius: var(--w-r-sm);
  background: var(--w-panel-2);
  color: var(--w-fg);
  white-space: nowrap;
}
.chip i { font-size: var(--w-fs-xs); opacity: 0.8; }
.chip.plus { color: #8fd18a; background: rgba(80, 160, 80, 0.16); }
.chip.minus { color: #e08a7a; background: rgba(200, 80, 60, 0.16); }
.chip.zero { color: var(--w-dim); }
.chip.off { opacity: 0.45; text-decoration: line-through; }
.total { font-size: var(--w-fs-xs); font-variant-numeric: tabular-nums; color: var(--w-dim); }
</style>
