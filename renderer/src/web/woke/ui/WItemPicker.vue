<template>
  <!-- A search box with the matching items under it. Arrows move, Enter adds the
       highlighted one, Esc closes; each row keeps its item tooltip. -->
  <div class="relative" @keydown="onKey">
    <WField :model-value="modelValue" :icon="icon" :placeholder="placeholder" :label="label ?? placeholder" class="w-full"
      :clear-on-esc="false" @update:model-value="emit('update:modelValue', String($event))" />
    <div v-if="items.length" ref="listEl" class="w-surface absolute left-0 right-0 z-10 mt-1 py-1" :style="listStyle" role="listbox" data-item-picker>
      <button v-for="(item, i) in items" :key="itemKey(item)" v-item-tip="tip(item)" type="button" role="option" :aria-selected="i === hl"
        class="w-row w-full text-left" :class="i === hl && $style.hl" style="grid-template-columns: minmax(0,1fr) auto;"
        @mouseenter="hl = i" @click="emit('pick', item)">
        <slot :item="item" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { nextTick, ref, watch } from 'vue'
import WField from './WField.vue'
import { vItemTip } from './tooltip/item-tip'
import type { ItemTipRef } from './tooltip/item-tip'
import { pickerKey } from './item-picker'

const props = defineProps<{
  modelValue: string
  items: T[]
  itemKey: (item: T) => string
  // A row's item tooltip; the row's item itself when left out (a market row).
  tipOf?: (item: T) => ItemTipRef
  placeholder?: string
  label?: string
  icon?: string
  listStyle?: string
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'pick', item: T): void
}>()

const hl = ref(0)
const listEl = ref<HTMLElement | null>(null)
watch(() => props.items, () => { hl.value = 0 })

function tip (item: T): ItemTipRef {
  return props.tipOf ? props.tipOf(item) : item as unknown as ItemTipRef
}

function onKey (e: KeyboardEvent) {
  const step = pickerKey(e.key, hl.value, props.items.length, props.modelValue !== '')
  if (!step) return
  e.preventDefault()
  e.stopPropagation()
  if (step.kind === 'close') { emit('update:modelValue', ''); return }
  hl.value = step.hl
  if (step.kind === 'pick') { emit('pick', props.items[step.hl]); return }
  nextTick(() => { listEl.value?.children[step.hl]?.scrollIntoView({ block: 'nearest' }) })
}
</script>

<style module>
.hl { background: var(--w-accent-soft); }
</style>
