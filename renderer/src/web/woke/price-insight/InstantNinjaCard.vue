<template>
  <!-- woke: the instant price check for an exchange item poe.ninja prices: a small card by
       the item instead of the window (WOKEPOET-480). Space opens the window and searches. -->
  <div ref="el" :class="[$style.anchor, { [$style.flipped]: flipped }]" :style="anchorStyle" data-testid="instant-ninja-card">
    <!-- The card by the mouse with its graph box under it, the related lists beside
         them (Guy's pick L2, 2026-11-25); left of the mouse, the lists go on the far side. -->
    <div :class="$style.main" data-main>
    <!-- The game's own tooltip look (Guy's pick I2, 2026-11-25): its header art and
         separators, the exchange rates, then what your stack is worth. -->
    <div :class="[$style.card, $style[frame]]" data-card>
      <header :class="[$style.head, { [$style.art]: headArt }]" :style="headArt">
        <span v-item-tip="{ name: item.info.refName }" :class="$style.name"><img v-if="item.info.icon" :src="item.info.icon" alt="" :class="$style.headIcon"><span :class="$style.nameText">{{ item.info.refName }}</span></span>
      </header>
      <!-- The item against a chaos and a divine, as the game's Currency Exchange shows it. -->
      <section :class="[$style.block, $style.rates]">
        <div v-for="(r, i) in rates" :key="i" :class="$style.rate" :data-testid="i === 0 ? 'instant-ninja-price' : 'instant-ninja-rate'">
          <span :class="$style.side"><span>{{ r.left.n }}</span><img v-if="sideIcon(r.left.of)" :src="sideIcon(r.left.of)" :alt="sideName(r.left.of)" :class="$style.coin"></span>
          <span :class="$style.arr">⇄</span>
          <span :class="[$style.side, $style.them]"><span>{{ r.right.n }}</span><img v-if="sideIcon(r.right.of)" :src="sideIcon(r.right.of)" :alt="sideName(r.right.of)" :class="$style.coin"></span>
        </div>
        <div v-if="!rates.length" :class="$style.rate" data-testid="instant-ninja-price">—</div>
        <div v-if="stack" :class="$style.line" data-testid="instant-ninja-stack">Your {{ have }} = <span :class="$style.fg"><w-price-text :text="stack" /></span></div>
        <!-- How sure poe.ninja's price is: Net worth's fake-price checks (ninja-trust.ts, WOKEPOET-534). -->
        <div v-if="doubtLine" :class="$style.doubt" data-testid="instant-ninja-doubt" :data-doubt="doubt?.kind"><w-price-text :text="doubtLine" /></div>
      </section>
      <!-- The item's own verdict, where it has one (Stacked Deck: open or sell). -->
      <section v-if="$slots.verdict" :class="$style.block"><slot name="verdict" /></section>
      <!-- A divination card: where it drops. -->
      <section v-if="item.category === ItemCategory.DivinationCard" :class="$style.block"><CardDrops :name="item.info.refName" compact /></section>
      <!-- Live offers only add something when poe.ninja's price is in doubt (Guy, 2026-11-25:
           "not sure price check actually even matters"). Space and the hotkey again always work. -->
      <button v-if="doubt" type="button" :class="$style.pc" data-testid="instant-ninja-live" :title="liveTitle" @click="$emit('live')">
        Price check<w-kbd keys="Space" :class="$style.kbd" /><span :class="$style.slash">/</span><svg :class="$style.lmb" viewBox="0 0 12 16" width="11" height="15" aria-label="left click"><rect x="0.75" y="0.75" width="10.5" height="14.5" rx="5.25" fill="none" stroke="currentColor" stroke-width="1.3" /><path d="M6 0.75 V6.5 H0.75 V6 A5.25 5.25 0 0 1 6 0.75 Z" fill="currentColor" /></svg>
      </button>
    </div>
    <!-- The price over 24h, 3 days or 7 days in its own box under the card: a click on a
         range or the mouse wheel steps through them (Guy, 2026-11-25). -->
    <!-- The graph box, and beside it a divine's parts in chaos (Guy, 2026-11-25). -->
    <div :class="$style.aside" data-aside>
    <div v-if="info" :class="$style.gbox" data-testid="instant-ninja-graph" :title="hasHistory ? 'Scroll or click: 24h, 3 days, 7 days' : undefined" @wheel="onWheel">
      <div v-if="hasHistory" :class="$style.gtabs">
        <button v-for="r in RANGES" :key="r.id" type="button" tabindex="-1" :class="{ [$style.on]: r.id === range }" :data-testid="`instant-ninja-range-${r.id}`" @mousedown.prevent @click="setRange(r.id)">{{ r.id }}</button>
      </div>
      <!-- The graph stretches to the box's width, which fills the card's width (Guy, 2026-11-25). -->
      <div v-if="spark.length > 1" ref="plot" :class="$style.plot" data-testid="instant-ninja-plot"><w-spark :values="spark" :width="plotSize.w" :height="plotSize.h" /></div>
      <div v-else-if="hasHistory && !(range === '24h' && savedLoading)" :class="$style.nograph">No change yet</div>
      <span v-if="change != null" :class="change >= 0 ? 'w-up' : 'w-down'" :title="changeTitle" data-testid="instant-ninja-change">{{ change >= 0 ? '▲' : '▼' }}{{ Math.abs(change) }}%</span>
      <span :class="$style.src" data-testid="instant-ninja-badge" :title="badgeTip" :data-tip-keys="againKeys ?? 'Space'">poe.ninja<template v-if="age">, {{ age }}</template></span>
    </div>
    <!-- A Divine Orb or Chaos Orb: 0.1 to 1 div in chaos beside the card, for paying part of a divine. -->
    <div v-if="tenths" :class="$style.tenths" data-testid="instant-ninja-tenths">
      <div :class="$style.tenthsHead"><span>Divine in chaos</span></div>
      <table :class="$style.tenthsTable">
        <tbody>
          <tr v-for="t in tenths" :key="t.div"><td><w-price-text :text="t.div" /></td><td><w-price-text :text="t.chaos" /></td></tr>
        </tbody>
      </table>
    </div>
    </div>
    </div>
    <!-- Related items (the item's family, what drops it), as beside the window. -->
    <div :class="$style.lists"><slot /></div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import type { ParsedItem } from '@/parser'
import { ItemCategory } from '@/parser'
import { usePoeninja } from '@/web/background/Prices'
import { ninjaTotal, divineTenths, chaosOrbRow, ninjaRates } from './ninja-first'
import type { RateSide } from './ninja-first'
import { instantCardKey, onKeyboardFocusedControl } from './instant-card-key'
import { useNinjaDoubt } from './use-ninja-doubt'
import { doubtText } from './ninja-trust'
import { exactDetailsId } from '@/web/price-check/trends/getDetailsId'
import { useLeagues } from '@/web/background/Leagues'
import { savedPriceSeries } from '../market/db'
import { typeForSlug } from '../market/types'
import { ninjaRange, savedRange } from '../market/ranges'

const DAY_MS = 24 * 3600 * 1000
// One point every 4 hours.
const DAY_POINTS = 7
const SAVED_WAIT_MS = 400
import { WSpark, WKbd, WPriceText, agoPhrase, vItemTip } from '../ui'
import { wheelStep } from '../dock/wheel'

const CardDrops = defineAsyncComponent(() => import('../card-drops/CardDrops.vue'))

const props = defineProps<{
  item: ParsedItem
  /** The cursor when the item was checked, in the overlay's CSS px. */
  at: { x: number, y: number }
  /** The price check is showing: a hidden card (widgets hide with v-show) takes no keys. */
  active: boolean
  /** The price check hotkey: pressed again on the item, it opens live offers. */
  againKeys: string | null
}>()
const emit = defineEmits<{
  /** `byKey`: Space or Enter, not a click. */
  live: [byKey?: boolean]
  close: []
  /** Where the card ended up, in the overlay's CSS px, so the mouse can be tracked into it. */
  placed: [rect: DOMRect]
}>()

// Keeps clear of the cursor and the game's own tooltip, which opens up and to the right of it.
// The pointer (about 20 x 32 px at 100%) hangs down and right of its hotspot:
// the card starts right of it, its top a little above the hotspot. On the left
// side the pointer is no obstacle, so a small gap does.
const RIGHT_GAP = 40
const LEFT_GAP = 16
const ABOVE = 12

const { findPriceByQuery, xchgRate, updatedAt } = usePoeninja()
const info = computed(() => {
  const q = exactDetailsId(props.item)
  const row = chaosOrbRow(props.item, xchgRate.value) ?? (q && findPriceByQuery(q))
  return row && row.chaos > 0 ? row : null
})

// Guy's wording (2026-11-22); the key shows boxed under it (title-tip.ts).
const badgeTip = computed(() => `This is used to provide instant pricing without any delay. For live data, press${props.againKeys ? ' the price check key again' : ''}:`)

const isDivine = computed(() => props.item.info.refName === 'Divine Orb')
// A Chaos Orb is 1c: its stack in chaos says nothing, and it has no graph (chaosOrbRow).
const isChaos = computed(() => props.item.info.refName === 'Chaos Orb')
const have = computed(() => props.item.stackSize?.value ?? 1)
const stack = computed(() => info.value && have.value > 1 && !isChaos.value ? ninjaTotal(info.value.chaos * have.value, isDivine.value ? undefined : xchgRate.value) : null)
const tenths = computed(() => {
  if (isDivine.value && info.value) return divineTenths(info.value.chaos)
  if (isChaos.value && xchgRate.value) return divineTenths(xchgRate.value)
  return null
})
const age = computed(() => agoPhrase(updatedAt.value))
const rates = computed(() => info.value ? ninjaRates(info.value.chaos, xchgRate.value, isDivine.value ? 'divine' : isChaos.value ? 'chaos' : null) : [])
function sideIcon (of: RateSide['of']): string {
  return of === 'c' ? '/images/chaos.png' : of === 'div' ? '/images/divine.png' : (props.item.info.icon ?? '')
}
function sideName (of: RateSide['of']): string {
  return of === 'c' ? 'Chaos Orb' : of === 'div' ? 'Divine Orb' : props.item.info.refName
}
// The game's header art for the item's kind; a card, like the game, has its own colour.
const frame = computed(() => props.item.category === ItemCategory.DivinationCard ? 'divcard' : props.item.info.namespace === 'ITEM' ? 'currency' : 'normal')
const headArt = computed(() => {
  if (frame.value === 'divcard') return undefined
  const file = (side: string) => `url(/images/item-frame/header-${frame.value}-${side}.png)`
  return { backgroundImage: `${file('left')}, ${file('right')}, ${file('middle')}` }
})
const doubt = useNinjaDoubt(info)
const doubtLine = computed(() => doubt.value ? doubtText(doubt.value, c => ninjaTotal(c, xchgRate.value)) : null)
// The last day (Guy, 2026-11-23): the prices this app saved about every 30
// minutes when it was running a day ago, else poe.ninja's last two daily prices.
const leagues = useLeagues()
const saved = shallowRef<Array<number | null> | null>(null)
// Waiting for the saved prices: the change shows once they're in, or after a
// short wait with poe.ninja's, so it never flips while the card is up.
const savedLoading = shallowRef(false)
const dayTrend = computed(() => {
  const row = info.value
  if (!row || savedLoading.value) return null
  if (saved.value) {
    const own = savedRange(row.chaos, saved.value)
    if (own) return { ...own, from: 'saved' as const }
  }
  const ninja = ninjaRange(row.chaos, row.graph, 1)
  return ninja.change == null ? null : { ...ninja, from: 'ninja' as const }
})
// The graph box's range, remembered for every card: 24h from the prices this
// app saves (else poe.ninja's last day), 3 and 7 days from poe.ninja's daily line.
const RANGES = [
  { id: '24h', long: 'the last 24 hours' },
  { id: '3d', long: 'the last 3 days' },
  { id: '7d', long: 'the last 7 days' }
] as const
type CardRange = typeof RANGES[number]['id']
const RANGE_KEY = 'woke.instantRange'
function readRange (): CardRange {
  try {
    const v = localStorage.getItem(RANGE_KEY)
    return RANGES.some(r => r.id === v) ? v as CardRange : '24h'
  } catch { return '24h' }
}
const range = shallowRef<CardRange>(readRange())
function setRange (id: CardRange) {
  range.value = id
  try { localStorage.setItem(RANGE_KEY, id) } catch { /* not kept: fine */ }
}
function stepRange (by: number) {
  const at = RANGES.findIndex(r => r.id === range.value)
  setRange(RANGES[(at + by + RANGES.length) % RANGES.length].id)
}
const shownTrend = computed(() => {
  const row = info.value
  if (!row) return null
  if (range.value === '24h') return dayTrend.value
  const days = range.value === '3d' ? 3 : Array.isArray(row.graph) ? row.graph.length - 1 : 6
  const ninja = ninjaRange(row.chaos, row.graph, days)
  return ninja.change == null ? null : { ...ninja, from: 'ninja' as const }
})
// No line at all (a new item, the app not running yesterday): the box keeps only poe.ninja's age.
const hasHistory = computed(() => {
  const g = info.value?.graph
  return (Array.isArray(g) && g.filter(v => typeof v === 'number').length > 1) || (saved.value?.some(v => v != null) ?? false)
})
function onWheel (e: WheelEvent) {
  if (!hasHistory.value) return
  e.preventDefault()
  // A touchpad's many small deltas add up to one notch (dock/wheel.ts).
  const dir = wheelStep(e)
  if (dir) stepRange(dir)
}
const spark = computed(() => shownTrend.value?.trend ?? [])
const change = computed(() => shownTrend.value?.change != null ? Math.round(shownTrend.value.change) : null)
const changeTitle = computed(() => {
  const long = RANGES.find(r => r.id === range.value)!.long
  return shownTrend.value?.from === 'saved'
    ? `Change over ${long}, from the prices this app saves about every 30 minutes`
    : `Change over ${long}, from poe.ninja's daily prices`
})
const liveTitle = computed(() => `Live offers from the trade site: Space, a click${props.againKeys ? `, or ${props.againKeys} again` : ''}`)
// Types the app's snapshots leave out (market/parse.ts, Prices.ts lookup-only).
const NOT_SAVED = new Set(['ClusterJewel', 'BaseType'])
watch(info, async (row) => {
  saved.value = null
  savedLoading.value = false
  const league = leagues.selectedId.value
  const type = row ? typeForSlug(row.slug) : undefined
  if (!row || !league || !type || NOT_SAVED.has(type)) return
  savedLoading.value = true
  const wait = setTimeout(() => { if (info.value === row) savedLoading.value = false }, SAVED_WAIT_MS)
  try {
    const got = await savedPriceSeries(league, type, DAY_MS, [row.name], DAY_POINTS, 5000)
    if (info.value === row && savedLoading.value) saved.value = got.rows[`${row.name}\u0000${row.variant ?? ''}`] ?? null
  } catch {
    // No saved prices: poe.ninja's daily line stands in.
  } finally {
    clearTimeout(wait)
    if (info.value === row) savedLoading.value = false
  }
}, { immediate: true })

// Left of the cursor when the right side has no room, above it when the bottom has none.
const el = shallowRef<HTMLElement | null>(null)
const pos = shallowRef({ left: props.at.x + RIGHT_GAP, top: props.at.y - ABOVE })
const anchorStyle = computed(() => ({ left: `${pos.value.left}px`, top: `${pos.value.top}px` }))
// Left of the mouse: the card goes on the mouse's side, the lists beyond it.
const flipped = computed(() => pos.value.left < props.at.x)

// Right of and below the cursor; left of it when the right has no room, and up
// as far as the screen needs when the bottom has none.
function place () {
  const node = el.value
  if (!node) return
  const w = node.offsetWidth
  // Only the card and the graph box under it decide the height, so the card stays
  // by the mouse (Guy, 2026-11-25); the lists beside fold groups to fit the screen.
  const head = node.querySelector('[data-main]')?.getBoundingClientRect().height ?? node.offsetHeight
  const { x, y } = props.at
  const left = x + RIGHT_GAP + w <= window.innerWidth ? x + RIGHT_GAP : Math.max(0, x - LEFT_GAP - w)
  const top = Math.max(0, Math.min(y - ABOVE, window.innerHeight - head))
  if (left !== pos.value.left || top !== pos.value.top) pos.value = { left, top }
}
// Related items load after the card, and change its size.
let resize: ResizeObserver | undefined
// The plot's own size (clientWidth is in the box's zoomed CSS px, as the svg's).
const plot = shallowRef<HTMLElement | null>(null)
const plotSize = shallowRef({ w: 92, h: 32 })
const plotResize = new ResizeObserver(() => {
  const p = plot.value
  if (!p) return
  const w = Math.max(40, Math.floor(p.clientWidth))
  const h = Math.max(24, Math.floor(p.clientHeight))
  if (w !== plotSize.value.w || h !== plotSize.value.h) plotSize.value = { w, h }
})
watch(plot, (now, was) => {
  if (was) plotResize.unobserve(was)
  if (now) plotResize.observe(now)
})
let stopKids: (() => void) | undefined

function onKey (e: KeyboardEvent) {
  if (!props.active || e.defaultPrevented || e.repeat || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return
  // Typing in another panel (Ctrl+Space search, Settings) is never for the card.
  const t = e.target as HTMLElement | null
  if (t && t !== document.body && !el.value?.contains(t)) return
  if (t?.closest('input, textarea, select, [contenteditable]')) return
  // A focused button keeps its own Enter and Space.
  const action = instantCardKey(e.key, onKeyboardFocusedControl(t))
  if (action === 'live') {
    e.preventDefault()
    emit('live', true)
  } else if (action === 'close') {
    emit('close')
  }
}

// Room around the card and its related items that still counts as on them, so
// a move between the two (or along an edge) doesn't hand the mouse back to the game.
const TRACK_PAD = 24
const CURSOR_CLEAR = 12

// Everything the card shows: the card and the related items under it, which can
// reach past the anchor's own box (it's capped at the screen's height).
function shownRect (node: HTMLElement): DOMRect | null {
  // Hidden (the widget is display:none): nothing to track.
  if (!node.offsetWidth) return null
  let { left, top, right, bottom } = node.getBoundingClientRect()
  for (const child of node.querySelectorAll(':scope > *, :scope .w-pc-side, :scope [data-aside]')) {
    const r = child.getBoundingClientRect()
    if (!r.width || !r.height) continue
    left = Math.min(left, r.left); top = Math.min(top, r.top)
    right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom)
  }
  left -= TRACK_PAD; right += TRACK_PAD; top -= TRACK_PAD; bottom += TRACK_PAD
  // Never over the item that was checked: a click or move there is for the game.
  const { x } = props.at
  if (left > x - TRACK_PAD) left = Math.max(left, x + CURSOR_CLEAR)
  else right = Math.min(right, x - CURSOR_CLEAR)
  return new DOMRect(left, top, right - left, bottom - top)
}

async function placeAndReport () {
  // The widget can still be display:none in the flush that mounts the card.
  await new Promise(resolve => requestAnimationFrame(resolve))
  place()
  await nextTick()
  const rect = el.value && shownRect(el.value)
  if (rect) emit('placed', rect)
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
  placeAndReport()
  resize = new ResizeObserver(() => { placeAndReport() })
  resize.observe(el.value!)
  // The related items appear after the card; watch them too, not only the anchor.
  const kids = new MutationObserver(() => {
    for (const child of el.value?.children ?? []) resize?.observe(child)
  })
  kids.observe(el.value!, { childList: true })
  for (const child of el.value!.children) resize.observe(child)
  const aside = el.value!.querySelector('[data-aside]')
  if (aside) resize.observe(aside)
  stopKids = () => kids.disconnect()
})
watch(() => props.at, placeAndReport)
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  resize?.disconnect()
  plotResize.disconnect()
  stopKids?.()
})
</script>

