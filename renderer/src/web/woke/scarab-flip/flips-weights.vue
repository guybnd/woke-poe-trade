<template>
  <div data-flip-weights>
    <div class="font-medium">Drop weights</div>
    <div :class="$style.hint">Weights are relative: changing one scales the rest. Your numbers stay through updates. Blank goes back to the listed weight, and 0 means it never comes up.</div>
    <WTabs :model-value="familyId" :options="tabs" @update:model-value="familyId = $event" />
    <div :class="[$style.row, $style.head]">
      <span>{{ capitalize(family.noun) }}</span><span>Source</span><span class="text-right">% of results</span><span />
    </div>
    <div :class="$style.list">
      <div v-for="r in rows" :key="r.name" :class="$style.row">
        <label :for="inputId(r.name)" class="w-trunc" :title="r.name">{{ shortName(r.name) }}</label>
        <span :class="sourceClass(r)">{{ sourceLabel(r) }}</span>
        <input :id="inputId(r.name)" class="rounded w-input px-1 text-right w-num" type="number" min="0" max="99" step="any"
          :value="shown(r)" :placeholder="r.percent == null ? '–' : ''" @change="setPercent(r.name, $event)">
        <button v-if="r.source === 'yours'" type="button" :class="$style.reset" @click="reset(r.name)">Reset</button><span v-else />
      </div>
    </div>
    <button v-if="hasOwn" type="button" :class="$style.reset" class="mt-1" @click="resetTab">Reset this tab</button>
  </div>
</template>

<script setup lang="ts">
// Every flip's drop weights, and where each came from. Only what you type is saved.
import { computed, shallowRef, useCssModule } from 'vue'
import { ITEMS_ITERATOR } from '@/assets/data'
import { WTabs } from '../ui'
import { FAMILIES, familyById, shortName, weightForPercent, weightRows } from './families'
import type { WeightRow } from './families'
import type { ScarabFlipWidget } from './widget'

const props = defineProps<{ configWidget: ScarabFlipWidget }>()
const $style = useCssModule()

// A flip with a known result has no weights to set.
const families = FAMILIES.filter(f => f.methods.some(m => m.id !== 'upgrade'))
const tabs = families.map(f => ({ value: f.id, label: f.label }))
const familyId = shallowRef(families.some(f => f.id === props.configWidget.family) ? props.configWidget.family! : families[0].id)
const family = computed(() => familyById(familyId.value))

const names = computed(() => {
  // The game's items, so names no longer in the game don't take up a share.
  const out: string[] = []
  for (const item of ITEMS_ITERATOR('"namespace":"ITEM"')) out.push(item.name)
  return out
})
const own = computed(() => props.configWidget.weights?.[familyId.value])
const rows = computed(() => weightRows(family.value, names.value, own.value))
const hasOwn = computed(() => Object.keys(own.value ?? {}).length > 0)

function capitalize (s: string) { return s[0].toUpperCase() + s.slice(1) }
function inputId (name: string) { return `flip-weight-${name.replace(/\W+/g, '-')}` }

function shown (r: WeightRow) {
  if (r.percent == null) return ''
  return Number(r.percent.toFixed(r.percent < 1 ? 2 : 1))
}

function sourceLabel (r: WeightRow) {
  if (r.source === 'yours') return 'Yours'
  if (r.source === 'estimate') return 'Estimated'
  return r.source ? family.value.sourceShort ?? 'Listed' : 'No weight'
}
function sourceClass (r: WeightRow) {
  return r.source === 'yours' ? $style.yours : r.source === 'estimate' ? $style.estimate : $style.measured
}

function write (next: Record<string, number>) {
  const others = Object.entries(props.configWidget.weights ?? {}).filter(([id]) => id !== familyId.value)
  props.configWidget.weights = Object.fromEntries(Object.keys(next).length ? [...others, [familyId.value, next]] : others)
}

function reset (name: string) {
  write(Object.fromEntries(Object.entries(own.value ?? {}).filter(([item]) => item !== name)))
}

function resetTab () {
  write({})
}

function setPercent (name: string, e: Event) {
  const el = e.target as HTMLInputElement
  if (el.value.trim() === '') {
    reset(name)
    return
  }
  const percent = Math.min(Number(el.value), 99)
  if (!(percent >= 0)) {
    el.value = String(shown(rows.value.find(r => r.name === name)!))
    return
  }
  write({ ...own.value, [name]: weightForPercent(family.value, names.value, own.value, name, percent) })
}
</script>

<style module>
.hint { margin: 2px 0 8px; color: var(--w-dim); font-size: var(--w-fs-sm); }
.list { max-height: 20rem; overflow-y: auto; }
.row { display: grid; grid-template-columns: minmax(0, 1fr) 7rem 5rem 3.2rem; gap: 8px; align-items: center; padding: 3px 0; border-top: 1px solid var(--w-line-soft); }
.head { margin-top: 6px; border: 0; color: var(--w-dim); font-size: var(--w-fs-sm); }
.measured { color: var(--w-dim); font-size: var(--w-fs-sm); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.estimate { color: var(--w-warn); font-size: var(--w-fs-sm); }
.yours { color: var(--w-info); font-size: var(--w-fs-sm); }
.reset { all: unset; cursor: pointer; color: var(--w-accent); font-size: var(--w-fs-sm); text-align: right; }
.reset:hover, .reset:focus-visible { text-decoration: underline; }
</style>
