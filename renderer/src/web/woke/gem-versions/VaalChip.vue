<template>
  <span v-if="r" ref="chip" :class="[$style.chip, r.unpriced ? $style.unsure : r.profit >= 0 ? $style.good : $style.bad]" tabindex="0" data-vaal-chip
    @mouseenter="show" @mouseleave="hide" @focus="onFocus" @blur="hide">
    Vaal 20/20 <b class="w-num">{{ signed(r.profit) }}{{ r.unpriced ? '?' : '' }}</b>
  </span>
  <Teleport to="body">
    <div v-if="r && open" ref="card" :class="[$style.card, 'w-pc-side', 'w-surface', 'w-corners']" :style="pos" role="tooltip" data-vaal-card>
      <div :class="$style.top">
        <span :class="$style.title">Vaal it?</span>
        <b :class="r.profit >= 0 ? 'w-up' : 'w-down'" class="w-num">{{ signed(r.profit) }}</b>
        <span class="w-dim">avg <w-price :chaos="r.ev" :divine="divine" /> vs <w-price :chaos="r.now" :divine="divine" /> for a clean 20/20</span>
      </div>
      <div :class="$style.strip">
        <span :class="$style.g" :style="{ width: pct(r.gain) }" />
        <span :class="$style.n" :style="{ width: pct(r.same) }" />
        <span :class="$style.l" :style="{ width: pct(r.lose) }" />
      </div>
      <div :class="$style.key">
        <span class="w-up">{{ pct(r.gain) }} gain</span><span>{{ pct(r.same) }} about the same</span><span class="w-down">{{ pct(r.lose) }} lose</span>
      </div>
      <table :class="$style.outs">
        <thead><tr><th>Outcome</th><th>Chance</th><th>Price</th><th>vs 20/20</th></tr></thead>
        <tbody>
          <tr v-for="o of r.outcomes" :key="o.id">
            <td>{{ o.label }}<span v-if="o.est" :class="$style.est"> · {{ o.est }}</span></td>
            <td>{{ chance(o.chance) }}</td>
            <td><w-price :chaos="o.chaos" :divine="divine" /></td>
            <td :class="tone(o.delta)">{{ o.delta == null ? '' : signed(o.delta) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr><td>Average, minus 1 Vaal Orb</td><td /><td><w-price :chaos="r.ev" :divine="divine" /></td><td :class="tone(r.profit)">{{ signed(r.profit) }}</td></tr>
        </tfoot>
      </table>
      <div v-if="r.unpriced" :class="$style.warn">{{ pct(r.unpriced) }} of outcomes have no poe.ninja price and count as 0.</div>
      <div :class="$style.foot">Community odds, 25% each: no change, Vaal form, level ±1, quality ±1 to 10 (max 23). poe.ninja prices.</div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// Vaal it? on the gem's name row: what a Vaal Orb on a 20/20 of this gem
// gives on average (Guy's pick V3, 2026-11-21). The outcomes show on hover.
import { computed, inject, nextTick, onUnmounted, shallowRef, watch } from 'vue'
import type { ParsedItem } from '@/parser'
import { ItemCategory } from '@/parser'
import type { WidgetManager } from '@/web/overlay/interfaces'
import WPrice from '@/web/woke/ui/WPrice.vue'
import { formatChaos } from '../ui/format'
import { useGemVersions } from './useVersions'
import { vaalEv } from './vaal-ev'

const props = defineProps<{ item: ParsedItem, league: string }>()

const isGem = computed(() => props.item.category === ItemCategory.Gem)
const { forms, versions, divine, vaalOrb } = useGemVersions(() => props.item, () => props.league)
const r = computed(() => isGem.value ? vaalEv(versions.value, vaalOrb.value, !!forms.value?.vaal) : null)

function signed (n: number): string {
  const t = formatChaos(Math.abs(n), divine.value)
  return n >= 0 ? `+${t}` : `−${t}`
}
const pct = (x: number) => `${Math.round(x * 100)}%`
const chance = (x: number) => `${+(x * 100).toFixed(1)}%`
const tone = (d: number | null) => d == null ? '' : d > 0 ? 'w-up' : d < 0 ? 'w-down' : ''

const chip = shallowRef<HTMLElement>()
const card = shallowRef<HTMLElement>()
const open = shallowRef(false)
const pos = shallowRef<Record<string, string>>({ visibility: 'hidden' })

async function show () {
  open.value = true
  pos.value = { visibility: 'hidden', left: '0', top: '0' }
  await nextTick()
  const b = chip.value?.getBoundingClientRect()
  const el = card.value
  if (!b || !el) return
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--w-ui-scale')) || 1
  const c = el.getBoundingClientRect()
  const left = Math.max(4, Math.min(b.left, window.innerWidth - c.width - 4))
  const below = b.bottom + 4
  const top = below + c.height > window.innerHeight - 4 ? Math.max(4, b.top - c.height - 4) : below
  pos.value = { left: `${left / scale}px`, top: `${top / scale}px` }
}
function hide () {
  open.value = false
}
// Keyboard focus only: a click also focuses the chip, and the window getting
// focus back would reopen the card with the mouse elsewhere.
function onFocus (e: FocusEvent) {
  if ((e.target as HTMLElement).matches(':focus-visible')) show()
}

// Never leave the card over the game.
const wm = inject<WidgetManager | undefined>('wm', undefined)
watch(() => wm?.active.value, (active) => { if (!active) hide() })
watch(() => props.item, hide)
watch(r, (v) => { if (!v) hide() })
const onScroll = () => { if (open.value) hide() }
window.addEventListener('blur', hide)
document.addEventListener('scroll', onScroll, true)
document.addEventListener('dragstart', onScroll, true)
onUnmounted(() => {
  window.removeEventListener('blur', hide)
  document.removeEventListener('scroll', onScroll, true)
  document.removeEventListener('dragstart', onScroll, true)
})
</script>

<style module>
.chip {
  display: inline-flex; align-items: center; gap: 4px; margin-left: 0.5rem; padding: 0 8px;
  border-radius: var(--w-r-pill); line-height: calc(18px * var(--w-text-scale, 1));
  font-size: var(--w-fs-sm); white-space: nowrap; border: 1px solid var(--w-line-strong); cursor: default;
}
.chip:focus-visible { outline: 1px solid var(--w-accent); outline-offset: 1px; }
.good { color: var(--w-fg); background: color-mix(in srgb, var(--w-up) 12%, transparent); border-color: color-mix(in srgb, var(--w-up) 55%, transparent); }
.good b { color: var(--w-up); }
.bad b { color: var(--w-down); }
.unsure b { color: var(--w-dim); }
.warn { font-size: var(--w-fs-xs); color: var(--w-warn); }
.card {
  position: fixed; z-index: 1001; width: 23rem; padding: var(--w-s2) var(--w-s3);
  background: var(--w-pc-window); border: 1px solid var(--w-line-strong); border-radius: var(--w-r-md); box-shadow: var(--w-shadow);
  font-family: var(--w-body); font-size: var(--w-fs-sm); color: var(--w-fg);
  zoom: var(--w-ui-scale, 1); pointer-events: none;
  display: grid; gap: 6px;
}
.top { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.title { font-family: var(--w-caps-face); font-size: var(--w-fs-md); }
.strip { display: flex; gap: 1px; height: 8px; border-radius: 1px; overflow: hidden; }
.g { background: var(--w-up); }
.n { background: var(--w-line-strong); }
.l { background: var(--w-down); }
.key { display: flex; justify-content: space-between; gap: 6px; font-size: var(--w-fs-xs); color: var(--w-faint); }
.outs { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.outs th { font-weight: 400; color: var(--w-faint); font-size: var(--w-fs-xs); text-align: right; padding: 1px 4px; border-bottom: 1px solid var(--w-line); }
.outs th:first-child, .outs td:first-child { text-align: left; }
.outs td { padding: 2px 4px; border-bottom: 1px solid var(--w-line-soft); text-align: right; color: var(--w-dim); }
.outs td:first-child { color: var(--w-fg); }
.outs td > * { justify-content: flex-end; }
.outs tfoot td { border-bottom: 0; border-top: 1px solid var(--w-line); color: var(--w-fg); }
.est { color: var(--w-faint); font-size: var(--w-fs-xs); }
.foot { font-size: var(--w-fs-xs); color: var(--w-faint); }
</style>
