<template>
  <!-- A vault's rewards: a row each with its game art, the whole name on one
       line and the price. The hover card and the Vaults tab both draw these. -->
  <div>
    <div v-for="r in rewards" :key="r.text" v-item-tip="r.item" :class="$style.row" :data-vault-reward="r.text">
      <WIcon :src="r.icon ? (itemArt({ name: r.icon }) ?? undefined) : undefined" :fallback="r.kind === 'unique' ? 'fas fa-ring' : 'fas fa-cube'" size="md" :class="r.kind === 'unique' && !r.icon ? $style.uniq : undefined" />
      <span :class="[$style.text, fit && $style.fit]" :title="fit && !r.item ? r.text : undefined">{{ r.text }}<span v-if="r.rare" :class="$style.rare">rare</span></span>
      <span v-if="r.chaos != null" :class="$style.price">{{ chaos(r.chaos) }}</span>
      <span v-else :class="[$style.price, $style.varies]">varies</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import WIcon from '../ui/WIcon.vue'
import { vItemTip } from '../ui/tooltip/item-tip'
import { itemArt } from '../ui/game-icons'

// item: the one item a reward is, with the variant it's priced at, for its game
// tooltip (null: one of several, or varies).
export interface RewardRow { text: string, kind: string, rare: boolean, chaos: number | null, icon: string | null, item: { name: string, variant?: string } | null }

// fit: a fixed-width place (the price check); long names end in "…" with the
// whole name on hover. Without it the rows grow to their names (the hover card).
defineProps<{ rewards: RewardRow[], fit?: boolean }>()

function chaos (n: number) {
  return `${Math.abs(n) >= 10 ? Math.round(n) : +n.toFixed(1)}c`
}
</script>

<style module>
.row { display: flex; align-items: center; gap: 8px; min-height: 28px; white-space: nowrap; }
.row + .row { border-top: 1px solid var(--w-line-soft); }
.text { flex: 1 1 auto; padding-right: 16px; }
.fit { min-width: 0; overflow: hidden; text-overflow: ellipsis; padding-right: 8px; }
.rare { margin-left: 6px; padding: 0 3px; border: 1px solid var(--w-r-unique); border-radius: var(--w-r-sm); color: var(--w-r-unique); font-size: var(--w-fs-xs); }
.uniq { color: var(--w-r-unique); }
.price { flex: none; font-variant-numeric: tabular-nums; }
.varies { color: var(--w-faint); font-style: italic; }
</style>
