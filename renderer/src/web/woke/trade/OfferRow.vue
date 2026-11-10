<template>
  <div :class="[$style.row, { [$style.open]: expanded, [$style.closed]: offer.closed }]" :data-offer="offer.who">
    <div :class="$style.head">
      <button type="button" :class="[$style.summary, { [$style.oneLine]: oneLine }]" :aria-expanded="offer.closed ? undefined : expanded" @click="$emit('expand')">
        <template v-if="oneLine">
          <img v-if="art && !artFailed" :src="art" alt="" :class="$style.art" @error="artFailed = true">
          <span v-if="dot" :class="[$style.dot, dot.up ? $style.dotUp : $style.dotDown]" :title="dot.title" />
          <span :class="$style.whoShort" class="w-trunc">{{ offer.who }}</span>
          <span v-if="statusChip" :class="[$style.chip, statusChip.up && $style.up]">{{ statusChip.text }}</span>
          <span v-if="offer.repeats" :class="$style.chip" :title="`Whispered ${offer.repeats + 1} times`">×{{ offer.repeats + 1 }}</span>
          <span v-item-tip="tip" :class="$style.itemShort" class="w-trunc w-dim">{{ label }}</span>
          <span class="w-num whitespace-nowrap" :class="offer.dir === 'sell' ? 'w-accent' : ''">{{ price }}</span>
        </template>
        <template v-else>
          <span :class="$style.line">
            <span :class="$style.who" class="w-trunc">{{ offer.who }}</span>
            <span v-if="statusChip" :class="[$style.chip, statusChip.up && $style.up, statusChip.down && $style.down]">{{ statusChip.text }}</span>
            <span v-if="offer.repeats" :class="$style.chip" :title="`Whispered ${offer.repeats + 1} times`">×{{ offer.repeats + 1 }}</span>
            <span v-if="!canReopen" class="w-faint w-num ml-auto whitespace-nowrap">{{ age }}</span>
          </span>
          <span :class="$style.item">
            <img v-if="art && !artFailed" :src="art" alt="" :class="$style.art" @error="artFailed = true">
            <span v-item-tip="tip" class="w-trunc">{{ label }}</span>
            <span class="ml-auto w-num whitespace-nowrap" :class="offer.dir === 'sell' ? 'w-accent' : ''">{{ price }}</span>
            <span v-if="delta != null && Math.abs(delta) >= 0.03" class="w-num text-xs whitespace-nowrap" :class="delta < 0 ? 'w-down' : 'w-up'"
              :title="`${delta < 0 ? 'Under' : 'Over'} poe.ninja's value for the same items`">{{ delta > 0 ? '+' : '−' }}{{ Math.round(Math.abs(delta) * 100) }}%</span>
          </span>
        </template>
      </button>
      <span v-if="canReopen" :class="[$style.slot, $style.slotClosed]">
        <span :class="$style.age" class="w-faint w-num">{{ age }}</span>
        <span :class="$style.closedActions">
          <button type="button" class="w-skin-btn" :class="[$style.btn, $style.action]" title="Put this offer back in the queue" data-reopen @click="$emit('reopen')">Reopen</button>
          <button type="button" class="w-skin-btn" :class="[$style.btn, $style.iconBtn]" title="Remove from History" aria-label="Remove from History" data-remove @click="$emit('remove')"><i class="fas fa-times" /></button>
        </span>
      </span>
      <span v-else-if="oneLine" :class="[$style.slot, { [$style.slotHover]: rowStyle === 'hover' && next }]">
        <span v-if="rowStyle === 'hover' || !next" :class="$style.age" class="w-faint w-num" @click="$emit('expand')">{{ age }}</span>
        <button v-if="next" type="button" class="w-skin-btn w-skin-primary" :class="[$style.btn, $style.primary, $style.action, $style.next]" :title="`${next.label} ${offer.who}`" data-next
          @click="$emit('reply', next.id)">{{ next.label }}</button>
      </span>
    </div>
    <template v-if="expanded && !offer.closed">
      <div v-if="offer.tab" :class="$style.tab">
        <span :class="$style.grid" :style="{ '--n': gridSize }" aria-hidden="true">
          <i v-for="c in gridSize * gridSize" :key="c" :class="{ [$style.on]: c === cell }" />
        </span>
        <span class="w-dim">Tab <b style="color: var(--w-fg);">"{{ offer.tab.name }}"</b><br>left {{ offer.tab.left }}, top {{ offer.tab.top }}</span>
        <span v-if="value" class="ml-auto w-faint w-num text-xs whitespace-nowrap" title="Today's poe.ninja value of the price">≈ {{ value }}</span>
      </div>
      <div v-else-if="value" class="w-faint w-num text-xs" title="Today's poe.ninja value of the price">≈ {{ value }}</div>
      <div v-if="offer.note" class="w-dim text-xs w-trunc" :title="offer.note">"{{ offer.note }}"</div>
      <div v-for="(m, i) in offer.messages" :key="i" class="w-dim text-xs w-trunc" :title="m">› {{ m }}</div>
      <div :class="$style.btns" style="padding-top: 4px;">
        <button v-for="b in stepButtons" :key="b.id" type="button" class="w-skin-btn" :class="[$style.btn, { [$style.primary]: b.primary, 'w-skin-primary': b.primary }]"
          :title="b.title" :data-reply="b.id" @click="$emit('reply', b.id)">
          {{ b.label }}<WKbd v-if="b.primary && stepKey" :keys="stepKey" :class="$style.kbd" />
        </button>
      </div>
      <div :class="$style.btns">
        <button v-for="b in otherButtons" :key="b.id" type="button" class="w-skin-btn" :class="$style.btn"
          :title="b.title" :data-reply="b.id" @click="$emit('reply', b.id)">{{ b.label }}</button>
        <span class="ml-auto" />
        <button type="button" class="w-skin-btn" :class="$style.btn" :title="offer.dir === 'sell' ? 'Log it as sold without a trade window seen' : 'Log it as bought'"
          :aria-label="offer.dir === 'sell' ? 'Log it as sold' : 'Log it as bought'" data-reply="traded" @click="$emit('traded')"><i class="fas fa-check" /></button>
        <button type="button" class="w-skin-btn" :class="$style.btn" title="Remove this offer" aria-label="Remove this offer" data-reply="dismiss" @click="$emit('dismiss')"><i class="fas fa-times" /></button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { WKbd, itemRefFromText, vItemTip } from '../ui'
