<template>
  <div :class="$style.wrap" class="w-scroll">
    <div :class="$style.top">
      <WToggle v-model="c.on">{{ kind === 'currency' ? 'Prices decide endgame currency' : `Prices decide endgame currency and ${KIND_NAME[kind]}` }}</WToggle>
      <span :class="$style.beta">Beta</span>
      <WInfo text="In maps (area level 68+), each pile of currency, essences, fossils, oils, delirium orbs, omens, tattoos and ducats counts as its poe.ninja price × stack (10 Chaos is 10c); an item whose full stack is worth less than Decent counts × stack^0.75, so piles of cheap shards stay quiet. Under the line it hides; over it it shows Small, and Normal, Decent, Big and Tink start at the prices you set; untick Show on a step to hide everything that would get it. Each category has its own Strictness (×1.25 a notch on top of the main one); click an item to set its step, price, supply stack or look by hand. Items with no price get a guess from NeverSink's tier (est.). Only this profile. Your own rules, build rules and presets still go on top. In maps these rules replace NeverSink's for these items, so price moves and tier edits for them apply only below area level 68." />
      <span class="w-faint text-xs">{{ statusText }}</span>
      <span class="flex-1" />
      <WButton v-if="changed" size="sm" variant="ghost" icon="fas fa-undo" title="Line, step prices and category strictness back to the start; your item edits stay" @click="reset">Defaults</WButton>
    </div>

    <div :class="$style.minBar" data-currency-min>
      <span :class="$style.minLab">Strictness</span>
      <input type="range" :min="MULT_MIN" :max="MULT_MAX" step="0.05" :value="dragMult ?? mult" :class="$style.range" aria-label="Strictness: every step's price times this"
        @input="dragMult = Number(($event.target as HTMLInputElement).value)"
        @change="c.mult = Number(($event.target as HTMLInputElement).value); dragMult = null">
      <b :class="$style.minVal">×{{ (dragMult ?? mult).toFixed(2) }}</b>
      <WButton v-if="c.mult != null" size="sm" variant="ghost" icon="fas fa-undo" :title="`Back to ×${strictMult(level).toFixed(2)}, from NeverSink's ${LEVEL_NAMES[level]}`" @click="c.mult = null">Follow {{ LEVEL_NAMES[level] }}</WButton>
      <span v-else class="w-faint text-xs">follows {{ LEVEL_NAMES[level] }}</span>
      <span class="flex-1" />
      <button type="button" :class="$style.hidChip" title="List the items that never show" data-currency-hidden @click="only = 'hidden'">{{ rows.length - shownCount }} of {{ rows.length }} never show</button>
    </div>

    <slot name="extra" />

    <StepRuler :c="c" :eff="eff" :cat="sampleCat" :faint-look="faintSample" :faint-on="c.faint.on" :edit="stepEdit" :samples="stepSample"
      @edit="s => stepEdit = s" @set="setShown" />

    <div v-if="stepEdit === 0" :class="$style.stepEd" data-currency-step-editor>
      <div :class="$style.stepEdHead">
        <b>Faint</b>
        <label :class="$style.offTog"><input type="checkbox" :checked="c.faint.on" aria-label="Show Faint" data-loot-faint @change="c.faint = { ...c.faint, on: !c.faint.on }"> Show</label>
        <label :class="$style.offTog" data-loot-faint-until>while Strictness is under
          <select :value="c.faint.until" :class="$style.sel2" aria-label="Faint shows while Strictness is under this" :disabled="!c.faint.on" @change="c.faint = { ...c.faint, until: Number(($event.target as HTMLSelectElement).value) }">
            <option v-for="u in FAINT_UNTILS" :key="u.v" :value="u.v">{{ u.label }}</option>
          </select></label>
        <span v-if="c.faint.on && !faintActive" class="w-faint text-xs">off now</span>
      </div>
    </div>
    <div v-else-if="stepEdit" :class="$style.stepEd" data-currency-step-editor>
      <div :class="$style.stepEdHead">
        <b>{{ CSTEP_NAMES[stepEdit] }}</b>
        <label v-if="stepEdit <= 4" :class="$style.offTog"><input type="checkbox" :checked="!c.off.includes(stepEdit)" :aria-label="`Show ${CSTEP_NAMES[stepEdit]}`" @change="toggleOff(stepEdit)"> Show</label>
        <span class="flex-1" />
        <WButton size="sm" variant="ghost" icon="fas fa-undo" :disabled="!c.steps[stepEdit]" @click="setStepLook(stepEdit, null)">Back to built-in</WButton>
      </div>
      <div :class="$style.samples">
        <LabelPreview v-for="cat in SAMPLE_CATS" :key="cat" :text="catArt(cat)" :actions="[]" :style-override="currencyFullLook(stepEdit, cat, c)" visibility="Show" :extras="false" :scale="0.8" />
      </div>
      <StyleEditor look-only no-colours :look="currencyFullLook(stepEdit, SAMPLE_CATS[0], c)" visibility="Show" :preview-text="catArt(SAMPLE_CATS[0])"
        @patch="p => setStepLook(stepEdit!, { ...c.steps[stepEdit!], ...loudOnly(p) })" />
    </div>

    <CurrencyPile v-if="baseItems.length" :items="items" :cfg="eff" :faint="faintActive" @go="goTo" />

    <div :class="$style.tools">
      <input v-model="query" type="search" placeholder="Find an item" :class="$style.search" aria-label="Find an item">
      <WChip clickable :active="only === 'all'" @click="only = 'all'">All {{ rows.length }}</WChip>
      <WChip clickable :active="only === 'shown'" @click="only = 'shown'">Can show {{ shownCount }}</WChip>
      <WChip clickable :active="only === 'hidden'" @click="only = 'hidden'">Always hidden {{ rows.length - shownCount }}</WChip>
      <WChip clickable :active="only === 'edited'" @click="only = 'edited'">Edited {{ editedCount }}</WChip>
    </div>

    <div v-if="!rows.length" class="w-faint text-sm">{{ emptyText }}</div>
    <div v-for="g in groups" v-else :key="g.cat.id" :class="$style.cat" :data-currency-cat="g.cat.id">
      <div :class="$style.catHead" role="button" tabindex="0" :aria-expanded="isOpen(g.cat.id)" @click="toggle(g.cat.id)" @keydown.enter.prevent="toggle(g.cat.id)" @keydown.space.prevent="toggle(g.cat.id)">
        <i class="fas text-xs w-dim" :class="isOpen(g.cat.id) ? 'fa-chevron-down' : 'fa-chevron-right'" />
        <WIcon :item="g.cat.art" size="sm" />
        <span :class="$style.catName">{{ g.cat.name }}</span>
        <span v-if="g.edited" :class="$style.edited">{{ g.edited }} edited</span>
        <span :class="$style.count">{{ g.shown }} of {{ g.all }} show</span>
        <span :class="$style.dots" aria-hidden="true"><i v-for="r in g.rows" :key="r.it.name" :style="{ background: STEP_CSS[r.one] }" /></span>
        <span class="flex-1" />
        <span :class="$style.secMode" data-loot-section-mode @click.stop @keydown.stop>
          <WSegmented :model-value="sectionMode(c, g.cat.id)" :options="SECTION_MODES" role="group" :aria-label="`${g.cat.name}: Off, Weighted or Always`" @update:model-value="v => setCatMode(g.cat.id, v)" />
        </span>
        <label :class="$style.whole" :title="`${g.cat.name}' own strictness: multiplies every step's price for them, on top of the main Strictness`" @click.stop @keydown.stop>Strictness
          <select :value="c.nudge[g.cat.id] ?? 0" :class="$style.sel2" :aria-label="`${g.cat.name} strictness`" @change="setNudge(g.cat.id, Number(($event.target as HTMLSelectElement).value))">
            <option v-for="n in NUDGES" :key="n" :value="n">×{{ (1.25 ** n).toFixed(2) }} · Small {{ chaosText(eff.line * 1.25 ** n) }}</option>
          </select></label>
      </div>
      <div v-if="isOpen(g.cat.id)" :class="$style.catBody" role="table" :aria-label="`${g.cat.name} and when they show`">
        <div :class="$style.catLook" data-currency-cat-look>
          <span :class="$style.lookLab">Look</span>
          <span :class="$style.catSample" :title="`How a Normal ${g.cat.name} label looks`"><LabelPreview :text="catArt(g.cat.id)" :actions="[]" :style-override="currencyFullLook(2, g.cat.id, c)" visibility="Show" :extras="false" :scale="0.75" /></span>
          <span :class="$style.lookLab">Colour</span>
          <input type="color" :value="hexOf(catColour(g.cat.id, c).rgb)" :class="$style.swatch" :aria-label="`${g.cat.name} colour`" :title="`${g.cat.name} colour`"
            @change="setCatLook(g.cat.id, { text: [...rgbOf(($event.target as HTMLInputElement).value), 255] })">
          <span :class="$style.lookLab" title="Map icon and beam">Icon</span>
          <select :value="catColour(g.cat.id, c).shape" :class="$style.sel2" :aria-label="`${g.cat.name} map icon shape`" :title="`${g.cat.name} map icon shape`"
            @change="setCatIcon(g.cat.id, { shape: ($event.target as HTMLSelectElement).value })">
            <option v-for="sh in ICON_SHAPES" :key="sh" :value="sh">{{ shapeGlyph(sh) }} {{ sh }}</option>
          </select>
          <select :value="catColour(g.cat.id, c).color" :class="$style.sel2" :aria-label="`${g.cat.name} map icon and beam colour`" :title="`${g.cat.name} map icon and beam colour`"
            @change="setCatIcon(g.cat.id, { color: ($event.target as HTMLSelectElement).value })">
            <option v-for="col in POE_COLOURS" :key="col" :value="col" :style="{ color: col.toLowerCase() }">● {{ col }}</option>
          </select>
          <button v-if="c.cats[g.cat.id]" type="button" class="w-icon-btn" :title="`${g.cat.name} back to its own colours`" :aria-label="`Reset ${g.cat.name} colours`" @click="setCatLook(g.cat.id, null)"><i class="fas fa-undo" /></button>
        </div>
        <template v-for="sg in g.subs" :key="sg.id">
        <div v-if="sg.name" :class="$style.subHead" :data-currency-sub="sg.name">
          <span :class="$style.subFold" role="button" tabindex="0" :aria-expanded="isOpen(`${g.cat.id}/${sg.name}`)"
            @click="toggle(`${g.cat.id}/${sg.name}`)" @keydown.enter.prevent="toggle(`${g.cat.id}/${sg.name}`)" @keydown.space.prevent="toggle(`${g.cat.id}/${sg.name}`)">
            <i class="fas text-xs w-dim" :class="isOpen(`${g.cat.id}/${sg.name}`) ? 'fa-chevron-down' : 'fa-chevron-right'" />
            <span :class="$style.subName">{{ sg.name }}</span>
            <span :class="$style.count">{{ sg.shown }} of {{ sg.all.length }} show</span>
            <span :class="$style.dots" aria-hidden="true"><i v-for="r in sg.all" :key="r.it.name" :style="{ background: STEP_CSS[r.one] }" /></span>
          </span>
          <span class="flex-1" />
          <label :class="$style.whole">Whole tier
            <select :value="sg.step" :class="$style.sel2" :aria-label="`Step for every ${sg.name} item`" @change="setSubStep(sg.all, ($event.target as HTMLSelectElement).value)">
              <option v-if="sg.step === 'mixed'" value="mixed" disabled>Mixed</option>
              <option value="auto">Price decides</option>
              <option v-for="(n, i) in CSTEP_NAMES" :key="n" :value="String(i)">{{ i === 0 ? 'Hidden (off)' : n }}</option>
            </select></label>
        </div>
        <template v-for="r in (sg.name && !isOpen(`${g.cat.id}/${sg.name}`) ? [] : sg.rows)" :key="r.it.name">
          <WItemRow :item="r.it.top ? { name: r.it.top, type: r.it.name } : { name: r.it.bt ?? r.it.name }" :class="[$style.row, { [$style.sel]: sel === r.it.name }]" role="row" action="pick" :data-currency-item="r.it.name" @pick="sel = sel === r.it.name ? null : r.it.name">
            <span :class="$style.name"><button v-if="kind === 'cards'" type="button" :class="[$style.star, { [$style.starOn]: c.items[r.it.name]?.min }]" :aria-pressed="!!c.items[r.it.name]?.min"
              :aria-label="`Collecting ${r.it.name}`" title="Collecting: every stack shows at least Normal" data-loot-collect @click.stop="toggleCollect(r.it.name)" @keydown.stop><i class="fas fa-star" aria-hidden="true" /></button>{{ r.it.name }}<span v-if="r.it.top" :class="$style.uniqTop" :title="r.it.of && r.it.of > 1 ? `The most valuable of ${r.it.of} uniques that drop on it` : 'The unique that drops on it'"> · {{ r.it.top }}<template v-if="r.it.of && r.it.of > 1"> +{{ r.it.of - 1 }}</template></span><span v-if="r.edited" :class="$style.edited"> edited</span></span>
            <span :class="$style.price" :title="r.it.own ? 'Your price' : r.it.free ? 'No price on poe.ninja: always shows at least Small' : r.it.est ? `No usable price: a guess from NeverSink's ${r.it.tier ? `tier ${r.it.tier}` : 'tiers'}` : 'poe.ninja'">
              {{ chaosText(r.it.chaos) }}<span v-if="r.it.est" :class="$style.est"> est.</span>
            </span>
            <span :class="$style.pills">
              <span v-for="p in r.pills" :key="p.text" :class="$style.pill" :style="{ background: STEP_CSS[p.step], color: p.step >= 3 ? '#140f08' : '#efe4cc' }">{{ p.text }}</span>
            </span>
            <i class="fas fa-pen w-faint" :class="$style.pen" aria-hidden="true" />
          </WItemRow>
          <CurrencyItemEditor v-if="sel === r.it.name" :it="r.it" :edit="c.items[r.it.name] ?? {}" :step="r.one" :base-price="baseChaos(r.it.name)" :base-look="currencyFullLook(r.one === 0 ? 1 : r.one, r.it.cat, c)" @change="e => setEdit(r.it.name, e)" />
        </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Currency weights (beta, currency-weights.ts), Guy's design A (2026-11-27):
