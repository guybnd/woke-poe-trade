<template>
  <!-- woke: a captured beast's Blood Altar recipes, beside the price check and
       under the instant card (WOKEPOET-485). The same table Ctrl+Space shows
       under a beast's price; a click on another beast price checks it. -->
  <div v-if="recipes.length" :class="$style.wrapper" class="w-pc-side" data-testid="beast-altar">
    <div :class="$style.hd">
      <span>Blood Altar</span>
      <span :class="$style.count">{{ recipes.length }} recipe{{ recipes.length > 1 ? 's' : '' }}</span>
    </div>
    <div :class="$style.list">
      <div v-for="rec in recipes" :key="`${rec.g}: ${rec.r}`" :class="$style.row" data-testid="beast-altar-recipe">
        <!-- A currency result is an item: its tooltip, not the recipe text. -->
        <span v-if="recipeItem(rec)" v-item-tip="{ name: recipeItem(rec)! }" :class="$style.what">{{ recipeTitle(rec) }}</span>
        <span v-else :class="$style.what" :title="[`${rec.g}: ${rec.r}`, ...(rec.n ?? [])].join('\n')">{{ recipeTitle(rec) }}</span>
        <span :class="$style.needs">
          <template v-if="others(rec).length || rec.red">
            <span class="w-faint">+</span>
            <template v-for="(b, i) in others(rec)" :key="b">
              <span v-if="i" class="w-faint">+</span>
              <button type="button" v-item-tip="{ name: b, type: 'Beast' }" :class="$style.beast" @click="check(b)">{{ shortBeast(b) }}</button>
              <WPrice bulk :chaos="price(b)" :divine="xchgRate ?? null" class="w-dim" />
            </template>
            <template v-if="rec.red"><span v-if="others(rec).length" class="w-faint">+</span><span>{{ rec.red }} red beast of any kind</span></template>
          </template>
          <span v-else>This beast alone</span>
        </span>
        <span v-if="others(rec).length" :class="$style.total">
          <span class="w-faint">All</span>
          <WPrice :chaos="beastsCost(rec, price)" :divine="xchgRate ?? null" />
        </span>
      </div>
    </div>
    <div :class="$style.ft">Since 3.30 a recipe needs only these beasts. Click one to price check it.</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { ParsedItem } from '@/parser'
import { usePoeninja } from '@/web/background/Prices'
import { WPrice, vItemTip } from '../ui'
import { priceCheckRequest } from '../ui/tooltip/item-price-check'
import type { PriceCheckInput } from '../ui/tooltip/item-menu-logic'
import { beastsCost, recipeItem, recipeTitle, recipesWith, shortBeast } from '../search/lookups/bestiary'
import type { BeastRecipe } from '../search/lookups/bestiary'
import { bestiaryData, loadBestiary } from '../search/lookups/bestiary-load'

const props = defineProps<{ item: ParsedItem }>()
const emit = defineEmits<{ check: [input: PriceCheckInput] }>()

const { findPriceByQuery, xchgRate } = usePoeninja()
onMounted(() => { loadBestiary() })

const me = computed(() => props.item.info.refName)
const recipes = computed(() => recipesWith(bestiaryData.value, me.value))
const others = (rec: BeastRecipe) => rec.b.filter(b => b !== me.value)
// The poe.ninja price the beast's own check shows.
function price (name: string): number | null {
  const row = findPriceByQuery({ ns: 'CAPTURED_BEAST', name, variant: undefined })
  return row && row.chaos > 0 ? row.chaos : null
}

// A later click, or a new check, wins over a click still waiting.
let seq = 0
async function check (name: string) {
  const mine = ++seq
  const item = props.item
  const input = await priceCheckRequest({ name, type: 'Beast' })
  if (input && mine === seq && props.item === item) emit('check', input)
}
</script>

<style module>
.wrapper {
  flex-shrink: 0;
  width: 17.5rem;
  max-width: 100%;
  margin-top: 1.5rem;
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-md);
  overflow: hidden;
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
  box-shadow: var(--w-shadow);
  pointer-events: auto;
}
.hd {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  padding: 6px 12px;
  background: var(--w-panel-solid);
  border-bottom: 1px solid var(--w-line);
  font-family: var(--w-head);
  font-size: var(--w-fs-lg);
  color: var(--w-accent);
}
.count { font-family: var(--w-body); font-size: var(--w-fs-sm); color: var(--w-faint); white-space: nowrap; }
/* Beside the instant card, which zooms it 1.2x (--w-instant-scale): the same height on screen as before. */
.list { max-height: calc(min(26rem, 60vh) / var(--w-instant-scale, 1)); overflow-y: auto; overscroll-behavior: contain; }
.row { display: flex; flex-direction: column; gap: 1px; padding: 5px 12px; border-bottom: 1px solid var(--w-line-soft); }
.row:last-child { border-bottom: 0; }
.what { color: var(--w-fg); font-weight: 500; }
.needs { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 5px; color: var(--w-dim); font-size: var(--w-fs-sm); }
.beast { color: #d98a4a; text-decoration: underline dotted; text-underline-offset: 2px; }
.beast:hover { color: var(--w-accent); }
.total { display: flex; gap: 5px; align-items: baseline; font-size: var(--w-fs-sm); font-variant-numeric: tabular-nums; }
.ft { padding: 4px 12px; border-top: 1px solid var(--w-line); font-size: var(--w-fs-sm); color: var(--w-faint); }
</style>
