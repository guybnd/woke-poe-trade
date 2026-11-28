<template>
  <div class="flex flex-wrap gap-1">
    <template v-for="row in rows" :key="row.kind === 'base' ? row.base : `fam:${row.family.id}`">
      <span v-if="row.kind === 'family'" :class="$style.chipWrap" :data-family="row.family.id">
        <WChip clickable :active="row.bases.every(b => picked.includes(b))" :draggable="draggable ? 'true' : undefined"
          :title="`${row.family.label}: click to ${famOpen(row.family.id) ? 'close' : 'open'}. ${draggable ? 'Drag to move all of them. ' : ''}Right-click to move all of them.`"
          :aria-expanded="famOpen(row.family.id)"
          @click="toggleFam(row.family.id)" @contextmenu="onFamMenu($event, row.bases)"
          @dragstart="onFamDrag($event, row.bases)" @dragend="emit('dragend')">
          <span data-no-item-tip="family of bases, each base has its own tooltip when opened" class="flex items-center gap-1">
            <i class="fas w-faint" :class="famOpen(row.family.id) ? 'fa-caret-down' : 'fa-caret-right'" style="font-size: 0.8em;" />
            <img v-if="baseIcon(row.bases[0])" :src="baseIcon(row.bases[0])!" :class="$style.chipArt" alt="">
            <span>{{ row.family.label }}</span>
            <span class="w-faint w-num">{{ row.bases.length }}</span>
          </span>
        </WChip>
        <button v-if="removable" type="button" :class="$style.chipX" :title="`Take all ${row.family.label} off this tier`" :aria-label="`Take all ${row.family.label} off this tier`" @click="emit('pickset', row.bases); emit('removeset')"><i aria-hidden="true" class="fas fa-times" /></button>
      </span>
      <span v-else :class="[$style.chipWrap, { [$style.member]: inFam.has(row.base) }]">
        <WChip clickable :active="picked.includes(row.base)" :draggable="draggable ? 'true' : undefined" :title="chipTitle"
          @click="emit('pick', row.base, $event)" @contextmenu="emit('menu', $event, row.base)"
          @dragstart="emit('dragstart', row.base, $event)" @dragend="emit('dragend')">
          <span v-item-tip="tip(row.base)" class="flex items-center gap-1">
            <img v-if="baseIcon(row.base)" :src="baseIcon(row.base)!" :class="$style.chipArt" alt="">
            <span :class="{ [$style.here]: row.base === current }">{{ row.base }}</span>
            <span v-if="priceOf(row.base) != null" class="w-num" :class="$style[`p_${priceGrade(priceOf(row.base), minChaos)}`]"><WPriceText :text="priceText(priceOf(row.base)!)" /></span>
            <i v-if="locked?.(row.base)" class="fas fa-lock w-faint" style="font-size: 0.75em;" title="You put it here, so prices won't move it" />
          </span>
        </WChip>
        <button v-if="removable" type="button" :class="$style.chipX" :title="locked?.(row.base) ? 'Back to where it was' : 'Take it off this tier'" :aria-label="`Take ${row.base} off this tier`" @click="emit('remove', row.base)"><i aria-hidden="true" class="fas fa-times" /></button>
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
// The items a tier lists by name: art, today's price, click to pick.
// The editor's Rules tab and the item panel's "Whole tier" both use it.
// A family of 3+ bases (Talismans, Runic...) folds into one chip that picks,
// moves or takes off all of them; click it to open and handle single bases.
import { computed, ref } from 'vue'
import { WChip, WPriceText, vItemTip } from '../ui'
import { formatAmount } from '../ui/format'
import type { ItemTipRef } from '../ui/tooltip/item-tip'
import { baseIcon } from './label-style'
import { priceGrade } from './health'
import { familyOf, foldFamilies } from './base-families'
import type { LaneRow } from './base-families'

const props = defineProps<{
  items: string[]
  picked: string[]
  priceOf: (base: string) => number | null
  minChaos: number
  tip: (base: string) => ItemTipRef | null
  chipTitle: string
  // Moved here by you (shows a lock).
  locked?: (base: string) => boolean
  // The item you're looking at, marked in the list.
  current?: string
  draggable?: boolean
  removable?: boolean
}>()

const emit = defineEmits<{
  (e: 'pick', base: string, ev: MouseEvent): void
  (e: 'menu', ev: MouseEvent, base: string): void
  (e: 'dragstart', base: string, ev: DragEvent): void
  // removeset: take off what pickset just picked.
  (e: 'dragend' | 'removeset'): void
  (e: 'remove', base: string): void
  // Picks exactly these (a family chip), before a menu, drag or take off.
  (e: 'pickset', bases: string[]): void
}>()

const fam = (b: string) => familyOf(b, baseIcon(b))
const opened = ref(new Set<string>())
// The item you're looking at keeps its family open.
const famOpen = (id: string) => opened.value.has(id) || (props.current != null && fam(props.current)?.id === id)
function toggleFam (id: string) {
  const next = new Set(opened.value)
  if (famOpen(id)) next.delete(id); else next.add(id)
  opened.value = next
}
const folded = computed(() => {
  const out = foldFamilies(props.items, fam)
  // A tier that is one family stays a plain list.
  return out.length === 1 && out[0].kind === 'family' ? props.items.map(base => ({ kind: 'base' as const, base })) : out
})
const inFam = computed(() => new Set(folded.value.flatMap(r => r.kind === 'family' && famOpen(r.family.id) ? r.bases : [])))
const rows = computed<LaneRow[]>(() => folded.value.flatMap(r =>
  r.kind === 'family' && famOpen(r.family.id) ? [r, ...r.bases.map(base => ({ kind: 'base' as const, base }))] : [r]))

function onFamMenu (ev: MouseEvent, bases: string[]) {
  emit('pickset', bases)
  emit('menu', ev, bases[0])
}
function onFamDrag (ev: DragEvent, bases: string[]) {
  emit('pickset', bases)
  emit('dragstart', bases[0], ev)
}

const priceText = (chaos: number) => chaos < 0.1 ? '<0.1c' : `${formatAmount(chaos)}c`
</script>

<style module>
.chipArt { width: 16px; height: 16px; object-fit: contain; flex: none; }
.chipWrap { display: inline-flex; align-items: center; }
.member { padding-left: 6px; border-left: 2px solid var(--w-line-strong); }
.here { text-decoration: underline; text-underline-offset: 3px; }
.p_high { color: var(--w-accent); }
.p_mid { color: var(--w-dim); }
.p_trash { color: var(--w-down); }
.p_unknown { color: var(--w-faint); }
.chipX {
  background: none;
  border: 0;
  padding: 0 4px 0 2px;
  color: var(--w-faint);
  font-size: 0.75em;
  cursor: pointer;
}
.chipX:hover { color: var(--w-fg); }
</style>