// the steps and where they start, one ground pile, then every item in its
// category, each with the stack it needs for each step and an editor.
import { computed, nextTick, ref, watch } from 'vue'
import { WButton, WChip, WIcon, WInfo, WItemRow, WSegmented, WToggle } from '../ui'
import CurrencyPile from './CurrencyPile.vue'
import CurrencyItemEditor from './CurrencyItemEditor.vue'
import LabelPreview from './LabelPreview.vue'
import StyleEditor from './StyleEditor.vue'
import StepRuler from './StepRuler.vue'
import { ICON_SHAPES, POE_COLOURS, shapeGlyph } from './colours'
import type { StylePatch } from './edits'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import { withEdit, CSTEP_NAMES, ALL_CATEGORIES, kindOf, SUBGROUPS, catColour, currencyFullLook, subgroupOf, CURRENCY_TYPE, LINE_MAX, LINE_MIN, NUDGE_MAX, catMult, currencyItems, defaultCurrency, offSteps, pileSteps, stacksFor, stepOfPile, levelOf, strictMult, scaled, MULT_MIN, MULT_MAX, FAINT_UNTIL, faintLook, faintOn, forcedHidden, sectionMode } from './currency-weights'
import { LEVEL_NAMES } from './strictness'
import type { CStep, CurrencyItem, ItemEdit, LootKind, SectionMode } from './currency-weights'
import { cardFacts, loadCardFacts } from './card-facts'
import { gemLinesOf } from './gem-classes'

