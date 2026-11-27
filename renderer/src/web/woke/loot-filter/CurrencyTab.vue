<template>
  <div :class="$style.wrap" class="w-scroll">
    <div :class="$style.top">
      <WToggle v-model="c.on">Prices decide endgame currency</WToggle>
      <span :class="$style.beta">Beta</span>
      <WInfo text="In maps (area level 68+), each pile of currency, essences, fossils, oils, delirium orbs, omens, tattoos and ducats counts as its poe.ninja price × √stack, plus a bonus of up to ×2.5 when a full stack of it is worth a lot. Under the line it hides; over it it shows Small, and Normal, Decent, Big and Tink start at the prices you set. Each category can see more or less; click an item to set its step, price, supply stack or look by hand. Items with no price get a guess from NeverSink's tier (est.). Only this profile. Your own rules, build rules and presets still go on top. In maps these rules replace NeverSink's for these items, so price moves and tier edits for them apply only below area level 68." />
      <span class="w-faint text-xs">{{ statusText }}</span>
      <span class="flex-1" />
      <WButton v-if="changed" size="sm" variant="ghost" icon="fas fa-undo" title="Line, step prices and category nudges back to the start; your item edits stay" @click="reset">Defaults</WButton>
    </div>

    <div :class="$style.steps" role="group" aria-label="Where each step starts">
      <div v-for="s in [0, 1, 2, 3, 4, 5]" :key="s" :class="$style.step" :style="{ '--step': STEP_CSS[s] }">
        <span :class="$style.stepName">{{ CSTEP_NAMES[s] }}</span>
        <span v-if="s === 0" class="w-faint text-xs">under the line</span>
        <label v-else-if="s === 1" :class="$style.from">from
          <input :value="c.line" type="number" :min="LINE_MIN" :max="LINE_MAX" step="0.1" :class="$style.numIn" aria-label="Small from this many chaos (the line)" @change="setLine($event.target as HTMLInputElement)"> c</label>
        <label v-else :class="$style.from">from
          <input :value="c.from[s - 2]" type="number" min="0.1" step="any" :class="$style.numIn" :aria-label="`${CSTEP_NAMES[s]} from this many chaos`"
            @change="setFrom(s - 2, $event.target as HTMLInputElement)"> c</label>
        <span class="w-faint text-xs">{{ STEP_NOTE[s] }}</span>
      </div>
    </div>

    <CurrencyPile v-if="baseItems.length" :items="items" :cfg="c" @go="goTo" />

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
        <span class="w-dim text-xs w-num">{{ g.shown }} of {{ g.all }} show</span>
        <span :class="$style.dots" aria-hidden="true"><i v-for="r in g.rows" :key="r.it.name" :style="{ background: STEP_CSS[r.one] }" /></span>
        <span class="flex-1" />
        <span :class="$style.nudge" @click.stop @keydown.stop>
          <button type="button" :disabled="(c.nudge[g.cat.id] ?? 0) <= -NUDGE_MAX" :aria-label="`See more ${g.cat.name}`" title="See more: halves the line for this category" @click="nudge(g.cat.id, -1)">−</button>
          <span class="w-num text-xs" :title="`Line for ${g.cat.name}: ${chaosText(catLine(c, g.cat.id))}`">{{ nudgeText(g.cat.id) }}</span>
          <button type="button" :disabled="(c.nudge[g.cat.id] ?? 0) >= NUDGE_MAX" :aria-label="`See less ${g.cat.name}`" title="See less: doubles the line for this category" @click="nudge(g.cat.id, 1)">+</button>
        </span>
      </div>
      <div v-if="isOpen(g.cat.id)" :class="$style.catBody" role="table" :aria-label="`${g.cat.name} and when they show`">
        <template v-for="r in g.rows" :key="r.it.name">
          <WItemRow :item="{ name: r.it.name }" :class="[$style.row, { [$style.sel]: sel === r.it.name }]" role="row" action="pick" :data-currency-item="r.it.name" @pick="sel = sel === r.it.name ? null : r.it.name">
            <span :class="$style.name">{{ r.it.name }}<span v-if="r.edited" :class="$style.edited"> edited</span></span>
            <span :class="$style.price" :title="r.it.own ? 'Your price' : r.it.est ? `No usable price: a guess from NeverSink's ${r.it.tier ? `tier ${r.it.tier}` : 'tiers'}` : 'poe.ninja'">
              {{ chaosText(r.it.chaos) }}<span v-if="r.it.est" :class="$style.est"> est.</span>
            </span>
            <span :class="$style.pills">
              <span v-for="p in r.pills" :key="p.text" :class="$style.pill" :style="{ background: STEP_CSS[p.step], color: p.step >= 3 ? '#140f08' : '#efe4cc' }">{{ p.text }}</span>
            </span>
            <i class="fas fa-pen w-faint" :class="$style.pen" aria-hidden="true" />
          </WItemRow>
          <CurrencyItemEditor v-if="sel === r.it.name" :it="r.it" :edit="c.items[r.it.name] ?? {}" :step="r.one" :base-price="baseChaos(r.it.name)" @change="e => setEdit(r.it.name, e)" />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Currency weights (beta, currency-weights.ts), Guy's design A (2026-11-27):
