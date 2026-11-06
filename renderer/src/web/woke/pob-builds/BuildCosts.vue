<template>
  <template v-if="stages.length">
    <div :class="$style.heading">Cost of each stage</div>
    <template v-for="s in stages" :key="s.title">
      <button type="button" :class="[$style.stage, { [$style.open]: open === s.title }]" class="w-focusable" :aria-expanded="open === s.title" @click="open = open === s.title ? null : s.title">
        <span class="w-trunc">{{ s.title }}</span>
        <span class="ml-auto flex items-center gap-1.5 whitespace-nowrap">
          <span v-if="s.uniques.length && s.atLeast" class="w-dim text-xs">from</span>
          <WPrice v-if="s.uniques.length" :chaos="s.chaos" :divine="divine" />
          <span v-if="s.unpriced.length" class="w-dim text-xs">{{ s.uniques.length ? '+ ' : '' }}{{ s.unpriced.length }} unpriced</span>
          <span v-if="s.rares.length" class="w-dim text-xs">{{ s.uniques.length || s.unpriced.length ? '+ ' : '' }}{{ s.rares.length }} {{ s.rares.length === 1 ? 'rare' : 'rares' }}</span>
        </span>
      </button>
      <template v-if="open === s.title">
        <div v-for="(r, i) in s.uniques" :key="`u${i}`" :class="$style.line">
          <span class="w-rarity-unique w-trunc">{{ r.item.name }}</span>
          <span class="ml-auto flex items-center gap-1 whitespace-nowrap">
            <WPrice :chaos="r.price?.chaos" :divine="divine" />
            <template v-if="r.price?.high != null"><span class="w-dim text-xs">to</span><WPrice :chaos="r.price.high" :divine="divine" /></template>
          </span>
        </div>
        <div v-for="(r, i) in s.unpriced" :key="`n${i}`" :class="$style.line">
          <span class="w-rarity-unique w-trunc">{{ r.item.name }}</span>
          <span class="ml-auto w-faint text-xs">no price</span>
        </div>
        <button v-for="(r, i) in s.rares" :key="`r${i}`" type="button" :class="$style.line" class="w-focusable" :title="`Price check this ${r.item.base} with its stats`" @click="openPriceCheck(r.item, $event)">
          <span class="w-rarity-rare w-trunc">{{ r.item.base || r.item.name }}</span>
          <span class="ml-auto w-dim text-xs whitespace-nowrap"><i class="fas fa-search" /> {{ r.slot }}</span>
        </button>
      </template>
    </template>
    <div class="w-faint text-xs pt-1">poe.ninja, for gear and tree jewels. A range means its variants differ. Rares have no price without a search.</div>
  </template>
</template>

<script setup lang="ts">
// On the Gear tab: what each stage of the build costs.
import { computed, onMounted, shallowRef } from 'vue'
import { ItemRarity } from '@/parser'
import type { ParsedItem } from '@/parser'
import { usePoeninja } from '@/web/background/Prices'
import { getDetailsId } from '@/web/price-check/trends/getDetailsId'
import { WPrice } from '../ui'
import { stageCosts } from './build-costs'
import type { Price } from './build-costs'
import { openPriceCheck } from './open-price-check'
import type { PobDetails, PobItem } from './widget'

const props = defineProps<{ details: PobDetails }>()

const ninja = usePoeninja()
const divine = computed(() => ninja.xchgRate.value ?? null)
const open = shallowRef<string | null>(null)

// The same query as the price check, so links and Foulborn variants count.
// A Foulborn item's name is what sets its price, and the query drops it.
function priceOf (item: PobItem, parsed: ParsedItem | null): Price | null {
  if (parsed?.rarity === ItemRarity.Unique && !item.name.startsWith('Foulborn ')) {
    try {
      const id = getDetailsId(parsed)
      const exact = id ? ninja.findPriceByQuery(id) : null
      if (exact) return { chaos: exact.chaos }
    } catch {}
  }
  const all = ninja.findPricesByName('UNIQUE', item.name).map(r => r.chaos)
  if (!all.length) return null
  const low = Math.min(...all)
  const high = Math.max(...all)
  return high > low ? { chaos: low, high } : { chaos: low }
}

// Other windows may not have asked for prices yet.
onMounted(() => { ninja.queuePricesFetch() })

const stages = computed(() => {
  // No prices yet: nothing to say. The divine rate comes with each load.
  if (divine.value == null) return []
  const costs = stageCosts(props.details, priceOf)
  // One set of rares says nothing the rows above don't.
  return costs.length > 1 || costs.some(c => c.uniques.length) ? costs : []
})
</script>

<style module>
.heading {
  padding: 8px 0 2px;
  font-size: var(--w-fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--w-faint);
}
.stage, .line {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  text-align: left;
  border-bottom: 1px solid var(--w-line-soft);
}
.stage { padding: 3px 0; }
.stage:hover, button.line:hover { background: var(--w-line-soft); }
.open { background: var(--w-accent-soft); }
.line { padding: 2px 0 2px 14px; }
</style>