const props = withDefaults(defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
  // The Loot tab's class: Currency or Fragments, one engine and one ladder.
  kind?: LootKind
  // An item to open and scroll to (Alt+F's "Open on the Loot tab").
  focusItem?: string | null
}>(), { kind: 'currency', focusItem: null })
const KIND_NAME: Record<LootKind, string> = { currency: 'currency', fragments: 'fragments', cards: 'divination cards', uniques: 'uniques', gems: 'gems', maps: 'special maps' }
const CATS = computed(() => ALL_CATEGORIES.filter(x => kindOf(x.id) === props.kind))

const c = computed(() => props.config.presets.currency)
const STEP_CSS = ['#3b372f', '#6d6250', '#a08d5e', '#cdb27a', '#ffe196', '#ff4040']

// The ruler hands back a price as shown (after Strictness); store it as yours.
function setShown (i: number, shown: number) {
  // The ruler shows the picked section's prices: take its Strictness off too.
  const n = Number((shown / mult.value / catMult(c.value, sampleCat.value)).toPrecision(3))
  if (i === 0) {
    c.value.line = Math.min(LINE_MAX, Math.max(LINE_MIN, n))
    return
  }
  const k = i - 1
  const from = [...c.value.from] as typeof c.value.from
  from[k] = Math.min(1e6, Math.max(0.01, n))
  // Each step starts at or above the one below it, and at or below the one above.
  for (let j = k + 1; j < 4; j++) from[j] = Math.max(from[j], from[k])
  for (let j = k - 1; j >= 0; j--) from[j] = Math.min(from[j], from[k])
  c.value.from = from
}

