<template>
  <!-- The Maps page's ground (Guy 2026-11-28: "should show normal maps,
       originator, nightmare maps, blighted, and maps with special implicits"):
       a mix of every kind of map, each run through the filter as it is now. -->
  <div :class="$style.wrap">
    <div :class="$style.bar">
      <b :class="$style.title">On the ground</b>
      <WButton size="sm" variant="ghost" icon="fas fa-dice" @click="seed++">Drop a new pile</WButton>
      <WChip clickable :active="ghosts" @click="ghosts = !ghosts">Show hidden, struck through</WChip>
      <span class="w-dim text-xs w-num">{{ hiddenCount }} of {{ drops.length }} hidden · hover a label for the map, click a priced one to open it</span>
    </div>
    <div ref="groundEl" :class="$style.ground" :style="{ height: `${placed.height}px` }" data-maps-pile>
      <template v-for="d in placed.list" :key="'b' + d.id">
        <span v-if="d.shown && d.look.effect" :class="$style.beam"
          :style="{ left: `${d.rect.x + d.rect.w / 2 - 1}px`, height: `${d.rect.y + 2}px`, background: `linear-gradient(to bottom, transparent, ${poeColour(d.look.effect.color)})` }" />
      </template>
      <span v-for="d in placed.list" :key="d.id" v-item-tip="{ name: d.tip }" :class="[$style.drop, { [$style.ghost]: !d.shown, [$style.click]: !!d.item }]"
        :style="{ left: `${d.rect.x}px`, top: `${d.rect.y}px` }" :role="d.item ? 'button' : undefined" :tabindex="d.item ? 0 : undefined"
        :aria-label="`${d.kind ? `${d.kind}: ` : ''}${d.label}: ${d.shown ? 'shows' : 'hidden'}, ${d.by}`" :title="d.by" :data-map-drop="d.key"
        @click="d.item && emit('go', d.item)" @keydown.enter="d.item && emit('go', d.item)">
        <span v-if="d.kind" :class="$style.kind">{{ d.kind }}</span>
        <LabelPreview :text="d.label" :actions="d.actions" :visibility="d.shown ? 'Show' : 'Hide'" :default-text="d.colour" :extras="false" :scale="1" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { WButton, WChip, vItemTip } from '../ui'
import LabelPreview from './LabelPreview.vue'
import { readStyle } from './edits'
import { labelBox, layoutLabels } from './shower'
import type { Rect } from './shower'
import { poeColour } from './colours'
import { matchItem } from './match'
import { defaultTextColour } from './drops'
import { ruleLabel } from './parse'
import { mapPile } from './map-pile'
import type { FilterDoc } from './parse'

const props = defineProps<{
  doc: FilterDoc | null
  // Names of the priced map items (blighted tiers), to open on click.
  priced: Set<string>
}>()
const emit = defineEmits<{ go: [name: string] }>()

const BEAM_ROOM = 36
// Room for the small kind tag above a special map's label.
const TAG_H = 13
const seed = ref(1)
const ghosts = ref(true)

const drops = computed(() => {
  const doc = props.doc
  if (!doc) return []
  return mapPile(seed.value).map(d => {
    const m = matchItem(doc, d.facts, { brief: true })
    const rule = m.final?.block
    const by = !rule ? 'no rule matched' : rule.type?.startsWith('woke->') ? `decided by ${ruleLabel(rule.type, rule.tier)}` : `NeverSink: ${ruleLabel(rule.type, rule.tier)}`
    return {
      ...d,
      shown: m.visibility !== 'Hide',
      actions: m.actions,
      look: readStyle(m.actions),
      colour: defaultTextColour(d.facts),
      by,
      item: props.priced.has(d.priced ?? '') ? d.priced : null
    }
  })
})
const hiddenCount = computed(() => drops.value.filter(d => !d.shown).length)

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
  const list = drops.value.filter(d => ghosts.value || d.shown)
  const sizes = list.map(d => {
    const b = labelBox(d.label, d.look.fontSize, 1, measure)
    return d.kind ? { w: Math.max(b.w, d.kind.length * 6 + 8), h: b.h + TAG_H } : b
  })
  const { rects, height } = layoutLabels(sizes, width.value, 220, seed.value, BEAM_ROOM)
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
  background:
    radial-gradient(ellipse at 30% 60%, rgba(90, 80, 60, 0.35), transparent 60%),
    radial-gradient(ellipse at 75% 30%, rgba(60, 70, 80, 0.3), transparent 55%),
    repeating-radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.015) 0 2px, transparent 2px 7px),
    linear-gradient(160deg, #24221d, #191814 60%, #1f1d18);
}
.drop { position: absolute; display: flex; flex-direction: column; align-items: center; }
.click { cursor: pointer; }
.drop:hover, .drop:focus-visible { filter: brightness(1.25); z-index: 2; outline: 1px solid var(--w-accent); outline-offset: 1px; }
.ghost { opacity: 0.55; text-decoration: line-through; filter: grayscale(0.7); }
.kind { font-size: 10px; line-height: 12px; color: #b9ab8a; white-space: nowrap; letter-spacing: 0.02em; }
.beam { position: absolute; top: 0; width: 3px; opacity: 0.85; pointer-events: none; }
</style>
