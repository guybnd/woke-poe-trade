<template>
  <div :class="$style.box">
    <div :class="[$style.row, $style.head]"><span>{{ heading }}</span><span>{{ me ? 'Also needs' : 'Needs' }}</span><span class="text-right">Beasts</span></div>
    <div v-for="rec in recipes" :key="recipeTitle(rec)" :class="$style.row">
      <button tabindex="-1" :class="$style.make" :title="`${rec.g}: ${rec.r}`" @click="emit('recipe', rec)">{{ recipeTitle(rec) }}</button>
      <span :class="$style.needs">
        <template v-for="b in rec.b.filter(b => b !== me)" :key="b">
          <span v-item-tip="{ name: b, type: 'Beast' }" :class="$style.beast">
            <button tabindex="-1" :class="$style.link" @click="emit('beast', b)">{{ shortBeast(b) }}</button>
            <WPrice bulk :chaos="price(b)" :divine="divine" class="w-dim" />
            <button class="w-icon-btn" tabindex="-1" :title="`Search trade for ${b}`" :aria-label="`Search trade for ${b}`" @click="emit('trade', b)"><i class="fas fa-search" /></button>
          </span>
          <span class="w-faint">+</span>
        </template>
        <span class="w-dim">{{ rec.a }} any rare</span>
      </span>
      <WPrice :chaos="beastsCost(rec, price)" :divine="divine" class="text-right" />
    </div>
    <p class="w-dim" :class="$style.note">{{ note }}</p>
  </div>
</template>

<script setup lang="ts">
// A beast's Blood Altar recipes under its price, or the recipe that leads to a
// unique (the portal to the den that drops it). A beast's name looks it up,
// the magnifier searches trade for it, and a recipe opens its own card.
import { WPrice, vItemTip } from '../ui'
import { beastsCost, recipeTitle, shortBeast } from './lookups/bestiary'
import type { BeastRecipe } from './lookups/bestiary'

defineProps<{
  recipes: BeastRecipe[]
  // The beast whose page this is: left out of "Also needs".
  me: string | null
  heading: string
  note: string
  price: (name: string) => number | null
  divine: number | null
}>()
const emit = defineEmits<{ recipe: [rec: BeastRecipe], beast: [name: string], trade: [name: string] }>()
</script>

<style module>
.box { margin-top: var(--w-s3); }
.row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr) 76px; column-gap: 8px; align-items: center; min-height: var(--w-row-h); border-bottom: 1px solid var(--w-line-soft); }
.head { min-height: calc(24px * var(--w-text-scale, 1)); font-size: var(--w-fs-caps); font-weight: var(--w-caps-weight); letter-spacing: 0.05em; text-transform: var(--w-caps-case); color: var(--w-dim); border-bottom: 1px solid var(--w-line); font-family: var(--w-caps-face); }
.make { text-align: left; min-width: 0; padding: 2px 0; }
.make:hover { color: var(--w-accent); }
.needs { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 6px; min-width: 0; font-size: var(--w-fs-sm); }
.beast { display: inline-flex; align-items: center; gap: 4px; }
.link { color: var(--w-accent); }
.link:hover { text-decoration: underline; }
.note { margin: 4px 0 0; font-size: var(--w-fs-sm); }
</style>