// The items as the filter lists them, with prices before any of yours; while
// off, read from the filter as it is.
const baseItems = computed<CurrencyItem[]>(() => {
  const doc = props.store.doc.value
  const lookup = props.store.prices.lootLookup.value
  if (!doc || !lookup) return []
  if (props.kind === 'cards') loadCardFacts()
  return currencyItems({ ...doc, blocks: doc.blocks.filter(b => b.type !== CURRENCY_TYPE) }, lookup, {}, cardFacts.value, props.kind === 'gems' ? gemLinesOf(props.store.prices.items.value) : null).filter(it => kindOf(it.cat) === props.kind)
})
const baseByName = computed(() => new Map(baseItems.value.map(i => [i.name, i])))
const baseChaos = (name: string) => baseByName.value.get(name)?.chaos ?? 0
// With your own prices on top.
const items = computed<CurrencyItem[]>(() => baseItems.value.map(it => withEdit(it, c.value.items[it.name])))

// Every section: Off / Weighted / Always (Guy 2026-11-27).
const SECTION_MODES = [{ value: 'off', label: 'Off' }, { value: 'auto', label: 'Weighted' }, { value: 'always', label: 'Always' }]
function setCatMode (cat: string, v: string) {
  const next = Object.fromEntries(Object.entries(c.value.catMode).filter(([k]) => k !== cat))
  if (v !== sectionMode({ catMode: {} }, cat)) next[cat] = v as SectionMode
  c.value.catMode = next
}
// Faint (Guy's T1): on below a Strictness you choose.
const FAINT_UNTILS = [1, FAINT_UNTIL, 1.55, 1.95, 2.45, 99].map(v => ({ v, label: v >= 99 ? 'always' : `×${v.toFixed(2)}` }))
const faintActive = computed(() => faintOn(c.value, props.store.doc.value?.strictness ?? null))
const faintSample = computed(() => faintLook(catColour(sampleCat.value, c.value).rgb))

