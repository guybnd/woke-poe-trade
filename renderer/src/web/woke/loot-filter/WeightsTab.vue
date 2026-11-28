<template>
  <div :class="$style.wrap" class="w-scroll" @paste="onPaste">
    <div :class="$style.top">
      <WToggle v-model="w.on">Weights decide endgame gear</WToggle>
      <span :class="$style.beta">Beta</span>
      <WInfo text="Every white, unidentified magic and unidentified rare gear item of item level 68+ gets points: its rarity and base rank, times each thing it has (drop tier, item level, corruption, size, and its biggest mark: links, influence, fractured...). Under the line it hides. Over it, it shows, and its score alone sets how loud: Normal, Big and Beam start at fixed scores you set, whatever the line. Only this profile. Your own rules, build rules and presets still go on top." />
      <span class="w-faint text-xs">{{ w.on ? `${store.weightRules.value.toLocaleString()} rules · ${sizeText}` : 'Off: NeverSink decides' }}</span>
      <span class="flex-1" />
      <WButton v-if="changed" size="sm" variant="ghost" icon="fas fa-undo" @click="reset">Defaults</WButton>
    </div>

    <div :class="$style.ruler">
      <div :class="$style.rulerTop">
        <span class="font-semibold text-sm">Score</span>
        <span class="text-xs w-dim">Every drop gets a score. Under the <b>Line</b> it's hidden. Over it, it shows, and gets bigger at <b>Normal</b>, <b>Big</b> and <b>Beam</b>. Drag the marks; the bars are {{ pile.length.toLocaleString() }} made-up map drops.</span>
      </div>
      <div :class="$style.rulerTop">
        <span class="text-xs w-faint">Line at</span>
        <WChip v-for="st in STAGES" :key="st.label" clickable :active="Math.abs(points(st.need) - needPoints) < 0.5" :title="`Line at ${pointsText(points(st.need))}`" @click="w.need = st.need">{{ st.label }}</WChip>
      </div>
      <div ref="track" :class="$style.track">
        <div :class="$style.hist" aria-hidden="true">
          <span v-for="(b, k) in hist" :key="k" :style="{ height: `${b.h}%`, background: STEP_CSS[b.step], opacity: b.step ? 0.95 : 0.5 }" />
        </div>
        <div :class="$style.band" aria-hidden="true">
          <span v-for="z in zones" :key="z.step" :style="{ left: `${z.x0}%`, width: `${z.x1 - z.x0}%`, color: z.step ? STEP_CSS[z.step] : 'var(--w-faint)', borderColor: STEP_CSS[z.step] }">{{ z.name }}</span>
        </div>
        <div :class="$style.axis" aria-hidden="true">
          <i v-for="t in ticks" :key="t" :style="{ left: `${xOf(t)}%` }">{{ pointsText(t) }}</i>
        </div>
        <button v-for="h in handles" :key="h.key" type="button" :class="[$style.handle, { [$style.lineHandle]: h.key === 'line', [$style.dragging]: drag?.key === h.key, [$style.under]: h.under }]" :style="{ left: `${xOf(h.p)}%`, color: h.color }"
          :aria-label="`${h.name}: ${pointsText(h.p)}`" :title="h.title" @pointerdown="startDrag(h.key, $event)" @keydown.left.prevent="moveHandle(h.key, h.p - 1)" @keydown.right.prevent="moveHandle(h.key, h.p + 1)">
          <b>{{ h.name }} {{ pointsText(h.p) }}</b>
        </button>
      </div>
      <div :class="$style.zones">
        <span v-for="(n, k) in pileSteps" :key="k" :title="`Of ${pile.length.toLocaleString()} made-up map drops`"><span :class="$style.dot" :style="{ background: STEP_CSS[k] }" />{{ STEP_NAMES[k] }} {{ pct(n) }}</span>
      </div>
    </div>

    <div v-if="ownRanks.length" :class="$style.ownRanks">
      <span class="text-xs w-dim">Your ranks</span>
      <span v-for="r in ownRanks" :key="r.name" v-item-tip="{ name: r.name }" :class="$style.ownRank">
        {{ r.name }} <span class="w-faint">{{ RANK_TEXT[r.from] }} →</span> <b>{{ RANK_TEXT[r.to] }}</b>
        <button type="button" :class="$style.step" :aria-label="`Back to the filter's rank for ${r.name}`" @click="setRank(r.name, null)"><i class="fas fa-times" /></button>
      </span>
      <WButton size="sm" variant="ghost" icon="fas fa-undo" @click="w.ranks = {}">Reset all</WButton>
    </div>

    <div :class="$style.split">
      <div :class="$style.left">
        <div :class="$style.cols">
          <div v-for="col in TABLE_COLS" :key="col.label" :class="$style.col">
            <div :class="$style.colHead">{{ col.label }}</div>
            <template v-for="g in col.groups" :key="g.key">
              <div v-if="g.key === 'tier'" :class="$style.group">
                <div :class="$style.groupHead"><i :class="g.icon" /> Drop tier</div>
                <div :class="$style.tierGrid">
                  <span />
                  <span v-for="n in 5" :key="n" :class="$style.tierHead">T{{ n }}</span>
                  <template v-for="tr in TIER_ROWS" :key="tr.label">
                    <span :class="$style.tierLabel">{{ tr.label }}</span>
                    <span v-for="k in tr.keys" :key="k" :class="$style.tierCell" :title="`${tr.label}, ${WEIGHT_LABEL[k]}: ${pointsText(points(w.mult[k]))}`">
                      <span :class="[$style.pts, $style[signOf(k)], { [$style.moved]: moved(k) }]">{{ pointsText(points(w.mult[k])) }}</span>
                      <span :class="$style.cellHov">
                        <button type="button" :class="$style.step" :aria-label="`Less for ${tr.label} ${WEIGHT_LABEL[k]}`" @click="nudge(k, -1)"><i class="fas fa-minus" /></button>
                        <button type="button" :class="$style.step" :aria-label="`More for ${tr.label} ${WEIGHT_LABEL[k]}`" @click="nudge(k, 1)"><i class="fas fa-plus" /></button>
                      </span>
                    </span>
                  </template>
                </div>
              </div>
              <div v-else :class="$style.group">
                <div :class="$style.groupHead"><i :class="g.icon" /> {{ g.label }}</div>
                <div v-for="r in g.rows" :key="r.key" :class="$style.row" :title="`${r.label}: ×${w.mult[r.key]}${moved(r.key) ? ` (default ×${r.dflt})` : ''}`">
                  <button v-if="PIN_ROWS.has(r.key)" type="button" :class="[$style.pin, { [$style.pinned]: w.always.includes(r.key) }]" :aria-pressed="w.always.includes(r.key)"
                    :title="w.always.includes(r.key) ? `Always shown (at least Small): ${r.label}. Click to let the score decide.` : `Always show ${r.label.toLowerCase()}, whatever its score`" @click="togglePin(r.key)"><i class="fas fa-thumbtack" /></button>
                  <span v-else />
                  <span :class="$style.rowName">{{ r.label }}</span>
                  <span :class="[$style.pts, $style[signOf(r.key)], { [$style.moved]: moved(r.key) }]">{{ pointsText(points(w.mult[r.key])) }}</span>
                  <span :class="$style.rowHov">
                    <button type="button" :class="$style.step" :aria-label="`Less for ${r.label}`" @click="nudge(r.key, -1)"><i class="fas fa-minus" /></button>
                    <span :class="$style.hovNum">{{ pointsText(points(w.mult[r.key])) }}</span>
                    <button type="button" :class="$style.step" :aria-label="`More for ${r.label}`" @click="nudge(r.key, 1)"><i class="fas fa-plus" /></button>
                  </span>
                </div>
              </div>
            </template>
          </div>
        </div>

        <div :class="$style.looks">
          <button type="button" :class="$style.fold" :aria-expanded="lookOpen" @click="lookOpen = !lookOpen">
            <i :class="lookOpen ? 'fas fa-caret-down' : 'fas fa-caret-right'" /> <b>Looks</b>
            <span class="w-faint">{{ lookOpen ? '· the first one an item has wins · size, sound and beam follow the score' : `· ${lookSummary}` }}</span>
          </button>
          <template v-if="lookOpen">
            <div v-for="ch in LOOK_CHANNELS" :key="ch.key" :class="[$style.lookLine, { [$style.lookOver]: dragOver === ch.key }]"
              @dragover.prevent="dragOver = ch.key" @dragleave="dragOver === ch.key && (dragOver = null)" @drop.prevent="dropLook(ch.key, null)">
              <span :class="$style.lookName"><b>{{ ch.label }}</b>{{ ch.job }}</span>
              <span :class="$style.lookChips">
                <span v-for="(k, i) in w.look[ch.key]" :key="k" :class="[$style.lookChip, { [$style.lookDead]: deadLook(ch.key, i) }]" draggable="true" :title="lookTitle(ch.key, k, i)"
                  @dragstart="dragKey = k" @dragend="dragKey = null; dragOver = null" @drop.prevent.stop="dropLook(ch.key, i)">
                  <span class="w-faint">{{ i + 1 }}</span><span :class="$style.lookSw" :style="{ background: LOOK_SWATCH[k] }" />{{ LOOK_LABEL[k] }}
                  <button type="button" :class="$style.chipX" :aria-label="`Stop using ${LOOK_LABEL[k]} for ${ch.label.toLowerCase()}`" @click="unuseLook(k)"><i class="fas fa-times" /></button>
                </span>
                <span :class="$style.addWrap">
                  <button v-if="lookList('unused').length" type="button" :class="[$style.lookChip, $style.lookAdd]" :aria-expanded="addTo === ch.key" :title="`Add to ${ch.label.toLowerCase()}`" @click="addTo = addTo === ch.key ? null : ch.key">+</button>
                  <span v-if="addTo === ch.key" :class="$style.addMenu">
                    <button v-for="k in lookList('unused')" :key="k" type="button" @click="addLook(ch.key, k)"><span :class="$style.lookSw" :style="{ background: LOOK_SWATCH[k] }" />{{ LOOK_LABEL[k] }}</button>
                  </span>
                </span>
              </span>
            </div>
          </template>
        </div>
      </div>

      <div :class="$style.right">
        <div :class="$style.source">
          <span :class="$style.seg">
            <button v-for="g in GROUND_SIDES" :key="g.key" type="button" :class="{ [$style.segOn]: side === g.key }" :aria-pressed="side === g.key" @click="side = g.key">{{ g.title }}</button>
          </span>
          <span :class="$style.seg">
            <button type="button" :class="{ [$style.segOn]: source === 'set' }" title="One of each kind of mark, and the mixes" @click="source = 'set'">Test set</button>
            <button type="button" :class="{ [$style.segOn]: source === 'random' }" title="Random map drops, with rough odds for each mark. Click again to reroll." @click="source === 'random' ? reroll() : (source = 'random')">Random <i v-if="source === 'random'" class="fas fa-dice" /></button>
            <button v-if="pasted.length" type="button" :class="{ [$style.segOn]: source === 'pasted' }" title="Only the items you pasted, newest first (they also lie in the other views)" @click="source = 'pasted'">Pasted {{ pasted.length }}</button>
          </span>
          <span class="flex-1" />
          <WButton size="sm" variant="ghost" icon="fas fa-paste" title="Copy an item in game (Ctrl+C), then paste here (Ctrl+V)" @click="pasteFromClipboard">Paste</WButton>
          <WButton v-if="pasted.length" size="sm" variant="ghost" icon="fas fa-times" title="Clear pasted items" @click="pasted = []; source === 'pasted' && (source = 'set')" />
        </div>
        <div v-if="pasteNote" class="text-xs w-faint">{{ pasteNote }}</div>
        <div v-if="!samples.length" class="w-faint text-sm">Load a NeverSink filter to see the test drops.</div>
        <template v-else>
          <div class="text-xs w-dim">{{ ground.shown }} of {{ samples.length }} shown · click a rank chip to lower the base, right-click to raise it</div>
          <div :ref="el => setGround('ground', el as HTMLElement | null)" :class="$style.ground" :style="{ height: `${ground.height}px` }">
            <template v-for="d in ground.placed" :key="'b' + d.i">
              <span v-if="d.beam" :class="$style.beam" :style="{ left: `${d.x + d.w / 2 - 1}px`, height: `${d.y + 2}px`, background: `linear-gradient(to bottom, transparent, ${d.beam})` }" />
            </template>
            <span v-for="d in ground.placed" :key="d.i" v-item-tip="samples[d.i].tip" :data-drop="d.i" :class="[$style.drop, { [$style.ghost]: d.hidden, [$style.on]: d.i === focus }]"
              :style="{ left: `${d.x}px`, top: `${d.y}px`, width: `${d.w}px` }" @mouseenter="focus = d.i" @click="pinned = pinned === d.i ? null : d.i">
              <span :class="$style.tags" data-no-item-tip="marks of the item below, which has its tooltip">
                <span :class="[$style.tag, $style.score]" :style="{ color: STEP_CSS[Math.max(1, samples[d.i].step)], borderColor: STEP_CSS[Math.max(1, samples[d.i].step)] }" :title="`Score ${pointsText(samples[d.i].pts)}, line ${pointsText(needPoints)}: ${STEP_NAMES[samples[d.i].step]}`">{{ pointsText(samples[d.i].pts) }}</span>
                <span v-for="t in samples[d.i].tags" :key="t.key" :class="[$style.tag, $style[signOf(t.key)], { [$style.off]: !t.counts }]"><i :class="ICON_OF[t.key]" />{{ t.text }}</span>
              </span>
              <span :class="$style.labelRow">
                <button type="button" :class="[$style.deco, $style.rankBtn, $style[signOf(samples[d.i].rankKey)], { [$style.own]: samples[d.i].row.was }]" :title="rankTitle(samples[d.i].row)"
                  @click.stop="shiftRank(samples[d.i].row, 1)" @contextmenu.prevent.stop="shiftRank(samples[d.i].row, -1)">{{ RANK_TEXT[samples[d.i].rankKey] }}</button>
                <LabelPreview :text="samples[d.i].row.name" :actions="d.actions" :visibility="d.hidden ? 'Hide' : 'Show'" :default-text="TEXT_OF[samples[d.i].it.rarity ?? 'Rare']" :extras="false" :scale="SCALE" />
                <span :class="$style.deco" :title="samples[d.i].tierText">{{ samples[d.i].tierShort }}</span>
              </span>
            </span>
          </div>
        </template>
        <div v-if="shown" :class="$style.why" data-no-item-tip="the item's name is on the ground above, with its tooltip">
          <span class="text-xs w-dim">{{ shown.row.name }}:</span>
          <span v-for="t in shown.terms" :key="t.key" :class="[$style.chip, $style[signOf(t.key)], { [$style.off]: !t.counts }]" :title="t.counts ? WEIGHT_LABEL[t.key] : `${WEIGHT_LABEL[t.key]}: doesn't count here (only the biggest mark counts, and none on a corrupted or mirrored item)`">
            <i :class="ICON_OF[t.key]" /> {{ CHIP_LABEL[t.key] ?? WEIGHT_LABEL[t.key] }} <b>{{ pointsText(points(w.mult[t.key])) }}</b>
          </span>
          <span :class="$style.total">= <b>{{ pointsText(shown.pts) }}</b> · <span :style="{ color: STEP_CSS[shown.step] }">{{ STEP_NAMES[shown.step] }}</span></span>
          <span v-if="shown.other" class="text-xs w-faint">· {{ shown.other }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Rare weights (beta, weights.ts): the switch, the line, the test rares and
// the multipliers, all for this profile.
import { computed, onBeforeUnmount, onMounted, onUpdated, reactive, ref, shallowRef } from 'vue'
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
import { LOOK_CHANNELS, LOOK_DEFAULT, LOOK_KEYS, LOOK_LABEL, RANK_KEYS, MULT_STEPS, NEED_MAX, multRange, NEED_MIN, STAGES, STEP_NAMES, WEIGHT_GROUPS, WEIGHT_LABEL, WEIGHT_TYPE, countedTerms, defaultWeights, filterBases, weightLook, stepFor, stepOf, PIN_ROWS, termsOf, weightOf } from './weights'
import type { BaseRow, LookChannel, LookKey, RankKey, WeightItem, WeightKey } from './weights'
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
// Beam is blue in the filter (red is kept for sure-profit drops).
const STEP_CSS = ['#3a3a3a', '#8a8a8a', '#d8d877', '#29d2a0', '#5a9cff']

const clampNeed = (p: number) => Math.min(NEED_MAX, Math.max(NEED_MIN, Number(fromPoints(p).toPrecision(4))))
const needPoints = computed({
  get: () => points(w.value.need),
  set: (p: number) => { if (Number.isFinite(p)) w.value.need = clampNeed(p) }
})

// The bases the filter's rules were written from; while off, read from the
// filter as it is.
const bases = computed(() => {
  if (props.store.weightBases.value.length) return props.store.weightBases.value
  const doc = props.store.doc.value
  return doc ? filterBases(doc, w.value.ranks) : []
})
const pile = computed(() => samplePile(bases.value))
type HandleKey = 'line' | 0 | 1 | 2
// While a ruler mark is dragged, only the ruler previews the move; the
// settings (and the filter build) change once on release.
const drag = ref<{ key: HandleKey, p: number } | null>(null)
const view = computed(() => {
  const need = w.value.need
  const loud = [...w.value.loud]
  const d = drag.value
  if (!d) return { need, loud }
  if (d.key === 'line') return { need: clampNeed(d.p), loud }
  loud[d.key] = clampLoud(d.key, d.p)
  return { need, loud }
})
const pileWeights = computed(() => pile.value.map(p => weightOf(p.it, w.value.mult)))
const pileSteps = computed(() => {
  const out = [0, 0, 0, 0, 0]
  const { need, loud } = view.value
  if (!drag.value) for (const p of pile.value) out[stepFor(p.it, w.value)]++
  else for (const x of pileWeights.value) out[stepOf(x, need, loud)]++
  return out
})
const pct = (n: number) => pile.value.length ? `${(100 * n / pile.value.length).toFixed(n && n * 1000 < pile.value.length ? 1 : 0)}%` : ''

const sizeText = computed(() => {
  const kb = props.store.weightChars.value / 1024
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`
})

// What lies on the ground: the fixed test set, or a random roll, plus
// whatever was pasted.
const source = ref<'set' | 'random' | 'pasted'>('set')
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
  if (source.value === 'pasted') return pasted.value
  const base: Drop[] = source.value === 'set'
    ? SAMPLES.flatMap(spec => {
        const row = sampleBase(spec, bases.value)
        return row ? [{ row, it: itemOf(row, spec.item), label: spec.label }] : []
      })
    : samplePile(bases.value, RANDOM_N, seed.value).map(p => ({ ...p, label: 'Random rare' }))
  // Pasted items join the pile (first), they don't replace it.
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
  pasted.value = [{ ...got, label: 'Pasted', facts: { ...facts, areaLevel: 83 } }, ...pasted.value].slice(0, 40)
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
const groundEls = new Map<string, HTMLElement>()
function setGround (key: string, el: HTMLElement | null) {
  observers.get(key)?.disconnect()
  observers.delete(key)
  groundEls.delete(key)
  if (!el) return
  groundEls.set(key, el)
  const ro = new ResizeObserver(() => { widths[key] = el.clientWidth })
  ro.observe(el)
  observers.set(key, ro)
  widths[key] = el.clientWidth
}
onBeforeUnmount(() => { for (const ro of observers.values()) ro.disconnect() })
// Labels are re-measured once the label font has loaded.
const fontsReady = ref(0)
document.fonts?.ready.then(() => { fontsReady.value++ }).catch(() => {})
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
const RANK_TEXT: Partial<Record<WeightKey, string>> = { x1: 'X1', x2: 'X2', r1: 'R1', r2: 'R2', r3: 'R3', r0: 'R–', rj: 'R✕' }

// Your own base ranks: click a label's rank to lower it, right-click to raise.
function setRank (name: string, rank: RankKey | null) {
  const rest = Object.fromEntries(Object.entries(w.value.ranks).filter(([n]) => n !== name))
  w.value.ranks = rank == null ? rest : { ...rest, [name]: rank }
}
function shiftRank (row: BaseRow, dir: 1 | -1) {
  const i = RANK_KEYS.indexOf(row.rank)
  const to = RANK_KEYS[Math.min(RANK_KEYS.length - 1, Math.max(0, i + dir))]
  if (to === row.rank) return
  setRank(row.name, to === (row.was ?? row.rank) && row.was ? null : to)
}
function rankTitle (row: BaseRow): string {
  const own = row.was ? ` (yours; the filter says ${WEIGHT_LABEL[row.was]})` : ''
  return `${row.name}: ${WEIGHT_LABEL[row.rank]}${own}. Click: lower rank. Right-click: higher.`
}
const ownRanks = computed(() => {
  const was = new Map(bases.value.filter(b => b.was).map(b => [b.name, b.was as RankKey]))
  return Object.entries(w.value.ranks).map(([name, to]) => ({ name, to, from: was.get(name) ?? to })).filter(r => r.from !== r.to).sort((a, b) => a.name.localeCompare(b.name))
})

// Places stay put while you tune: each rare gets a slot sized for the
// biggest label, so only its look changes.
// Each slot is the whole drop: the chip row above, the rank and tier chips
// beside and the label. The chips use the app's font and text size, so a
// first guess is checked against what the ground really drew, and a slot
// only ever grows (it settles, and the pile doesn't shuffle as you tune).
const drawn = reactive<Record<string, { w: number, h: number }>>({})
const drawnKey = (x: { row: BaseRow, tags: Array<{ text: string }> }) => `${x.row.name}|${x.tags.map(t => t.text).join('|')}`
function layout (key: string) {
  const width = widths[key] || 420
  const m = fontsReady.value >= 0 ? measure : undefined
  const boxes = samples.value.map(x => {
    const b = labelBox(x.row.name, 45, SCALE, m)
    // Score chip, then each mark: 3px padding a side, icon, 2px between.
    const tagsW = x.tags.reduce((n, t) => n + (m ? m(t.text, 11) : t.text.length * 7) + 22, 40)
    const seen = drawn[drawnKey(x)]
    return { w: Math.ceil(Math.max(b.w + DECO_W * 2, tagsW, seen?.w ?? 0)), h: Math.ceil(Math.max(b.h + TAG_H, seen?.h ?? 0)) }
  })
  return layoutLabels(boxes, width, 220, 3, BEAM_ROOM)
}
function measureDrawn () {
  const el = groundEls.get('ground')
  if (!el) return
  for (const node of el.querySelectorAll<HTMLElement>('[data-drop]')) {
    const x = samples.value[Number(node.dataset.drop)]
    const tags = node.firstElementChild as HTMLElement | null
    const row = node.lastElementChild as HTMLElement | null
    const label = row?.querySelector<HTMLElement>('[data-label-preview] > span')
    if (!x || !tags || !row || !label) continue
    // The label clips its text to the slot, so its scroll width is the real one.
    const labelW = label.scrollWidth + (label.offsetWidth - label.clientWidth)
    const w = Math.ceil(Math.max(tags.scrollWidth, tags.offsetWidth, row.offsetWidth - label.offsetWidth + labelW))
    const h = Math.ceil(Math.max(node.offsetHeight, node.scrollHeight))
    const k = drawnKey(x)
    const was = drawn[k]
    if (!was || w > was.w || h > was.h) drawn[k] = { w: Math.max(w, was?.w ?? 0), h: Math.max(h, was?.h ?? 0) }
  }
}
onMounted(measureDrawn)
onUpdated(measureDrawn)
const GROUND_SIDES = [{ key: 'weights', title: 'Weights' }, { key: 'ns', title: 'NeverSink now' }] as const
const side = ref<'weights' | 'ns'>('weights')
const ground = computed(() => {
  const list = samples.value
  const look = (i: number) => side.value === 'weights'
    ? { actions: weightLook(list[i].it, w.value.look, list[i].step), hidden: list[i].step === 0 }
    : { actions: list[i].ns?.actions ?? [], hidden: list[i].ns?.visibility === 'Hide' }
  const { rects, height } = layout('ground')
  const placed = list.map((_, i) => {
    const l = look(i)
    const effect = readStyle(l.actions).effect
    return { i, ...rects[i], actions: l.actions, hidden: l.hidden, beam: !l.hidden && effect ? poeColour(effect.color) : '' }
  })
  return { height, placed, shown: placed.filter(d => !d.hidden).length }
})

// Each chip wears its group's icon, green when it adds and red when it takes away.
const ICON_OF = Object.fromEntries(WEIGHT_GROUPS.flatMap(g => g.rows.map(x => [x.key, g.icon]))) as Record<WeightKey, string>
const signOf = (k: WeightKey) => w.value.mult[k] > 1 ? 'plus' : w.value.mult[k] < 1 ? 'minus' : 'zero'

// ---- The score ruler: the line and where Normal, Big and Beam start -----------

const LOUD_NAMES = ['Normal', 'Big', 'Beam'] as const
const track = ref<HTMLElement | null>(null)
const range = computed(() => {
  const ps = [needPoints.value, ...w.value.loud.map(points)]
  return { lo: Math.min(-40, Math.floor(Math.min(...ps) / 10) * 10 - 10), hi: Math.max(110, Math.ceil(Math.max(...ps) / 10) * 10 + 10) }
})
const xOf = (p: number) => 100 * (Math.min(range.value.hi, Math.max(range.value.lo, p)) - range.value.lo) / (range.value.hi - range.value.lo)
const ticks = computed(() => {
  const out: number[] = []
  for (let t = Math.ceil(range.value.lo / 20) * 20; t <= range.value.hi; t += 20) out.push(t)
  return out
})
const BINS = 60
const hist = computed(() => {
  const { lo, hi } = range.value
  const n = new Array<number>(BINS).fill(0)
  for (const x of pileWeights.value) {
    const pt = points(x)
    const k = Math.floor((Math.min(hi - 1e-6, Math.max(lo, pt)) - lo) / (hi - lo) * BINS)
    n[k]++
  }
  const top = Math.sqrt(Math.max(1, ...n))
  return n.map((c, k) => ({ h: c ? 6 + 94 * Math.sqrt(c) / top : 2, step: stepOf(fromPoints(lo + (k + 0.5) * (hi - lo) / BINS), view.value.need, view.value.loud) }))
})
// The named stretches under the bars: Hidden, Small, Normal, Big, Beam.
const zones = computed(() => {
  const { lo, hi } = range.value
  const need = points(view.value.need)
  const starts = [lo, need, ...view.value.loud.map(l => Math.max(need, points(l)))]
  return starts.map((x0, step) => ({ step, name: STEP_NAMES[step], x0: xOf(x0), x1: xOf(starts[step + 1] ?? hi) }))
    .filter(z => z.x1 - z.x0 > 0.5)
})
const handles = computed(() => {
  const need = points(view.value.need)
  return [
    { key: 'line' as HandleKey, name: 'Line', p: Math.round(need), color: '#f3d48a', under: false, title: 'Drops under the line are hidden. Drag it, or pick a stage at the top right.' },
    ...LOUD_NAMES.map((name, i) => {
      const p = Math.round(points(view.value.loud[i]))
      return { key: i as HandleKey, name, p, color: STEP_CSS[i + 2], under: p < need, title: p < need ? `${name} starts under the line, so drops get ${name} as soon as they pass the line` : `Drops scoring ${pointsText(p)} or more show as ${name}` }
    })
  ]
})
function clampLoud (key: 0 | 1 | 2, p: number) {
  const l = w.value.loud
  const lo = key > 0 ? l[key - 1] : NEED_MIN
  const hi = key < 2 ? l[key + 1] : NEED_MAX * 64
  return Math.min(hi, Math.max(lo, Number(fromPoints(p).toPrecision(4))))
}
function moveHandle (key: HandleKey, p: number) {
  if (key === 'line') { needPoints.value = p; return }
  const l = [...w.value.loud]
  l[key] = clampLoud(key, p)
  w.value.loud = l
}
function startDrag (key: HandleKey, e: PointerEvent) {
  const el = track.value
  if (!el) return
  const btn = e.currentTarget as HTMLElement
  btn.setPointerCapture(e.pointerId)
  const at = (ev: PointerEvent) => {
    const r = el.getBoundingClientRect()
    const f = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width))
    drag.value = { key, p: Math.round(range.value.lo + f * (range.value.hi - range.value.lo)) }
  }
  const move = (ev: PointerEvent) => at(ev)
  const up = () => {
    const d = drag.value
    drag.value = null
    if (d) moveHandle(d.key, d.p)
    btn.removeEventListener('pointermove', move); btn.removeEventListener('pointerup', up); btn.removeEventListener('pointercancel', up)
  }
  btn.addEventListener('pointermove', move)
  btn.addEventListener('pointerup', up)
  btn.addEventListener('pointercancel', up)
}

// ---- The table: three themes, drop tiers as one small grid --------------------

const GROUP_BY_KEY = new Map(WEIGHT_GROUPS.map(g => [g.key, g]))
const groupsOf = (keys: string[]) => keys.flatMap(k => GROUP_BY_KEY.get(k) ?? [])
const TABLE_COLS = [
  { label: 'The base', groups: groupsOf(['rank', 'rarity', 'size', 'ilvl', 'corr']) },
  { label: 'The drop · what it has', groups: groupsOf(['tier', 'infl', 'special', 'links']) }
]
const TIER_ROWS: Array<{ label: string, keys: WeightKey[] }> = [
  { label: 'Rare', keys: ['t1', 't2', 't3', 't4', 't5'] },
  { label: 'Magic, white', keys: ['mt1', 'mt2', 'mt3', 'mt4', 'mt5'] }
]
const DEFAULT_MULT = defaultWeights().mult
const moved = (k: WeightKey) => w.value.mult[k] !== DEFAULT_MULT[k]

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
  return w.value.need !== d.need || w.value.always.length > 0 || w.value.loud.some((v, i) => v !== d.loud[i]) || lookChanged.value || Object.keys(w.value.ranks).length > 0 || (Object.keys(d.mult) as WeightKey[]).some(k => w.value.mult[k] !== d.mult[k])
})
// Look channels: drag rows to rank them or move them between channels.
type LookCol = LookChannel | 'unused'
const LOOK_SWATCH: Record<LookKey, string> = {
  qual: '#ff7ad9',
  synth: '#6eaaff',
  fract: '#d7b46e',
  infl: '#be78ff',
  eld: '#ff9628',
  abyss: '#3cc88c',
  ench: '#b4e1ff',
  l6: '#ebffeb',
  cruc: '#ff6e3c',
  strand: '#78e6e6',
  l5: '#82eb82',
  fated: '#ffcd82',
  mirr: '#a0c8ff',
  corr: '#5a0000',
  exotic: '#ff8c1a',
  rarity: 'linear-gradient(90deg,#c8c8c8,#8888ff,#ffff77)',
  score: 'linear-gradient(90deg,#232323,#141400,#004b1e,#5a0000)'
}
const dragKey = ref<LookKey | null>(null)
const dragOver = ref<LookCol | null>(null)
function lookList (ch: LookCol): LookKey[] {
  if (ch !== 'unused') return w.value.look[ch]
  const used = new Set(LOOK_CHANNELS.flatMap(c => w.value.look[c.key]))
  return LOOK_KEYS.filter(k => !used.has(k))
}
// Rows under the score step in a channel it always paints never show.
function deadLook (ch: LookCol, i: number): boolean {
  if (ch === 'unused') return false
  const at = w.value.look[ch].indexOf('score')
  return ch === 'bg' && at >= 0 && i > at
}
function lookTitle (ch: LookCol, k: LookKey, i: number): string {
  if (ch === 'unused') return `${LOOK_LABEL[k]}: not used. Drag it onto a channel.`
  if (deadLook(ch, i)) return `${LOOK_LABEL[k]}: under the score step, which always sets the background, so it never shows`
  const at = w.value.look[ch].indexOf('score')
  const over = at > i && k !== 'score' ? ' Above the score step, it doubles the rules or more.' : ''
  return `${LOOK_LABEL[k]}: rank ${i + 1} for ${ch === 'bg' ? 'background' : ch === 'text' ? 'text colour' : 'border'}. Drag to move.${over}`
}
function setLook (next: Record<LookChannel, LookKey[]>) { w.value.look = next }
function without (k: LookKey): Record<LookChannel, LookKey[]> {
  const l = w.value.look
  return { border: l.border.filter(x => x !== k), bg: l.bg.filter(x => x !== k), text: l.text.filter(x => x !== k) }
}
function dropLook (ch: LookCol, at: number | null) {
  const k = dragKey.value
  dragKey.value = null
  dragOver.value = null
  if (!k) return
  const next = without(k)
  if (ch !== 'unused') {
    const list = next[ch]
    // Dropping on a row puts it there (after it when moving down the same list).
    const from = w.value.look[ch].indexOf(k)
    let i = at ?? list.length
    if (at != null && from >= 0 && from < at) i = at
    list.splice(Math.min(i, list.length), 0, k)
  }
  setLook(next)
}
function unuseLook (k: LookKey) { setLook(without(k)) }
const lookOpen = ref(false)
const addTo = ref<LookChannel | null>(null)
function addLook (ch: LookChannel, k: LookKey) {
  const next = without(k)
  next[ch].push(k)
  setLook(next)
  addTo.value = null
}
const lookSummary = computed(() => LOOK_CHANNELS.map(c => {
  const l = w.value.look[c.key]
  return `${c.label.toLowerCase()}: ${l.length ? l.slice(0, 2).map(k => LOOK_LABEL[k].toLowerCase()).join(', ') + (l.length > 2 ? '…' : '') : 'none'}`
}).join(' · '))
const lookChanged = computed(() => LOOK_CHANNELS.some(c => w.value.look[c.key].join() !== LOOK_DEFAULT[c.key].join()))

function reset () {
  const d = defaultWeights()
  w.value.look = d.look
  w.value.ranks = {}
  w.value.need = d.need
  Object.assign(w.value.mult, d.mult)
  w.value.always = []
  w.value.loud = [...d.loud]
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
  container-type: inline-size;
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
  position: relative;
  grid-template-columns: 16px 1fr auto;
  align-items: center;
  gap: 2px;
  font-size: var(--w-fs-xs);
  line-height: 1.5;
  border-radius: var(--w-r-sm);
}
.rowName { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
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
.ownRanks { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; }
.ownRank { display: inline-flex; align-items: center; gap: 3px; font-size: var(--w-fs-xs); background: var(--w-panel-2); border-radius: var(--w-r-sm); padding: 0 2px 0 6px; }
.rankBtn { cursor: pointer; font-family: inherit; border: 0; padding: 0; }
.deco.minus { color: #e08a8a; }
.rankBtn:hover { outline: 1px solid var(--w-accent); }
.own { box-shadow: inset 0 -2px 0 var(--w-accent); }
.lookDead { opacity: 0.45; }
.lookSw { width: 10px; height: 10px; border-radius: 2px; box-shadow: inset 0 0 0 1px #0008; }
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

/* score ruler */
.ruler { background: var(--w-panel-2); border-radius: var(--w-r-sm); padding: 4px 8px 6px; display: flex; flex-direction: column; gap: 2px; }
.rulerTop { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.track { position: relative; height: 98px; margin: 0 6px; touch-action: none; }
.hist { position: absolute; left: 0; right: 0; top: 18px; height: 48px; display: flex; align-items: flex-end; gap: 1px; }
.hist > span { flex: 1 1 0; min-width: 0; border-radius: 1px 1px 0 0; }
.axis { position: absolute; left: 0; right: 0; top: 82px; height: 14px; }
.axis > i { position: absolute; top: 1px; transform: translateX(-50%); font-style: normal; font-size: var(--w-fs-xs); color: var(--w-faint); font-variant-numeric: tabular-nums; white-space: nowrap; }
.handle { position: absolute; top: 0; height: 68px; width: 14px; margin-left: -7px; padding: 0; border: 0; background: none; cursor: ew-resize; z-index: 1; }
.handle::before { content: ''; position: absolute; left: 6px; top: 14px; bottom: 0; width: 2px; background: currentColor; opacity: 0.8; }
.handle > b { position: absolute; top: 0; left: 50%; transform: translateX(-50%); font-size: var(--w-fs-xs); font-weight: 600; white-space: nowrap; line-height: 1.2; padding: 0 3px; border-radius: var(--w-r-sm); background: rgba(0, 0, 0, 0.7); }
.handle:hover::before, .handle:focus-visible::before { opacity: 1; width: 3px; }
.handle:focus-visible { outline: none; }
.handle:focus-visible > b { outline: 1px solid var(--w-accent); }
.lineHandle::before { width: 3px; opacity: 1; }
.dragging > b { outline: 1px solid var(--w-accent); }
.under { opacity: 0.45; }
.band { position: absolute; left: 0; right: 0; top: 66px; height: 14px; }
.band > span { position: absolute; top: 0; height: 100%; border-top: 2px solid; font-size: var(--w-fs-xs); line-height: calc(12px * var(--w-text-scale, 1)); text-align: center; overflow: hidden; white-space: nowrap; text-overflow: clip; opacity: 0.9; }
.lineHandle > b { color: var(--w-fg); border: 1px solid currentColor; }
.zones { display: flex; flex-wrap: wrap; gap: 2px 12px; font-size: var(--w-fs-xs); color: var(--w-dim); }
.zones > span { display: inline-flex; align-items: center; gap: 4px; }

/* table + ground */
.split { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 10px; align-items: start; }
.left { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.right { position: sticky; top: 0; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; align-items: start; }
.col { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.colHead { font-size: var(--w-fs-xs); color: var(--w-faint); text-transform: uppercase; letter-spacing: 0.06em; padding: 0 2px; }
.tierGrid { display: grid; grid-template-columns: auto repeat(5, minmax(0, 1fr)); gap: 2px; align-items: center; font-size: var(--w-fs-xs); }
.tierHead { text-align: center; color: var(--w-faint); }
.tierLabel { color: var(--w-dim); white-space: nowrap; padding-right: 4px; }
.tierCell { position: relative; display: flex; justify-content: center; }
.tierCell .pts { min-width: 0; width: 100%; }
.cellHov, .rowHov { position: absolute; inset: 0; display: none; align-items: center; justify-content: space-between; border-radius: var(--w-r-sm); background: var(--w-panel); box-shadow: 0 0 0 1px var(--w-line); }
.rowHov { left: auto; justify-content: flex-end; gap: 2px; padding-left: 8px; background: linear-gradient(90deg, transparent, var(--w-panel) 8px); box-shadow: none; }
.tierCell:hover .cellHov, .tierCell:focus-within .cellHov, .row:hover .rowHov, .row:focus-within .rowHov { display: flex; }
.hovNum { min-width: 2.2rem; text-align: center; font-variant-numeric: tabular-nums; }
.row:hover { background: var(--w-panel); }
.pts { display: inline-block; min-width: 2.4rem; text-align: center; padding: 0 4px; border-radius: var(--w-r-sm); font-variant-numeric: tabular-nums; background: rgba(255, 255, 255, 0.04); color: var(--w-fg); }
.pts.plus { color: #8fd18a; background: rgba(80, 160, 80, 0.14); }
.pts.minus { color: #e08a7a; background: rgba(200, 80, 60, 0.14); }
.pts.zero { color: var(--w-dim); }
.pts.moved { box-shadow: inset 0 -2px 0 var(--w-accent); }

/* looks */
.looks { display: flex; flex-direction: column; gap: 3px; background: var(--w-panel-2); border-radius: var(--w-r-sm); padding: 3px 6px; }
.fold { display: flex; align-items: center; gap: 5px; border: 0; background: none; padding: 1px 0; color: var(--w-fg); font-size: var(--w-fs-xs); text-align: left; cursor: pointer; min-width: 0; }
.fold > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lookLine { display: grid; grid-template-columns: 7.5rem 1fr; gap: 6px; align-items: start; padding: 2px; border-radius: var(--w-r-sm); outline: 1px dashed transparent; }
.lookLine.lookOver { outline-color: var(--w-accent); }
.lookName { display: flex; flex-direction: column; font-size: var(--w-fs-xs); color: var(--w-faint); line-height: 1.3; }
.lookName > b { color: var(--w-fg); font-weight: 600; }
.lookChips { display: flex; flex-wrap: wrap; gap: 3px; align-items: center; }
.lookChip { position: relative; display: inline-flex; align-items: center; gap: 4px; font-size: var(--w-fs-xs); line-height: 1.5; padding: 0 6px; border-radius: var(--w-r-sm); background: var(--w-panel); border: 1px solid var(--w-line); cursor: grab; white-space: nowrap; }
.chipX { display: none; padding: 0; border: 0; background: none; color: var(--w-faint); cursor: pointer; font-size: var(--w-fs-xs); }
.chipX:hover { color: var(--w-fg); }
.lookChip:hover .chipX, .lookChip:focus-within .chipX { display: inline; }
.addWrap { position: relative; }
.lookAdd { cursor: pointer; color: var(--w-dim); border-style: dashed; }
.lookAdd:hover { color: var(--w-fg); }
.addMenu { position: absolute; left: 0; top: 100%; z-index: 5; margin-top: 2px; display: flex; flex-direction: column; min-width: 9rem; padding: 3px; border-radius: var(--w-r-sm); background: var(--w-panel); border: 1px solid var(--w-line); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5); }
.addMenu > button { display: flex; align-items: center; gap: 5px; border: 0; background: none; color: var(--w-fg); font-size: var(--w-fs-xs); padding: 1px 4px; text-align: left; border-radius: var(--w-r-sm); cursor: pointer; }
.addMenu > button:hover { background: var(--w-panel-2); }

/* segmented buttons */
.seg { display: inline-flex; border: 1px solid var(--w-line); border-radius: var(--w-r-sm); overflow: hidden; }
.seg > button { border: 0; background: none; color: var(--w-dim); font-size: var(--w-fs-xs); padding: 1px 7px; cursor: pointer; white-space: nowrap; }
.seg > button + button { border-left: 1px solid var(--w-line); }
.seg > button:hover { color: var(--w-fg); }
.seg > button.segOn { background: var(--w-panel-2); color: var(--w-fg); box-shadow: inset 0 -2px 0 var(--w-accent); }

@container (max-width: 640px) {
  .split { grid-template-columns: 1fr; }
  .right { position: static; }
}
</style>