// the steps and where they start, one ground pile, then every item in its
// category, each with the stack it needs for each step and an editor.
import { computed, nextTick, ref } from 'vue'
import { WButton, WChip, WIcon, WInfo, WItemRow, WToggle } from '../ui'
import CurrencyPile from './CurrencyPile.vue'
import CurrencyItemEditor from './CurrencyItemEditor.vue'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import { CSTEP_NAMES, CURRENCY_CATEGORIES, CURRENCY_TYPE, LINE_MAX, LINE_MIN, NUDGE_MAX, catLine, currencyItems, defaultCurrency, stacksFor, stepOfPile } from './currency-weights'
import type { CStep, CurrencyItem, ItemEdit } from './currency-weights'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
}>()

const c = computed(() => props.config.presets.currency)
const STEP_CSS = ['#3b372f', '#6d6250', '#a08d5e', '#cdb27a', '#ffe196', '#ff4040']
const STEP_NOTE = ['', 'quiet', 'soft sound', 'sound, map icon', 'loud, yellow beam', 'the big sound, red on white, red beam']

// Both write back to the field, so a refused or clamped number doesn't stay typed.
function setLine (el: HTMLInputElement) {
  const n = Number(el.value)
  if (el.value.trim() && Number.isFinite(n)) c.value.line = Math.min(LINE_MAX, Math.max(LINE_MIN, n))
  el.value = String(c.value.line)
}
function setFrom (i: number, el: HTMLInputElement) {
  const raw = el.value
  const n = Number(raw)
  el.value = String(c.value.from[i])
  if (!raw.trim() || !Number.isFinite(n) || n <= 0) return
  const from = [...c.value.from] as typeof c.value.from
  from[i] = Math.min(1e6, n)
  // Each step starts at or above the one below it, and at or below the one above.
  for (let k = i + 1; k < 4; k++) from[k] = Math.max(from[k], from[i])
  for (let k = i - 1; k >= 0; k--) from[k] = Math.min(from[k], from[i])
  c.value.from = from
  el.value = String(from[i])
}

// The items as the filter lists them, with prices before any of yours; while
// off, read from the filter as it is.
const baseItems = computed<CurrencyItem[]>(() => {
  const doc = props.store.doc.value
  const lookup = props.store.prices.lookup.value
  if (!doc || !lookup) return []
  return currencyItems({ ...doc, blocks: doc.blocks.filter(b => b.type !== CURRENCY_TYPE) }, lookup)
})
const baseByName = computed(() => new Map(baseItems.value.map(i => [i.name, i])))
const baseChaos = (name: string) => baseByName.value.get(name)?.chaos ?? 0
// With your own prices on top.
const items = computed<CurrencyItem[]>(() => baseItems.value.map(it => {
  const price = c.value.items[it.name]?.price
  return price != null ? { ...it, chaos: price, est: false, own: true } : it
}))

interface Pill { step: CStep, text: string }
function pillsOf (stacks: Array<number | null>, edit: ItemEdit | undefined): Pill[] {
  if (stacks.every(k => k == null)) return [{ step: 0, text: edit?.step === 0 ? 'Hidden, set by you' : 'Hidden at any stack' }]
  if (edit?.step != null) return [{ step: edit.step, text: `${CSTEP_NAMES[edit.step]} at any stack, set by you` }]
  const out: Pill[] = []
  if (stacks[0] != null && stacks[0] > 1) out.push({ step: 0, text: stacks[0] === 2 ? 'Hidden at 1' : `Hidden 1–${stacks[0] - 1}` })
  stacks.forEach((k, i) => {
    if (k == null) return
    const next = stacks.slice(i + 1).find(v => v != null)
    if (next === k) return
    out.push({ step: (i + 1) as CStep, text: `${CSTEP_NAMES[i + 1]} ${k === 1 ? 'any' : `${k.toLocaleString()}+`}` })
  })
  return out
}

