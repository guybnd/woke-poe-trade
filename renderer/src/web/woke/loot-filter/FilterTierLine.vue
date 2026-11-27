<template>
  <!-- woke: a unique's loot filter tier, in its label's own look (Guy,
       2026-11-27). Folded: the tier. Open: the drop's look, its rule and
       the dearest unique on the base, which NeverSink tiers by. -->
  <template v-if="tier">
    <button type="button" :class="$style.hd" :aria-expanded="open" data-related-head data-goto-spot="filter-tier" data-filter-tier-head @click="open = !open">
      <span :class="[$style.chev, { [$style.open]: open }]">▶</span>
      <span :class="$style.title">Loot filter</span>
      <span :class="$style.top" :title="tier.where"><LabelPreview :text="tier.short" :actions="tier.actions" :visibility="tier.visibility" :extras="false" /></span>
    </button>
    <div v-if="open" :class="$style.body" data-filter-tier>
      <div :class="$style.look">
        <LabelPreview :text="item.info.name" :actions="tier.actions" :visibility="tier.visibility" />
        <button v-if="tier.rule" type="button" :class="$style.go" @click="goToRule">Go to rule ›</button>
      </div>
      <div :class="$style.note">{{ tier.where }}{{ tier.visibility === 'Hide' ? ', hidden' : '' }}.<template v-if="tier.byBase"> Your filter tiers uniques by base: every unique {{ tier.base }} drops like this.</template></div>
      <div v-if="tier.dearest && tier.dearest.name === item.info.refName" :class="$style.note">{{ tier.dearest.setsTier ? 'Its price sets the tier' : 'The dearest unique on this base' }}<span v-if="price" :class="$style.price">{{ price.text }}<img :class="$style.coin" :src="price.coin" alt=""></span></div>
      <div v-else-if="tier.dearest" :class="$style.note">{{ tier.dearest.setsTier ? 'Set by' : 'Dearest on this base:' }} <span v-item-tip="{ name: tier.dearest.name, type: tier.base }" :class="$style.uname">{{ tier.dearest.name }}</span><span v-if="price" :class="$style.price">{{ price.text }}<img :class="$style.coin" :src="price.coin" alt=""></span></div>
    </div>
  </template>
</template>

<script setup lang="ts">
// Loaded with the first unique checked while a loot filter is set up, not at
// startup (RelatedItems.vue; the startup JS budget).
import { computed } from 'vue'
import type { ParsedItem } from '@/parser'
import { usePoeninja, displayRounding } from '@/web/background/Prices'
import { vItemTip } from '../ui/tooltip/item-tip'
import { storedPref } from '../ui/stored-pref'
import { toast } from '../ui'
import LabelPreview from './LabelPreview.vue'
import { useActiveFilter } from './active-filter'
import { uniqueTier } from './unique-tier'
import { openRuleInEditor } from './open-rule'

const props = defineProps<{ item: ParsedItem }>()
const active = useActiveFilter()
const { autoCurrency } = usePoeninja()

const tier = computed(() => {
  try { return uniqueTier(active.value, props.item) } catch { return null }
})

// Open or folded as the player last left it; folded at first.
const open = storedPref<boolean>('woke.uniqueFilterTierOpen', raw => raw === 'true', v => v ? 'true' : null)

const price = computed(() => {
  const chaos = tier.value?.dearest?.chaos
  if (chaos == null) return null
  const p = autoCurrency(chaos)
  const text = p.min === p.max ? displayRounding(p.min, true) : `${displayRounding(p.min, true)}–${displayRounding(p.max, true)}`
  return { text, coin: p.currency === 'div' ? '/images/divine.png' : '/images/chaos.png' }
})

function goToRule () {
  const rule = tier.value?.rule
  if (rule && !openRuleInEditor(rule)) toast('The loot filter editor is not loaded.')
}
</script>

<style module>
/* The side list's own folding heading (RelatedItems.vue .hd + .fold). */
.hd {
  display: flex;
  width: 100%;
  text-align: left;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--w-panel-solid);
  border-bottom: 1px solid var(--w-line);
  font-family: var(--w-head);
  font-size: var(--w-fs-lg);
  color: var(--w-accent);
  cursor: pointer;
}
.hd:hover { filter: brightness(1.15); }
.chev { display: inline-block; flex: none; width: 10px; font-size: var(--w-fs-xs); color: var(--w-faint); transition: transform .12s; }
.chev.open { transform: rotate(90deg); }
.title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.top { margin-left: auto; display: inline-flex; align-items: center; min-width: 0; max-width: 60%; font-family: var(--w-body); }
.body { display: grid; gap: 3px; padding: 6px 12px 7px; }
.look { display: flex; align-items: center; gap: 8px; min-width: 0; }
.go { margin-left: auto; flex: none; font-size: var(--w-fs-sm); color: var(--w-dim); cursor: pointer; white-space: nowrap; }
.go:hover { color: var(--w-accent); }
.note { font-size: var(--w-fs-sm); line-height: 1.35; color: var(--w-faint); }
.uname { color: #d98a4a; }
.price { display: inline-flex; margin-left: 5px; vertical-align: bottom; align-items: center; gap: 3px; color: var(--w-dim); white-space: nowrap; font-variant-numeric: tabular-nums; }
.coin { width: 16px; height: 16px; object-fit: contain; }
</style>
