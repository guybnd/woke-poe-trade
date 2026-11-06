<template>
  <span v-if="verdict" :class="[$style.chip, verdict.disenchant ? $style.good : $style.dim]" :title="title">
    <template v-if="verdict.disenchant"><i class="fas fa-hammer" :class="$style.icon" /> Disenchant · </template>{{ amount }} dust/c
  </span>
</template>

<script setup lang="ts">
// Price check chip, when switched on in Settings: the checked unique's dust
// per chaos at its poe.ninja price, and "Disenchant" at your line or above.
import { computed } from 'vue'
import type { ParsedItem } from '@/parser'
import { AppConfig } from '@/web/Config'
import { usePoeninja } from '@/web/background/Prices'
import { getDetailsId } from '@/web/price-check/trends/getDetailsId'
import { DEFAULT_VERDICT_LINE, dustVerdict } from './calc'

const props = defineProps<{ item: ParsedItem }>()
const ninja = usePoeninja()

const setting = computed(() => AppConfig().woke?.disenchantVerdict)
const line = computed(() => setting.value?.line ?? DEFAULT_VERDICT_LINE)

const chaos = computed(() => {
  if (!setting.value?.on || !props.item.dustEquivalent) return null
  try {
    const id = getDetailsId(props.item)
    return id ? (ninja.findPriceByQuery(id)?.chaos ?? null) : null
  } catch { return null }
})

const verdict = computed(() => setting.value?.on && props.item.dustEquivalent
  ? dustVerdict(props.item.dustEquivalent, chaos.value, line.value)
  : null)
const amount = computed(() => Math.round(verdict.value?.dustPerChaos ?? 0).toLocaleString('en-US'))
const title = computed(() => {
  const v = verdict.value
  if (!v) return ''
  const price = `${chaos.value} chaos on poe.ninja`
  return v.disenchant
    ? `Its dust is worth more than its price (${price}): ${amount.value} dust per chaos, at or above your line of ${line.value.toLocaleString('en-US')}.`
    : `${amount.value} dust per chaos at ${price}, under your line of ${line.value.toLocaleString('en-US')}: selling it is better.`
})
</script>

<style module>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 0.5rem;
  padding: 0 8px;
  border-radius: var(--w-r-pill);
  line-height: calc(18px * var(--w-text-scale, 1));
  font-size: var(--w-fs-sm);
  white-space: nowrap;
  border: 1px solid var(--w-line-strong);
  font-variant-numeric: tabular-nums;
}
.good { color: var(--w-up); background: color-mix(in srgb, var(--w-up) 12%, transparent); }
.dim { color: var(--w-dim); }
.icon { font-size: var(--w-fs-xs); }
</style>
