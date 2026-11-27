<template>
  <div :class="$style.wrap" class="w-scroll">
    <div :class="$style.top">
      <WToggle v-model="c.on">Prices decide endgame currency</WToggle>
      <span :class="$style.beta">Beta</span>
      <WInfo text="In maps (area level 68+), each pile of currency, essences, fossils, oils, delirium orbs, omens, tattoos and ducats counts as its poe.ninja price × √stack, plus a bonus of up to ×2.5 when a full stack of it is worth a lot. Under the line it hides. Over it, it shows, and Normal, Big and Beam start at fixed prices you set, whatever the line. Items with no price or a thin one get a guess from NeverSink's tier (est.). Supplies show from the stack you set; pins always show. Only this profile. Your own rules, build rules and presets still go on top. In maps these rules replace NeverSink's for these items, so price moves and tier edits for them apply only below area level 68." />
      <span class="w-faint text-xs">{{ statusText }}</span>
      <span class="flex-1" />
      <WButton v-if="changed" size="sm" variant="ghost" icon="fas fa-undo" @click="reset">Defaults</WButton>
    </div>

    <div :class="$style.line">
      <span class="font-semibold text-sm">Hide under</span>
      <input v-model.number="lineStep" type="range" min="0" max="100" step="1" :class="$style.slider" aria-label="Chaos a pile must count for to show">
      <span :class="$style.num">{{ chaosText(c.line) }}</span>
      <WChip v-for="v in LINE_CHIPS" :key="v" clickable :active="Math.abs(c.line - v) < 1e-6" @click="c.line = v">{{ chaosText(v) }}</WChip>
    </div>
    <div :class="$style.loud">
      <span class="text-xs w-dim">Louder from</span>
      <label :class="$style.loudStep"><span :style="{ color: STEP_CSS[2] }">Normal</span>
        <input v-model.lazy.number="normalIn" type="number" min="0.1" step="1" :class="$style.numIn" aria-label="Normal from this many chaos"> c</label>
      <label :class="$style.loudStep"><span :style="{ color: STEP_CSS[3] }">Big, sound</span>
        <input v-model.lazy.number="bigIn" type="number" min="0.1" step="1" :class="$style.numIn" aria-label="Big from this many chaos"> c</label>
      <label :class="$style.loudStep"><span :class="$style.beamName">Beam</span>
        <input v-model.lazy.number="beamIn" type="number" min="0.05" step="0.5" :class="$style.numIn" aria-label="Beam from this many divines"> div <span class="w-faint">({{ chaosText(starts[3]) }})</span></label>
    </div>

    <div :class="$style.tools">
      <input v-model="query" type="search" placeholder="Find an item" :class="$style.search" aria-label="Find an item">
      <WChip clickable :active="only === 'all'" @click="only = 'all'">All {{ rows.length }}</WChip>
      <WChip clickable :active="only === 'shown'" @click="only = 'shown'">Can show {{ shownCount }}</WChip>
      <WChip clickable :active="only === 'hidden'" @click="only = 'hidden'">Always hidden {{ rows.length - shownCount }}</WChip>
      <WChip clickable :active="only === 'mine'" @click="only = 'mine'">Supplies and pins {{ mineCount }}</WChip>
    </div>

    <div v-if="!rows.length" class="w-faint text-sm">{{ emptyText }}</div>
    <div v-else :class="$style.table" role="table" aria-label="Currency and when it shows">
      <div :class="[$style.grid, $style.head]" role="row" data-no-item-tip="column headings">
        <span role="columnheader">Item</span>
        <span role="columnheader" :class="$style.r">Each</span>
        <span role="columnheader" :class="$style.r" title="How many fit in one stack">Stack</span>
        <span role="columnheader" :class="$style.r">Shows from</span>
        <span role="columnheader" :class="$style.r" :style="{ color: STEP_CSS[2] }">Normal</span>
        <span role="columnheader" :class="$style.r" :style="{ color: STEP_CSS[3] }">Big</span>
        <span role="columnheader" :class="[$style.r, $style.beamName]">Beam</span>
        <span role="columnheader" :class="$style.r" title="Always show from this stack size: crafting supplies">Supply</span>
        <span role="columnheader" />
      </div>
      <WItemRow v-for="r in visible" :key="r.it.name" :item="{ name: r.it.name }" :class="[$style.grid, $style.row]" role="row">
        <span :class="$style.name">{{ r.it.name }}</span>
        <span :class="[$style.r, $style.num]" :title="r.it.est ? `No usable price: a guess from NeverSink's ${tierText(r.it)}` : 'poe.ninja'">
          {{ chaosText(r.it.chaos) }}<span v-if="r.it.est" :class="$style.est"> est.</span>
        </span>
        <span :class="[$style.r, 'w-faint']">{{ r.it.full.toLocaleString() }}</span>
        <span v-for="(k, s) in r.stacks" :key="s" :class="[$style.r, $style.num, { 'w-faint': k == null }]">{{ fromText(k) }}</span>
        <span :class="$style.r">
          <input :value="c.supplies[r.it.name] ?? ''" type="number" min="1" :max="r.it.full" placeholder="–" :class="$style.supIn"
            :aria-label="`Always show ${r.it.name} from this stack size`" @change="setSupply(r.it.name, ($event.target as HTMLInputElement).value)">
        </span>
        <button type="button" :class="[$style.pin, { [$style.pinned]: c.pins.includes(r.it.name) }]" :aria-pressed="c.pins.includes(r.it.name)"
          :title="c.pins.includes(r.it.name) ? `Always shown: ${r.it.name}. Click to let the price decide.` : `Always show ${r.it.name}, whatever its price`" @click.stop="togglePin(r.it.name)"><i class="fas fa-thumbtack" /></button>
      </WItemRow>
    </div>
  </div>