<style module>
/* The card reads at a glance by a stash cell: 40% over the app's UI size
   (Guy, 2026-11-24, "small and hard to read"). The list beside it follows. */
.anchor { --w-instant-scale: 1.4; --w-instant-gap: calc(6px * var(--w-ui-size, 1) * var(--w-instant-scale, 1)); position: absolute; pointer-events: auto; z-index: 5; display: flex; align-items: flex-start; gap: var(--w-instant-gap); max-height: 100%; }
.flipped { flex-direction: row-reverse; }
/* No game showing through anywhere on the card or beside it (Guy, 2026-11-25), whatever
   the panel see-through setting says: it beats theme.css's #overlay-window * rule. */
:global(#overlay-window) .anchor.anchor.anchor, :global(#overlay-window) .anchor.anchor.anchor * {
  --w-panel: var(--w-panel-solid-base);
  --w-panel-solid: var(--w-panel-solid-base);
  --w-panel-2: var(--w-panel-2-base);
  --w-pc-well: var(--w-pc-well-base);
  --w-tip-bg: #060504;
}
/* The boxes meet edge to edge (Guy, 2026-11-25, "corners all touching"): the lists are
   as tall as the card and its graph box, the card and graph box as wide as each other.
   .main keeps its own height, which place() keeps by the mouse. */
