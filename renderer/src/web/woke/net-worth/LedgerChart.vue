<template>
  <div ref="box" :class="$style.chart" data-ledger-chart :style="height ? { height: `${height}px` } : undefined" @mousemove="onMove" @mouseleave="hover = null" @click="onClick">
    <!-- Maps (pick D): a faint column per map, behind the line; the best one named. -->
    <span v-for="m in mapCols" :key="'m' + m.from" :class="[$style.mapCol, { [$style.mapBest]: m.best }]" :style="{ left: m.x + '%', width: m.w + '%' }" />
    <span v-if="bestMap" :class="$style.mapLabel" :style="bestMap.x > 70 ? { right: (100 - bestMap.x - bestMap.w) + '%' } : { left: bestMap.x + '%' }">{{ bestMap.name }} {{ signed(bestMap.gainDiv!) }}<Coin /></span>
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" :class="$style.svg" aria-hidden="true">
      <template v-if="mode === 'total'">
        <path v-if="area" :d="area" :class="$style.area" />
        <!-- At Faustus (pick A): a band on top of the stash, so its top edge is all you own. -->
        <template v-if="band">
          <path :d="band.d" :class="$style.listed" data-listed-band />
          <path :d="band.top" :class="$style.listedTop" vector-effect="non-scaling-stroke" />
        </template>
        <path v-if="line" :d="line" :class="$style.line" vector-effect="non-scaling-stroke" />
      </template>
      <template v-else>
        <path v-for="b in bands" :key="b.id" :d="b.d" :style="{ fill: b.colour }" :class="$style.band" />
      </template>
      <line v-if="goalY != null" x1="0" :x2="W" :y1="goalY" :y2="goalY" :class="$style.goal" vector-effect="non-scaling-stroke" />
    </svg>
    <!-- The live run's start (runs.ts): a gold line where it counts from. -->
    <span v-if="runLine != null" :class="$style.runStart" :style="{ left: runLine + '%' }" />
    <!-- Sales (Guy's pick S2, 2026-11-24): a small tick on the bottom edge per
         slot of time with a sale, off the line; the hover card counts them. -->
    <span v-for="(m, i) in saleTicks" :key="'t' + i + ':' + m.at" :class="$style.saleTick" :style="{ left: m.x + '%' }" data-sale-tick />
    <template v-if="shown">
      <span :class="$style.dot" :style="{ left: shown.x + '%', top: shown.y + '%' }" />
      <!-- Follows the mouse; a click keeps it open (pinned), and then its item
           names take the item tooltip and menu. -->
      <div ref="tipEl" :class="[$style.tip, place.below ? $style.below : $style.above, $style[place.align], { [$style.pinned]: !!pinned, [$style.wide]: !!tipBelow }]"
        :style="{ left: shown.x + '%', top: shown.y + '%' }" data-chart-card>
        <b class="w-num">{{ when(shown.p.at) }} · {{ fmt(shown.listed ? shown.p.div + shown.listed : shown.p.div) }}<Coin /><template v-if="shown.p.netDiv != null"> · {{ signed(shown.p.netDiv) }}<Coin /></template></b>
        <span v-if="shown.listed" class="w-num">Stash {{ fmt(shown.p.div) }}<Coin /> · <span :class="$style.listedText">At Faustus {{ fmt(shown.listed) }}<Coin /></span></span>
        <span v-if="shownMap">{{ shownMap.name }}<template v-if="shownMap.gainDiv != null"> · {{ signed(shownMap.gainDiv) }}<Coin /></template></span>
        <!-- Hovered: the totals and what sold. Clicked (pinned): what changed too. -->
        <span v-if="shownSales.count" :class="$style.saleText" class="w-num">Sold {{ shownSales.count }} {{ shownSales.count === 1 ? 'item' : 'items' }}<template v-if="shownSales.div > 0"> · {{ fmt(shownSales.div) }}<Coin /></template></span>
        <span v-if="shown.p.spentDiv" :class="$style.spendText">Purchase: {{ fmt(shown.p.spentDiv) }}<Coin />, not counted as a loss</span>
        <span v-if="shown.p.daily" class="w-dim">That day's last read</span>
        <!-- What sold shows on hover too (Guy, 2026-11-24). The card ignores the
             mouse until pinned, so no item tooltip pops over it on hover. -->
        <span v-for="(x, i) in shownSales.list" :key="'s' + i" :class="$style.soldRow"><span v-item-tip="x.tip ?? null" :class="$style.item">{{ x.text }}</span></span>
        <span v-if="shownSales.more" class="w-dim">+{{ shownSales.more }} more sold</span>
        <span v-if="pinned && shown.p.top.length">
          <template v-for="(t, i) in shown.p.top" :key="i"><span v-item-tip="tipOf ? topTip(t) : null" :class="$style.item">{{ t }}</span><template v-if="i < shown.p.top.length - 1">, </template></template>
        </span>
        <span v-else-if="!pinned && (shown.p.top.length || (!shown.p.daily && shown.p.netDiv != null && spendAction?.(shown.p.at)))" class="w-dim">Click for what changed</span>
        <!-- Purchases (spend.ts): mark a losing refresh as one, with how much,
             or say a purchase wasn't one. -->
        <div v-if="pinAction" :class="$style.spendBar">
          <template v-if="pinAction.mark === 'spend'">
            <label :class="$style.spendAmount">Spent <input v-model.number="amountDiv" type="number" min="0" step="0.1" :class="$style.spendInput" aria-label="Amount spent"><Coin /></label>
            <button type="button" :class="$style.spendBtn" @click="markSpend('spend', amountDiv)">Mark as purchase</button>
          </template>
          <button v-else type="button" :class="$style.spendBtn" @click="markSpend(pinAction.mark)">{{ pinAction.label }}</button>
        </div>
        <!-- Strategy runs (runs.ts): count a run from this read. -->
        <div v-if="pinned && runFrom && !pinned.p.daily" :class="$style.spendBar">
          <button type="button" :class="$style.spendBtn" @click="startRunHere">Start a run from here</button>
        </div>
      </div>
    </template>
    <div v-if="series.length < 2" :class="$style.empty" class="w-dim text-xs">The line fills in as you refresh.</div>
  </div>
</template>

<script setup lang="ts">
// The net worth line (B1): a point per refresh, small gold ticks where things
// sold, hover for a short card, click for what changed. By category (B2): the same points stacked. Goal line (D6).
import { computed, onUnmounted, shallowRef, watch } from 'vue'
import { vItemTip } from '../ui'
import type { ItemTipRef } from '../ui/tooltip/item-tip'
import { formatAmount } from '../ui/format'
import { parseTop } from './tips'
import Coin from './Coin.vue'
import { tipPlacement } from './ledger'
import type { SeriesPoint } from './ledger'
import type { Category } from './valuation'
import type { SpendMark } from './spend'
import { groupSales, mapOf } from './chart-marks'
import type { ChartMap, ChartSale } from './chart-marks'

const props = defineProps<{
  series: SeriesPoint[]
  mode: 'total' | 'category'
  goalDiv: number | null
  // The item tooltip for a name in a pinned card.
  tipOf?: (name: string, count: number) => ItemTipRef
  // px; 80 when left out (the dock card uses a shorter one).
  height?: number
  // Always open the hover card below the line (the dock card scrolls, so
  // one above the chart would be cut off).
  tipBelow?: boolean
  // A clicked point's purchase switch (spend.ts); left out: none.
  spendAction?: (at: number) => { label: string, mark: SpendMark | null } | null
  // Your sales: ticks on the bottom edge, and each point's card counts those since the point before.
  sales?: ChartSale[]
  // Offer "Start a run from here" on a clicked point (runs.ts).
  runFrom?: boolean
  // The live run's start, drawn as a line.
  runStartAt?: number | null
  // At Faustus at each point of `series` (pick A), in the chart's unit; left
  // out or all 0: no band.
  listed?: number[]
  // Your maps (pick D): a column each.
  maps?: ChartMap[]
}>()
// Mark or unmark a refresh as a purchase; amount in the chart's unit.
const emit = defineEmits<{ spend: [at: number, mark: SpendMark | null, amount?: number], run: [at: number] }>()
function startRunHere () {
  const p = pinned.value?.p
  if (!p) return
  emit('run', p.at)
  pinned.value = null
}

const W = 400
const H = 80
const PAD = 4
const CAT_ORDER: Category[] = ['currency', 'fragments', 'cards', 'gear', 'other']
const CAT_COLOUR: Record<Category, string> = {
  currency: 'var(--w-r-currency)',
  fragments: 'var(--w-r-normal)',
  cards: 'var(--w-r-divination)',
  gear: 'var(--w-r-unique)',
  other: 'var(--w-faint)'
}

const box = shallowRef<HTMLElement | null>(null)
type At = { p: SeriesPoint, x: number, y: number, listed: number }
const hover = shallowRef<At | null>(null)
// A clicked point's card stays until a click elsewhere, Esc, or new points.
const pinned = shallowRef<At | null>(null)
const shown = computed<At | null>(() => {
  const a = pinned.value ?? hover.value
  if (!a) return null
  // Worked out again: the band or the mode can change under a pinned card.
  const i = props.series.findIndex(p => p.at === a.p.at)
  if (i < 0) return a
  return { ...a, y: yOf(props.mode === 'total' ? topOf(i) : sumCats(a.p)) / H * 100, listed: listedOf(i) }
})
const tipEl = shallowRef<HTMLElement | null>(null)
const topTip = (t: string) => { const x = parseTop(t); return props.tipOf!(x.name, Math.abs(x.count)) }

const pinAction = computed(() => {
  const p = pinned.value?.p
  if (!p || p.daily || p.netDiv == null || !props.spendAction) return null
  return props.spendAction(p.at)
})
// The amount box starts at the whole drop.
const amountDiv = shallowRef(0)
watch(() => pinned.value?.p.at, () => {
  const n = pinned.value?.p.netDiv
  amountDiv.value = n != null && n < 0 ? Math.round(-n * 10) / 10 : 0
})
function markSpend (mark: SpendMark | null, amount?: number) {
  const p = pinned.value?.p
  if (!p) return
  emit('spend', p.at, mark, amount != null && Number.isFinite(amount) && amount >= 0 ? amount : undefined)
  pinned.value = null
}

function onClick (e: MouseEvent) {
  if (tipEl.value?.contains(e.target as Node)) return
  const h = hover.value
  pinned.value = !h || (pinned.value && pinned.value.p.at === h.p.at) ? null : h
}
function outside (e: PointerEvent) {
  if (!box.value?.contains(e.target as Node)) pinned.value = null
}
function onKey (e: KeyboardEvent) {
  if (e.key === 'Escape') pinned.value = null
}
watch(pinned, (on, was) => {
  if (on && !was) {
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('keydown', onKey)
  } else if (!on && was) {
    document.removeEventListener('pointerdown', outside, true)
    document.removeEventListener('keydown', onKey)
  }
})
// New points drop the pinned card only when its point is gone (the dock card
// rebuilds its series as the clock moves).
watch(() => [props.series, props.mode], () => {
  if (pinned.value && !props.series.some(p => p.at === pinned.value!.p.at)) pinned.value = null
})
onUnmounted(() => {
  document.removeEventListener('pointerdown', outside, true)
  document.removeEventListener('keydown', onKey)
})

const span = computed(() => {
  const s = props.series
  const t0 = s[0]?.at ?? 0
  const t1 = s[s.length - 1]?.at ?? 1
  // The bottom from the stash line, the top from the band's edge: both stay
  // inside the chart.
  let lo = Math.min(...s.map(p => p.div))
  let hi = Math.max(...s.map((p, i) => p.div + (props.mode === 'total' ? listedOf(i) : 0)))
  // The goal joins the scale when it's within reach of the line.
  if (props.goalDiv && props.goalDiv <= hi * 1.5) hi = Math.max(hi, props.goalDiv)
  if (props.mode === 'category') lo = 0
  if (hi === lo) { hi += 1; lo = Math.max(0, lo - 1) }
  return { t0, t1: t1 === t0 ? t0 + 1 : t1, lo, hi }
})

const place = computed(() => {
  if (!shown.value) return { below: false, align: 'center' as const }
  const p = tipPlacement(shown.value.x, shown.value.y)
  return props.tipBelow ? { ...p, below: true } : p
})

// At Faustus at point i (0 without a band).
const hasBand = computed(() => props.mode === 'total' && !!props.listed && props.listed.length === props.series.length && props.listed.some(v => v > 0))
const listedOf = (i: number) => hasBand.value ? Math.max(0, props.listed![i] ?? 0) : 0
const topOf = (i: number) => props.series[i].div + listedOf(i)

const xOf = (at: number) => (at - span.value.t0) / (span.value.t1 - span.value.t0) * W
const yOf = (v: number) => H - PAD - (v - span.value.lo) / (span.value.hi - span.value.lo) * (H - 2 * PAD)

const line = computed(() => props.series.length >= 2 ? 'M' + props.series.map(p => `${xOf(p.at).toFixed(1)},${yOf(p.div).toFixed(1)}`).join(' L') : '')
const area = computed(() => line.value ? `${line.value} L${W},${H} L0,${H} Z` : '')

const band = computed(() => {
  const s = props.series
  if (!hasBand.value || s.length < 2) return null
  const up = s.map((p, i) => `${xOf(p.at).toFixed(1)},${yOf(topOf(i)).toFixed(1)}`)
  const down = s.map(p => `${xOf(p.at).toFixed(1)},${yOf(p.div).toFixed(1)}`).reverse()
  return { d: `M${up.join(' L')} L${down.join(' L')} Z`, top: `M${up.join(' L')}` }
})

const bands = computed(() => {
  const s = props.series
  if (s.length < 2) return []
  const base = s.map(() => 0)
  return CAT_ORDER.map(c => {
    const top = s.map((p, i) => base[i] + p.byCategory[c])
    const up = s.map((p, i) => `${xOf(p.at).toFixed(1)},${yOf(top[i]).toFixed(1)}`)
    const down = s.map((p, i) => `${xOf(p.at).toFixed(1)},${yOf(base[i]).toFixed(1)}`).reverse()
    top.forEach((v, i) => { base[i] = v })
    return { id: c, colour: CAT_COLOUR[c], d: `M${up.join(' L')} L${down.join(' L')} Z` }
  })
})

// Only while it lies inside the chart (a goal passed long ago would draw under it).
const goalY = computed(() => props.goalDiv && props.goalDiv <= span.value.hi && props.goalDiv >= span.value.lo ? yOf(props.goalDiv) : null)

// One tick per slot of time with a sale, on the bottom edge (pick S2).
const saleTicks = computed(() => {
  if (props.mode !== 'total' || props.series.length < 2 || !props.sales?.length) return []
  const { t0, t1 } = span.value
  return groupSales(props.sales.filter(x => x.at >= t0 && x.at <= t1), t0, t1, 48).map(x => ({ at: x.at, x: xOf(x.at) / W * 100 }))
})
// The map columns in view, and the best one named.
const mapCols = computed(() => {
  const ms = props.maps
  if (props.mode !== 'total' || props.series.length < 2 || !ms?.length) return []
  const { t0, t1 } = span.value
  const inView = ms.filter(m => m.to > t0 && m.from < t1)
  const best = inView.reduce<ChartMap | null>((b, m) => m.gainDiv != null && m.gainDiv > 0 && (!b || m.gainDiv > b.gainDiv!) ? m : b, null)
  return inView.map(m => {
    const a = xOf(Math.max(t0, m.from)) / W * 100
    const z = xOf(Math.min(t1, m.to)) / W * 100
    return { ...m, x: a, w: Math.max(0.3, z - a), best: m === best }
  })
})
const bestMap = computed(() => mapCols.value.find(m => m.best) ?? null)
const shownMap = computed(() => shown.value && props.maps?.length && props.mode === 'total' ? mapOf(props.maps, shown.value.p.at) : null)
// The card names this many sales, dearest first, then "+N more sold".
const SOLD_LIST = 6
const shownSales = computed(() => {
  const p = shown.value?.p
  if (!p || !props.sales?.length) return { list: [], more: 0, count: 0, div: 0 }
  const i = props.series.findIndex(q => q.at === p.at)
  // The first point counts only sales at its own time, not the whole league before it.
  const from = i > 0 ? props.series[i - 1].at : p.at - 1
  const list = props.sales.filter(x => x.at > from && x.at <= p.at).sort((a, b) => (b.div ?? -1) - (a.div ?? -1))
  return { list: list.slice(0, SOLD_LIST), more: Math.max(0, list.length - SOLD_LIST), count: list.length, div: list.reduce((n, x) => n + (x.div ?? 0), 0) }
})

const runLine = computed(() => {
  const at = props.runStartAt
  if (at == null || props.series.length < 2 || at < span.value.t0 || at > span.value.t1) return null
  return xOf(at) / W * 100
})

function onMove (e: MouseEvent) {
  const el = box.value
  const s = props.series
  if (!el || !s.length) return
  const r = el.getBoundingClientRect()
  const at = span.value.t0 + (e.clientX - r.left) / r.width * (span.value.t1 - span.value.t0)
  let i = 0
  s.forEach((q, k) => { if (Math.abs(q.at - at) < Math.abs(s[i].at - at)) i = k })
  // On a sale tick (within 6 px): the read that counts that sale, the first at or after it.
  const px = (e.clientX - r.left) / r.width * 100
  const tick = saleTicks.value.find(t => Math.abs(t.x - px) / 100 * r.width <= 6)
  if (tick) {
    const k = s.findIndex(q => q.at >= tick.at)
    if (k >= 0) i = k
  }
  const p = s[i]
  hover.value = { p, x: xOf(p.at) / W * 100, y: yOf(props.mode === 'total' ? topOf(i) : sumCats(p)) / H * 100, listed: listedOf(i) }
}

const sumCats = (p: SeriesPoint) => CAT_ORDER.reduce((s, c) => s + p.byCategory[c], 0)
const fmt = (n: number) => formatAmount(n)
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatAmount(Math.abs(n))}`
function when (at: number) {
  const d = new Date(at)
  const today = new Date().toDateString() === d.toDateString()
  const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return today ? `Today ${t}` : `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} ${t}`
}
</script>

<style module>
.chart { position: relative; height: 80px; }
.svg { display: block; width: 100%; height: 100%; overflow: visible; }
.area { fill: color-mix(in srgb, var(--w-gold) 18%, transparent); }
.line { fill: none; stroke: var(--w-gold); stroke-width: 1.5; }
.band { opacity: .55; }
.goal { stroke: var(--w-up); stroke-width: 1; stroke-dasharray: 4 3; }
.runStart { position: absolute; top: 0; bottom: 0; width: 0; border-left: 2px solid var(--w-gold); opacity: .7; pointer-events: none; }
.spendText { color: var(--w-info); }
.saleTick { position: absolute; bottom: 0; width: 2px; height: 7px; margin-left: -1px; background: var(--w-accent); pointer-events: none; }
.listed { fill: color-mix(in srgb, var(--w-higher) 24%, transparent); }
.listedTop { fill: none; stroke: var(--w-higher); stroke-width: 1; stroke-dasharray: 3 2; opacity: .85; }
.listedText { color: var(--w-higher); }
.mapCol { position: absolute; top: 0; bottom: 0; background: color-mix(in srgb, var(--w-fg) 5%, transparent); pointer-events: none; }
.mapBest { background: color-mix(in srgb, var(--w-gold) 13%, transparent); }
.mapLabel { position: absolute; top: 1px; display: inline-flex; align-items: center; gap: 2px; padding: 0 2px; font-size: var(--w-fs-xs); line-height: 1.2; color: var(--w-gold); white-space: nowrap; pointer-events: none; }
.saleText { color: var(--w-gold); }
.spendBar { display: flex; align-items: center; gap: 8px; margin-top: 3px; flex-wrap: wrap; }
.spendAmount { display: inline-flex; align-items: center; gap: 4px; color: var(--w-dim); }
.spendInput { width: 56px; background: var(--w-panel-solid); color: var(--w-fg); border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm); padding: 0 4px; font: inherit; }
.spendBtn { color: var(--w-accent); text-decoration: underline; background: none; border: 0; padding: 0; cursor: pointer; font: inherit; }
.dot { position: absolute; width: 8px; height: 8px; border-radius: 50%; background: var(--w-fg); box-shadow: 0 0 0 2px var(--w-panel-solid), 0 0 0 3px var(--w-gold); transform: translate(-50%, -50%); pointer-events: none; }
.tip {
  position: absolute; z-index: 5; pointer-events: none;
  display: flex; flex-direction: column; gap: 1px; width: max-content; max-width: 300px; white-space: normal;
  background: var(--w-panel-solid); border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm);
  padding: 4px 7px; font-size: var(--w-fs-xs); color: var(--w-fg); box-shadow: 0 4px 12px rgba(0, 0, 0, .5);
}
.pinned { pointer-events: auto; border-color: var(--w-gold); }
/* Below the point, as wide as the chart: never past the dock card's sides. */
.wide { left: 0 !important; right: 0; width: auto; max-width: none; transform: translate(0, 12px) !important; }
.pinned .item { text-decoration: underline dotted; text-underline-offset: 2px; cursor: help; }
.soldRow { padding-left: 8px; }
.chart { cursor: pointer; }
.above { --ty: calc(-100% - 10px); }
.below { --ty: 12px; }
.center { transform: translate(-50%, var(--ty)); }
.left { transform: translate(-4px, var(--ty)); }
.right { transform: translate(calc(-100% + 4px), var(--ty)); }
.empty { position: absolute; inset: 0; display: grid; place-items: center; }
</style>
