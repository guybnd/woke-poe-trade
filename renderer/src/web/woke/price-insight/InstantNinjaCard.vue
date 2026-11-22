<template>
  <!-- woke: the instant price check for an exchange item poe.ninja prices: a small card by
       the item instead of the window (WOKEPOET-480). Space or Live offers opens the window
       and searches; Details opens it without a search. -->
  <div ref="el" :class="$style.anchor" :style="anchorStyle" data-testid="instant-ninja-card">
    <div :class="$style.card">
      <div :class="$style.eyebrow">
        <span v-item-tip="{ name: item.info.refName }" :class="$style.name">{{ item.info.refName }}</span>
        <span class="flex-1" />
        <span :class="$style.badge" title="poe.ninja's price from the exchange, cached in the app. No trade search was used.">POE.NINJA</span>
      </div>
      <div :class="$style.value">
        <span :class="$style.headline">{{ each }}</span>
        <span :class="$style.dim">each</span>
        <template v-if="weekChange != null">
          <span class="flex-1" />
          <w-spark :values="spark" :width="32" :height="14" />
          <span :class="weekChange >= 0 ? 'w-up' : 'w-down'">{{ weekChange >= 0 ? '▲' : '▼' }}{{ Math.abs(weekChange) }}%</span>
        </template>
      </div>
      <div v-if="stack" :class="$style.dim">{{ stack }} for your {{ have }}<template v-if="age"> · {{ age }}</template></div>
      <div v-else-if="age" :class="$style.dim">Updated {{ age }}</div>
      <div :class="$style.row">
        <button type="button" class="btn w-pc-primary" :class="$style.btn" data-testid="instant-ninja-live" @click="$emit('live')">
          Live offers<w-kbd keys="Space" class="ml-2" />
        </button>
        <button type="button" class="btn" :class="$style.btn" data-testid="instant-ninja-details" @click="$emit('details')">Details</button>
      </div>
      <div v-if="againKeys" :class="$style.dim" data-testid="instant-ninja-again">Live offers: <w-kbd :keys="againKeys" /> again</div>
    </div>
    <!-- Related items (the item's family, what drops it), as beside the window. -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import type { ParsedItem } from '@/parser'
import { usePoeninja, displayRounding } from '@/web/background/Prices'
import { exactDetailsId } from '@/web/price-check/trends/getDetailsId'
import { WSpark, WKbd, agoPhrase, vItemTip } from '../ui'

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
  live: []
  details: []
  close: []
  /** Where the card ended up, in the overlay's CSS px, so the mouse can be tracked into it. */
  placed: [rect: DOMRect]
}>()

// Keeps clear of the cursor and the game's own tooltip, which opens up and to the right of it.
const GAP = 18

const { findPriceByQuery, autoCurrency, updatedAt } = usePoeninja()
const info = computed(() => {
  const q = exactDetailsId(props.item)
  return (q && findPriceByQuery(q)) || null
})

function amount (chaos: number): string {
  // A Divine Orb is priced in chaos, or it would read "1 div".
  const p = props.item.info.refName === 'Divine Orb'
    ? { min: chaos, currency: 'chaos' as const }
    : autoCurrency(chaos)
  return `${displayRounding(p.min)}${p.currency === 'div' ? ' div' : 'c'}`
}

const have = computed(() => props.item.stackSize?.value ?? 1)
const each = computed(() => info.value ? amount(info.value.chaos) : '')
const stack = computed(() => info.value && have.value > 1 ? amount(info.value.chaos * have.value) : null)
const age = computed(() => agoPhrase(updatedAt.value))
const spark = computed(() => (info.value?.graph ?? []).filter((p): p is number => p != null))
const weekChange = computed(() => spark.value.length ? Math.round(spark.value[spark.value.length - 1]) : null)

// Left of the cursor when the right side has no room, above it when the bottom has none.
const el = shallowRef<HTMLElement | null>(null)
const pos = shallowRef({ left: props.at.x + GAP, top: props.at.y + GAP })
const anchorStyle = computed(() => ({ left: `${pos.value.left}px`, top: `${pos.value.top}px` }))

// Right of and below the cursor; left of it when the right has no room, and up
// as far as the screen needs when the bottom has none.
function place () {
  const node = el.value
  if (!node) return
  const w = node.offsetWidth
  const h = node.offsetHeight
  const { x, y } = props.at
  const left = x + GAP + w <= window.innerWidth ? x + GAP : Math.max(0, x - GAP - w)
  const top = y + GAP + h <= window.innerHeight ? y + GAP : Math.max(0, window.innerHeight - h)
  if (left !== pos.value.left || top !== pos.value.top) pos.value = { left, top }
}
// Related items load after the card, and change its size.
let resize: ResizeObserver | undefined

function onKey (e: KeyboardEvent) {
  if (!props.active || e.defaultPrevented || e.repeat || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return
  // Typing in another panel (Ctrl+Space search, Settings) is never for the card.
  const t = e.target as HTMLElement | null
  if (t && t !== document.body && !el.value?.contains(t)) return
  if (t?.closest('input, textarea, select, [contenteditable]')) return
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    emit('live')
  } else if (e.key === 'Escape') {
    emit('close')
  }
}

async function placeAndReport () {
  // The widget can still be display:none in the flush that mounts the card.
  await new Promise(resolve => requestAnimationFrame(resolve))
  place()
  await nextTick()
  if (el.value) emit('placed', el.value.getBoundingClientRect())
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
  placeAndReport()
  resize = new ResizeObserver(() => { placeAndReport() })
  resize.observe(el.value!)
})
watch(() => props.at, placeAndReport)
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  resize?.disconnect()
})
</script>

<style module>
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
.row { display: flex; gap: 6px; margin-top: 2px; }
.btn { display: inline-flex; align-items: center; }
</style>
