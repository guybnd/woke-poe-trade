<template>
  <!-- Under the Jewels page's Abyss and Jewels folds (Guy's Jewels A + U1,
       2026-11-28): the unique jewels, read only (the Uniques page owns them,
       so two settings never fight over one jewel). Cluster jewels are a
       section of their own above, folded by size (WOKEPOET-726); NeverSink's
       cluster price rules stay on the Rules tab's Cluster page. -->
  <div :class="$style.wrap" data-loot-jewels>
    <div v-if="uniques.length" :class="$style.cat" data-loot-unique-jewels>
      <div :class="$style.head" role="button" tabindex="0" :aria-expanded="open" @click="open = !open" @keydown.enter.prevent="open = !open" @keydown.space.prevent="open = !open">
        <i class="fas text-xs w-dim" :class="open ? 'fa-chevron-down' : 'fa-chevron-right'" />
        <WIcon item="Prismatic Jewel" size="sm" />
        <span :class="$style.name">Unique jewels</span>
        <span :class="$style.count">{{ uniques.filter(u => u.step > 0).length }} of {{ uniques.length }} show · set in Uniques</span>
      </div>
      <div v-if="open" :class="$style.body" role="table" aria-label="Unique jewels and their step, set on the Uniques page">
        <WItemRow v-for="u in uniques" :key="u.it.name" :item="tipOf(u.it)" :class="$style.row" role="row" action="pick" :data-unique-jewel="u.it.name" @pick="emit('open-unique', u.it.name)">
          <span :class="$style.label">{{ u.it.top ?? u.it.name }}<span v-if="u.it.top" class="w-faint"> · {{ u.it.name }}</span></span>
          <span :class="$style.price">{{ chaosText(u.it.chaos) }}<span v-if="u.it.est" class="w-faint"> est.</span></span>
          <span :class="$style.pill" :style="{ background: STEP_CSS[u.step], color: u.step >= 3 ? '#140f08' : '#efe4cc' }">{{ CSTEP_NAMES[u.step] }}</span>
          <i class="fas fa-arrow-right w-faint" aria-hidden="true" title="Open in Uniques" />
        </WItemRow>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { WIcon, WItemRow } from '../ui'
import { CSTEP_NAMES, CURRENCY_TYPE, currencyItems, scaled, stacksFor, stepOfPile, withEdit } from './currency-weights'
import type { CurrencyItem } from './currency-weights'
import { isJewelBase } from './jewel-classes'
import { UNIQUE_CLS } from './unique-classes'
import { lootTipRef } from './base-tip'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'

const props = defineProps<{ store: LootFilterStore, config: LootFilterWidget }>()
const emit = defineEmits<{ (e: 'open-rule', r: { type: string, tier: string }): void, (e: 'open-unique', name: string): void }>()

const STEP_CSS = ['#3b372f', '#6d6250', '#a08d5e', '#cdb27a', '#ffe196', '#ff4040']
const open = ref(true)
const c = computed(() => props.config.presets.currency)

// The Uniques page's rows on a jewel base, with your edits, and the step a
// single one gets there.
const uniques = computed(() => {
  const doc = props.store.doc.value
  const lookup = props.store.prices.lootLookup.value
  if (!doc || !lookup) return []
  const eff = scaled(c.value, doc.strictness)
  return currencyItems({ ...doc, blocks: doc.blocks.filter(b => b.type !== CURRENCY_TYPE) }, lookup, {})
    .filter(it => it.cls === UNIQUE_CLS && isJewelBase(it.bt ?? it.name))
    .map(raw => {
      const it = withEdit(raw, c.value.items[raw.name])
      return { it, step: c.value.on ? stepOfPile(stacksFor(it, eff), 1) : 0 }
    })
    .sort((a, b) => b.it.chaos - a.it.chaos || a.it.name.localeCompare(b.it.name))
})
const tipOf = (it: CurrencyItem) => lootTipRef(it, props.store.prices.breakdown.value, props.config.safetyNet.minChaos)

function chaosText (v: number): string {
  if (v >= 100) return `${Math.round(v).toLocaleString()}c`
  if (v >= 10) return `${Math.round(v)}c`
  if (v >= 1) return `${Number(v.toFixed(1))}c`
  return `${Number(v.toPrecision(2))}c`
}
</script>

<style module>
.wrap { display: flex; flex-direction: column; gap: 8px; }
.cat { border: 1px solid var(--w-line); border-radius: var(--w-r-sm); max-width: 60rem; }
.head { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; padding: 4px 8px; cursor: pointer; }

.name { font-size: var(--w-fs-sm); color: #e2d3ad; white-space: nowrap; }
.count { font-size: var(--w-fs-xs); color: var(--w-dim); }
.body { border-top: 1px solid var(--w-line); padding: 4px 8px 6px; }
.row { display: grid; grid-template-columns: auto minmax(0, 1fr) 5.5rem auto 1rem; align-items: center; gap: 8px; padding: 1px 4px; }
.label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #c9b98c; }
.price { text-align: right; font-variant-numeric: tabular-nums; }
.pill { font-size: var(--w-fs-xs); padding: 0 5px; border-radius: 2px; line-height: 1.5; white-space: nowrap; }
</style>