import { belongsInHistory, nextStep, stepsOf } from './book'
import type { Offer, StepId } from './book'
import type { ReplyId, TradeRowStyle } from './widget'
import { offerLabel, priceLabel } from './whispers'

const props = withDefaults(defineProps<{
  offer: Offer
  expanded?: boolean
  now: number
  rowStyle?: TradeRowStyle
  stepKey?: string | null
  // "120 div" from today's prices, when it says more than the price itself.
  value?: string | null
  delta?: number | null
  art?: string | null
}>(), { rowStyle: 'hover', expanded: false })

defineEmits<{
  (e: 'expand' | 'traded' | 'dismiss' | 'reopen' | 'remove'): void
  (e: 'reply', id: ReplyId): void
}>()

const STEP_LABELS: Record<StepId, string> = {
  invite: 'Invite',
  trade: 'Trade',
  thanks: 'Thanks',
  kick: 'Kick',
  hideout: 'Hideout'
}

const artFailed = shallowRef(false)
const label = computed(() => offerLabel(props.offer))
const tip = computed(() => props.offer.bulk ? { name: props.offer.item } : itemRefFromText(props.offer.item))
const price = computed(() => priceLabel(props.offer.price))
const oneLine = computed(() => props.rowStyle !== 'full' && !props.expanded)
const canReopen = computed(() => belongsInHistory(props.offer))

const age = computed(() => {
  // Closed offers count from when they closed.
  const s = Math.max(0, Math.floor((props.now - (props.offer.closedAt ?? props.offer.at)) / 1000))
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  if (s < 48 * 3600) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
})

const statusChip = computed<{ text: string, up?: boolean, down?: boolean } | null>(() => {
  const o = props.offer
  if (o.closed === 'done') return { text: 'traded', up: true }
  if (o.closed) return { text: o.closed }
  if (o.traded) return { text: 'traded', up: true }
  // On one line these two are a dot instead.
  if (oneLine.value) return null
  if (o.inArea) return { text: o.dir === 'sell' ? 'in your hideout' : 'with you', up: true }
  if (o.offline) return { text: 'offline', down: true }
  return null
})

const dot = computed(() => {
  const o = props.offer
  if (o.closed || o.traded) return null
  if (o.inArea) return { up: true, title: o.dir === 'sell' ? 'In your hideout' : 'With you' }
  if (o.offline) return { up: false, title: 'Offline' }
  return null
})

const next = computed(() => {
  if (props.offer.closed) return null
  const id = nextStep(props.offer)
  return id ? { id, label: STEP_LABELS[id] } : null
})

// 12×12 tabs; quad tabs (up to 24) get a finer grid.
const gridSize = computed(() => {
  const t = props.offer.tab
  return t && (t.left > 12 || t.top > 12) ? 24 : 12
})
const cell = computed(() => {
  const t = props.offer.tab
  if (!t) return -1
  return (t.top - 1) * gridSize.value + t.left
})

const stepButtons = computed(() => stepsOf(props.offer).map((id) => ({
  id,
  label: STEP_LABELS[id],
  primary: id === next.value?.id,
  title: undefined as string | undefined
})))