</template>

<script setup lang="ts">
// Currency weights (beta, currency-weights.ts): the switch, the line, how
// loud, and every item with the pile it needs for each step.
import { computed, ref } from 'vue'
import { WButton, WChip, WInfo, WItemRow, WToggle } from '../ui'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import { CURRENCY_TYPE, LINE_MAX, LINE_MIN, currencyItems, defaultCurrency, divineChaos, stacksFor, stepStarts } from './currency-weights'
import type { CurrencyItem } from './currency-weights'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
}>()

const c = computed(() => props.config.presets.currency)
const STEP_CSS = ['#3a3a3a', '#8a8a8a', '#d2be8c', '#ffe196', '#ff4040']
const LINE_CHIPS = [0.2, 0.5, 1, 2, 5]

// The slider runs on a log scale from 0.1c to 5c.
const lineStep = computed({
  get: () => Math.round(100 * Math.log(c.value.line / LINE_MIN) / Math.log(LINE_MAX / LINE_MIN)),
  set: (s: number) => {
    if (!Number.isFinite(s)) return
    const v = LINE_MIN * (LINE_MAX / LINE_MIN) ** (s / 100)
    c.value.line = Number(v.toPrecision(v < 1 ? 1 : 2))
  }
})
const clampNum = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null
const normalIn = computed({ get: () => c.value.normal, set: v => { const n = clampNum(v, 0.1, 10_000); if (n != null) { c.value.normal = n; c.value.big = Math.max(c.value.big, n) } } })
const bigIn = computed({ get: () => c.value.big, set: v => { const n = clampNum(v, 0.1, 100_000); if (n != null) { c.value.big = n; c.value.normal = Math.min(c.value.normal, n) } } })
const beamIn = computed({ get: () => c.value.beamDiv, set: v => { const n = clampNum(v, 0.05, 1000); if (n != null) c.value.beamDiv = n } })

// The items the rules were written from; while off, read from the filter as it is.
const items = computed<CurrencyItem[]>(() => {
  if (props.store.currencyItems.value.length) return props.store.currencyItems.value
  const doc = props.store.doc.value
  const lookup = props.store.prices.lookup.value
  if (!doc || !lookup) return []
  return currencyItems({ ...doc, blocks: doc.blocks.filter(b => b.type !== CURRENCY_TYPE) }, lookup)
})
const starts = computed(() => stepStarts(c.value, divineChaos(items.value)))
const rows = computed(() => items.value
  .map(it => ({ it, stacks: stacksFor(it, c.value, starts.value) }))
  .sort((x, y) => y.it.chaos - x.it.chaos || x.it.name.localeCompare(y.it.name)))
