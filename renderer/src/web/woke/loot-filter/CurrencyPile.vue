<template>
  <!-- One ground for the whole tab (Guy's pick G1): a random pile of currency as these settings show it. -->
  <div :class="$style.wrap">
    <div :class="$style.bar">
      <b :class="$style.title">On the ground</b>
      <WButton size="sm" variant="ghost" icon="fas fa-dice" @click="seed++">Drop a new pile</WButton>
      <WChip clickable :active="ghosts" @click="ghosts = !ghosts">Show hidden, struck through</WChip>
      <span class="w-dim text-xs w-num">{{ hiddenCount }} of {{ drops.length }} hidden · click a label to open its item</span>
    </div>
    <div ref="groundEl" :class="$style.ground" :style="{ height: `${placed.height}px` }" data-currency-pile>
      <template v-for="d in placed.list" :key="'b' + d.id">
        <span v-if="d.step > 0 && d.look.effect" :class="$style.beam"
          :style="{ left: `${d.rect.x + d.rect.w / 2 - 1}px`, height: `${d.rect.y + 2}px`, background: `linear-gradient(to bottom, transparent, ${poeColour(d.look.effect.color)})` }" />
      </template>
      <span v-for="d in placed.list" :key="d.id" v-item-tip="{ name: d.it.name }" :class="[$style.drop, { [$style.ghost]: d.step === 0 }]"
        :style="{ left: `${d.rect.x}px`, top: `${d.rect.y}px` }" role="button" tabindex="0"
        :aria-label="`${d.label}: ${CSTEP_NAMES[d.step]}. Open it`" @click="emit('go', d.it.name)" @keydown.enter="emit('go', d.it.name)">
        <LabelPreview :text="d.label" :actions="[]" :style-override="d.look" :visibility="d.step === 0 ? 'Hide' : 'Show'" :extras="false" :scale="SCALE" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
// The tab's ground: about two dozen piles, cheap ones more often, laid out
// like the Preview tab's shower, each in the look its step (or own look)
// gives. Clicking a label opens that item in the list.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { WButton, WChip, vItemTip } from '../ui'
import LabelPreview from './LabelPreview.vue'
import type { StylePatch } from './edits'
import { labelBox, layoutLabels } from './shower'
import type { Rect } from './shower'
import { poeColour } from './colours'
import { CSTEP_NAMES, currencyFullLook, stacksFor, stepOfPile } from './currency-weights'
import type { CStep, CurrencyItem, CurrencySettings } from './currency-weights'

const props = defineProps<{
  items: CurrencyItem[]
  cfg: CurrencySettings
}>()
const emit = defineEmits<{ go: [name: string] }>()

const SCALE = 1
const COUNT = 24
const BEAM_ROOM = 36
const seed = ref(1)
const ghosts = ref(true)

// A small seeded generator, so a pile stays put while you tune the steps.
function rng (s: number) {
  let x = (s * 16807 + 12345) % 2147483647
  return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646 }
}

// Which piles fall: picked by name and stack, so changing a setting re-looks
// the same pile instead of dropping a new one.
const picks = computed(() => {
  const pool = props.items
  if (!pool.length) return []
  const r = rng(seed.value)
  const w = pool.map(i => 1 / Math.pow(Math.max(0.01, i.chaos), 0.35))
  const total = w.reduce((a, b) => a + b, 0)
  const out: Array<{ id: number, it: CurrencyItem, stack: number }> = []
  for (let k = 0; k < Math.min(COUNT, pool.length * 2); k++) {
    let x = r() * total
    let j = 0
    while (x > w[j] && j < pool.length - 1) { x -= w[j]; j++ }
    const it = pool[j]
    const stack = it.full > 1 && it.chaos < 20 ? Math.max(1, Math.round(Math.pow(r(), 2.2) * Math.min(it.full, 40))) : 1
    out.push({ id: k, it, stack })
  }
  return out
})

const drops = computed(() => picks.value.map(p => {
  const step: CStep = stepOfPile(stacksFor(p.it, props.cfg), p.stack)
  const own = props.cfg.items[p.it.name]?.look
  const look: StylePatch = { ...currencyFullLook(step, p.it.cat, props.cfg), ...(step > 0 ? own ?? {} : {}) }
  return { ...p, step, look, label: p.stack > 1 ? `${p.stack}x ${p.it.name}` : p.it.name }
}))
const hiddenCount = computed(() => drops.value.filter(d => d.step === 0).length)

// The ground's width, measured so labels lay out to the real space.
const groundEl = ref<HTMLElement | null>(null)
const width = ref(700)
let ro: ResizeObserver | null = null
watch(groundEl, el => {
  ro?.disconnect()
  if (!el) return
  ro = new ResizeObserver(() => { width.value = el.clientWidth || 700 })
  ro.observe(el)
  width.value = el.clientWidth || 700
}, { immediate: true })
onBeforeUnmount(() => ro?.disconnect())

const ctx = document.createElement('canvas').getContext('2d')
function measure (text: string, px: number): number {
  if (!ctx) return text.length * px * 0.68
  ctx.font = `${px}px FontinSmallCaps, FrizQuadrataC, Georgia, serif`
  return ctx.measureText(text).width
}

const placed = computed(() => {
  const list = drops.value.filter(d => ghosts.value || d.step > 0)
  const { rects, height } = layoutLabels(list.map(d => labelBox(d.label, d.look.fontSize, SCALE, measure)), width.value, 200, seed.value, BEAM_ROOM)
  return { height, list: list.map((d, i) => ({ ...d, rect: rects[i] as Rect })) }
})
</script>

<style module>
.wrap { display: flex; flex-direction: column; gap: 4px; }
.bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.title { font-family: var(--w-font-display, inherit); font-weight: normal; color: var(--w-accent, #c8a565); }
.ground {
  position: relative;
  overflow: hidden;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line);
  /* Dusty stone floor, like the Preview tab's. */
  background:
    radial-gradient(ellipse at 30% 60%, rgba(90, 80, 60, 0.35), transparent 60%),
    radial-gradient(ellipse at 75% 30%, rgba(60, 70, 80, 0.3), transparent 55%),
    repeating-radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.015) 0 2px, transparent 2px 7px),
    linear-gradient(160deg, #24221d, #191814 60%, #1f1d18);
}
.drop { position: absolute; cursor: pointer; }
.drop:hover, .drop:focus-visible { filter: brightness(1.25); z-index: 2; outline: 1px solid var(--w-accent); outline-offset: 1px; }
.ghost { opacity: 0.55; text-decoration: line-through; filter: grayscale(0.7); }
.beam { position: absolute; top: 0; width: 3px; opacity: 0.85; pointer-events: none; }
</style>
