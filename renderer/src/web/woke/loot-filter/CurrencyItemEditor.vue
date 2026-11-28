<template>
  <!-- One item, set by hand (Guy's pick E1): its step, its price, a supply
       stack, its own look, as one line of chips (E1, 2026-11-28). -->
  <div :class="$style.ed" data-currency-editor>
    <div :class="$style.line">
      <span :class="$style.lab">Step</span>
      <StateChip :model-value="edit.step == null ? 'auto' : String(edit.step)" :options="stepOptions" :title="`${it.name}: step`" dflt="auto" @update:model-value="setStep" />
      <label :class="$style.lab" :title="`Your price replaces ${source}'s for this item`">Price
        <input :value="edit.price ?? ''" type="number" min="0" step="any" :placeholder="basePrice > 0 ? String(basePrice >= 10 ? Math.round(basePrice) : Number(basePrice.toPrecision(2))) : '–'" :class="[$style.numIn, { [$style.moved]: edit.price != null }]"
          :aria-label="`Your price for ${it.name}, in chaos`" @change="setPrice($event.target as HTMLInputElement)"><span :class="$style.unit">c · {{ edit.price != null ? 'yours' : source }}</span></label>
      <label :class="$style.lab" :title="`A stack of this many or more always shows, at least Small (full stack ${it.full.toLocaleString()})`">Always from
        <input :value="edit.supply ?? ''" type="number" min="1" :max="it.full" placeholder="–" :class="[$style.numIn, $style.short, { [$style.moved]: edit.supply != null }]"
          :aria-label="`Always show ${it.name} from this stack size`" @change="setSupply($event.target as HTMLInputElement)"><span :class="$style.unit">of {{ it.full.toLocaleString() }}</span></label>
      <span :class="$style.lab">Look</span>
      <StateChip :model-value="edit.look ? 'own' : 'step'" :options="LOOKS" :title="`${it.name}: look`" dflt="step" @update:model-value="v => v === 'own' ? setLook(edit.look ?? {}) : setLook(undefined)" />
      <span class="flex-1" />
      <button type="button" class="w-icon-btn" :disabled="!Object.keys(edit).length" title="Let the price decide again: clears your step, price, stack and look" aria-label="Let the price decide again"
        @click="emit('change', null)"><i class="fas fa-undo" aria-hidden="true" /></button>
    </div>
    <div v-if="!noAvg && it.uniques && it.uniques.length > 1" :class="$style.line" data-loot-avg-uniques>
      <span :class="$style.lab" title="Untick a unique to leave it out of this base's average drop (a special drop you never see)">In the average</span>
      <label v-for="u in it.uniques" :key="u.name" :class="[$style.uq, { [$style.uqOut]: !u.counted }]" :title="u.chase ? 'Chase (T0): never in the average, the base shows in Chase uniques' : u.out ? 'Left out of the average' : u.counted ? 'Counted in the average' : 'Not counted'">
        <input type="checkbox" :checked="!u.out" :disabled="u.chase && !u.out" :aria-label="`Count ${u.name} in the average`" data-loot-not-avg @change="emit('notAvg', u.name)">
        <span v-item-tip="{ name: u.name, type: it.name }" :class="$style.uqName">{{ u.name }}</span>
        <span :class="$style.unit">{{ u.chase ? 'chase' : rarity(u.tier) }} · {{ chaosText(u.chaos) }}</span>
      </label>
    </div>
    <StyleEditor v-if="edit.look" look-only :look="{ ...stepLook, ...edit.look }" visibility="Show" :preview-text="it.name" @patch="p => setLook({ ...edit.look, ...p })" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import StateChip from './StateChip.vue'
import StyleEditor from './StyleEditor.vue'
import type { StylePatch } from './edits'
import { CSTEP_NAMES } from './currency-weights'
import type { CStep, CurrencyItem, ItemEdit } from './currency-weights'

const props = defineProps<{
  it: CurrencyItem
  edit: ItemEdit
  // The step one of it gets now, for the own look to start from.
  step: CStep
  // poe.ninja's (or the guessed) price, before any of yours.
  basePrice: number
  // How its step and category look, for the own look to start from.
  baseLook: StylePatch
  // The Alt+F card lists the uniques itself.
  noAvg?: boolean
}>()
const emit = defineEmits<{ change: [edit: ItemEdit | null], notAvg: [name: string] }>()
const RARITY = ['extremely rare', 'very rare', 'very rare', 'rare', 'uncommon', 'common']
const rarity = (t: number | null) => t == null ? 'untiered' : RARITY[t] ?? ''
const chaosText = (v: number) => `${v >= 10 ? Math.round(v) : Number(v.toPrecision(2))}c`

// The Loot tab's step colours.
const STEP_CSS = ['#3b372f', '#6d6250', '#a08d5e', '#cdb27a', '#ffe196', '#ff4040']
const stepOptions = [
  { value: 'auto', label: 'Price decides', desc: 'Its price × stack picks the step.', dot: 'var(--w-gold)' },
  ...CSTEP_NAMES.map((n, i) => ({ value: String(i), label: n, desc: i === 0 ? 'Never shows in maps.' : `Always looks ${n}, whatever the price.`, dot: STEP_CSS[i], hollow: i === 0 }))
]
const LOOKS = [
  { value: 'step', label: "Its step's look", desc: 'Looks like the rest of its step.', dot: 'var(--w-gold)' },
  { value: 'own', label: 'Its own look', desc: 'Your colours, sound, beam and map icon, on top of its step.', dot: 'var(--w-gold-hi)', glow: true }
]
const source = computed(() => props.it.none ? 'no price' : props.it.why ? props.it.why.toLowerCase() : props.it.est ? 'a guess' : 'poe.ninja')
const stepLook = computed<StylePatch>(() => props.baseLook)

function put (patch: Partial<ItemEdit>) {
  const next = Object.fromEntries(Object.entries({ ...props.edit, ...patch }).filter(([, v]) => v !== undefined)) as ItemEdit
  emit('change', Object.keys(next).length ? next : null)
}
function setStep (v: string) { put({ step: v === 'auto' ? undefined : Number(v) as CStep }) }
// Each writes back to the field, so a refused number doesn't stay typed.
function setPrice (el: HTMLInputElement) {
  const n = Number(el.value)
  const price = el.value.trim() && Number.isFinite(n) && n > 0 ? Math.min(n, 1e7) : undefined
  put({ price })
  el.value = price == null ? '' : String(price)
}
function setSupply (el: HTMLInputElement) {
  const n = Math.round(Number(el.value))
  const supply = el.value.trim() && Number.isFinite(n) && n >= 1 ? Math.min(n, 100_000) : undefined
  put({ supply })
  el.value = supply == null ? '' : String(supply)
}
function setLook (look: StylePatch | undefined) { put({ look }) }
</script>

<style module>
.ed {
  margin: 2px 0 6px 26px;
  padding: 4px 8px;
  border-left: 2px solid var(--w-line);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.line { display: flex; align-items: center; gap: 4px 12px; flex-wrap: wrap; font-size: var(--w-fs-sm); }
.lab { display: inline-flex; align-items: center; gap: 4px; color: var(--w-dim); font-size: var(--w-fs-xs); }
.unit { color: var(--w-faint); }
.numIn {
  width: 4.2em;
  background: none;
  border: 1px solid transparent;
  border-bottom-color: var(--w-line);
  border-radius: var(--w-r-sm);
  color: var(--w-fg);
  padding: 0 3px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.numIn:hover, .numIn:focus { border-color: var(--w-line); background: var(--w-panel-2); }
.short { width: 3.2em; }
.moved { border-color: var(--w-frame); }
.uq { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
.uq input { accent-color: #c8a565; margin: 0; }
.uqName { color: #af6025; }
.uqOut .uqName { color: var(--w-faint); text-decoration: line-through; }
</style>
