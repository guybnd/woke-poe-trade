<template>
  <!-- woke: a divination card on the instant card: what its full set gives, in the
       game's colours, and the set's price against the reward's (Guy, 2026-11-28). -->
  <section v-if="tip" :class="$style.root" data-testid="instant-card-set" data-goto-spot="card-set">
    <div :class="$style.head">Full set of {{ tip.n }} gives</div>
    <div v-for="(line, l) in lines" :key="l" :class="$style.reward" v-item-tip="l === 0 && reward ? { name: reward.name, count: reward.count > 1 ? reward.count : undefined } : null">
      <span v-for="(p, i) in line" :key="i" :class="$style[`t-${p.tone}`]">{{ p.text }}</span>
    </div>
    <div v-if="setText" :class="$style.sum" data-testid="instant-card-set-sum">
      <span>{{ tip.n }} cards <w-price-text :text="setText" /></span>
      <template v-if="rewardText">
        <span :class="$style.dot">·</span><span>reward <w-price-text :text="rewardText" /></span>
        <span v-if="gain" :class="gain.up ? 'w-up' : 'w-down'" data-testid="instant-card-set-gain">{{ gain.text }}</span>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { loadTipItems } from '../ui/tooltip/item-tip'
import { parseMarkup } from '../ui/tooltip/tip-content'
import { cardReward } from '../ui/tooltip/card-tip-extras'
import { usePrice } from '../shared/price'
import { formatChaos } from '../ui/format'
import { WPriceText, vItemTip } from '../ui'

const props = defineProps<{
  name: string
  /** The card's own price in chaos (poe.ninja's), if it has one. */
  chaos: number | null
}>()

const tip = shallowRef<{ d: string, n: number } | null>(null)
watch(() => props.name, (name) => {
  tip.value = null
  loadTipItems().then(items => {
    const t = items?.[name]
    if (props.name === name && t?.d && t.n) tip.value = { d: t.d, n: t.n }
  }).catch(() => {})
}, { immediate: true })

const lines = computed(() => tip.value ? parseMarkup(tip.value.d, 'text') : [])
const reward = computed(() => cardReward(tip.value ?? undefined))
const price = usePrice()
const fmt = (c: number) => formatChaos(c, price.divine.value)
const setChaos = computed(() => tip.value && props.chaos != null && props.chaos > 0 ? props.chaos * tip.value.n : null)
const rewardChaos = computed(() => {
  const r = reward.value
  if (!r || (r.ns === 'UNIQUE' && price.isVariable(r.name))) return null
  const each = price.priceOf(r.name, { ns: r.ns })?.chaos
  return each != null && each > 0 ? each * r.count : null
})
const setText = computed(() => setChaos.value != null ? fmt(setChaos.value) : null)
const rewardText = computed(() => rewardChaos.value != null ? fmt(rewardChaos.value) : null)
const gain = computed(() => {
  if (setChaos.value == null || rewardChaos.value == null) return null
  const pct = Math.round((rewardChaos.value / setChaos.value - 1) * 100)
  if (pct === 0) return { text: 'even', up: true }
  return { text: `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`, up: pct > 0 }
})
</script>

<style module>
.root { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: calc(15px * var(--w-text-scale, 1)); text-align: center; }
.head { color: var(--w-dim); }
.reward { font-size: calc(17px * var(--w-text-scale, 1)); line-height: 1.3; }
.sum { display: flex; flex-wrap: wrap; justify-content: center; gap: 0 6px; color: var(--w-dim); margin-top: 2px; }
.dot { color: var(--w-faint); }
.t-label { color: var(--w-faint); }
.t-value { color: #fff; }
.t-text { color: var(--w-r-normal); }
.t-mod { color: var(--w-r-magic); }
.t-dim { color: var(--w-dim); }
.t-gem { color: var(--w-r-gem); }
.t-corrupted { color: var(--w-down); }
.t-mutated { color: var(--w-corrupt); }
.t-unique { color: var(--w-r-unique); }
.t-rare { color: var(--w-r-rare); }
.t-currency { color: var(--w-r-currency); }
.t-card { color: var(--w-r-divination); }
</style>
