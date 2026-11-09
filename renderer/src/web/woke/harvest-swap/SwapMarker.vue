<template>
  <ui-popover v-if="cand" trigger="click" placement="bottom-end" boundary="#price-window">
    <template #target>
      <button type="button" :class="[$style.marker, { [$style.dim]: !swap!.cheap(cand), [$style.on]: running }]"
        :title="`Can be swapped: ${cand.family.label}`">⇄</button>
    </template>
    <template #content>
      <div :class="$style.card">
        <div :class="$style.head">{{ cand.family.random ? "Genteel's Ducat" : 'Harvest swap' }} · {{ cand.family.label }}</div>
        <div :class="$style.rows">
          <div v-for="t of cand.targets" :key="t" :class="$style.row">
            <span>{{ KEY_LABEL[cand.from] }} → {{ KEY_LABEL[t] }}</span>
            <span class="w-dim">{{ costText(t) }}</span>
          </div>
        </div>
        <div v-if="cand.family.random" :class="$style.note">You don't pick: it lands on one of these at random.</div>
        <div v-if="cand.randomTarget" :class="$style.warn">Another mod on this item is hit by the same craft. The game picks one of the two at random.</div>
        <div v-if="cand.family.anyRoll" :class="$style.note">Tiers differ between elements, so swaps are searched at any roll.</div>
        <div :class="$style.buttons">
          <w-chip clickable :active="!active" @click="swap!.view.value = 'results'">This only</w-chip>
          <w-chip clickable :active="active === 'any'" @click="swap!.run(cand!, 'any')">{{ cand.family.random ? 'Any (random)' : 'Any' }}</w-chip>
          <template v-if="!cand.family.random">
            <w-chip v-for="t of cand.targets" :key="t" clickable :active="active === t" @click="swap!.run(cand!, t)">{{ KEY_LABEL[t] }}</w-chip>
          </template>
        </div>
        <div :class="$style.note">Each button is one trade search.</div>
      </div>
    </template>
  </ui-popover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UiPopover from '@/web/ui/Popover.vue'
import { WChip } from '../ui'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { KEY_LABEL } from './families'
import { useSwap } from './useSwap'

// The ⇄ next to a mod a swap can change. Its buttons pick what that mod is
// searched as; nothing searches until one is pressed.
const props = defineProps<{ filter: StatFilter }>()
const swap = useSwap()
const cand = computed(() => swap?.candidateFor(props.filter))
const run = computed(() => (swap && cand.value) ? swap.runs.get(cand.value.filter) : undefined)
const running = computed(() => run.value != null && swap?.view.value === 'flip')
const active = computed(() => running.value ? run.value!.mode : null)

function costText (to: string): string {
  const c = cand.value!
  const pay = c.family.cost(to)
  const chaos = swap!.cost(c, to)
  const what = `${pay.amount} ${pay.item.replace(' Crystallised Lifeforce', '')}`
  return chaos == null ? `${what} · no price yet` : `${what} ≈ ${chaos >= 10 ? Math.round(chaos) : chaos.toFixed(1)}c`
}
</script>

<style module>
.marker {
  align-self: center;
  font-size: var(--w-fs-sm);
  line-height: calc(16px * var(--w-text-scale, 1));
  padding: 0 5px;
  border-radius: var(--w-r-sm);
  background: var(--w-accent-soft);
  color: var(--w-accent);
  white-space: nowrap;
}
.marker:hover { filter: brightness(1.2); }
.dim { background: var(--w-panel-3); color: var(--w-faint); }
.on { outline: 1px solid var(--w-accent); }
.card { display: flex; flex-direction: column; gap: var(--w-s2); padding: var(--w-s2); max-width: calc(300px * var(--w-text-scale, 1)); font-size: var(--w-fs-sm); }
.head { font-weight: 600; }
.rows { display: flex; flex-direction: column; gap: 2px; }
.row { display: flex; justify-content: space-between; gap: var(--w-s3); }
.buttons { display: flex; flex-wrap: wrap; gap: var(--w-s1); }
.note { color: var(--w-faint); font-size: var(--w-fs-xs); }
.warn { color: var(--w-warn); font-size: var(--w-fs-xs); }
</style>
