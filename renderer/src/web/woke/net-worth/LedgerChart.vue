<template>
  <div ref="box" :class="$style.chart" @mousemove="onMove" @mouseleave="hover = null" @click="onClick">
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" :class="$style.svg" aria-hidden="true">
      <template v-if="mode === 'total'">
        <path v-if="area" :d="area" :class="$style.area" />
        <path v-if="line" :d="line" :class="$style.line" vector-effect="non-scaling-stroke" />
      </template>
      <template v-else>
        <path v-for="b in bands" :key="b.id" :d="b.d" :style="{ fill: b.colour }" :class="$style.band" />
      </template>
      <line v-if="goalY != null" x1="0" :x2="W" :y1="goalY" :y2="goalY" :class="$style.goal" vector-effect="non-scaling-stroke" />
    </svg>
    <span v-for="m in marks" :key="m.at" :class="$style.mark" :style="{ left: m.x + '%', top: m.y + '%' }" />
    <template v-if="shown">
      <span :class="$style.dot" :style="{ left: shown.x + '%', top: shown.y + '%' }" />
      <!-- Follows the mouse; a click keeps it open (pinned), and then its item
           names take the item tooltip and menu. -->
      <div ref="tipEl" :class="[$style.tip, place.below ? $style.below : $style.above, $style[place.align], { [$style.pinned]: !!pinned }]"
        :style="{ left: shown.x + '%', top: shown.y + '%' }" data-chart-card>
        <b class="w-num">{{ when(shown.p.at) }} · {{ fmt(shown.p.div) }}<Coin /><template v-if="shown.p.netDiv != null"> · {{ signed(shown.p.netDiv) }}<Coin /></template></b>
        <span v-if="shown.p.top.length">
          <template v-for="(t, i) in shown.p.top" :key="i"><span v-item-tip="pinned && tipOf ? topTip(t) : null" :class="{ [$style.item]: !!pinned }">{{ t }}</span><template v-if="i < shown.p.top.length - 1">, </template></template>
        </span>
        <span v-else-if="shown.p.daily" class="w-dim">That day's last read</span>
        <span v-if="!pinned && shown.p.top.length && tipOf" class="w-dim">Click to keep this open</span>
      </div>
    </template>
    <div v-if="series.length < 2" :class="$style.empty" class="w-dim text-xs">The line fills in as you refresh.</div>
  </div>
</template>

<script setup lang="ts">
// The net worth line (B1): a point per refresh, big gains marked, hover for
// what changed. By category (B2): the same points stacked. Goal line (D6).
import { computed, onUnmounted, shallowRef, watch } from 'vue'
import { vItemTip } from '../ui'
import type { ItemTipRef } from '../ui/tooltip/item-tip'
import { formatAmount } from '../ui/format'
import { parseTop } from './tips'
import Coin from './Coin.vue'
import { tipPlacement } from './ledger'
import type { SeriesPoint } from './ledger'
import type { Category } from './valuation'

const props = defineProps<{
  series: SeriesPoint[]
  big: Set<number>
  mode: 'total' | 'category'
  goalDiv: number | null
  // The item tooltip for a name in a pinned card.
  tipOf?: (name: string, count: number) => ItemTipRef
}>()

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
type At = { p: SeriesPoint, x: number, y: number }
const hover = shallowRef<At | null>(null)
// A clicked point's card stays until a click elsewhere, Esc, or new points.
const pinned = shallowRef<At | null>(null)
const shown = computed(() => pinned.value ?? hover.value)
const tipEl = shallowRef<HTMLElement | null>(null)
const topTip = (t: string) => { const x = parseTop(t); return props.tipOf!(x.name, Math.abs(x.count)) }

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
watch(() => [props.series, props.mode], () => { pinned.value = null })
onUnmounted(() => {
  document.removeEventListener('pointerdown', outside, true)
  document.removeEventListener('keydown', onKey)
})

const span = computed(() => {
  const s = props.series
  const t0 = s[0]?.at ?? 0
  const t1 = s[s.length - 1]?.at ?? 1
  const vals = s.map(p => p.div)
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  // The goal joins the scale when it's within reach of the line.
  if (props.goalDiv && props.goalDiv <= hi * 1.5) hi = Math.max(hi, props.goalDiv)
  if (props.mode === 'category') lo = 0
  if (hi === lo) { hi += 1; lo = Math.max(0, lo - 1) }
  return { t0, t1: t1 === t0 ? t0 + 1 : t1, lo, hi }
})

const place = computed(() => shown.value ? tipPlacement(shown.value.x, shown.value.y) : { below: false, align: 'center' as const })

const xOf = (at: number) => (at - span.value.t0) / (span.value.t1 - span.value.t0) * W
const yOf = (v: number) => H - PAD - (v - span.value.lo) / (span.value.hi - span.value.lo) * (H - 2 * PAD)

const line = computed(() => props.series.length >= 2 ? 'M' + props.series.map(p => `${xOf(p.at).toFixed(1)},${yOf(p.div).toFixed(1)}`).join(' L') : '')
const area = computed(() => line.value ? `${line.value} L${W},${H} L0,${H} Z` : '')

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

const goalY = computed(() => props.goalDiv && props.goalDiv <= span.value.hi ? yOf(props.goalDiv) : null)

const marks = computed(() => props.mode !== 'total'
  ? []
  : props.series.filter(p => props.big.has(p.at)).map(p => ({ at: p.at, x: xOf(p.at) / W * 100, y: yOf(p.div) / H * 100 })))

function onMove (e: MouseEvent) {
  const el = box.value
  const s = props.series
  if (!el || !s.length) return
  const r = el.getBoundingClientRect()
  const at = span.value.t0 + (e.clientX - r.left) / r.width * (span.value.t1 - span.value.t0)
  const p = s.reduce((best, q) => Math.abs(q.at - at) < Math.abs(best.at - at) ? q : best, s[0])
  hover.value = { p, x: xOf(p.at) / W * 100, y: yOf(props.mode === 'total' ? p.div : sumCats(p)) / H * 100 }
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
.mark { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: var(--w-up); transform: translate(-50%, -50%); pointer-events: none; }
.dot { position: absolute; width: 8px; height: 8px; border-radius: 50%; background: var(--w-fg); box-shadow: 0 0 0 2px var(--w-panel-solid), 0 0 0 3px var(--w-gold); transform: translate(-50%, -50%); pointer-events: none; }
.tip {
  position: absolute; z-index: 5; pointer-events: none;
  display: flex; flex-direction: column; gap: 1px; width: max-content; max-width: 300px; white-space: normal;
  background: var(--w-panel-solid); border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm);
  padding: 4px 7px; font-size: var(--w-fs-xs); color: var(--w-fg); box-shadow: 0 4px 12px rgba(0, 0, 0, .5);
}
.pinned { pointer-events: auto; border-color: var(--w-gold); }
.item { text-decoration: underline dotted; text-underline-offset: 2px; cursor: help; }
.chart { cursor: pointer; }
.above { --ty: calc(-100% - 10px); }
.below { --ty: 12px; }
.center { transform: translate(-50%, var(--ty)); }
.left { transform: translate(-4px, var(--ty)); }
.right { transform: translate(calc(-100% + 4px), var(--ty)); }
.empty { position: absolute; inset: 0; display: grid; place-items: center; }
</style>
