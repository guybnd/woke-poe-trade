<template>
  <div :class="$style.flip">
    <div :class="$style.top">
      <span class="w-dim">What this item sells for after each swap. The price above is the item as it is.</span>
      <w-button size="sm" :disabled="anyLoading" @click="swap.runAll()">Check all ({{ swap.candidates.value.length }} {{ swap.candidates.value.length === 1 ? 'search' : 'searches' }})</w-button>
    </div>
    <div v-for="cand of swap.candidates.value" :key="cand.filter.statRef" :class="$style.block">
      <div :class="$style.title">
        <span>{{ modLine(cand) }}</span>
        <span class="w-faint">{{ cand.family.label }}</span>
      </div>
      <template v-if="runOf(cand)?.state === 'done'">
        <div :class="$style.table">
          <div :class="[$style.row, $style.head]">
            <span>{{ cand.family.random ? 'Lands on' : 'Swap to' }}</span><span>Sells for</span><span>Cost</span><span>Profit</span><span>Listings</span>
          </div>
          <div v-for="p of runOf(cand)!.result!.prices" :key="p.key" :class="$style.row">
            <span>{{ p.key === cand.from ? `Keep ${KEY_LABEL[p.key]}` : KEY_LABEL[p.key] }}</span>
            <w-price :chaos="p.chaos" :divine="divine" />
            <span class="w-num w-dim">{{ p.key === cand.from ? '—' : costText(cand, p.key) }}</span>
            <span class="w-num" :class="toneOf(profit(cand, p.key))">{{ profitText(profit(cand, p.key)) }}</span>
            <span class="w-num" :class="{ 'w-faint': p.listings < MIN_LISTINGS }">
              <template v-if="p.listings >= MIN_LISTINGS">{{ p.listings }}</template>
              <template v-else-if="runOf(cand)!.refining === p.key">searching…</template>
              <button v-else-if="runOf(cand)!.mode === 'any'" type="button" :class="$style.link"
                :title="`Only ${p.listings} among the cheapest listings. Search ${KEY_LABEL[p.key]} on its own (1 search).`"
                @click="swap.refine(cand, p.key)">{{ p.listings }}, search alone</button>
              <template v-else>{{ p.listings }}, too few</template>
            </span>
          </div>
          <div v-if="cand.family.random && average(cand) != null" :class="$style.row">
            <span class="w-dim">Average of both</span><span /><span /><span class="w-num" :class="toneOf(average(cand))">{{ profitText(average(cand)) }}</span><span />
          </div>
        </div>
        <div v-if="swap.stale(cand)" :class="$style.warn">
          Your filters changed since this search.
          <button type="button" :class="$style.link" @click="swap.run(cand, runOf(cand)!.mode)">Check again (1 search)</button>
        </div>
        <div v-if="runOf(cand)!.error" :class="$style.warn">{{ runOf(cand)!.error }}</div>
        <div v-if="runOf(cand)!.mode !== 'any'" class="w-faint" :class="$style.small">Only {{ KEY_LABEL[runOf(cand)!.mode] }} was searched. Press Any on the ⇄ to compare with your item.</div>
        <div v-if="cand.randomTarget" :class="$style.warn">Another mod is hit by the same craft, so the swap may land on that one instead.</div>
      </template>
      <div v-else-if="runOf(cand)?.state === 'loading'" class="w-dim" :class="$style.small">Searching…</div>
      <div v-else-if="runOf(cand)?.state === 'error'" :class="$style.warn">{{ runOf(cand)!.error }}</div>
      <div v-else :class="$style.small">
        <w-button size="sm" @click="swap.run(cand, 'any')">Check (1 search)</w-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WButton, WPrice } from '../ui'
import { usePoeninja } from '@/web/background/Prices'
import { KEY_LABEL } from './families'
import { MIN_LISTINGS } from './search'
import type { SwapCandidate } from './detect'
import type { SwapController } from './useSwap'

// The Flip tab: each swappable mod with what the item sells for after each swap.
const props = defineProps<{ swap: SwapController }>()
const ninja = usePoeninja()
const divine = computed(() => ninja.xchgRate.value ?? null)

const runOf = (cand: SwapCandidate) => props.swap.runs.get(cand.filter)
const anyLoading = computed(() => [...props.swap.runs.values()].some(r => r.state === 'loading'))

function modLine (cand: SwapCandidate): string {
  const roll = cand.filter.roll?.value
  return roll == null ? cand.filter.text : cand.filter.text.replace('#', String(roll))
}

function priceOf (cand: SwapCandidate, key: string): number | null {
  return runOf(cand)?.result?.prices.find(p => p.key === key)?.chaos ?? null
}

/** What the swap earns: the swapped item's price, less the item's own and the swap's cost. */
function profit (cand: SwapCandidate, key: string): number | null {
  if (key === cand.from) return null
  const after = priceOf(cand, key)
  const now = priceOf(cand, cand.from)
  const cost = props.swap.cost(cand, key)
  if (after == null || now == null || cost == null) return null
  return after - now - cost
}

function average (cand: SwapCandidate): number | null {
  const values = cand.targets.map(t => profit(cand, t))
  if (values.some(v => v == null)) return null
  return (values as number[]).reduce((a, b) => a + b, 0) / values.length
}

function money (chaos: number): string {
  const d = divine.value
  if (d && Math.abs(chaos) >= d) return `${(chaos / d).toFixed(1)} div`
  return `${Math.round(chaos)}c`
}

function profitText (v: number | null): string {
  if (v == null) return '—'
  return (v > 0 ? '+' : v < 0 ? '−' : '') + money(Math.abs(v))
}

function toneOf (v: number | null): string {
  if (v == null) return 'w-faint'
  return v > 0 ? 'w-up' : v < 0 ? 'w-down' : ''
}

function costText (cand: SwapCandidate, key: string): string {
  const c = props.swap.cost(cand, key)
  return c == null ? 'no price' : money(c)
}
</script>

<style module>
.flip { display: flex; flex-direction: column; gap: var(--w-s3); padding-top: var(--w-s2); font-size: var(--w-fs-sm); }
.top { display: flex; justify-content: space-between; align-items: center; gap: var(--w-s2); flex-wrap: wrap; }
.block { display: flex; flex-direction: column; gap: var(--w-s1); }
.title { display: flex; justify-content: space-between; gap: var(--w-s2); font-weight: 600; }
.table { display: flex; flex-direction: column; }
.row { display: grid; grid-template-columns: 1.4fr 1fr 0.8fr 0.9fr 0.9fr; gap: var(--w-s2); align-items: center; padding: 2px 0; border-bottom: 1px solid var(--w-line); }
.row > :nth-child(n+2) { text-align: right; justify-content: flex-end; }
.head { color: var(--w-faint); font-size: var(--w-fs-caps); text-transform: var(--w-caps-case); letter-spacing: 0.04em; font-family: var(--w-caps-face); }
.small { font-size: var(--w-fs-xs); }
.warn { color: var(--w-warn); font-size: var(--w-fs-xs); }
.link { color: var(--w-accent); text-decoration: underline; text-underline-offset: 2px; }
</style>