const shownCount = computed(() => rows.value.filter(r => r.stacks[0] != null).length)
const mineCount = computed(() => rows.value.filter(r => isMine(r.it.name)).length)
const isMine = (n: string) => c.value.pins.includes(n) || c.value.supplies[n] != null

const query = ref('')
const only = ref<'all' | 'shown' | 'hidden' | 'mine'>('all')
const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return rows.value.filter(r =>
    (!q || r.it.name.toLowerCase().includes(q)) &&
    (only.value === 'all' ||
      (only.value === 'shown' && r.stacks[0] != null) ||
      (only.value === 'hidden' && r.stacks[0] == null) ||
      (only.value === 'mine' && isMine(r.it.name))))
})

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

const changed = computed(() => { const { line, normal, big, beamDiv } = c.value; const d = defaultCurrency(); return line !== d.line || normal !== d.normal || big !== d.big || beamDiv !== d.beamDiv })
function reset () {
  const d = defaultCurrency()
  // Supplies and pins are a list you built: Defaults keeps them.
  Object.assign(c.value, { ...d, on: c.value.on, supplies: c.value.supplies, pins: c.value.pins })
}

function chaosText (v: number): string {
  if (v >= 100) return `${Math.round(v).toLocaleString()}c`
  if (v >= 10) return `${Math.round(v)}c`
  if (v >= 1) return `${Number(v.toFixed(1))}c`
  return `${Number(v.toPrecision(2))}c`
}
const fromText = (k: number | null) => k == null ? 'never' : k === 1 ? 'any' : `${k.toLocaleString()}+`
const tierText = (it: CurrencyItem) => it.tier ? `tier ${it.tier}` : 'tiers'

function setSupply (name: string, raw: string) {
  const n = Math.round(Number(raw))
  const next = Object.fromEntries(Object.entries(c.value.supplies).filter(([k]) => k !== name))
  if (raw.trim() && Number.isFinite(n) && n >= 1) next[name] = Math.min(n, 100_000)
  c.value.supplies = next
}
function togglePin (name: string) {
  c.value.pins = c.value.pins.includes(name) ? c.value.pins.filter(n => n !== name) : [...c.value.pins, name]
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
.top, .line, .loud, .tools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.beta {
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  padding: 0 4px;
}
.slider { flex: 1 1 140px; min-width: 100px; }
.num { font-variant-numeric: tabular-nums; }
.loudStep { display: inline-flex; align-items: center; gap: 4px; font-size: var(--w-fs-sm); }
.numIn, .supIn {
  width: 4.2em;
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  color: inherit;
  padding: 0 4px;
  font-variant-numeric: tabular-nums;
}
.supIn { width: 3.6em; text-align: right; }
.supIn::placeholder { color: var(--w-faint); }
.beamName { color: #ff4040; background: #fff; padding: 0 3px; border-radius: 2px; }
.search {
  flex: 0 1 12rem;
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  color: inherit;
  padding: 1px 6px;
}
.table { display: flex; flex-direction: column; min-width: 0; }
.grid {
  display: grid;
  grid-template-columns: 20px minmax(8rem, 1fr) 4.5rem 3.5rem 4.5rem 4rem 4rem 4rem 4rem 1.5rem;
  align-items: center;
  column-gap: 6px;
  font-size: var(--w-fs-sm);
}
.head { color: var(--w-dim); font-size: var(--w-fs-xs); padding-bottom: 2px; border-bottom: 1px solid var(--w-line); }
.head > :first-child { grid-column: 1 / span 2; }
.row { padding: 1px 0; border-bottom: 1px solid color-mix(in srgb, var(--w-line) 50%, transparent); }
.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #c9b98c; }
.r { text-align: right; }
.est { color: var(--w-faint); font-size: var(--w-fs-xs); }
.pin { color: var(--w-faint); opacity: 0.5; }
.pin:hover, .pinned { opacity: 1; color: var(--w-accent, #d2be8c); }
</style>
