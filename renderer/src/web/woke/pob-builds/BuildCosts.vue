<template>
  <template v-if="stages.length">
    <div :class="$style.heading">Cost of each stage</div>
    <template v-for="s in stages" :key="s.title">
      <button type="button" :class="[$style.stage, { [$style.open]: open === s.title }]" class="w-focusable" :aria-expanded="open === s.title" @click="open = open === s.title ? null : s.title">
        <span class="w-trunc">{{ s.title }}</span>
        <span class="ml-auto flex items-center gap-1.5 whitespace-nowrap">
          <WPrice v-if="s.uniques.length" :chaos="s.chaos" :divine="divine" />
          <span v-if="s.rares.length" class="w-dim text-xs">{{ s.uniques.length ? '+ ' : '' }}{{ s.rares.length }} {{ s.rares.length === 1 ? 'rare' : 'rares' }}</span>
        </span>
      </button>
      <template v-if="open === s.title">
        <div v-for="r in s.uniques" :key="r.slot" :class="$style.line">
          <span class="w-rarity-unique w-trunc">{{ r.item.name }}</span>
          <span class="ml-auto"><WPrice :chaos="r.chaos" :divine="divine" /></span>
        </div>
        <div v-for="r in s.unpriced" :key="r.slot" :class="$style.line">
          <span class="w-rarity-unique w-trunc">{{ r.item.name }}</span>
          <span class="ml-auto w-faint text-xs">no price</span>
        </div>
        <button v-for="r in s.rares" :key="r.slot" type="button" :class="$style.line" class="w-focusable" :title="`Price check this ${r.item.base} with its stats`" @click="openPriceCheck(r.item, $event)">
          <span class="w-rarity-rare w-trunc">{{ r.item.base || r.item.name }}</span>
          <span class="ml-auto w-dim text-xs whitespace-nowrap"><i class="fas fa-search" /> {{ r.slot }}</span>
        </button>
      </template>
    </template>
    <div class="w-faint text-xs pt-1">poe.ninja. Rares have no price without a search.</div>
  </template>
</template>

<script setup lang="ts">
// On the Gear tab: what each stage of the build costs.
import { computed, shallowRef } from 'vue'
import { ItemRarity } from '@/parser'
import type { ParsedItem } from '@/parser'
import { usePoeninja } from '@/web/background/Prices'
import { getDetailsId } from '@/web/price-check/trends/getDetailsId'
import { WPrice } from '../ui'
import { stageCosts } from './build-costs'
import { openPriceCheck } from './open-price-check'
import type { PobDetails } from './widget'

const props = defineProps<{ details: PobDetails }>()

const ninja = usePoeninja()
const divine = computed(() => ninja.xchgRate.value ?? null)
const open = shallowRef<string | null>(null)

// The same query as the price check, so links and Foulborn variants count.
function priceOf (item: ParsedItem): number | null {
  if (item.rarity !== ItemRarity.Unique) return null
  try {
    const id = getDetailsId(item)
    return id ? ninja.findPriceByQuery(id)?.chaos ?? null : null
  } catch {
    return null
  }
}

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