const otherButtons = computed<Array<{ id: ReplyId, label: string, title: string }>>(() => props.offer.dir === 'sell'
  ? [
      { id: 'busy', label: 'Busy', title: 'Tell them you will invite soon' },
      { id: 'still', label: 'Still?', title: 'Ask if they still want it' },
      { id: 'sold', label: 'Sold', title: 'Tell them it is sold, and remove the offer' }
    ]
  : [{ id: 'again', label: 'Again', title: 'Send your whisper again' }])
</script>

<style module>
.row { display: flex; flex-direction: column; gap: 2px; padding: 4px var(--w-pad); border-top: 1px solid var(--w-line); }
.row:first-child { border-top: 0; }
.head { display: flex; align-items: center; gap: 6px; min-width: 0; }
.closed .summary { opacity: .55; }
.summary { flex: 1 1 0; display: flex; flex-direction: column; gap: 2px; min-width: 0; text-align: left; background: none; border: 0; padding: 0; color: inherit; font: inherit; cursor: pointer; }
.closed .summary { cursor: default; }
.summary:focus-visible { outline: 2px solid var(--w-accent); outline-offset: 1px; }
.oneLine { flex-direction: row; align-items: center; gap: 6px; min-height: calc(22px * var(--w-text-scale, 1)); }
.line { display: flex; align-items: center; gap: 6px; min-width: 0; }
.who { font-weight: 600; }
.whoShort { font-weight: 600; flex: 0 1 auto; max-width: 7rem; }
.itemShort { flex: 1 1 0; min-width: 0; }
.dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.dotUp { background: var(--w-up); }
.dotDown { background: var(--w-down); }
.chip { font-size: calc(10.5px * var(--w-text-scale, 1)); line-height: calc(14px * var(--w-text-scale, 1)); border-radius: var(--w-r-pill); padding: 0 6px; border: 1px solid var(--w-line-strong, var(--w-line)); color: var(--w-dim); white-space: nowrap; }
.up { color: var(--w-up); border-color: color-mix(in srgb, var(--w-up) 45%, transparent); }
.down { color: var(--w-down); border-color: color-mix(in srgb, var(--w-down) 45%, transparent); }
.item { display: flex; align-items: center; gap: 6px; min-width: 0; }
.art { width: 18px; height: 18px; object-fit: contain; flex: none; }
/* The same width whether it holds the age or the button, so nothing jumps. */
.slot { position: relative; flex: none; width: calc(62px * var(--w-text-scale, 1)); min-height: calc(22px * var(--w-text-scale, 1)); display: flex; align-items: center; justify-content: flex-end; }
.age { cursor: pointer; white-space: nowrap; }
.next { width: 100%; }
.slotHover .next { position: absolute; inset: 0 0 0 auto; opacity: 0; pointer-events: none; }
.row:hover .slotHover .next, .slotHover .next:focus-visible { opacity: 1; pointer-events: auto; }
.row:hover .slotHover .age { visibility: hidden; }
/* A closed row: its age at rest, what you can do with it on hover. */
.slotClosed { width: calc(84px * var(--w-text-scale, 1)); }
.slotClosed .age { cursor: default; }
.closedActions { position: absolute; inset: 0 0 0 auto; display: flex; align-items: center; gap: 4px; opacity: 0; pointer-events: none; }
.row:hover .closedActions, .closedActions:focus-within { opacity: 1; pointer-events: auto; }
.row:hover .slotClosed .age, .slotClosed:focus-within .age { visibility: hidden; }
.iconBtn { width: calc(22px * var(--w-text-scale, 1)); padding: 0; }
.tab { display: flex; align-items: center; gap: 8px; font-size: calc(11.5px * var(--w-text-scale, 1)); line-height: 1.35; padding-top: 2px; }
.grid { --n: 12; display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 1px; width: 49px; height: 49px; flex: none; }
.grid i { background: color-mix(in srgb, var(--w-fg) 9%, transparent); border-radius: 0.5px; }
.grid i.on { background: var(--w-accent); box-shadow: 0 0 4px var(--w-accent); }
.btns { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding-top: 2px; }
/* Colours here are the plain look's; the game look reskins .w-skin-btn (ui/controls.css). */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; flex: none; min-height: calc(22px * var(--w-text-scale, 1)); font-size: calc(11.5px * var(--w-text-scale, 1)); line-height: calc(20px * var(--w-text-scale, 1)); padding: 0 8px; border-radius: var(--w-r-sm, 3px);
  border: 1px solid var(--w-line-strong, var(--w-line)); background: var(--w-panel-solid, transparent); color: var(--w-fg); cursor: pointer; white-space: nowrap; }
.btn:hover { background: color-mix(in srgb, var(--w-fg) 12%, var(--w-panel-solid, transparent)); }
.btn:focus-visible { outline: 2px solid var(--w-accent); outline-offset: 1px; }
.primary { border-color: var(--w-accent); color: var(--w-accent); }
.kbd { margin-left: 2px; }
.action { padding: 0 6px; }
</style>