interface Pill { step: CStep, text: string }
function pillsOf (stacks: Array<number | null>, edit: ItemEdit | undefined, it: CurrencyItem, off: number[]): Pill[] {
  const under = forcedHidden(it, c.value) || !faintActive.value ? 'Hidden' : 'Faint'
  if (stacks.every(k => k == null)) return [{ step: 0, text: edit?.step === 0 ? 'Hidden, set by you' : sectionMode(c.value, it.cat) === 'off' && under === 'Hidden' ? 'Hidden, section off' : `${under} at any stack` }]
  if (edit?.step != null) return [{ step: edit.step, text: `${CSTEP_NAMES[edit.step]} at any stack, set by you` }]
  const out: Pill[] = []
  if (stacks[0] != null && stacks[0] > 1) out.push({ step: 0, text: stacks[0] === 2 ? `${under} at 1` : `${under} 1–${stacks[0] - 1}` })
  stacks.forEach((k, i) => {
    if (k == null) return
    const next = stacks.slice(i + 1).find(v => v != null)
    if (next === k) return
    const from = k === 1 ? 'any' : `${k.toLocaleString()}+`
    // A step turned off: those piles hide.
    if (off.includes(i + 1)) out.push({ step: 0, text: `Hidden ${from} (${CSTEP_NAMES[i + 1]} off)` })
    else out.push({ step: (i + 1) as CStep, text: `${CSTEP_NAMES[i + 1]} ${from}` })
  })
  return out
}

const rows = computed(() => items.value
  .map(it => {
    const stacks = stacksFor(it, eff.value)
    const edit = c.value.items[it.name]
    const off = offSteps(it, c.value)
    return { it, one: stepOfPile(stacks, 1, off), shows: pileSteps(stacks, off).some(([, , hidden]) => !hidden), pills: pillsOf(stacks, edit, it, off), edited: edit != null }
  })
  .sort((x, y) => y.it.chaos - x.it.chaos || x.it.name.localeCompare(y.it.name)))
const shownCount = computed(() => rows.value.filter(r => r.shows).length)
const editedCount = computed(() => rows.value.filter(r => r.edited).length)

const query = ref('')
const only = ref<'all' | 'shown' | 'hidden' | 'edited'>('all')
const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return rows.value.filter(r =>
    (!q || r.it.name.toLowerCase().includes(q)) &&
    (only.value === 'all' ||
      (only.value === 'shown' && r.shows) ||
      (only.value === 'hidden' && !r.shows) ||
      (only.value === 'edited' && r.edited)))
})

const groups = computed(() => CATS.value.map(cat => {
  const all = rows.value.filter(r => r.it.cat === cat.id)
  const rowsHere = visible.value.filter(r => r.it.cat === cat.id)
  const names = SUBGROUPS[cat.id]
  const subs = names
    ? names.map(name => {
        const inSub = all.filter(r => subgroupOf(r.it.name, cat.id) === name)
        return { id: name, name, all: inSub, shown: inSub.filter(r => r.shows).length, step: wholeStep(inSub), rows: rowsHere.filter(r => subgroupOf(r.it.name, cat.id) === name) }
      }).filter(sg => sg.rows.length)
    : [{ id: '', name: '', all, shown: 0, step: 'auto', rows: rowsHere }]
  return { cat, all: all.length, shown: all.filter(r => r.shows).length, edited: all.filter(r => r.edited).length, rows: rowsHere, subs }
}).filter(g => g.rows.length))