.anchor { align-items: stretch; }
.main { align-self: flex-start; display: flex; flex-direction: column; align-items: flex-start; gap: var(--w-instant-gap); }
.flipped .main { align-items: flex-end; }
.lists { display: flex; flex-direction: column; gap: var(--w-instant-gap); min-height: 0; max-height: 100%; }
.lists:empty { display: none; }
/* The last list grows to the bottom of the graph box. */
.lists > :last-child { flex-grow: 1; }
.card {
  zoom: calc(var(--w-ui-size, 1) * var(--w-instant-scale, 1));
  --tip: var(--w-r-normal);
  --tip-rgb: 200, 200, 200;
  display: flex;
  flex-direction: column;
  min-width: 15rem;
  max-width: 20rem;
  text-align: center;
  border: 1px solid rgba(var(--tip-rgb), .55);
  background: var(--w-tip-bg, rgba(0, 0, 0, .92));
  box-shadow: 0 6px 24px rgba(0, 0, 0, .7);
  color: var(--w-dim);
  font-family: var(--w-head);
  font-size: var(--w-fs-sm);
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
}
.normal { --tip: var(--w-r-normal); --tip-rgb: 200, 200, 200; --sep: url(/images/item-frame/separator-normal.png); }
.currency { --tip: var(--w-r-currency); --tip-rgb: 170, 158, 130; --sep: url(/images/item-frame/separator-currency.png); }
.divcard { --tip: var(--w-r-divination); --tip-rgb: 127, 181, 214; }
/* As GameTooltip's header: the game's art, ends fixed and the middle repeated; a card gets a colour band. */
.head {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 2px 26px;
  color: var(--tip);
  font-size: var(--w-fs-md, 13px);
  background: linear-gradient(90deg, rgba(var(--tip-rgb), .08), rgba(var(--tip-rgb), .26) 22%, rgba(var(--tip-rgb), .26) 78%, rgba(var(--tip-rgb), .08));
  border-bottom: 1px solid rgba(var(--tip-rgb), .7);
}
.art { background-position: left center, right center, center; background-size: auto 100%; background-repeat: no-repeat, no-repeat, repeat-x; border-bottom: 0; }
.name { display: inline-flex; align-items: center; min-width: 0; white-space: nowrap; }
.nameText { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.block { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 5px 12px; }
/* The game's fading line between sections. */
.block + .block { background: var(--sep, none) center top / auto 6px no-repeat, linear-gradient(90deg, transparent, rgba(var(--tip-rgb), .5), transparent) top / 80% 1px no-repeat; padding-top: 8px; }
.line { color: var(--w-dim); font-size: calc(15px * var(--w-text-scale, 1)); margin-top: 2px; }
.rates { gap: 0; }
.rate { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; width: 100%; font-family: var(--w-num); font-size: calc(19px * var(--w-text-scale, 1)); color: #fff; line-height: 1.5; }
.side { display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px; }
.them { justify-content: flex-start; }
.arr { color: var(--w-dim); font-size: var(--w-fs-sm); }
.coin { width: 1.3em; height: 1.3em; object-fit: contain; }
.doubt { color: var(--w-warn, #e0a03c); max-width: 18rem; }
.fg { color: var(--w-r-magic, #8888ff); }
/* The graph box and, for a divine, its parts in chaos: side by side under the card. */
/* As wide as the card, the graph box taking the width the table leaves (Guy, 2026-11-25: width, not height). */
.aside { align-self: stretch; display: flex; align-items: flex-start; gap: var(--w-instant-gap); }
.tenths {
  zoom: calc(var(--w-ui-size, 1) * var(--w-instant-scale, 1));
  border: 1px solid var(--w-line-strong, var(--w-line));
  border-radius: var(--w-r-sm);
  background: var(--w-pc-well, var(--w-panel-solid));
  box-shadow: 0 4px 18px rgba(0, 0, 0, .6);
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-sm);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
}
.tenthsHead { padding: 4px 10px; border-bottom: 1px solid var(--w-line); color: var(--w-accent); font-family: var(--w-head); letter-spacing: var(--w-head-track, 0); white-space: nowrap; }
.tenthsTable { border-collapse: collapse; width: 100%; }
.tenthsTable td { padding: 0 8px; line-height: calc(16px * var(--w-text-scale, 1)); white-space: nowrap; }
.tenthsTable td:first-child { color: var(--w-dim); }
.tenthsTable td:last-child { text-align: right; }
.tenthsTable tr:nth-child(even) td { background: color-mix(in srgb, var(--w-fg) 5%, transparent); }
.tenthsTable tr:last-child td { color: var(--w-accent); font-weight: 600; }
.headIcon { flex: none; width: 1.4em; height: 1.4em; object-fit: contain; margin-right: 4px; }
.gbox {
  zoom: calc(var(--w-ui-size, 1) * var(--w-instant-scale, 1));
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 6px 5px;
  border: 1px solid rgba(170, 158, 130, .55);
  background: var(--w-tip-bg, rgba(0, 0, 0, .92));
  box-shadow: 0 6px 24px rgba(0, 0, 0, .7);
  color: var(--w-dim);
  font-family: var(--w-head);
  font-size: var(--w-fs-sm);
  font-variant-numeric: tabular-nums;
}
.gtabs { display: flex; gap: 2px; }
.gtabs button { background: none; border: 1px solid transparent; color: var(--w-dim); font: inherit; font-size: var(--w-fs-xs); padding: 0 5px; cursor: pointer; }
.gtabs button:hover { color: var(--w-fg); }
.gtabs .on { color: var(--w-r-currency); border-color: rgba(170, 158, 130, .55); background: rgba(170, 158, 130, .1); }
/* Out of the flow, so the graph never sets the box's size, only fills it. */
.plot { position: relative; align-self: stretch; height: 32px; }
.plot > svg { position: absolute; inset: 0; }
.nograph { font-size: var(--w-fs-xs); padding: 8px 0; }
.src { font-size: var(--w-fs-xs); opacity: .8; }
/* One game-style button at the foot (Guy's pick I2). */
.pc {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding: 4px 8px;
  border: 0;
  border-top: 1px solid rgba(var(--tip-rgb), .55);
  background: linear-gradient(#2a2117, #1a140e);
  color: var(--w-r-currency);
  font-family: var(--w-head);
  font-size: var(--w-fs-sm);
  cursor: pointer;
}
.pc:hover { background: linear-gradient(#3a2e20, #241b12); }
.kbd { margin-left: 2px; }
.slash { color: var(--w-dim); }
.lmb { flex: none; color: var(--w-dim); }
</style>