const rows = computed(() => items.value
  .map(it => {
    const stacks = stacksFor(it, c.value)
    const edit = c.value.items[it.name]
    return { it, one: stepOfPile(stacks, 1), shows: stacks.some(k => k != null), pills: pillsOf(stacks, edit), edited: edit != null }
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

const groups = computed(() => CURRENCY_CATEGORIES.map(cat => {
  const all = rows.value.filter(r => r.it.cat === cat.id)
  return { cat, all: all.length, shown: all.filter(r => r.shows).length, edited: all.filter(r => r.edited).length, rows: visible.value.filter(r => r.it.cat === cat.id) }
}).filter(g => g.rows.length))

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
async function goTo (name: string) {
  const it = items.value.find(i => i.name === name)
  if (!it) return
  query.value = ''
  only.value = 'all'
  open.value = new Set([...open.value, it.cat])
  sel.value = name
  await nextTick()
  document.querySelector(`[data-currency-item="${CSS.escape(name)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

function nudge (cat: string, d: number) {
  const v = Math.max(-NUDGE_MAX, Math.min(NUDGE_MAX, (c.value.nudge[cat] ?? 0) + d))
  const next = Object.fromEntries(Object.entries(c.value.nudge).filter(([k]) => k !== cat))
  if (v !== 0) next[cat] = v
  c.value.nudge = next
}
const nudgeText = (cat: string) => {
  const v = c.value.nudge[cat] ?? 0
  return v === 0 ? '·' : v > 0 ? `less ${v}` : `more ${-v}`
}

function setEdit (name: string, e: ItemEdit | null) {
  const next = Object.fromEntries(Object.entries(c.value.items).filter(([k]) => k !== name))
  if (e) next[name] = e
  c.value.items = next
}

const emptyText = computed(() => {
  if (!props.store.doc.value) return 'Load a NeverSink filter to see its currency.'
  if (!props.store.prices.lookup.value) return 'Waiting for prices from poe.ninja.'
  return 'No currency found in this filter.'
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
  return c.value.line !== d.line || c.value.from.some((v, i) => v !== d.from[i]) || Object.keys(c.value.nudge).length > 0
})
function reset () {
  const d = defaultCurrency()
  // Your item edits are a list you built: Defaults keeps them.
  Object.assign(c.value, { line: d.line, from: d.from, nudge: d.nudge })
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
.beta {
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  padding: 0 4px;
}
.steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr)); gap: 4px; }
.step {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 6px;
  border: 1px solid var(--w-line);
  border-top: 3px solid var(--step);
  border-radius: var(--w-r-sm);
  background: var(--w-panel-2);
  min-width: 0;
}
.stepName { font-size: var(--w-fs-sm); color: var(--w-text); }
.from { display: inline-flex; align-items: center; gap: 4px; font-size: var(--w-fs-xs); color: var(--w-dim); }
.numIn {
  width: 4.4em;
  background: var(--w-panel);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  color: inherit;
  padding: 0 4px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.search {
  flex: 0 1 12rem;
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  color: inherit;
  padding: 1px 6px;
}
.cat { border: 1px solid var(--w-line); border-radius: var(--w-r-sm); }
.catHead { display: flex; align-items: center; gap: 8px; padding: 4px 8px; cursor: pointer; }
.catHead:hover { background: var(--w-panel-2); }
.catName { font-size: var(--w-fs-sm); color: #e2d3ad; white-space: nowrap; }
.dots { display: flex; gap: 2px; flex-wrap: wrap; max-width: 16rem; min-width: 0; }
.dots i { width: 7px; height: 7px; border-radius: 1px; display: block; }
.nudge { display: inline-flex; align-items: center; gap: 4px; }
.nudge button {
  width: 18px;
  height: 18px;
  line-height: 1;
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  background: var(--w-panel-2);
  color: inherit;
}
.nudge button:disabled { opacity: 0.4; }
.nudge span { min-width: 3.2em; text-align: center; color: var(--w-dim); }
.catBody { border-top: 1px solid var(--w-line); padding: 4px 6px; display: flex; flex-direction: column; }
.row {
  display: grid;
  grid-template-columns: 20px minmax(9rem, 1.3fr) 4.5rem minmax(0, 2.6fr) 14px;
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
.pen { font-size: var(--w-fs-xs); }
</style>
