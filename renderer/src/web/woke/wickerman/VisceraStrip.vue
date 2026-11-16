<template>
  <div v-if="v" :class="$style.strip" data-woke-viscera>
    <!-- A click prices that version: the search below swaps to its mod and range. -->
    <div v-for="(t, i) in v.tiers" :key="t.label"
      :class="[$style.tier, i === shown && $style.held, canPick(i) && $style.pick]"
      :role="canPick(i) ? 'button' : undefined"
      :title="canPick(i) ? (i === held ? 'Back to your version' : `Price the ${t.label} version`) : undefined"
      @click="pick(i)">
      <span :class="$style.label">{{ t.label }}</span>
      <span :class="[$style.text, i !== shown && 'w-dim']">{{ t.text }}</span>
      <span v-if="i === held" :class="$style.yours">yours</span>
      <span v-else-if="i === shown" :class="$style.shown">searched</span>
    </div>
    <div :class="$style.drops">
      <template v-if="v.act">
        <span class="w-dim">Act {{ v.act.n }}</span>
        <span :class="v.act.unsure && $style.unsure" :title="v.act.unsure ? 'Not confirmed' : undefined">{{ actLine(v) }}</span>
      </template>
      <template v-for="m in v.maps" :key="m.boss + m.map">
        <span class="w-dim">{{ m.kind === 'Map boss' ? 'Map' : m.kind }}</span>
        <span :class="m.unsure && $style.unsure" :title="m.unsure ? 'Not confirmed' : undefined">{{ m.boss }}, {{ m.map }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, shallowRef, watchEffect } from 'vue'
import { parseClipboard } from '@/parser'
import type { ParsedItem } from '@/parser'
import { AppConfig } from '@/web/Config'
import { isModuleOn } from '../modules'
import { onSharedDataChange } from '../app/live-data'
import { actLine, heldTier, loadViscera, otherTierText } from './viscera'
import type { VisceraTable } from './viscera'

const props = defineProps<{ item: ParsedItem }>()

// The price check's item, swapped for another version's (PriceCheckWindow.vue).
const replaceItem = inject<((other: ParsedItem) => void) | null>('price-check-replace-item', null)

const table = shallowRef<VisceraTable | null>(null)
const on = computed(() => isModuleOn(AppConfig(), 'wickerman'))
// A data update brings a new table: read it again.
onBeforeUnmount(onSharedDataChange(() => { table.value = null }))

watchEffect(() => {
  if (on.value && !table.value) loadViscera().then(t => { table.value = t }).catch(() => {})
})

// The item you copied, while the window prices another version of it.
const own = computed(() => made.get(props.item)?.own ?? props.item)

const lines = computed(() => own.value.rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l && l !== '--------'))
// The name as copied ("Greater Skeletal Warrior's Leg"): the first line after the header.
const copiedName = computed(() => lines.value.find(l => !/^(Item Class|Rarity):/.test(l)) ?? '')

const v = computed(() => {
  if (!on.value || !table.value) return null
  return table.value.byName.get(own.value.info.refName.toLowerCase()) ?? null
})

const held = computed(() => v.value ? heldTier(v.value, copiedName.value, lines.value) : null)
// The version the search below is for.
const shown = computed(() => made.get(props.item)?.tier ?? held.value)

// Another version needs your version's lines to swap; a named one with the
// same text as yours (Queen) would search the same thing.
function canPick (i: number): boolean {
  if (!replaceItem || !v.value || held.value == null || i === shown.value) return false
  return i === held.value || v.value.tiers[i].text !== v.value.tiers[held.value].text
}

function pick (i: number) {
  if (!canPick(i)) return
  if (i === held.value) { replaceItem!(own.value); return }
  const text = otherTierText(v.value!, own.value.rawText, held.value!, i)
  const other = text == null ? null : parseClipboard(text).unwrapOr(null)
  if (!other) return
  made.set(other, { own: own.value, tier: i })
  replaceItem!(other)
}
</script>

<script lang="ts">
// Items made for another version, with the copy they came from.
const made = new WeakMap<ParsedItem, { own: ParsedItem, tier: number }>()
</script>

<style module>
.strip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border-radius: var(--w-r-md);
  border: 1px solid var(--w-line-strong);
  background: var(--w-panel);
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-sm);
}
.tier { display: flex; align-items: baseline; gap: 8px; padding: 1px 4px; margin: 0 -4px; border-radius: var(--w-r-sm); }
.held { background: var(--w-accent-soft); }
.pick { cursor: pointer; }
.pick:hover { background: var(--w-chip-ground); }
.label { flex: none; min-width: 3.5em; color: var(--w-gold); font-family: var(--w-caps-face); }
.text { min-width: 0; white-space: pre-line; color: var(--w-r-magic); }
.yours {
  flex: none;
  margin-left: auto;
  font-size: var(--w-fs-xs);
  padding: 0 5px;
  border-radius: var(--w-r-sm);
  background: var(--w-accent);
  color: var(--w-accent-fg);
}
.shown {
  flex: none;
  margin-left: auto;
  font-size: var(--w-fs-xs);
  padding: 0 5px;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-accent);
  color: var(--w-accent);
}
.drops {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1px 10px;
  margin-top: 3px;
  padding-top: 4px;
  border-top: 1px solid var(--w-line);
}
.unsure { text-decoration: underline dotted; text-underline-offset: 2px; }
</style>