type Row = (typeof rows.value)[number]
// The step every item of a sub-group has by hand, 'auto' when none has one,
// 'mixed' otherwise.
function wholeStep (list: Row[]): string {
  const steps = new Set(list.map(r => c.value.items[r.it.name]?.step))
  if (steps.size !== 1) return 'mixed'
  const [s] = steps
  return s == null ? 'auto' : String(s)
}
// Sets (or clears) the step of every item in a sub-group; their other edits stay.
function setSubStep (list: Row[], v: string) {
  const step = v === 'auto' ? undefined : Number(v) as CStep
  const next = { ...c.value.items }
  for (const r of list) {
    const rest = Object.fromEntries(Object.entries(next[r.it.name] ?? {}).filter(([k]) => k !== 'step')) as ItemEdit
    next[r.it.name] = step == null ? rest : { ...rest, step }
  }
  c.value.items = Object.fromEntries(Object.entries(next).filter(([, e]) => Object.keys(e).length))
}

// Folded by default; a search or a filter chip opens what it finds.
const open = ref(new Set<string>())
const filtering = computed(() => query.value.trim() !== '' || only.value !== 'all')
const isOpen = (id: string) => filtering.value || open.value.has(id)
function toggle (id: string) {
  const next = new Set(open.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  open.value = next
}

const sel = ref<string | null>(null)
// Once its item is listed (prices can come in after the tab opens).
let focused: string | null = null
watch([() => props.focusItem, () => items.value.length], ([name]) => {
  if (!name || name === focused || !items.value.some(i => i.name === name)) return
  focused = name
  goTo(name).catch(() => {})
}, { immediate: true })
async function goTo (name: string) {
  const it = items.value.find(i => i.name === name)
  if (!it) return
  query.value = ''
  only.value = 'all'
  // Its sub-fold too (essences by tier), or the row isn't on the page.
  const sub = subgroupOf(it.name, it.cat)
  open.value = new Set([...open.value, it.cat, ...(sub ? [`${it.cat}/${sub}`] : [])])
  sel.value = name
  await nextTick()
  document.querySelector(`[data-currency-item="${CSS.escape(name)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

// Step looks: loudness only, for every category (Guy's L1).
const stepEdit = ref<CStep | null>(null) // 0 is Faint
// The strictness multiplier: the player's own, or NeverSink's level's.
const level = computed(() => levelOf(props.store.doc.value?.strictness ?? null))
const mult = computed(() => c.value.mult ?? strictMult(level.value))
const eff = computed(() => scaled(c.value, props.store.doc.value?.strictness ?? null))
const dragMult = ref<number | null>(null)
const SAMPLE_CATS = props.kind === 'maps' ? ['mapblight', 'mapravaged'] : props.kind === 'gems' ? ['gemexc', 'gemawk', 'gemtrans', 'gemsup', 'gemskill'] : props.kind === 'uniques' ? ['uniqplain', 'uniqvar', 'uniqearly', 'uniqboss', 'uniqfoul'] : props.kind === 'cards' ? ['cardcur', 'carduniq', 'cardgem', 'cardgear', 'cardmap'] : props.kind === 'fragments' ? ['invites', 'uber', 'shaper', 'crests', 'emblems'] : ['orbs', 'essences', 'oils', 'fossils', 'catalysts']
// The colours the step ruler shows.
const sampleCat = ref(SAMPLE_CATS[0])
// Each step card's sample: an item of the picked category that one of shows
// at that step, the one in the middle of the step's price range (Guy: the
// sample should be something that really lands there).
const stepSample = computed(() => {
  const out: Record<number, string> = {}
  for (const s of [1, 2, 3, 4, 5]) {
    const at = rows.value.filter(r => r.one === s && !c.value.items[r.it.name]?.step)
    const pool = at.filter(r => r.it.cat === sampleCat.value)
    const list = (pool.length ? pool : at).map(r => r.it).sort((a, b) => a.chaos - b.chaos)
    if (list.length) out[s] = list[Math.floor(list.length / 2)].name
  }
  return out
})
const catArt = (id: string) => ALL_CATEGORIES.find(x => x.id === id)?.art ?? id
function loudOnly (p: StylePatch): StylePatch {
  const out: StylePatch = {}
  if (p.fontSize !== undefined) out.fontSize = p.fontSize
  if (p.sound !== undefined) out.sound = p.sound
  if (p.effect !== undefined) out.effect = p.effect
  if (p.icon !== undefined) out.icon = p.icon
  return out
}
function toggleOff (s: number) {
  c.value.off = c.value.off.includes(s) ? c.value.off.filter(x => x !== s) : [...c.value.off, s].sort((a, b) => a - b)
}
function setStepLook (s: number, p: StylePatch | null) {
  const next = Object.fromEntries(Object.entries(c.value.steps).filter(([k]) => k !== String(s)))
  if (p && Object.keys(p).length) next[String(s)] = p
  c.value.steps = next
}
// Category colours: the colour, the map icon's shape and the icon and beam colour.
function setCatLook (id: string, p: StylePatch | null) {
  const next = Object.fromEntries(Object.entries(c.value.cats).filter(([k]) => k !== id))
  if (p) next[id] = { ...c.value.cats[id], ...p }
  c.value.cats = next
}
function setCatIcon (id: string, p: { shape?: string, color?: string }) {
  const cur = catColour(id, c.value)
  setCatLook(id, { icon: { size: 1, color: p.color ?? cur.color, shape: p.shape ?? cur.shape } })
}
const hexOf = (rgb: number[]) => '#' + rgb.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('')
const rgbOf = (hex: string): [number, number, number] => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]

const NUDGES = Array.from({ length: NUDGE_MAX * 2 + 1 }, (_, i) => i - NUDGE_MAX)
function setNudge (cat: string, v: number) {
  const next = Object.fromEntries(Object.entries(c.value.nudge).filter(([k]) => k !== cat))
  if (v !== 0) next[cat] = v
  c.value.nudge = next
}

// Collecting (Guy's star N): the card shows at least Normal, at any stack.
function toggleCollect (name: string) {
  const { min, ...rest } = c.value.items[name] ?? {}
  setEdit(name, min ? (Object.keys(rest).length ? rest : null) : { ...rest, min: 2 })
}
function setEdit (name: string, e: ItemEdit | null) {
  const next = Object.fromEntries(Object.entries(c.value.items).filter(([k]) => k !== name))
  if (e) next[name] = e
  c.value.items = next
}

const emptyText = computed(() => {
  const what = props.kind === 'currency' ? 'currency' : KIND_NAME[props.kind]
  if (!props.store.doc.value) return `Load a NeverSink filter to see its ${what}.`
  if (!props.store.prices.lookup.value) return 'Waiting for prices from poe.ninja.'
  // Gem rows come from poe.ninja's gem prices, not from the filter.
  if (props.kind === 'gems') return 'No gem prices from poe.ninja yet.'
  if (props.kind === 'maps') return 'No blighted map prices from poe.ninja yet.'
  return `No ${what} found in this filter.`
})
const statusText = computed(() => {
  if (!c.value.on) return 'Off: NeverSink decides'
  const n = props.store.currencyRules.value
  if (!n) return props.store.prices.lookup.value ? 'No rules written' : 'Waiting for prices: NeverSink decides meanwhile'
  const kb = Math.max(1, Math.round(props.store.currencyChars.value / 1024))
  return `${n.toLocaleString()} rules · ${kb} KB`
})

const changed = computed(() => {
  const d = defaultCurrency()
  const mine = (o: Record<string, unknown>) => Object.keys(o).some(k => catIds.value.has(k))
  return mine(c.value.catMode) || c.value.faint.on !== d.faint.on || c.value.faint.until !== d.faint.until || c.value.line !== d.line || c.value.from.some((v, i) => v !== d.from[i]) || mine(c.value.nudge) || Object.keys(c.value.steps).length > 0 || mine(c.value.cats) || c.value.off.length > 0 || c.value.mult != null
})
// This class's categories: Defaults leaves the other classes' sections (and
// the League items' Offs) as they are.
const catIds = computed(() => new Set(CATS.value.map(x => x.id)))
function reset () {
  const d = defaultCurrency()
  const others = <T>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).filter(([k]) => !catIds.value.has(k)))
  // Your item edits are a list you built: Defaults keeps them. The steps are shared by every class.
  Object.assign(c.value, { line: d.line, from: d.from, nudge: others(c.value.nudge), steps: d.steps, cats: others(c.value.cats), off: d.off, mult: d.mult, catMode: others(c.value.catMode), faint: d.faint })
}

function chaosText (v: number): string {
  if (v >= 100) return `${Math.round(v).toLocaleString()}c`
  if (v >= 10) return `${Math.round(v)}c`
  if (v >= 1) return `${Number(v.toFixed(1))}c`
  return `${Number(v.toPrecision(2))}c`
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
  gap: 8px;
}
:global([data-w-sized]) .wrap { max-height: none; }
.top, .tools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.secMode { display: inline-flex; }
.beta {
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  padding: 0 4px;
}
.search {
  flex: 0 1 12rem;
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  color: inherit;
  padding: 1px 6px;
}
.cat { border: 1px solid var(--w-line); border-radius: var(--w-r-sm); max-width: 60rem; }
.count { font-size: var(--w-fs-xs); color: var(--w-dim); white-space: nowrap; font-variant-numeric: tabular-nums; }
.catHead { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; padding: 4px 8px; cursor: pointer; }
.catHead:hover { background: var(--w-panel-2); }
.catName { font-size: var(--w-fs-sm); color: #e2d3ad; white-space: nowrap; }
/* One row of dots, cut off when the header is crowded (a squeezed wrap made
   one dot a line and the header as tall as the category). */
.dots { display: flex; gap: 2px; flex-wrap: nowrap; overflow: hidden; max-width: 10rem; min-width: 0; flex: 0 1 auto; }
.dots i { width: 7px; height: 7px; border-radius: 1px; display: block; flex: none; }
.subHead { display: flex; align-items: center; gap: 8px; padding: 3px 2px; margin-top: 2px; border-bottom: 1px solid var(--w-line); }
.subFold { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; min-width: 0; }
.subName { font-size: var(--w-fs-sm); color: #d8c89c; min-width: 5.5rem; }
.whole { display: inline-flex; align-items: center; gap: 6px; color: var(--w-dim); font-size: var(--w-fs-xs); }
.sel2 { max-width: 7.5rem; background: var(--w-panel); border: 1px solid var(--w-line); border-radius: var(--w-r-sm); color: inherit; padding: 0 4px; }
.minBar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 6px 10px; border: 1px solid var(--w-line); border-radius: var(--w-r-sm); background: var(--w-panel-2); }
.minLab { color: #e2d3ad; font-size: var(--w-fs-sm); }
.range { width: min(22rem, 100%); accent-color: var(--w-accent, #c8a565); }
.hidChip { font-size: var(--w-fs-xs); color: var(--w-dim); background: var(--w-panel); border: 1px solid var(--w-line); border-radius: 10px; padding: 0 8px; cursor: pointer; white-space: nowrap; }
.hidChip:hover { color: var(--w-accent, #c8a565); }
.minVal { font-size: var(--w-fs-sm); color: var(--w-accent, #c8a565); min-width: 3.5em; font-variant-numeric: tabular-nums; }
.catSample { display: inline-flex; pointer-events: none; }
.lookLab { white-space: nowrap; font-size: var(--w-fs-xs); color: var(--w-muted, #a89a7a); }
.offTog { display: flex; align-items: center; gap: 4px; font-size: var(--w-fs-xs); color: var(--w-muted, #a89a7a); cursor: pointer; }
.stepEd { border: 1px solid var(--w-accent, #c8a565); border-radius: var(--w-r-sm); background: var(--w-panel-2); padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; }
.stepEdHead { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.samples { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; padding: 6px; background: #1a1712; border-radius: var(--w-r-sm); }
.catLook { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; padding: 2px 2px 4px; border-bottom: 1px solid var(--w-line); }
.swatch { flex-shrink: 0; width: 20px; height: 18px; padding: 0; border: 1px solid var(--w-line); background: none; cursor: pointer; }
.catBody { border-top: 1px solid var(--w-line); padding: 4px 6px; display: flex; flex-direction: column; }
.row {
  display: grid;
  grid-template-columns: 20px minmax(8rem, 15rem) 4rem minmax(0, 1fr) 14px;
  align-items: center;
  column-gap: 8px;
  font-size: var(--w-fs-sm);
  padding: 1px 2px;
  border-radius: var(--w-r-sm);
}
.sel { background: var(--w-panel-2); }
.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #c9b98c; }
.price { text-align: right; font-variant-numeric: tabular-nums; }
.est { color: var(--w-faint); font-size: var(--w-fs-xs); }
.pills { display: flex; gap: 3px; flex-wrap: wrap; min-width: 0; }
.pill { font-size: var(--w-fs-xs); padding: 0 5px; border-radius: 2px; line-height: 1.5; white-space: nowrap; font-variant-numeric: tabular-nums; }
.edited { color: var(--w-accent, #c8a565); font-size: var(--w-fs-xs); }
.uniqTop { color: #af6025; font-size: var(--w-fs-xs); }
.pen { font-size: var(--w-fs-xs); }
.star { background: none; border: 0; padding: 0 5px 0 0; color: var(--w-faint); cursor: pointer; font-size: var(--w-fs-xs); }
.star:hover { color: #e8c96a; }
.starOn { color: #f0c040; }
</style>
