<template>
  <!-- One item, set by hand (Guy's pick E1): its step, its price, a supply stack, its own look. -->
  <div :class="$style.ed" data-currency-editor>
    <div :class="$style.row">
      <span :class="$style.lab">Price</span>
      <span class="w-num">{{ chaosText(priceNow) }} each</span>
      <span class="w-faint text-xs">{{ edit.price != null ? 'yours' : it.est ? `a guess from NeverSink's ${it.tier ? `tier ${it.tier}` : 'tiers'}` : 'poe.ninja' }}</span>
      <label :class="$style.lab2">Use my price
        <input :value="edit.price ?? ''" type="number" min="0" step="any" placeholder="–" :class="$style.numIn"
          :aria-label="`Your price for ${it.name}, in chaos`" @change="setPrice($event.target as HTMLInputElement)"> c</label>
    </div>
    <div :class="$style.row">
      <span :class="$style.lab">Step</span>
      <WSegmented :model-value="edit.step == null ? 'auto' : String(edit.step)" :options="stepOptions" @update:model-value="setStep" />
    </div>
    <div :class="$style.row">
      <span :class="$style.lab">Supply</span>
      <label :class="$style.lab2">Always show from
        <input :value="edit.supply ?? ''" type="number" min="1" :max="it.full" placeholder="–" :class="$style.numIn"
          :aria-label="`Always show ${it.name} from this stack size`" @change="setSupply($event.target as HTMLInputElement)"> in a stack (full stack {{ it.full.toLocaleString() }})</label>
    </div>
    <div :class="$style.row">
      <span :class="$style.lab">Look</span>
      <WSegmented :model-value="edit.look ? 'own' : 'step'" :options="[{ value: 'step', label: 'Its step\'s look' }, { value: 'own', label: 'Its own look' }]" @update:model-value="v => v === 'own' ? setLook(edit.look ?? {}) : setLook(undefined)" />
      <span class="w-faint text-xs">{{ edit.look ? 'On top of its step: colours, sound, beam and map icon' : '' }}</span>
    </div>
    <StyleEditor v-if="edit.look" look-only :look="{ ...stepLook, ...edit.look }" visibility="Show" :preview-text="it.name" @patch="p => setLook({ ...edit.look, ...p })" />
    <div :class="$style.row">
      <WButton size="sm" variant="ghost" icon="fas fa-undo" :disabled="!Object.keys(edit).length" @click="emit('change', null)">Let the price decide again</WButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WButton, WSegmented } from '../ui'
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
}>()
const emit = defineEmits<{ change: [edit: ItemEdit | null] }>()

const stepOptions = [{ value: 'auto', label: 'Price decides' }, ...CSTEP_NAMES.map((n, i) => ({ value: String(i), label: n }))]
const priceNow = computed(() => props.edit.price ?? props.basePrice)
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

function chaosText (v: number): string {
  if (v >= 100) return `${Math.round(v).toLocaleString()}c`
  if (v >= 10) return `${Math.round(v)}c`
  if (v >= 1) return `${Number(v.toFixed(1))}c`
  return `${Number(v.toPrecision(2))}c`
}
</script>

<style module>
.ed {
  margin: 2px 0 6px 26px;
  padding: 8px 10px;
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  background: var(--w-panel-2);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: var(--w-fs-sm); }
.lab { color: var(--w-dim); min-width: 4.5rem; font-size: var(--w-fs-xs); }
.lab2 { display: inline-flex; align-items: center; gap: 4px; color: var(--w-dim); }
.numIn {
  width: 4.6em;
  background: var(--w-panel);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  color: inherit;
  padding: 0 4px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
