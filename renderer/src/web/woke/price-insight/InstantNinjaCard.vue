<template>
  <!-- woke: the instant price check for an exchange item poe.ninja prices: a small card by
       the item instead of the window (WOKEPOET-480). Space or Live offers opens the window
       and searches; Details opens it without a search. -->
  <div ref="el" :class="$style.anchor" :style="anchorStyle" data-testid="instant-ninja-card">
    <div :class="$style.top">
    <div :class="$style.card">
      <div :class="$style.eyebrow">
        <span v-item-tip="{ name: item.info.refName }" :class="$style.name">{{ item.info.refName }}</span>
        <span class="flex-1" />
        <span :class="$style.badge" data-testid="instant-ninja-badge" :title="badgeTip" :data-tip-keys="againKeys ?? 'Space'">POE.NINJA</span>
      </div>
      <div :class="$style.value">
        <span :class="$style.headline" data-testid="instant-ninja-price"><w-price-text :text="price?.main" /></span>
        <span v-if="price?.each" :class="$style.dim">each</span>
        <template v-if="weekChange != null">
          <span class="flex-1" />
          <w-spark :values="spark" :width="32" :height="14" />
          <span :class="weekChange >= 0 ? 'w-up' : 'w-down'" :title="changeTitle" data-testid="instant-ninja-change">{{ weekChange >= 0 ? '▲' : '▼' }}{{ Math.abs(weekChange) }}%<span :class="$style.range">1d</span></span>
        </template>
      </div>
      <div v-if="price?.sub || stack" :class="$style.dim">
        <template v-if="stack"><span :class="$style.fg"><w-price-text :text="stack" /></span> for your {{ have }}</template><template v-if="stack && price?.sub"> · </template><w-price-text :text="price?.sub" />
      </div>
      <!-- The item's own verdict, where it has one (Stacked Deck: open or sell). -->
      <slot name="verdict" />
      <!-- A divination card: where it drops. -->
      <CardDrops v-if="item.category === ItemCategory.DivinationCard" :name="item.info.refName" compact />
      <div v-if="age" :class="$style.dim">poe.ninja, updated {{ age }}</div>
      <div :class="$style.row">
        <button type="button" class="btn w-pc-primary" :class="$style.btn" data-testid="instant-ninja-live" @click="$emit('live')">
          Live offers<w-kbd keys="Space" class="ml-2" />
        </button>
        <button type="button" class="btn" :class="$style.btn" data-testid="instant-ninja-details" @click="$emit('details')">Details</button>
      </div>
      <div v-if="againKeys" :class="$style.dim" data-testid="instant-ninja-again">Live offers: <w-kbd :keys="againKeys" /> again</div>
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
    <!-- Related items (the item's family, what drops it), as beside the window. -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import type { ParsedItem } from '@/parser'
import { ItemCategory } from '@/parser'
import { usePoeninja } from '@/web/background/Prices'
import { ninjaPrice, ninjaTotal, divineTenths, chaosOrbRow } from './ninja-first'
import { instantCardKey, onKeyboardFocusedControl } from './instant-card-key'
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
  details: []
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
const have = computed(() => props.item.stackSize?.value ?? 1)
const price = computed(() => info.value ? ninjaPrice(info.value.chaos, xchgRate.value, isDivine.value) : null)
const stack = computed(() => info.value && have.value > 1 ? ninjaTotal(info.value.chaos * have.value, isDivine.value ? undefined : xchgRate.value) : null)
const tenths = computed(() => {
  if (isDivine.value && info.value) return divineTenths(info.value.chaos)
  if (props.item.info.refName === 'Chaos Orb' && xchgRate.value) return divineTenths(xchgRate.value)
  return null
})
const age = computed(() => agoPhrase(updatedAt.value))
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
const spark = computed(() => dayTrend.value?.trend ?? [])
const weekChange = computed(() => dayTrend.value?.change != null ? Math.round(dayTrend.value.change) : null)
const changeTitle = computed(() => dayTrend.value?.from === 'saved'
  ? 'Change over the last 24 hours, from the prices this app saves about every 30 minutes'
  : "Change over the last day, from poe.ninja's daily prices")
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

// Right of and below the cursor; left of it when the right has no room, and up
// as far as the screen needs when the bottom has none.
function place () {
  const node = el.value
  if (!node) return
  const w = node.offsetWidth
  const h = node.offsetHeight
  const { x, y } = props.at
  const left = x + RIGHT_GAP + w <= window.innerWidth ? x + RIGHT_GAP : Math.max(0, x - LEFT_GAP - w)
  const top = Math.max(0, Math.min(y - ABOVE, window.innerHeight - h))
  if (left !== pos.value.left || top !== pos.value.top) pos.value = { left, top }
}
// Related items load after the card, and change its size.
let resize: ResizeObserver | undefined
let stopKids: (() => void) | undefined

function onKey (e: KeyboardEvent) {
  if (!props.active || e.defaultPrevented || e.repeat || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return
  // Typing in another panel (Ctrl+Space search, Settings) is never for the card.
  const t = e.target as HTMLElement | null
  if (t && t !== document.body && !el.value?.contains(t)) return
  if (t?.closest('input, textarea, select, [contenteditable]')) return
  // A focused button keeps its own Enter and Space: Details never runs a search.
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
  for (const child of node.querySelectorAll(':scope > *, :scope .w-pc-side')) {
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
  stopKids = () => kids.disconnect()
})
watch(() => props.at, placeAndReport)
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  resize?.disconnect()
  stopKids?.()
})
</script>

<style module>
.range { margin-left: 3px; color: var(--w-dim); font-size: var(--w-fs-xs); }
.anchor { position: absolute; pointer-events: auto; z-index: 5; display: flex; flex-direction: column; align-items: flex-start; max-height: 100%; }
.card {
  zoom: var(--w-ui-size, 1);
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 15rem;
  max-width: 20rem;
  padding: 8px 10px;
  border: 1px solid var(--w-line-strong, var(--w-line));
  border-radius: var(--w-r-sm);
  background: var(--w-pc-well, var(--w-panel-solid));
  box-shadow: 0 4px 18px rgba(0, 0, 0, .6);
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-sm);
  font-variant-numeric: tabular-nums;
}
.eyebrow { display: flex; align-items: center; gap: 8px; min-width: 0; }
.name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--w-fg); font-weight: 600; }
.badge {
  flex: none;
  font-size: var(--w-fs-xs);
  font-weight: 600;
  letter-spacing: .05em;
  padding: 0 5px;
  border-radius: var(--w-r-sm);
  border: 1px solid currentColor;
  color: #7fb2e5;
}
.value { display: flex; align-items: baseline; gap: 6px; }
.headline { font-family: var(--w-num); font-size: calc(24px * var(--w-text-scale, 1)); line-height: 1.1; font-weight: 600; color: var(--w-accent); white-space: nowrap; }
.dim { color: var(--w-dim); }
.fg { color: var(--w-fg); }
.top { display: flex; align-items: flex-start; gap: calc(6px * var(--w-ui-size, 1)); }
.tenths {
  zoom: var(--w-ui-size, 1);
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
.row { display: flex; gap: 6px; margin-top: 2px; }
.btn { display: inline-flex; align-items: center; }
</style>
